// Openi Reasoning Kernel — linkview.profile@1 (ADR-005).
//
// An ADDITIVE, opt-in profile of openi.bundle@1. It changes NOTHING in the base
// bundle/claim/grading/evidence shapes or in validateBundle. It adds:
//   - registered linkview.* vocabularies (verification, reliability, credibility,
//     corroboration, deconfliction),
//   - a second validator (validateLinkviewProfile) for the LinkView-shaped
//     optional top-level fields (entities, relationships, sources, evidence,
//     evidenceLinks, case, timeline, deconflictions),
//   - referential-integrity + lossless-vocabulary checks extended to those fields.
//
// No LinkView algorithm lives here — only the contract shapes and validation.
// LinkView-specific extras ride in the profile fields or appExtensions.linkview.

import { validateBundle } from './interchange.js'
import { OPENI_CONFIDENCE_SCHEME } from './grading.js'

export const LINKVIEW_PROFILE_ID = 'linkview.profile@1'

// ── Vocabulary schemes ───────────────────────────────────────────────────────
export const LINKVIEW_VERIFICATION_SCHEME = 'linkview.verification@1'
export const LINKVIEW_RELIABILITY_SCHEME = 'linkview.reliability@1'
export const LINKVIEW_CREDIBILITY_SCHEME = 'linkview.credibility@1'
export const LINKVIEW_CORROBORATION_SCHEME = 'linkview.corroboration@1'
export const LINKVIEW_DECONFLICTION_SCHEME = 'linkview.deconfliction@1'

// LinkView's confidence_level enum carried VERBATIM on the `verification` axis.
// Never collapsed to openi.confidence@1 (ADR-001 Addendum A, ADR-005 §3).
export const LINKVIEW_VERIFICATION_VOCAB = Object.freeze({
  scheme: LINKVIEW_VERIFICATION_SCHEME,
  axis: 'verification',
  ordinal: true,
  values: [
    { value: 'deconfliction_required', label: 'Deconfliction required', order: 0 },
    { value: 'disputed', label: 'Disputed', order: 1 },
    { value: 'unconfirmed', label: 'Unconfirmed', order: 2 },
    { value: 'low', label: 'Low', order: 3 },
    { value: 'possible', label: 'Possible', order: 4 },
    { value: 'medium', label: 'Medium', order: 5 },
    { value: 'likely', label: 'Likely', order: 6 },
    { value: 'high', label: 'High', order: 7 },
    { value: 'confirmed', label: 'Confirmed', order: 8 },
  ],
})

// Admiralty source reliability A–F (independent of credibility).
export const LINKVIEW_RELIABILITY_VOCAB = Object.freeze({
  scheme: LINKVIEW_RELIABILITY_SCHEME,
  axis: 'reliability',
  ordinal: true,
  values: [
    { value: 'A', label: 'Completely reliable', order: 5 },
    { value: 'B', label: 'Usually reliable', order: 4 },
    { value: 'C', label: 'Fairly reliable', order: 3 },
    { value: 'D', label: 'Not usually reliable', order: 2 },
    { value: 'E', label: 'Unreliable', order: 1 },
    { value: 'F', label: 'Cannot be judged', order: 0 },
  ],
})

// Admiralty information credibility 1–6 (independent of reliability).
// NOTE: LinkView's `credibility` column has no DB CHECK; range is convention.
export const LINKVIEW_CREDIBILITY_VOCAB = Object.freeze({
  scheme: LINKVIEW_CREDIBILITY_SCHEME,
  axis: 'credibility',
  ordinal: true,
  values: [
    { value: 1, label: 'Confirmed', order: 6 },
    { value: 2, label: 'Probably true', order: 5 },
    { value: 3, label: 'Possibly true', order: 4 },
    { value: 4, label: 'Doubtful', order: 3 },
    { value: 5, label: 'Improbable', order: 2 },
    { value: 6, label: 'Cannot be judged', order: 1 },
  ],
})

// Numeric corroboration score 0–100 (the engine output). Carried ALONGSIDE the
// verification label — both survive. Numeric scheme: no enumerated value list.
export const LINKVIEW_CORROBORATION_VOCAB = Object.freeze({
  scheme: LINKVIEW_CORROBORATION_SCHEME,
  axis: 'corroboration',
  numeric: true,
  min: 0,
  max: 100,
  values: [],
})

// Deconfliction kinds (LinkView methodology output).
export const LINKVIEW_DECONFLICTION_VOCAB = Object.freeze({
  scheme: LINKVIEW_DECONFLICTION_SCHEME,
  axis: 'deconfliction',
  values: [
    { value: 'name_collision', label: 'Name collision' },
    { value: 'weak_attribution', label: 'Weak attribution' },
    { value: 'inferred_link', label: 'Inferred link' },
    { value: 'selector_ambiguous', label: 'Selector ambiguous' },
  ],
})

