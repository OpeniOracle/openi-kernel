// Openi Reasoning Kernel — multi-axis Grading (ADR-002, Phase C).
//
// A grade is never a bare value. It is a self-describing GradedValue that
// carries the id+version of the vocabulary it came from, so the same label
// (e.g. "moderate", "high", "strong") can never be confused across axes or
// apps on interchange (ADR-001 §3e, ADR-002 §2).
//
// The kernel owns exactly ONE vocabulary: openi.confidence@1. Every other axis
// vocabulary (severity, verification, ranking, reliability, ...) stays
// app-defined and travels in the interchange bundle as a VocabularyDefinition.

import { CONFIDENCE_LEVELS } from './ontology.js'

// The reserved, kernel-known axis names. All are optional; an app populates only
// the axes it uses. Unknown axis names are permitted (Grading is extensible),
// but these five have defined cross-app meaning.
export const GRADING_AXES = Object.freeze([
  'confidence', // how sure we are
  'severity', // how much it matters
  'verification', // analytic / corroboration status
  'ranking', // app-defined pursuit ordering
  'reliability', // source grade (usually on evidence/source, not the claim)
])

// The single kernel-owned vocabulary. Its values mirror ontology CONFIDENCE_LEVELS
// (single source of truth) so there is no second copy of the confidence scale.
export const OPENI_CONFIDENCE_SCHEME = 'openi.confidence@1'

export const OPENI_CONFIDENCE_VOCAB = Object.freeze({
  scheme: OPENI_CONFIDENCE_SCHEME,
  axis: 'confidence',
  ordinal: true,
  values: CONFIDENCE_LEVELS.map((o, i) => ({ value: o.value, label: o.label, order: i })),
})

// Construct a self-describing graded value: { scheme, value, label? }.
export function gradedValue(scheme, value, label) {
  if (typeof scheme !== 'string' || scheme === '') {
    throw new TypeError('gradedValue: `scheme` must be a non-empty string')
  }
  if (value === undefined || value === null) {
    throw new TypeError('gradedValue: `value` is required')
  }
  const gv = { scheme, value }
  if (label !== undefined) gv.label = label
  return gv
}

// Convenience constructor for the kernel confidence axis.
export function confidence(value, label) {
  return gradedValue(OPENI_CONFIDENCE_SCHEME, value, label)
}
