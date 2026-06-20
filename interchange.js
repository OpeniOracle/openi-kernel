// Openi Reasoning Kernel — lossless interchange bundle (ADR-002, Phase C).
//
// A bundle packages claims (+ optional entities/sources/evidence) together with
// the vocabulary definitions for every app-specific grading scheme they
// reference, so a receiver can interpret app axes (LinkView verification,
// Waypoint ranking, ...) without hardcoding them. The only scheme that needs no
// definition is the kernel's own openi.confidence@1.
//
// serialize/deserialize are pure JSON with a structural validation gate.
// validateBundle returns a (possibly empty) array of human-readable problems;
// it performs structural checks only — no app/semantic policy.

import { nowIso } from './ids.js'
import { OPENI_CONFIDENCE_SCHEME } from './grading.js'
import { CLAIM_SCHEMA, AUTHOR_KINDS } from './claim.js'

export const BUNDLE_SCHEMA = 'openi.bundle@1'

// Build a bundle with defaults. `claims` defaults to []; optional arrays are
// included only when provided.
export function makeBundle(input = {}) {
  const bundle = {
    schemaVersion: BUNDLE_SCHEMA,
    emittedBy: input.emittedBy || 'unknown',
    emittedAt: input.emittedAt || nowIso(),
    claims: input.claims || [],
  }
  if (input.vocabularies !== undefined) bundle.vocabularies = input.vocabularies
  if (input.entities !== undefined) bundle.entities = input.entities
  if (input.sources !== undefined) bundle.sources = input.sources
  if (input.evidence !== undefined) bundle.evidence = input.evidence
  return bundle
}

// Serialize to JSON. Throws if the bundle is structurally invalid.
export function serializeBundle(bundle, options = {}) {
  const { pretty = true } = options
  const errors = validateBundle(bundle)
  if (errors.length) {
    throw new Error('serializeBundle: invalid bundle:\n - ' + errors.join('\n - '))
  }
  return JSON.stringify(bundle, null, pretty ? 2 : 0)
}

// Parse + validate. Accepts a JSON string or an already-parsed object. Throws on
// malformed JSON or an invalid bundle.
export function deserializeBundle(json) {
  let obj
  if (typeof json === 'string') {
    try {
      obj = JSON.parse(json)
    } catch (e) {
      throw new Error('deserializeBundle: not valid JSON: ' + e.message)
    }
  } else {
    obj = json
  }
  const errors = validateBundle(obj)
  if (errors.length) {
    throw new Error('deserializeBundle: invalid bundle:\n - ' + errors.join('\n - '))
  }
  return obj
}

// Structural validation. Returns [] when valid.
export function validateBundle(bundle) {
  const errors = []
  if (!isPlainObject(bundle)) return ['bundle must be an object']

  if (bundle.schemaVersion !== BUNDLE_SCHEMA) {
    errors.push(`bundle.schemaVersion must be "${BUNDLE_SCHEMA}"`)
  }
  if (!isNonEmptyString(bundle.emittedBy)) errors.push('bundle.emittedBy must be a non-empty string')
  if (!isNonEmptyString(bundle.emittedAt)) errors.push('bundle.emittedAt must be a non-empty string')

  if (!Array.isArray(bundle.claims)) {
    errors.push('bundle.claims must be an array')
  } else {
    bundle.claims.forEach((c, i) => validateClaim(c, `claims[${i}]`, errors))
  }
  for (const key of ['vocabularies', 'entities', 'sources', 'evidence']) {
    if (bundle[key] !== undefined && !Array.isArray(bundle[key])) {
      errors.push(`bundle.${key} must be an array when present`)
    }
  }

  // Lossless interpretation: every grading scheme used (other than the kernel's
  // own) must be defined in bundle.vocabularies.
  const defined = new Set([OPENI_CONFIDENCE_SCHEME])
  if (Array.isArray(bundle.vocabularies)) {
    for (const v of bundle.vocabularies) {
      if (v && typeof v.scheme === 'string') defined.add(v.scheme)
    }
  }
  for (const { scheme, path } of collectGradingSchemes(bundle)) {
    if (!defined.has(scheme)) {
      errors.push(`${path} uses scheme "${scheme}" not defined in bundle.vocabularies`)
    }
  }

  return errors
}

// ── internals ────────────────────────────────────────────────────────────────

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}
function isNonEmptyString(v) {
  return typeof v === 'string' && v !== ''
}

