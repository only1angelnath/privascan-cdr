import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

export const runtime = "nodejs"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PrivaScan Confidential Reports",
  description: "Encrypted onchain risk reports powered by Story CDR",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
