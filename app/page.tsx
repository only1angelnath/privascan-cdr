"use client"

export const runtime = "nodejs"

import { useState, useEffect } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"
import { fetchPrivateReport, PrivateScoreReport } from "@/lib/privascan"
import MintFlow from "@/components/MintFlow"
import type { MintResult } from "@/lib/vault"

const CHAINS = ["ethereum", "base", "arbitrum", "optimism", "polygon", "bsc"]
const GRADE_COLORS: Record<string, string> = { A: "#22c55e", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444" }
const GRADE_LABELS: Record<string, string> = { A: "Low Risk", B: "Moderate-Low", C: "Moderate Risk", D: "High Risk", F: "Critical Risk" }
const SEV_COLOR: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f97316", LOW: "#f59e0b", INFORMATIONAL: "#475569" }
const STAGES = ["Fetching contract bytecode...", "Running Slither analysis...", "Checking ownership patterns...", "Computing private score..."]

// ── PrivaScan Logo (ported from frontend/components/Logo.tsx) ──────────────
function PrivaScanLogo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <style>{`@keyframes logo-sweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes logo-pulse{0%,100%{opacity:.22}50%{opacity:.85}}`}</style>
        <polygon points="40,3 71,21 71,59 40,77 9,59 9,21" stroke="#00d4ff" strokeWidth="1.5"/>
        <circle cx="40" cy="40" r="24" stroke="#00d4ff" strokeWidth=".7" style={{animation:"logo-pulse 2s ease-in-out infinite"}}/>
        <circle cx="40" cy="40" r="16" stroke="#00d4ff" strokeWidth=".7" style={{animation:"logo-pulse 2s ease-in-out infinite",animationDelay:".55s"}}/>
        <circle cx="40" cy="40" r="8"  stroke="#00d4ff" strokeWidth=".7" style={{animation:"logo-pulse 2s ease-in-out infinite",animationDelay:"1.1s"}}/>
        <line x1="40" y1="16" x2="40" y2="64" stroke="#00d4ff" strokeWidth=".4" opacity=".3"/>
        <line x1="16" y1="40" x2="64" y2="40" stroke="#00d4ff" strokeWidth=".4" opacity=".3"/>
        <g style={{transformOrigin:"40px 40px",animation:"logo-sweep 3s linear infinite"}}>
          <line x1="40" y1="40" x2="64" y2="40" stroke="#00d4ff" strokeWidth="1.5" opacity=".9"/>
          <path d="M40 40 L64 40 A24 24 0 0 0 40 16 Z" fill="#00d4ff" fillOpacity=".07"/>
        </g>
        <line x1="71" y1="21" x2="65" y2="24" stroke="#f59e0b" strokeWidth="1.5"/>
        <line x1="71" y1="59" x2="65" y2="56" stroke="#f59e0b" strokeWidth="1.5"/>
        <line x1="9"  y1="21" x2="15" y2="24" stroke="#f59e0b" strokeWidth="1.5"/>
        <line x1="9"  y1="59" x2="15" y2="56" stroke="#f59e0b" strokeWidth="1.5"/>
        <circle cx="40" cy="40" r="4.5" fill="#f59e0b" fillOpacity=".2"/>
        <circle cx="40" cy="40" r="2"   fill="#f59e0b"/>
      </svg>
      <div>
        <div style={{ fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: size * 0.5, letterSpacing: "0.08em", lineHeight: 1 }}>
          <span style={{ color: "#00d4ff" }}>PRIVA</span><span style={{ color: "#f59e0b" }}>SCAN</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginTop: 2 }}>
          CONFIDENTIAL
        </div>
      </div>
    </div>
  )
}

