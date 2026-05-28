// Fetches the full private score report from PrivaScan backend.
// Used by the mint flow to get data before creating a CDR vault.

export interface SlitherFinding {
  check: string
  severity: string        // "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL"
  confidence: string
  description: string
  location: string
  is_custom: boolean
  remediation: string
}

export interface OwnershipFinding {
  finding_type: string
  detail: string
  risk_level: string
  remediation: string
}

export interface RemediationItem {
  priority: number
  finding_ref: string
  action: string
  effort: string
}

export interface PrivateScoreReport {
  // Public fields
  address: string
  chain: string
  chain_id: number
  composite_score: number
  grade: string
  grade_label: string
  scored_at: string
  sub_scores: Record<string, number | null>

  // Private additions
  slither_findings: SlitherFinding[]
  ownership_findings: OwnershipFinding[]
  remediation: RemediationItem[]

  // Metadata
  slither_finding_count: number
  slither_finding_high: number
  slither_finding_medium: number
  raw_findings_available: boolean
  source_verified: boolean
}

export async function fetchPrivateReport(
  chain: string,
  address: string
): Promise<PrivateScoreReport> {
  const base = process.env.NEXT_PUBLIC_PRIVASCAN_API
  const key = process.env.NEXT_PUBLIC_PRIVASCAN_API_KEY

  if (!base || !key) {
    throw new Error("PrivaScan API not configured — check .env.local")
  }

  const url = `${base}/score/${chain}/${address}/private`

  const res = await fetch(url, {
    headers: { "X-API-Key": key },
    // No cache — always fresh for private reports
    cache: "no-store",
  })

  if (res.status === 404) {
    throw new Error("Contract not found — score it on privascan.xyz first")
  }
  if (res.status === 429) {
    throw new Error("Rate limited — get a free API key at privascan.xyz")
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PrivaScan API error ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json()
}
