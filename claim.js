// The Claim envelope — one graded, evidence-backed, provenance-stamped
// assertion. BriefBuilder Findings, Waypoint Leads, and HashLens matches are
// profiles of this envelope (ADR-001 §5); apps keep their local shapes and
// convert at the interchange boundary.

import { newId, nowIso } from './ids.js'
import { validateGrading } from './grading.js'
import { validateEntityRef } from './entity.js'
import { validateAuthorship, newAuthorship } from './provenance.js'

// Cross-app claim disposition — the analyst's working verdict on the claim.
// Reconciles BriefBuilder's approve/reject with Waypoint's pursue/clear
// vocabulary. Apps with richer local dispositions attach them via `extensions`.
export const CLAIM_DISPOSITIONS = [
  { value: 'open', label: 'Open' },
  { value: 'pursuing', label: 'Pursuing' },
  { value: 'supported', label: 'Supported' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'cleared', label: 'Cleared' },
]

export function newClaim({
  id,
  subject,
  statement,
  gradings,
  evidence_ids = [],
  caveats = [],
  recommended_action,
  authorship,
  disposition = 'open',
  notes,
  lineage,
  extensions,
  created_at,
  updated_at,
} = {}) {
  const claim = {
    id: id || newId(),
    statement: statement || '',
    gradings: gradings || {},
    evidence_ids,
    caveats,
    disposition,
    authorship: authorship || newAuthorship(),
    created_at: created_at || nowIso(),
    updated_at: updated_at || created_at || nowIso(),
  }
  if (subject !== undefined) claim.subject = subject
  if (recommended_action !== undefined) claim.recommended_action = recommended_action
  if (notes !== undefined) claim.notes = notes
  if (lineage !== undefined) claim.lineage = lineage
  if (extensions !== undefined) claim.extensions = extensions
  return claim
}

export function validateClaim(claim) {
  const problems = []
  if (claim == null || typeof claim !== 'object') return ['claim must be an object']
  if (!claim.id) problems.push('claim.id is required')
  if (!claim.statement || !String(claim.statement).trim()) problems.push('claim.statement is required')
  if (!Array.isArray(claim.evidence_ids)) problems.push('claim.evidence_ids must be an array')
  if (!Array.isArray(claim.caveats)) problems.push('claim.caveats must be an array')
  if (!CLAIM_DISPOSITIONS.some((o) => o.value === claim.disposition)) {
    problems.push(`claim.disposition: unknown value ${JSON.stringify(claim.disposition)}`)
  }
  problems.push(...validateGrading(claim.gradings || {}).map((p) => `claim.${p}`))
  if (claim.subject !== undefined) {
    problems.push(...validateEntityRef(claim.subject).map((p) => `claim.subject: ${p}`))
  }
  problems.push(...validateAuthorship(claim.authorship).map((p) => `claim.${p}`))
  return problems
}
