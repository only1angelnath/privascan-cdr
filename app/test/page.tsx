"use client"

export const runtime = "nodejs"

import { useState } from "react"
import { useWalletClient, useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { encodeAbiParameters, toHex } from "viem"
import { ensureWasm, makeCDRClient } from "@/lib/cdr"
import { CONDITIONS } from "@/lib/conditions"
import { getHeliaProvider } from "@/lib/helia"
import { encryptFile } from "@piplabs/cdr-crypto"
import { uuidToLabel } from "@piplabs/cdr-sdk"

export default function TestPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [uuid, setUuid] = useState<number | null>(null)
  const [cid, setCid] = useState<string>("")
  const [decrypted, setDecrypted] = useState<string>("")
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg])
  }

  async function handleMint() {
    if (!walletClient || !address) return
    setBusy(true)
    setLog([])
    setUuid(null)
    setCid("")
    try {
      addLog("Ensuring WASM ready...")
      await ensureWasm()

      addLog("Getting Helia provider...")
      const storageProvider = await getHeliaProvider()

      addLog("Building CDR client...")
      const client = makeCDRClient(walletClient)

      addLog("Fetching global public key...")
      const globalPubKey = await client.observer.getGlobalPubKey()
      addLog("Got global pub key")

      const content = new TextEncoder().encode("hello world — privascan CDR test")

      // Step 1: AES-encrypt the file locally
      addLog("Encrypting file locally (AES)...")
      const { ciphertext: encryptedFile, key } = encryptFile(content)

      // Step 2: Upload encrypted file to IPFS
      addLog("Uploading encrypted file to IPFS via Helia...")
      const ipfsCid = await storageProvider.upload(encryptedFile, { pin: true })
      addLog("IPFS upload done, CID: " + ipfsCid)
      setCid(ipfsCid)

      // Step 3: Build vault payload
      const payload = JSON.stringify({ cid: ipfsCid, key: toHex(key) })
      const payloadBytes = new TextEncoder().encode(payload)

      // Step 4: Allocate vault — skipConditionValidation because readConditionAddr is EOA
      addLog("Allocating CDR vault (TX 1)...")
      const { uuid: newUuid } = await client.uploader.allocate({
        updatable: false,
        writeConditionAddr: CONDITIONS.OWNER_WRITE,
        readConditionAddr: address,
        writeConditionData: encodeAbiParameters([{ type: "address" }], [address]),
        readConditionData: "0x",
        skipConditionValidation: true,
      })
      addLog("Vault allocated! UUID: " + newUuid)
      setUuid(newUuid)

      // Step 5: TDH2-encrypt the payload key with UUID-derived label
      addLog("TDH2-encrypting data key...")
      const label = uuidToLabel(newUuid)
      const ciphertext = await client.uploader.encryptDataKey({
        dataKey: payloadBytes,
        globalPubKey,
        label,
      })

      // Step 6: Write to chain
      addLog("Writing encrypted data to vault (TX 2)...")
      await client.uploader.write({
        uuid: newUuid,
        accessAuxData: "0x",
        encryptedData: toHex(ciphertext.raw),
      })

      addLog("Mint complete!")
    } catch (err: any) {
      addLog("ERROR: " + (err?.message ?? String(err)))
    } finally {
      setBusy(false)
    }
  }

  async function handleDecrypt() {
    if (!walletClient || !uuid) return
    setBusy(true)
    setDecrypted("")
    try {
      addLog("Ensuring WASM ready...")
      await ensureWasm()

      addLog("Getting Helia provider...")
      const storageProvider = await getHeliaProvider()

      addLog("Building CDR client...")
      const client = makeCDRClient(walletClient)

      addLog("Downloading + decrypting (30-120s)...")
      const result = await client.consumer.downloadFile({
        uuid,
        accessAuxData: "0x",
        storageProvider,
        timeoutMs: 120_000,
        skipCidVerification: true,
      })

      const text = new TextDecoder().decode(result.content)
      addLog("Decrypted successfully!")
      setDecrypted(text)
    } catch (err: any) {
      addLog("ERROR: " + (err?.message ?? String(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "monospace", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <h1 style={{ color: "#7c3aed", marginBottom: 24 }}>CDR Test Page — Day 1</h1>

      <ConnectButton />

      {isConnected && (
        <div style={{ marginTop: 32 }}>
          <p style={{ color: "#64748b", marginBottom: 16 }}>Connected: {address}</p>

          <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
            <button
              onClick={handleMint}
              disabled={busy}
              style={{ padding: "10px 24px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: busy ? "not-allowed" : "pointer" }}
            >
              {busy ? "Working..." : "Mint test vault"}
            </button>

            <button
              onClick={handleDecrypt}
              disabled={busy || uuid === null}
              style={{ padding: "10px 24px", background: "#06b6d4", color: "#fff", border: "none", borderRadius: 8, cursor: (busy || !uuid) ? "not-allowed" : "pointer" }}
            >
              Decrypt
            </button>
          </div>

          {uuid && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#84cc16" }}>Vault UUID: {uuid ?? ""}</p>
              <p style={{ color: "#64748b", fontSize: 12 }}>IPFS CID: {cid}</p>
            </div>
          )}

          {decrypted && (
            <p style={{ color: "#22c55e", fontSize: 18 }}>Decrypted: "{decrypted}"</p>
          )}

          <div style={{ marginTop: 24, padding: 16, background: "#1e293b", borderRadius: 8 }}>
            <p style={{ color: "#64748b", marginBottom: 8 }}>Log:</p>
            {log.map((line, i) => (
              <p key={i} style={{ color: "#e2e8f0", margin: "2px 0" }}>{"> "}{line}</p>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