// ── Score ring ────────────────────────────────────────────────────────────
function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const [anim, setAnim] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnim(true), 120); return () => clearTimeout(t) }, [])
  const R = 52, C = 2 * Math.PI * R, filled = anim ? (score / 100) * C : 0
  const color = GRADE_COLORS[grade] ?? "#64748b"
  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      <defs>
        <filter id="ringglow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx={65} cy={65} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={9}/>
      <circle cx={65} cy={65} r={R} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={`${filled} ${C - filled}`} strokeDashoffset={C / 4}
        filter="url(#ringglow)" style={{ transition: "stroke-dasharray 1s ease-out" }}/>
      <text x={65} y={57} textAnchor="middle" fill="white" fontSize="25" fontWeight="800" fontFamily="Orbitron,monospace">{Math.round(score)}</text>
      <text x={65} y={78} textAnchor="middle" fill={color} fontSize="14" fontWeight="900" fontFamily="Orbitron,monospace">{grade}</text>
      <text x={65} y={95} textAnchor="middle" fill="#334155" fontSize="8" fontFamily="IBM Plex Mono,monospace" letterSpacing="2">{(GRADE_LABELS[grade] ?? "").toUpperCase()}</text>
    </svg>
  )
}

// ── Geometric step icons ──────────────────────────────────────────────────
function IconScan() {
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <rect x="4" y="4" width="28" height="28" rx="4" stroke="#7c3aed" strokeWidth="1.2" opacity="0.4"/>
      <circle cx="18" cy="18" r="8" stroke="#7c3aed" strokeWidth="1.2"/>
      <circle cx="18" cy="18" r="3" fill="#7c3aed" opacity="0.6"/>
      <line x1="18" y1="10" x2="18" y2="4" stroke="#00d4ff" strokeWidth="1"/>
      <line x1="18" y1="26" x2="18" y2="32" stroke="#00d4ff" strokeWidth="1"/>
      <line x1="10" y1="18" x2="4" y2="18" stroke="#00d4ff" strokeWidth="1"/>
      <line x1="26" y1="18" x2="32" y2="18" stroke="#00d4ff" strokeWidth="1"/>
    </svg>
  )
}

function IconLock() {
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <rect x="8" y="16" width="20" height="15" rx="3" stroke="#7c3aed" strokeWidth="1.2"/>
      <path d="M12 16V12a6 6 0 0 1 12 0v4" stroke="#7c3aed" strokeWidth="1.2"/>
      <circle cx="18" cy="23" r="2.5" fill="#7c3aed" opacity="0.7"/>
      <line x1="18" y1="25" x2="18" y2="28" stroke="#7c3aed" strokeWidth="1.2"/>
      <circle cx="6" cy="6" r="1.5" fill="#00d4ff" opacity="0.4"/>
      <circle cx="30" cy="6" r="1.5" fill="#00d4ff" opacity="0.4"/>
    </svg>
  )
}

function IconKey() {
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
      <circle cx="13" cy="16" r="7" stroke="#7c3aed" strokeWidth="1.2"/>
      <circle cx="13" cy="16" r="3" stroke="#7c3aed" strokeWidth="1.2" opacity="0.5"/>
      <line x1="19" y1="19" x2="32" y2="27" stroke="#7c3aed" strokeWidth="1.2"/>
      <line x1="27" y1="24" x2="27" y2="29" stroke="#00d4ff" strokeWidth="1.2"/>
      <line x1="30" y1="26" x2="30" y2="30" stroke="#00d4ff" strokeWidth="1.2"/>
    </svg>
  )
}

// ── Animated grid + particle background ──────────────────────────────────
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Deep gradient base */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(124,58,237,0.12) 0%, transparent 60%)" }}/>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 80% 60%, rgba(0,212,255,0.07) 0%, transparent 60%)" }}/>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 50% 100%, rgba(124,58,237,0.06) 0%, transparent 60%)" }}/>
      {/* Grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px)", backgroundSize: "60px 60px" }}/>
      {/* Horizontal scan line effect */}
      <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(0,212,255,0.15),transparent)", animation: "scanline 8s linear infinite", top: 0 }}/>
      <style>{`
        @keyframes scanline { 0%{top:0%} 100%{top:100%} }
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-dot { 0%,100%{opacity:0.15} 50%{opacity:0.6} }
      `}</style>
      {/* Floating dots */}
      {[
        { x: "15%", y: "20%", s: 3, delay: "0s", d: "float1" },
        { x: "75%", y: "15%", s: 2, delay: "1s", d: "float2" },
        { x: "85%", y: "45%", s: 4, delay: "2s", d: "float1" },
        { x: "10%", y: "65%", s: 2, delay: "0.5s", d: "float2" },
        { x: "60%", y: "75%", s: 3, delay: "1.5s", d: "float1" },
        { x: "40%", y: "88%", s: 2, delay: "3s", d: "float2" },
        { x: "92%", y: "80%", s: 3, delay: "2.5s", d: "float1" },
      ].map((dot, i) => (
        <div key={i} style={{ position: "absolute", left: dot.x, top: dot.y, width: dot.s, height: dot.s, borderRadius: "50%", background: "#7c3aed", animation: `${dot.d} ${3 + i * 0.4}s ease-in-out infinite ${dot.delay}, pulse-dot ${2 + i * 0.3}s ease-in-out infinite ${dot.delay}` }}/>
      ))}
    </div>
  )
}

