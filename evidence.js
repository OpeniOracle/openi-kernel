// Evidence reference — a stable, addressable pointer to supporting material,
// with the integrity fields HashLens's practice showed every app eventually
// needs (content hash + capture metadata). Generalizes BriefBuilder's
// evidence items and Waypoint's signals/observations (ADR-001 §4).

import { newId, nowIso } from './ids.js'

export const EVIDENCE_KINDS = [
  { value: 'url', label: 'URL / web capture' },
  { value: 'file', label: 'File / document' },
  { value: 'text', label: 'Text / note' },
  { value: 'dataset', label: 'Dataset / records' },
  { value: 'observation', label: 'Observation / signal' },
  { value: 'other', label: 'Other' },
]

// `locator` is where the artifact lives (URL, storage path, row selector).
// `hash`/`hash_algorithm` fingerprint the content when it was captured.
// `capture` records how it entered custody: { method, collector, notes }.
export function newEvidenceRef({
  id,
  kind = 'other',
  label,
  locator,
  excerpt,
  hash,
  hash_algorithm,
  captured_at,
  capture,
} = {}) {
  const ref = {
    id: id || newId(),
    kind,
    label: label || '',
    captured_at: captured_at || nowIso(),
  }
  if (locator !== undefined) ref.locator = locator
  if (excerpt !== undefined) ref.excerpt = excerpt
  if (hash !== undefined) ref.hash = hash
  if (hash_algorithm !== undefined) ref.hash_algorithm = hash_algorithm
  if (capture !== undefined) ref.capture = capture
  return ref
}

export function validateEvidenceRef(ref) {
  const problems = []
  if (ref == null || typeof ref !== 'object') return ['evidence ref must be an object']
  if (!ref.id) problems.push('evidence.id is required')
  if (!EVIDENCE_KINDS.some((o) => o.value === ref.kind)) {
    problems.push(`evidence.kind: unknown value ${JSON.stringify(ref.kind)}`)
  }
  if (ref.hash && !ref.hash_algorithm) {
    problems.push('evidence.hash_algorithm is required when hash is present')
  }
  return problems
}