function validateClaim(c, path, errors) {
  if (!isPlainObject(c)) {
    errors.push(`${path} must be an object`)
    return
  }
  if (c.schemaVersion !== CLAIM_SCHEMA) errors.push(`${path}.schemaVersion must be "${CLAIM_SCHEMA}"`)
  if (!isNonEmptyString(c.id)) errors.push(`${path}.id must be a non-empty string`)
  if (!isNonEmptyString(c.statement)) errors.push(`${path}.statement must be a non-empty string`)
  if (!isNonEmptyString(c.createdAt)) errors.push(`${path}.createdAt must be a non-empty string`)

  if (!isPlainObject(c.grading)) {
    errors.push(`${path}.grading must be an object`)
  } else {
    validateGrading(c.grading, `${path}.grading`, errors)
  }

  if (!Array.isArray(c.evidence)) {
    errors.push(`${path}.evidence must be an array`)
  } else {
    c.evidence.forEach((e, i) => validateEvidenceRef(e, `${path}.evidence[${i}]`, errors))
  }

  if (!isPlainObject(c.authorship)) {
    errors.push(`${path}.authorship must be an object`)
  } else if (!AUTHOR_KINDS.includes(c.authorship.author)) {
    errors.push(`${path}.authorship.author must be one of ${AUTHOR_KINDS.join('|')}`)
  }
}

function validateGrading(g, path, errors) {
  for (const [axis, gv] of Object.entries(g)) {
    if (gv === undefined) continue
    validateGradedValue(gv, `${path}.${axis}`, errors)
  }
}

function validateGradedValue(gv, path, errors) {
  if (!isPlainObject(gv)) {
    errors.push(`${path} must be an object`)
    return
  }
  if (!isNonEmptyString(gv.scheme)) errors.push(`${path}.scheme must be a non-empty string`)
  if (gv.value === undefined || gv.value === null) errors.push(`${path}.value is required`)
}

function validateEvidenceRef(e, path, errors) {
  if (!isPlainObject(e)) {
    errors.push(`${path} must be an object`)
    return
  }
  if (!isNonEmptyString(e.ref)) errors.push(`${path}.ref must be a non-empty string`)
  if (!isNonEmptyString(e.kind)) errors.push(`${path}.kind must be a non-empty string`)
  if (e.grading !== undefined) {
    if (!isPlainObject(e.grading)) errors.push(`${path}.grading must be an object`)
    else validateGrading(e.grading, `${path}.grading`, errors)
  }
  if (e.appExtensions !== undefined && !isPlainObject(e.appExtensions)) {
    errors.push(`${path}.appExtensions must be an object`)
  }
}

// Yield { scheme, path } for every GradedValue across the bundle's known grading
// locations: claim grading, claim-evidence grading (+ its source), and the
// optional top-level sources/evidence arrays.
function* collectGradingSchemes(bundle) {
  const claims = Array.isArray(bundle.claims) ? bundle.claims : []
  for (let i = 0; i < claims.length; i++) {
    const c = claims[i]
    if (!isPlainObject(c)) continue
    yield* gradingSchemesOf(c.grading, `claims[${i}].grading`)
    const ev = Array.isArray(c.evidence) ? c.evidence : []
    for (let j = 0; j < ev.length; j++) {
      yield* gradingSchemesOf(ev[j] && ev[j].grading, `claims[${i}].evidence[${j}].grading`)
      if (ev[j] && ev[j].source) {
        yield* gradingSchemesOf(ev[j].source.grading, `claims[${i}].evidence[${j}].source.grading`)
      }
    }
  }
  for (const key of ['sources', 'evidence']) {
    const arr = Array.isArray(bundle[key]) ? bundle[key] : []
    for (let i = 0; i < arr.length; i++) {
      yield* gradingSchemesOf(arr[i] && arr[i].grading, `${key}[${i}].grading`)
      if (key === 'evidence' && arr[i] && arr[i].source) {
        yield* gradingSchemesOf(arr[i].source.grading, `${key}[${i}].source.grading`)
      }
    }
  }
}

function* gradingSchemesOf(grading, path) {
  if (!isPlainObject(grading)) return
  for (const [axis, gv] of Object.entries(grading)) {
    if (gv && typeof gv === 'object' && typeof gv.scheme === 'string') {
      yield { scheme: gv.scheme, path: `${path}.${axis}` }
    }
  }
}