// ── Connect wallet button (plain wagmi — no RainbowKit QR crash) ──────────
function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#22c55e" }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}/>
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    )
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      style={{ padding: "7px 16px", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8, cursor: "pointer", fontFamily: "'Orbitron',monospace", fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.08em", boxShadow: "0 0 16px rgba(124,58,237,0.25)" }}
    >
      CONNECT WALLET
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const { isConnected } = useAccount()
  const [chain, setChain] = useState("ethereum")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<PrivateScoreReport | null>(null)
  const [mintOpen, setMintOpen] = useState(false)
  const [mintResult, setMintResult] = useState<MintResult | null>(null)

  async function handleFetch() {
    if (!address.match(/^0x[0-9a-fA-F]{40}$/)) { setError("Invalid address — must be 0x + 40 hex chars"); return }
    setLoading(true); setError(null); setReport(null); setStage(0)
    const sid = setInterval(() => setStage(s => Math.min(s + 1, STAGES.length - 1)), 10000)
    try { setReport(await fetchPrivateReport(chain, address)) }
    catch (err: any) { setError(err?.message ?? "Failed to fetch report") }
    finally { clearInterval(sid); setLoading(false) }
  }

  const gc = report ? (GRADE_COLORS[report.grade] ?? "#7c3aed") : "#7c3aed"

  return (
    <div style={{ background: "#080d1a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'IBM Plex Mono',monospace", position: "relative", overflowX: "hidden" }}>
      <Background />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(8,13,26,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        <PrivaScanLogo size={28} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/read" style={{ fontSize: 11, color: "#475569", textDecoration: "none", padding: "6px 14px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, letterSpacing: "0.06em", transition: "color 0.2s" }}>READ REPORT</a>
          <WalletButton />
        </div>
      </nav>

      {/* Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 820, margin: "0 auto", padding: "100px 24px 80px" }}>

        {/* Hero */}
        <div style={{ paddingTop: 32, marginBottom: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ height: 1, width: 32, background: "linear-gradient(90deg,transparent,#7c3aed)" }}/>
            <span style={{ fontSize: 9, color: "#7c3aed", letterSpacing: "0.2em", textTransform: "uppercase" }}>STORY CDR · THRESHOLD ENCRYPTION · STORY L1</span>
            <div style={{ height: 1, width: 32, background: "linear-gradient(90deg,#7c3aed,transparent)" }}/>
          </div>

          <h1 style={{ fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: "clamp(1.9rem,4.5vw,3rem)", lineHeight: 1.12, letterSpacing: "-0.02em", margin: "0 0 24px" }}>
            <span style={{ color: "#f1f5f9" }}>Know Every Finding.</span><br />
            <span style={{ background: "linear-gradient(135deg,#7c3aed 0%,#00d4ff 55%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Control Who Sees It.</span>
          </h1>

          <p style={{ fontSize: 12, color: "#334155", lineHeight: 1.9, maxWidth: 520, margin: 0 }}>
            PrivaScan surfaces the full picture — raw Slither findings, ownership risks, per-contract breakdown.
            CDR seals it inside a threshold-encrypted vault on Story L1.
            You decide who reads it.
          </p>
        </div>

        {/* Input card */}
        <div style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(124,58,237,0.16)", borderRadius: 20, padding: 28, marginBottom: 16, boxShadow: "0 0 80px rgba(124,58,237,0.04), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 20 }}>// FETCH PRIVATE REPORT</div>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 9, color: "#1e293b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Chain</label>
              <select value={chain} onChange={e => setChain(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(124,58,237,0.16)", borderRadius: 10, color: "#cbd5e1", fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer", appearance: "none" }}>
                {CHAINS.map(c => <option key={c} value={c} style={{ background: "#080d1a" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 9, color: "#1e293b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Contract Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." onKeyDown={e => e.key === "Enter" && handleFetch()}
                style={{ width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(124,58,237,0.16)", borderRadius: 10, color: "#e2e8f0", fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(124,58,237,0.16)")} />
            </div>
          </div>
          <button onClick={handleFetch} disabled={loading || !address}
            style={{ width: "100%", padding: "13px 24px", background: loading ? "rgba(124,58,237,0.08)" : "linear-gradient(135deg,#7c3aed,#5b21b6)", color: loading ? "#7c3aed" : "#fff", border: loading ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(124,58,237,0.45)", borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron',monospace", letterSpacing: "0.1em", cursor: loading || !address ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: loading ? "none" : "0 0 28px rgba(124,58,237,0.22)" }}>
            {loading ? `⟳  ${STAGES[stage]}` : "FETCH PRIVATE REPORT →"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px 18px", marginBottom: 16, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.16)", borderRadius: 10, fontSize: 11, color: "#ef4444" }}>⚠ {error}</div>
        )}

        {/* Report card */}
        {report && (
          <div style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${gc}28`, borderRadius: 20, overflow: "hidden", boxShadow: `0 0 80px ${gc}06, inset 0 1px 0 rgba(255,255,255,0.04)` }}>
            <div style={{ height: 2, background: `linear-gradient(90deg,${gc},rgba(124,58,237,0.4),transparent)` }}/>

            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <ScoreRing score={report.composite_score} grade={report.grade} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 9, color: "#1e293b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>{report.chain.toUpperCase()} · PRIVATE RISK REPORT</div>
                <div style={{ fontSize: 14, color: "#f1f5f9", marginBottom: 12, fontFamily: "'IBM Plex Mono',monospace" }}>{report.address.slice(0, 12)}...{report.address.slice(-10)}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: GRADE_LABELS[report.grade] ?? "", color: gc, bg: `${gc}12`, border: `${gc}28` },
                    { label: "🔒 CDR PROTECTED", color: "#a78bfa", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.22)" },
                    ...(report.source_verified ? [{ label: "✓ VERIFIED", color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.18)" }] : []),
                  ].map((b, i) => (
                    <span key={i} style={{ fontSize: 9, padding: "3px 10px", background: b.bg, border: `1px solid ${b.border}`, borderRadius: 20, color: b.color, letterSpacing: "0.08em" }}>{b.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#1e293b", fontFamily: "'IBM Plex Mono',monospace" }}>
                {new Date(report.scored_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>

            {/* Two columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {/* Public */}
              <div style={{ padding: "22px 28px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 9, color: "#1e293b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>PUBLIC · ANYONE CAN SEE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(report.sub_scores).map(([k, v]) => {
                    const pct = v ?? 0
                    const bc = pct <= 40 ? "#22c55e" : pct <= 65 ? "#f59e0b" : "#ef4444"
                    return (
                      <div key={k}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: "#334155", textTransform: "capitalize" }}>{k}</span>
                          <span style={{ fontSize: 10, fontFamily: "'Orbitron',monospace", color: bc, fontWeight: 700 }}>{pct.toFixed(0)}</span>
                        </div>
                        <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: bc, borderRadius: 2, opacity: 0.6, transition: "width 1.2s ease-out" }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Private */}
              <div style={{ padding: "22px 28px", background: "rgba(124,58,237,0.02)" }}>
                <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>🔒 PRIVATE · ONLY YOU</div>
                {report.raw_findings_available ? (
                  <div>
                    <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                      {[{ n: report.slither_finding_high, label: "HIGH", c: "#ef4444" }, { n: report.slither_finding_medium, label: "MED", c: "#f97316" }, { n: report.slither_finding_count, label: "TOTAL", c: "#64748b" }].map(x => (
                        <div key={x.label} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 22, fontWeight: 900, color: x.c, lineHeight: 1 }}>{x.n}</div>
                          <div style={{ fontSize: 8, color: "#334155", letterSpacing: "0.12em", marginTop: 3 }}>{x.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 12 }}/>
                    {report.slither_findings.slice(0, 3).map((f, i) => (
                      <div key={i} style={{ padding: "9px 12px", borderRadius: 9, marginBottom: 8, background: `${SEV_COLOR[f.severity] ?? "#64748b"}08`, border: `1px solid ${SEV_COLOR[f.severity] ?? "#64748b"}18` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: SEV_COLOR[f.severity] ?? "#64748b", boxShadow: `0 0 5px ${SEV_COLOR[f.severity] ?? "#64748b"}`, flexShrink: 0 }}/>
                          <span style={{ fontSize: 8, color: SEV_COLOR[f.severity], letterSpacing: "0.1em", fontWeight: 700 }}>{f.severity}</span>
                          <span style={{ fontSize: 10, color: "#cbd5e1" }}>{f.check}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#334155", lineHeight: 1.5, paddingLeft: 12 }}>{f.remediation}</div>
                      </div>
                    ))}
                    {report.slither_findings.length > 3 && (
                      <div style={{ fontSize: 10, color: "#1e293b", textAlign: "center" }}>+{report.slither_findings.length - 3} more sealed in vault</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.8, marginBottom: 12 }}>
                      {report.source_verified === false ? "Source not verified on Etherscan — raw findings unavailable. Rescore needed." : "Raw findings available after next rescore."}
                    </div>
                    {report.ownership_findings.map((f, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.14)", fontSize: 11, color: "#f97316" }}>⚠ {f.finding_type.replace(/-/g, " ")}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div style={{ padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "rgba(0,0,0,0.1)" }}>
              {!isConnected ? (
                <><div style={{ fontSize: 11, color: "#334155" }}>Connect wallet to mint this as a CDR vault on Story Aeneid</div><WalletButton /></>
              ) : (
                <><div style={{ fontSize: 11, color: "#22c55e" }}>✓ Wallet connected — ready to mint</div>
                <button
                  onClick={() => setMintOpen(true)}
                  style={{ padding: "11px 26px", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 10, fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", cursor: "pointer", boxShadow: "0 0 24px rgba(124,58,237,0.25)" }}>
                  {mintResult ? "VIEW VAULT →" : "MINT CDR VAULT →"}
                </button></>
              )}
            </div>
          </div>
        )}

        {/* How it works */}
        {!report && !loading && (
          <div style={{ marginTop: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.2))" }}/>
              <span style={{ fontSize: 9, color: "#1e293b", letterSpacing: "0.2em", textTransform: "uppercase" }}>HOW IT WORKS</span>
              <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(124,58,237,0.2),transparent)" }}/>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {[
                { icon: <IconScan />, step: "01", title: "SCORE", desc: "Fetch full private risk report — raw Slither findings, ownership risks, per-contract breakdown." },
                { icon: <IconLock />, step: "02", title: "ENCRYPT", desc: "Report threshold-encrypted on Story L1 via CDR. Not readable on-chain without validator consensus." },
                { icon: <IconKey />,  step: "03", title: "SHARE",   desc: "Grant read access to any wallet — auditor, DAO voter, institutional investor or regulator." },
              ].map(({ icon, step, title, desc }) => (
                <div key={title} style={{ padding: "24px 20px", background: "rgba(255,255,255,0.02)", backdropFilter: "blur(10px)", border: "1px solid rgba(124,58,237,0.1)", borderRadius: 14, position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}>
                  <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "'Orbitron',monospace", fontSize: 30, fontWeight: 900, color: "rgba(124,58,237,0.05)", lineHeight: 1 }}>{step}</div>
                  <div style={{ marginBottom: 16 }}>{icon}</div>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.12em", marginBottom: 10 }}>{title}</div>
                  <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.7 }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#1e293b" }}>Already have a vault? </span>
              <a href="/read" style={{ fontSize: 11, color: "#7c3aed", textDecoration: "none" }}>Read a Report →</a>
            </div>
          </div>
        )}
      </main>

      {/* Mint modal */}
      {mintOpen && report && (
        <MintFlow
          report={report}
          onClose={() => setMintOpen(false)}
          onSuccess={(res) => { setMintResult(res); setMintOpen(false) }}
        />
      )}

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <PrivaScanLogo size={20} />
        <a href="https://privascanxyz.vercel.app" target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: "#1e293b", textDecoration: "none", letterSpacing: "0.1em" }}>PRIVASCAN.XYZ ↗</a>
      </footer>
    </div>
  )
}