// Carried vocabulary for interpreting claim disposition (finding status). This
// is NOT a grading axis (axis name is informational only) — disposition is never
// subject to the grading lossless rule, so registering this does not affect
// grading validation. It travels so receivers can label draft/review/published.
export const LINKVIEW_FINDING_STATUS_SCHEME = 'linkview.finding_status@1'
export const LINKVIEW_FINDING_STATUS_VOCAB = Object.freeze({
  scheme: LINKVIEW_FINDING_STATUS_SCHEME,
  axis: 'disposition',
  values: [
    { value: 'draft', label: 'Draft', order: 0 },
    { value: 'review', label: 'Review', order: 1 },
    { value: 'published', label: 'Published', order: 2 },
  ],
})

// The full set an emitter should attach to bundle.vocabularies.
export function linkviewVocabularies() {
  return [
    LINKVIEW_VERIFICATION_VOCAB,
    LINKVIEW_RELIABILITY_VOCAB,
    LINKVIEW_CREDIBILITY_VOCAB,
    LINKVIEW_CORROBORATION_VOCAB,
    LINKVIEW_DECONFLICTION_VOCAB,
    LINKVIEW_FINDING_STATUS_VOCAB,
  ]
}

// Is the LinkView profile declared on this bundle?
export function hasLinkviewProfile(bundle) {
  return Boolean(
    bundle &&
      isPlainObject(bundle.profiles) &&
      Object.prototype.hasOwnProperty.call(bundle.profiles, LINKVIEW_PROFILE_ID),
  )
}

const DECONFLICTION_REF_TYPES = new Set(['entity', 'relationship', 'finding', 'claim'])

