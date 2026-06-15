// Openi Reasoning Kernel — the Claim envelope and its references (ADR-002, Phase C).
//
// A Claim is a graded, evidence-backed, provenance-stamped assertion. Brief
// Builder Finding, Waypoint Lead, and LinkView Finding are all profiles of it
// (ADR-002 §5). These are plain factory helpers — they fill ids/timestamps and
// validate the few required fields, then pass everything else through. They do
// NOT enforce app policy and they never mutate their input.

import { newId, nowIso } from './ids.js'

export const CLAIM_SCHEMA = 'openi.claim@1'

// Who/what produced a claim. Distinct from the grading axes.
export const AUTHOR_KINDS = Object.freeze(['analyst', 'ai', 'automated', 'imported'])

// Build a Claim. Only `statement` is required. `grading` defaults to {} (no
// axes), `evidence` to [], `authorship` to an analyst stamp.
export function makeClaim(input = {}) {
  if (!input || typeof input.statement !== 'string' || input.statement.trim() === '') {
    throw new TypeError('makeClaim: `statement` (non-empty string) is required')
  }
  const now = nowIso()
  const claim = {
    id: input.id || newId(),
    schemaVersion: CLAIM_SCHEMA,
    statement: input.statement,
    grading: input.grading || {},
    evidence: input.evidence || [],
    authorship: input.authorship || { author: 'analyst', createdAt: now },
    createdAt: input.createdAt || now,
  }
  // Optional pass-through fields, only when provided (keeps bundles tidy).
  if (input.subject !== undefined) claim.subject = input.subject
  if (input.subjects !== undefined) claim.subjects = input.subjects
  if (input.detail !== undefined) claim.detail = input.detail
  if (input.disposition !== undefined) claim.disposition = input.disposition
  if (input.lineage !== undefined) claim.lineage = input.lineage
  if (input.caveats !== undefined) claim.caveats = input.caveats
  if (input.recommendedAction !== undefined) claim.recommendedAction = input.recommendedAction
  if (input.notes !== undefined) claim.notes = input.notes
  if (input.tags !== undefined) claim.tags = input.tags
  if (input.appExtensions !== undefined) claim.appExtensions = input.appExtensions
  if (input.updatedAt !== undefined) claim.updatedAt = input.updatedAt
  return claim
}

// Build an EvidenceReference: a stable, addressable pointer to a backing record.
export function makeEvidenceRef(input = {}) {
  if (!input || typeof input.ref !== 'string' || input.ref === '') {
    throw new TypeError('makeEvidenceRef: `ref` (non-empty string) is required')
  }
  if (typeof input.kind !== 'string' || input.kind === '') {
    throw new TypeError('makeEvidenceRef: `kind` (non-empty string) is required')
  }
  const e = { id: input.id || newId(), ref: input.ref, kind: input.kind }
  if (input.label !== undefined) e.label = input.label
  if (input.locator !== undefined) e.locator = input.locator
  if (input.source !== undefined) e.source = input.source
  if (input.grading !== undefined) e.grading = input.grading
  if (input.capturedAt !== undefined) e.capturedAt = input.capturedAt
  return e
}

// Build a minimal EntityReference (the Claim subject). The full Entity primitive
// and human-gated resolution are Phase E (ADR-001 §7.5); here it is a reference.
export function makeEntityRef(input = {}) {
  if (!input || typeof input.type !== 'string' || input.type === '') {
    throw new TypeError('makeEntityRef: `type` (non-empty string) is required')
  }
  if (typeof input.label !== 'string' || input.label === '') {
    throw new TypeError('makeEntityRef: `label` (non-empty string) is required')
  }
  const ref = { id: input.id || newId(), type: input.type, label: input.label }
  if (input.resolved !== undefined) ref.resolved = input.resolved
  return ref
}
