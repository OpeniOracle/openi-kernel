// Provenance — the unified authorship stamp and lineage encoding
// (ADR-001 §3d/§4). One contract across the suite: the analyst is author of
// record; AI/automated output is always distinguishable and requires explicit
// review before it is treated as an analyst product.

import { nowIso } from './ids.js'

// Who/what produced this content. Harvested from BriefBuilder's
// GENERATION_SOURCES; Waypoint's analyst-vs-auto signal maps onto it
// (analyst manual promotion → analyst_written, question-lens → ai_generated).
export const GENERATION_SOURCES = [
  { value: 'ai_generated', label: 'AI-generated' },
  { value: 'analyst_edited', label: 'Analyst-edited' },
  { value: 'analyst_written', label: 'Analyst-written' },
]

// Review state of suggested content. From BriefBuilder's FINDING_STATUSES.
export const REVIEW_STATUSES = [
  { value: 'ai_suggested', label: 'AI-suggested' },
  { value: 'analyst_approved', label: 'Analyst-approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function newAuthorship({ generation_source = 'analyst_written', author, tool, created_at } = {}) {
  const stamp = {
    generation_source,
    created_at: created_at || nowIso(),
  }
  if (author !== undefined) stamp.author = author
  if (tool !== undefined) stamp.tool = tool
  return stamp
}

export function validateAuthorship(stamp) {
  const problems = []
  if (stamp == null || typeof stamp !== 'object') return ['authorship must be an object']
  if (!GENERATION_SOURCES.some((o) => o.value === stamp.generation_source)) {
    problems.push(`authorship.generation_source: unknown value ${JSON.stringify(stamp.generation_source)}`)
  }
  return problems
}

// Lineage — the traceable chain raw source → evidence → claim → product.
// A lineage is { app, case_id?, refs: [{ rel, ref }] } where rel names the
// relationship and ref is an id in the same packet or an app-native locator.
export const LINEAGE_RELS = [
  { value: 'derived_from', label: 'Derived from' },
  { value: 'supports', label: 'Supports' },
  { value: 'produced_by', label: 'Produced by' },
]

export function newLineage({ app, case_id, refs = [] } = {}) {
  const lineage = { app: app || '', refs }
  if (case_id !== undefined) lineage.case_id = case_id
  return lineage
}