// Validate a bundle that declares linkview.profile@1. Always runs base
// validateBundle first; profile checks run only when the profile is declared
// (so a base Waypoint/BriefBuilder bundle returns base errors only). Returns a
// (possibly empty) array of human-readable problems.
export function validateLinkviewProfile(bundle) {
  const errors = validateBundle(bundle)
  if (!isPlainObject(bundle)) return errors
  if (!hasLinkviewProfile(bundle)) return errors // not a LinkView bundle: base-only

  // Optional arrays, when present, must be arrays.
  for (const key of ['entities', 'relationships', 'sources', 'evidence', 'evidenceLinks', 'timeline', 'deconflictions']) {
    if (bundle[key] !== undefined && !Array.isArray(bundle[key])) {
      errors.push(`bundle.${key} must be an array when present`)
    }
  }
  if (bundle.case !== undefined && !isPlainObject(bundle.case)) {
    errors.push('bundle.case must be an object when present')
  }

  const ids = collectIds(bundle)

  // Entities
  for (const [i, e] of arr(bundle.entities).entries()) {
    const path = `entities[${i}]`
    if (!isPlainObject(e)) { errors.push(`${path} must be an object`); continue }
    reqStr(e.id, `${path}.id`, errors)
    reqStr(e.type, `${path}.type`, errors)
    reqStr(e.label, `${path}.label`, errors)
    if (e.aliases !== undefined && !isStrArray(e.aliases)) errors.push(`${path}.aliases must be a string[]`)
    if (e.identifiers !== undefined) {
      if (!Array.isArray(e.identifiers)) errors.push(`${path}.identifiers must be an array`)
      else e.identifiers.forEach((id, j) => {
        if (!isPlainObject(id) || !isNonEmptyString(id.kind) || id.value === undefined)
          errors.push(`${path}.identifiers[${j}] must be { kind, value }`)
      })
    }
    validateGradingShape(e.grading, `${path}.grading`, errors)
  }

  // Relationships (the graph edge): from/to must resolve to an entity ref id.
  for (const [i, r] of arr(bundle.relationships).entries()) {
    const path = `relationships[${i}]`
    if (!isPlainObject(r)) { errors.push(`${path} must be an object`); continue }
    reqStr(r.id, `${path}.id`, errors)
    reqStr(r.type, `${path}.type`, errors)
    reqStr(r.from, `${path}.from`, errors)
    reqStr(r.to, `${path}.to`, errors)
    if (isNonEmptyString(r.from) && !ids.entityRefIds.has(r.from)) errors.push(`${path}.from "${r.from}" does not resolve to an entity (or claim subject)`)
    if (isNonEmptyString(r.to) && !ids.entityRefIds.has(r.to)) errors.push(`${path}.to "${r.to}" does not resolve to an entity (or claim subject)`)
    if (r.directed !== undefined && typeof r.directed !== 'boolean') errors.push(`${path}.directed must be a boolean`)
    if (r.strength !== undefined && typeof r.strength !== 'number') errors.push(`${path}.strength must be a number`)
    validateGradingShape(r.grading, `${path}.grading`, errors)
    if (r.evidence !== undefined && !Array.isArray(r.evidence)) errors.push(`${path}.evidence must be an array`)
  }

  // Sources
  for (const [i, s] of arr(bundle.sources).entries()) {
    const path = `sources[${i}]`
    if (!isPlainObject(s)) { errors.push(`${path} must be an object`); continue }
    reqStr(s.id, `${path}.id`, errors)
    validateGradingShape(s.grading, `${path}.grading`, errors)
  }

  // Top-level evidence[] are EvidenceReferences (id/ref/kind required; optional
  // appExtensions must be an object). Formalizes LinkView evidence carry-through.
  for (const [i, ev] of arr(bundle.evidence).entries()) {
    const path = `evidence[${i}]`
    if (!isPlainObject(ev)) { errors.push(`${path} must be an object`); continue }
    reqStr(ev.id, `${path}.id`, errors)
    reqStr(ev.ref, `${path}.ref`, errors)
    reqStr(ev.kind, `${path}.kind`, errors)
    validateGradingShape(ev.grading, `${path}.grading`, errors)
    if (ev.appExtensions !== undefined && !isPlainObject(ev.appExtensions)) {
      errors.push(`${path}.appExtensions must be an object`)
    }
  }

  // Timeline
  for (const [i, t] of arr(bundle.timeline).entries()) {
    const path = `timeline[${i}]`
    if (!isPlainObject(t)) { errors.push(`${path} must be an object`); continue }
    reqStr(t.id, `${path}.id`, errors)
    reqStr(t.occurredAt, `${path}.occurredAt`, errors)
    reqStr(t.title, `${path}.title`, errors)
    if (t.entityIds !== undefined && !isStrArray(t.entityIds)) errors.push(`${path}.entityIds must be a string[]`)
    if (t.evidenceIds !== undefined && !isStrArray(t.evidenceIds)) errors.push(`${path}.evidenceIds must be a string[]`)
    validateGradingShape(t.grading, `${path}.grading`, errors)
  }

  // EvidenceLinks: referential integrity into the bundle.
  for (const [i, l] of arr(bundle.evidenceLinks).entries()) {
    const path = `evidenceLinks[${i}]`
    if (!isPlainObject(l)) { errors.push(`${path} must be an object`); continue }
    reqStr(l.evidenceId, `${path}.evidenceId`, errors)
    if (isNonEmptyString(l.evidenceId) && !ids.evidenceIds.has(l.evidenceId)) errors.push(`${path}.evidenceId "${l.evidenceId}" does not resolve to evidence in the bundle`)
    if (l.entityId === undefined && l.relationshipId === undefined && l.findingId === undefined) {
      errors.push(`${path} must link to at least one of entityId/relationshipId/findingId`)
    }
    if (l.entityId !== undefined && !ids.entityRefIds.has(l.entityId)) errors.push(`${path}.entityId "${l.entityId}" does not resolve to an entity`)
    if (l.relationshipId !== undefined && !ids.relationshipIds.has(l.relationshipId)) errors.push(`${path}.relationshipId "${l.relationshipId}" does not resolve to a relationship`)
    if (l.findingId !== undefined && !ids.claimIds.has(l.findingId)) errors.push(`${path}.findingId "${l.findingId}" does not resolve to a claim/finding`)
  }

  // Case / investigation
  if (isPlainObject(bundle.case)) {
    reqStr(bundle.case.id, 'case.id', errors)
    reqStr(bundle.case.name, 'case.name', errors)
  }

  // Deconfliction results
  for (const [i, d] of arr(bundle.deconflictions).entries()) {
    const path = `deconflictions[${i}]`
    if (!isPlainObject(d)) { errors.push(`${path} must be an object`); continue }
    if (d.scheme !== LINKVIEW_DECONFLICTION_SCHEME) errors.push(`${path}.scheme must be "${LINKVIEW_DECONFLICTION_SCHEME}"`)
    reqStr(d.kind, `${path}.kind`, errors)
    if (d.severity !== 'warning' && d.severity !== 'critical') errors.push(`${path}.severity must be "warning" | "critical"`)
    reqStr(d.rationale, `${path}.rationale`, errors)
    if (!DECONFLICTION_REF_TYPES.has(d.refType)) errors.push(`${path}.refType must be one of ${[...DECONFLICTION_REF_TYPES].join('|')}`)
    reqStr(d.refId, `${path}.refId`, errors)
    if (isNonEmptyString(d.refType) && isNonEmptyString(d.refId) && !refResolves(d.refType, d.refId, ids)) {
      errors.push(`${path}.refId "${d.refId}" does not resolve to a ${d.refType} in the bundle`)
    }
  }

  // Extended lossless rule: every grading scheme used on the profile's graded
  // objects (other than openi.confidence@1) must be defined in bundle.vocabularies.
  const defined = new Set([OPENI_CONFIDENCE_SCHEME])
  for (const v of arr(bundle.vocabularies)) if (v && typeof v.scheme === 'string') defined.add(v.scheme)
  for (const { scheme, path } of profileGradingSchemes(bundle)) {
    if (!defined.has(scheme)) errors.push(`${path} uses scheme "${scheme}" not defined in bundle.vocabularies`)
  }

  return errors
}

