"use client"

import { useEffect } from "react"
import { WagmiProvider } from "wagmi"
import { defineChain } from "viem"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import { ensureWasm } from "@/lib/cdr"
import "@rainbow-me/rainbowkit/styles.css"

export const storyAeneid = defineChain({
  id: 1315,
  name: "Story Aeneid Testnet",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_STORY_RPC || "https://aeneid.storyrpc.io"] },
  },
  blockExplorers: {
    default: { name: "StoryScan", url: "https://www.storyscan.io" },
  },
  testnet: true,
})

const config = getDefaultConfig({
  appName: "PrivaScan Confidential Reports",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [storyAeneid],
  ssr: true,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureWasm().catch(console.error)
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
