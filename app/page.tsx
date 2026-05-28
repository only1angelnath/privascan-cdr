"use client"

export const runtime = "nodejs"

import { useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { fetchPrivateReport, PrivateScoreReport } from "@/lib/privascan"

const CHAINS = ["ethereum", "base", "arbitrum", "optimism", "polygon", "bsc"]

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
}

export default function HomePage() {
  const { isConnected } = useAccount()

  const [chain, setChain] = useState("ethereum")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<PrivateScoreReport | null>(null)

  async function handleFetch() {
    if (!address.match(/^0x[0-9a-fA-F]{40}$/)) {
      setError("Invalid address — must be 0x + 40 hex characters")
      return
    }
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const data = await fetchPrivateReport(chain, address)
      setReport(data)
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch report")
    } finally {
      setLoading(false)
    }
  }

  const gradeColor = report ? (GRADE_COLORS[report.grade] ?? "#64748b") : "#64748b"

  return (
    <main style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #1e293b", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#e2e8f0" }}>PrivaScan Confidential</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="https://privascan.xyz" target="_blank" rel="noopener noreferrer"
            style={{ color: "#64748b", fontSize: 14, textDecoration: "none" }}>
            privascan.xyz ↗
          </a>
          <ConnectButton />
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px 40px" }}>
        <h1 style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.2, marginBottom: 16, color: "#f1f5f9" }}>
          Your risk report.<br />
          <span style={{ color: "#7c3aed" }}>Encrypted onchain.</span><br />
          Yours to share.
        </h1>
        <p style={{ color: "#64748b", fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
          Risk scores are public. Your full findings don't have to be.
          Powered by Story CDR — threshold encryption on Story L1.
        </p>

        {/* Input form */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Chain
            </label>
            <select
              value={chain}
              onChange={e => setChain(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 15 }}
            >
              {CHAINS.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Contract Address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="0x..."
              style={{ width: "100%", padding: "10px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 15, boxSizing: "border-box" }}
              onKeyDown={e => e.key === "Enter" && handleFetch()}
            />
          </div>

          <button
            onClick={handleFetch}
            disabled={loading || !address}
            style={{
              width: "100%", padding: "12px 24px", background: loading ? "#4c1d95" : "#7c3aed",
              color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600,
              cursor: loading || !address ? "not-allowed" : "pointer", transition: "background 0.2s"
            }}
          >
            {loading ? "Fetching report... (30-60s)" : "Fetch Private Report →"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 16, padding: 16, background: "#1e1a2e", border: "1px solid #ef4444", borderRadius: 8, color: "#ef4444", fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Already have a vault? */}
        <p style={{ marginTop: 20, textAlign: "center", color: "#64748b", fontSize: 14 }}>
          Already have a vault?{" "}
          <a href="/read" style={{ color: "#7c3aed", textDecoration: "none" }}>Read a Report →</a>
        </p>
      </section>

      {/* Report Preview */}
      {report && (
        <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, marginBottom: 16 }}>
            {/* Score overview */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                border: `4px solid ${gradeColor}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
              }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: gradeColor }}>{report.grade}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{report.composite_score.toFixed(1)}</span>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 18, margin: 0, color: "#f1f5f9" }}>
                  {report.address.slice(0, 6)}...{report.address.slice(-4)}
                </p>
                <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>
                  {report.chain.charAt(0).toUpperCase() + report.chain.slice(1)} · {report.grade_label}
                </p>
              </div>
            </div>

            {/* Public vs Private split */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ padding: 16, background: "#0f172a", borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Public (anyone sees)</p>
                <p style={{ margin: "4px 0", fontSize: 14 }}>Score: <strong style={{ color: gradeColor }}>{report.composite_score.toFixed(1)}</strong></p>
                <p style={{ margin: "4px 0", fontSize: 14 }}>Grade: <strong style={{ color: gradeColor }}>{report.grade}</strong></p>
              </div>
              <div style={{ padding: 16, background: "#1a0a2e", border: "1px solid #7c3aed33", borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: "#7c3aed", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>🔒 Private (only you)</p>
                {report.raw_findings_available ? (
                  <>
                    <p style={{ margin: "4px 0", fontSize: 14 }}><strong style={{ color: "#ef4444" }}>{report.slither_finding_high} HIGH</strong> findings</p>
                    <p style={{ margin: "4px 0", fontSize: 14 }}><strong style={{ color: "#f97316" }}>{report.slither_finding_medium} MEDIUM</strong> findings</p>
                    <p style={{ margin: "4px 0", fontSize: 14 }}>{report.slither_finding_count} total · {report.ownership_findings.length} ownership risks</p>
                  </>
                ) : (
                  <p style={{ margin: "4px 0", fontSize: 14, color: "#64748b" }}>
                    {report.source_verified === false
                      ? "Source not verified — rescore needed for raw findings"
                      : "Findings available after rescore"}
                  </p>
                )}
              </div>
            </div>

            {/* Sub-scores */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sub-scores</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(report.sub_scores).map(([key, val]) => (
                  <div key={key} style={{ padding: "6px 12px", background: "#0f172a", borderRadius: 6, fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>{key}: </span>
                    <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{val?.toFixed(1) ?? "N/A"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            {!isConnected ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>Connect your wallet to mint this report as a CDR vault</p>
                <ConnectButton />
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#22c55e", fontSize: 14, marginBottom: 12 }}>✓ Wallet connected — ready to mint</p>
                <a href="/mint" style={{
                  display: "inline-block", padding: "12px 32px",
                  background: "#7c3aed", color: "#fff", borderRadius: 8,
                  fontWeight: 600, fontSize: 16, textDecoration: "none"
                }}>
                  Mint Confidential Report →
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How it works */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
        <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.05em" }}>How it works</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { icon: "🔍", title: "Score", desc: "Fetch full private risk report from PrivaScan" },
            { icon: "🔒", title: "Encrypt", desc: "Report encrypted on Story L1 via CDR threshold encryption" },
            { icon: "🔑", title: "Share", desc: "Grant read access to any wallet — auditor, investor, DAO" },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ padding: 20, background: "#1e293b", borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <p style={{ fontWeight: 600, margin: "0 0 8px", color: "#f1f5f9" }}>{title}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1e293b", padding: "20px 32px", textAlign: "center" }}>
        <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>
          Built on Story CDR · <a href="https://privascan.xyz" style={{ color: "#334155" }}>privascan.xyz</a>
        </p>
      </footer>
    </main>
  )
}
