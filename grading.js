// Multi-axis grading — the named axes that keep "how sure", "how much it
// matters", "how reliable is the source", and app-defined rankings from
// colliding on exchange (ADR-001 §3e, resolved by ADR-002).
//
// Kernel-defined axes:
//   confidence  — how sure (low | moderate | high), from ontology.js
//   severity    — how much it matters (low | medium | high | critical),
//                 harvested from BriefBuilder's risk_level
//   reliability — NATO Admiralty source reliability (A–F), from LinkView
//   credibility — NATO Admiralty information credibility (1–6), from LinkView
//
// App-defined axes (Waypoint lead priority, LinkView's 9-value verification
// taxonomy, …) stay app-local and travel as an explicit `ranking` with their
// axis name attached — they must never be silently mapped onto confidence.

import { CONFIDENCE_LEVELS } from './ontology.js'

export { CONFIDENCE_LEVELS }

export const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

// NATO Admiralty / APP-11 source reliability.
export const RELIABILITY_LEVELS = [
  { value: 'A', label: 'A — Completely reliable' },
  { value: 'B', label: 'B — Usually reliable' },
  { value: 'C', label: 'C — Fairly reliable' },
  { value: 'D', label: 'D — Not usually reliable' },
  { value: 'E', label: 'E — Unreliable' },
  { value: 'F', label: 'F — Reliability cannot be judged' },
]

// NATO Admiralty information credibility.
export const CREDIBILITY_LEVELS = [
  { value: 1, label: '1 — Confirmed by other sources' },
  { value: 2, label: '2 — Probably true' },
  { value: 3, label: '3 — Possibly true' },
  { value: 4, label: '4 — Doubtful' },
  { value: 5, label: '5 — Improbable' },
  { value: 6, label: '6 — Truth cannot be judged' },
]

const AXIS_VOCABS = {
  confidence: CONFIDENCE_LEVELS,
  severity: SEVERITY_LEVELS,
  reliability: RELIABILITY_LEVELS,
  credibility: CREDIBILITY_LEVELS,
}

export const GRADING_AXES = Object.keys(AXIS_VOCABS)

// Build a grading object. Only pass the axes that were actually assessed —
// absent axes stay absent (never defaulted, so "ungraded" survives exchange).
// `ranking` is the app-defined axis: { axis, value, label? }.
export function newGrading({ confidence, severity, reliability, credibility, ranking } = {}) {
  const grading = {}
  if (confidence !== undefined) grading.confidence = confidence
  if (severity !== undefined) grading.severity = severity
  if (reliability !== undefined) grading.reliability = reliability
  if (credibility !== undefined) grading.credibility = credibility
  if (ranking !== undefined) grading.ranking = ranking
  return grading
}

// Returns a list of human-readable problems; empty means valid.
export function validateGrading(grading) {
  const problems = []
  if (grading == null || typeof grading !== 'object') {
    return ['grading must be an object']
  }
  for (const axis of GRADING_AXES) {
    const value = grading[axis]
    if (value === undefined) continue
    if (!AXIS_VOCABS[axis].some((o) => o.value === value)) {
      problems.push(`grading.${axis}: unknown value ${JSON.stringify(value)}`)
    }
  }
  if (grading.ranking !== undefined) {
    const r = grading.ranking
    if (r == null || typeof r !== 'object' || !r.axis || r.value === undefined) {
      problems.push('grading.ranking must be { axis, value } when present')
    } else if (GRADING_AXES.includes(r.axis)) {
      problems.push(`grading.ranking.axis must not shadow the kernel axis "${r.axis}"`)
    }
  }
  return problems
}

// Admiralty shorthand, e.g. gradingCode({reliability:'C', credibility:3}) → 'C3'.
export function gradingCode(grading) {
  if (!grading) return ''
  const r = grading.reliability ?? ''
  const c = grading.credibility ?? ''
  return `${r}${c}`
}
