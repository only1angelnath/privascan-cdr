import { CDRClient, initWasm } from "@piplabs/cdr-sdk"
import { createPublicClient, http } from "viem"

// initWasm() must be called once before any encrypt/decrypt operation.
// This singleton ensures it is never called twice.
let wasmReady = false
let wasmPromise: Promise<void> | null = null

export async function ensureWasm(): Promise<void> {
  if (wasmReady) return
  if (wasmPromise) return wasmPromise
  wasmPromise = initWasm().then(() => {
    wasmReady = true
  })
  return wasmPromise
}

export function makeCDRClient(walletClient?: any): CDRClient {
  const publicClient = createPublicClient({
    transport: http(process.env.NEXT_PUBLIC_STORY_RPC!),
  })

  return new CDRClient({
    network: "testnet",
    publicClient,
    walletClient,
    apiUrl: process.env.NEXT_PUBLIC_STORY_API_URL!,
  })
}
