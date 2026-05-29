import { encryptFile } from "@piplabs/cdr-crypto"
import { uuidToLabel } from "@piplabs/cdr-sdk"
import { toHex, encodeAbiParameters } from "viem"
import { CONDITIONS } from "@/lib/conditions"
import { ensureWasm, makeCDRClient } from "@/lib/cdr"
import { getHeliaProvider } from "@/lib/helia"
import type { PrivateScoreReport } from "@/lib/privascan"

export type MintProgressStep =
  | "encrypting"
  | "uploading"
  | "allocating"
  | "writing"
  | "done"

export interface MintProgress {
  step: MintProgressStep
  message: string
}

export interface MintResult {
  uuid: string
  cid: string
}

export async function mintPrivateReport(
  report: PrivateScoreReport,
  ownerAddress: string,
  walletClient: any,
  onProgress?: (progress: MintProgress) => void
): Promise<MintResult> {
  const progress = (step: MintProgressStep, message: string) => {
    onProgress?.({ step, message })
  }

  await ensureWasm()

  const storageProvider = await getHeliaProvider()
  const client = makeCDRClient(walletClient)
  const globalPubKey = await client.observer.getGlobalPubKey()
  const content = new TextEncoder().encode(JSON.stringify(report))

  progress("encrypting", "Encrypting report locally...")
  const { ciphertext: encryptedFile, key } = encryptFile(content)

  progress("uploading", "Uploading encrypted report to IPFS...")
  const ipfsCid = await storageProvider.upload(encryptedFile, { pin: true })

  const payload = JSON.stringify({ cid: ipfsCid, key: toHex(key) })
  const payloadBytes = new TextEncoder().encode(payload)

  progress("allocating", "Allocating CDR vault on Story... (TX 1 of 2)")

  const { uuid } = await client.uploader.allocate({
    updatable: false,
    writeConditionAddr: CONDITIONS.OWNER_WRITE,
    readConditionAddr: ownerAddress as `0x${string}`,
    writeConditionData: encodeAbiParameters(
      [{ type: "address" }],
      [ownerAddress as `0x${string}`]
    ),
    readConditionData: "0x",
    accessAuxData: "0x",
    skipConditionValidation: true,
  })

  const label = uuidToLabel(uuid)
  const ciphertext = await client.uploader.encryptDataKey({
    dataKey: payloadBytes,
    globalPubKey,
    label,
  })

  progress("writing", "Writing encrypted report to vault... (TX 2 of 2)")

  await client.uploader.write({
    uuid,
    accessAuxData: "0x",
    encryptedData: toHex(ciphertext.raw),
  })

  progress("done", "Private report minted successfully!")
  return { uuid, cid: ipfsCid }
}

export async function readPrivateReport(
  uuid: string,
  walletClient: any,
  onProgress?: (message: string) => void
): Promise<PrivateScoreReport> {
  onProgress?.("Initialising CDR client...")
  await ensureWasm()

  const storageProvider = await getHeliaProvider()
  const client = makeCDRClient(walletClient)

  onProgress?.("Submitting read request to Story validators... (TX 1)")

  const result = await client.consumer.downloadFile({
    uuid,
    accessAuxData: "0x",
    storageProvider,
    timeoutMs: 120_000,
    skipCidVerification: true,
  } as any)

  onProgress?.("Decrypting report locally...")
  const json = new TextDecoder().decode(result.content)
  return JSON.parse(json) as PrivateScoreReport
}

export async function grantReadAccess(
  report: PrivateScoreReport,
  granteeAddress: string,
  walletClient: any,
  onProgress?: (progress: MintProgress) => void
): Promise<MintResult> {
  return mintPrivateReport(report, granteeAddress, walletClient, onProgress)
}