// ── internals ────────────────────────────────────────────────────────────────

function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) }
function isNonEmptyString(v) { return typeof v === 'string' && v !== '' }
function isStrArray(v) { return Array.isArray(v) && v.every((x) => typeof x === 'string') }
function arr(v) { return Array.isArray(v) ? v : [] }
function reqStr(v, path, errors) { if (!isNonEmptyString(v)) errors.push(`${path} must be a non-empty string`) }

function validateGradingShape(g, path, errors) {
  if (g === undefined) return
  if (!isPlainObject(g)) { errors.push(`${path} must be an object`); return }
  for (const [axis, gv] of Object.entries(g)) {
    if (gv === undefined) continue
    if (!isPlainObject(gv)) { errors.push(`${path}.${axis} must be an object`); continue }
    if (!isNonEmptyString(gv.scheme)) errors.push(`${path}.${axis}.scheme must be a non-empty string`)
    if (gv.value === undefined || gv.value === null) errors.push(`${path}.${axis}.value is required`)
  }
}

function collectIds(bundle) {
  const entityRefIds = new Set()
  const relationshipIds = new Set()
  const claimIds = new Set()
  const evidenceIds = new Set()
  for (const e of arr(bundle.entities)) if (e && isNonEmptyString(e.id)) entityRefIds.add(e.id)
  for (const r of arr(bundle.relationships)) if (r && isNonEmptyString(r.id)) relationshipIds.add(r.id)
  for (const ev of arr(bundle.evidence)) if (ev && isNonEmptyString(ev.id)) evidenceIds.add(ev.id)
  for (const c of arr(bundle.claims)) {
    if (!isPlainObject(c)) continue
    if (isNonEmptyString(c.id)) claimIds.add(c.id)
    if (isPlainObject(c.subject) && isNonEmptyString(c.subject.id)) entityRefIds.add(c.subject.id)
    for (const s of arr(c.subjects)) if (isPlainObject(s) && isNonEmptyString(s.id)) entityRefIds.add(s.id)
    for (const ev of arr(c.evidence)) if (isPlainObject(ev) && isNonEmptyString(ev.id)) evidenceIds.add(ev.id)
  }
  for (const r of arr(bundle.relationships)) for (const ev of arr(r && r.evidence)) {
    if (isPlainObject(ev) && isNonEmptyString(ev.id)) evidenceIds.add(ev.id)
  }
  return { entityRefIds, relationshipIds, claimIds, evidenceIds }
}

function refResolves(refType, refId, ids) {
  if (refType === 'entity') return ids.entityRefIds.has(refId)
  if (refType === 'relationship') return ids.relationshipIds.has(refId)
  if (refType === 'finding' || refType === 'claim') return ids.claimIds.has(refId)
  return false
}

// Grading-bearing locations the profile adds (base already covers claim/evidence).
function* profileGradingSchemes(bundle) {
  const walk = function* (grading, path) {
    if (!isPlainObject(grading)) return
    for (const [axis, gv] of Object.entries(grading)) {
      if (gv && typeof gv === 'object' && typeof gv.scheme === 'string') yield { scheme: gv.scheme, path: `${path}.${axis}` }
    }
  }
  for (const [i, e] of arr(bundle.entities).entries()) yield* walk(e && e.grading, `entities[${i}].grading`)
  for (const [i, r] of arr(bundle.relationships).entries()) {
    yield* walk(r && r.grading, `relationships[${i}].grading`)
    for (const [j, ev] of arr(r && r.evidence).entries()) yield* walk(ev && ev.grading, `relationships[${i}].evidence[${j}].grading`)
  }
  for (const [i, s] of arr(bundle.sources).entries()) yield* walk(s && s.grading, `sources[${i}].grading`)
  for (const [i, t] of arr(bundle.timeline).entries()) yield* walk(t && t.grading, `timeline[${i}].grading`)
  for (const [i, ev] of arr(bundle.evidence).entries()) {
    yield* walk(ev && ev.grading, `evidence[${i}].grading`)
    if (ev && ev.source) yield* walk(ev.source.grading, `evidence[${i}].source.grading`)
  }
}
