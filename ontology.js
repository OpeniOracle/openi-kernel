// Openi Reasoning Kernel — shared ontology primitives.
//
// Single source of truth for vocabulary primitives shared identically by every
// Openi application. Extracted per ADR-001 (docs/openi-reasoning-kernel.md),
// Phase A. App-specific vocabularies remain in each app's own constants module
// and may extend these; only primitives that are genuinely shared live here.

// Confidence — the one grading axis shared identically across apps
// (low | moderate | high). Deliberately distinct from app-specific grading axes
// such as BriefBuilder's risk_level or Waypoint's lead priority, which stay
// app-local (see ADR-001 §3e on keeping grading axes from colliding).
export const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
]

// Resolve a controlled-vocabulary value to its display label. Works on any
// [{ value, label }] vocabulary — kernel or app-specific.
export function labelFor(vocab, value) {
  const hit = vocab.find((o) => o.value === value)
  return hit ? hit.label : value
}
