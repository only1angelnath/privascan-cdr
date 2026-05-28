import { createHelia } from "helia"
import { unixfs } from "@helia/unixfs"
import { HeliaProvider } from "@piplabs/cdr-sdk"

let heliaProviderInstance: HeliaProvider | null = null

export async function getHeliaProvider(): Promise<HeliaProvider> {
  if (heliaProviderInstance) return heliaProviderInstance

  const helia = await createHelia()
  const fs = unixfs(helia)

  // Import CID from the same multiformats that helia uses internally
  // to avoid instanceof mismatches across multiple installed versions
  const { CID } = await import("multiformats/cid")

  heliaProviderInstance = new HeliaProvider({
    helia,
    unixfs: fs,
    CID: (s: string) => CID.parse(s),
  })

  return heliaProviderInstance
}
