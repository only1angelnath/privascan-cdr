"use client"

import { useState } from "react"
import { useWalletClient, useAccount } from "wagmi"
import { mintPrivateReport, MintProgress, MintResult } from "@/lib/vault"
import type { PrivateScoreReport } from "@/lib/privascan"

interface Props {
  report: PrivateScoreReport
  onClose: () => void
  onSuccess: (result: MintResult) => void
}

const STEP_ORDER = ["encrypting", "uploading", "allocating", "writing", "done"]

const STEP_LABELS: Record<string, string> = {
  encrypting: "Encrypt locally",
  uploading:  "Upload to IPFS",
  allocating: "Allocate vault",
  writing:    "Write to chain",
  done:       "Complete",
}

function StepRow({ stepKey, current, message }: { stepKey: string; current: string; message: string }) {
  const currentIdx = STEP_ORDER.indexOf(current)
  const stepIdx    = STEP_ORDER.indexOf(stepKey)
  const isDone     = stepIdx < currentIdx || current === "done"
  const isActive   = stepKey === current && current !== "done"
  const isPending  = stepIdx > currentIdx

  const color = isDone ? "#22c55e" : isActive ? "#7c3aed" : "#1e293b"
  const label = isDone ? STEP_LABELS[stepKey] : isActive ? message : STEP_LABELS[stepKey]

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {/* Icon */}
      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "rgba(34,197,94,0.1)" : isActive ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${color}30` }}>
        {isDone ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : isActive ? (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", animation: "mintpulse 1s ease-in-out infinite" }}/>
        ) : (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1e293b" }}/>
        )}
      </div>
      {/* Label */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: isPending ? "#1e293b" : "#e2e8f0", fontFamily: "'IBM Plex Mono',monospace" }}>{label}</div>
      </div>
      {/* TX badge */}
      {(stepKey === "allocating" || stepKey === "writing") && !isPending && (
        <span style={{ fontSize: 9, color: isDone ? "#22c55e" : "#7c3aed", letterSpacing: "0.1em", padding: "2px 8px", border: `1px solid ${isDone ? "rgba(34,197,94,0.2)" : "rgba(124,58,237,0.2)"}`, borderRadius: 10 }}>
          {stepKey === "allocating" ? "TX 1" : "TX 2"}
        </span>
      )}
    </div>
  )
}

export default function MintFlow({ report, onClose, onSuccess }: Props) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [minting, setMinting] = useState(false)
  const [progress, setProgress] = useState<MintProgress | null>(null)
  const [result, setResult] = useState<MintResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleMint() {
    if (!walletClient || !address) return
    setMinting(true)
    setError(null)
    setProgress({ step: "encrypting", message: "Encrypting report locally..." })
    try {
      const res = await mintPrivateReport(
        report,
        address,
        walletClient,
        (p) => setProgress(p)
      )
      setResult(res)
    } catch (err: any) {
      setError(err?.message ?? "Mint failed")
    } finally {
      setMinting(false)
    }
  }

  function copyUUID() {
    if (!result) return
    navigator.clipboard.writeText(String(result.uuid))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentStep = progress?.step ?? "encrypting"

  return (
    <>
      <style>{`@keyframes mintpulse{0%,100%{opacity:0.4;transform:scale(0.85)}50%{opacity:1;transform:scale(1)}}`}</style>

      {/* Backdrop */}
      <div onClick={!minting ? onClose : undefined} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 100 }}/>

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 101, width: "min(480px,90vw)",
        background: "rgba(8,13,26,0.97)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(124,58,237,0.25)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 0 80px rgba(124,58,237,0.15)",
      }}>
        {/* Top accent */}
        <div style={{ height: 2, background: result ? "linear-gradient(90deg,#22c55e,rgba(34,197,94,0.2))" : "linear-gradient(90deg,#7c3aed,rgba(0,212,255,0.4),transparent)" }}/>

        <div style={{ padding: 28 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 800, fontSize: 14, color: "#f1f5f9", letterSpacing: "0.05em" }}>
                {result ? "VAULT MINTED" : "MINT CDR VAULT"}
              </div>
              <div style={{ fontSize: 10, color: "#334155", marginTop: 3, fontFamily: "'IBM Plex Mono',monospace" }}>
                {report.chain.toUpperCase()} · {report.address.slice(0, 8)}...{report.address.slice(-6)}
              </div>
            </div>
            {!minting && (
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#334155", fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>✕</button>
            )}
          </div>

          {/* Success state */}
          {result ? (
            <div>
              <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12l5 5L20 6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 13, color: "#22c55e", letterSpacing: "0.08em", marginBottom: 6 }}>PRIVATE REPORT MINTED</div>
                <div style={{ fontSize: 11, color: "#334155" }}>Your report is sealed on Story Aeneid</div>
              </div>

              {/* UUID */}
              <div style={{ padding: 16, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>VAULT ID</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#e2e8f0", wordBreak: "break-all", marginBottom: 12 }}>{result.uuid}</div>
                <button onClick={copyUUID} style={{ width: "100%", padding: "8px", background: copied ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.1)", border: `1px solid ${copied ? "rgba(34,197,94,0.25)" : "rgba(124,58,237,0.25)"}`, borderRadius: 8, color: copied ? "#22c55e" : "#a78bfa", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer" }}>
                  {copied ? "✓ Copied" : "Copy Vault ID"}
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <a href={`https://www.storyscan.io`} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "10px", textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#64748b", fontSize: 11, textDecoration: "none", fontFamily: "'IBM Plex Mono',monospace" }}>
                  StoryScan ↗
                </a>
                <a href={`/read?uuid=${result.uuid}`} style={{ display: "block", padding: "10px", textAlign: "center", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 10, color: "#fff", fontSize: 11, textDecoration: "none", fontFamily: "'Orbitron',monospace", fontWeight: 700, letterSpacing: "0.06em" }}>
                  READ REPORT →
                </a>
              </div>
            </div>
          ) : (
            <div>
              {/* Pre-mint summary */}
              {!minting && !error && (
                <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>REPORT SUMMARY</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { label: "Protocol", value: `${report.address.slice(0,8)}...${report.address.slice(-6)}` },
                      { label: "Chain", value: report.chain.charAt(0).toUpperCase() + report.chain.slice(1) },
                      { label: "Grade", value: `${report.grade} — ${report.composite_score.toFixed(1)}` },
                      { label: "Findings", value: `${report.slither_finding_count} total (${report.slither_finding_high} HIGH)` },
                      { label: "Storage", value: "IPFS via Helia" },
                      { label: "Network", value: "Story Aeneid Testnet" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#334155" }}>{label}</span>
                        <span style={{ color: "#94a3b8", fontFamily: "'IBM Plex Mono',monospace" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 10, color: "#1e293b" }}>
                    This will send 2 transactions on Story Aeneid. Estimated cost: ~0.003 IP testnet tokens.
                  </div>
                </div>
              )}

              {/* Progress steps */}
              {minting && (
                <div style={{ marginBottom: 20 }}>
                  {STEP_ORDER.filter(s => s !== "done").map(s => (
                    <StepRow key={s} stepKey={s} current={currentStep} message={progress?.message ?? ""} />
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10, fontSize: 11, color: "#ef4444", marginBottom: 16 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Mint button */}
              {!minting && (
                <button onClick={handleMint} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", border: "1px solid rgba(124,58,237,0.45)", borderRadius: 10, fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", cursor: "pointer", boxShadow: "0 0 28px rgba(124,58,237,0.22)" }}>
                  {error ? "RETRY MINT →" : "MINT CONFIDENTIAL REPORT →"}
                </button>
              )}

              {minting && (
                <div style={{ textAlign: "center", padding: "8px 0", fontSize: 11, color: "#475569", fontFamily: "'IBM Plex Mono',monospace" }}>
                  Approve transactions in MetaMask when prompted...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
