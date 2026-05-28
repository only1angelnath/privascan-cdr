import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "helia",
    "@helia/unixfs",
    "libp2p",
    "@libp2p/webrtc",
    "node-datachannel",
  ],
  turbopack: {},
}

export default nextConfig
