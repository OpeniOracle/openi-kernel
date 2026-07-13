// Entity — the canonical "who/what is this about" primitive (ADR-001 §3f,
// ADR-005). Two tiers:
//   EntityRef — the minimal pointer used as a claim subject (Phase A of the
//               entity design, unchanged since ADR-002);
//   Entity    — the full register record (ADR-005, Phase C): an EntityRef
//               plus optional aliases, description, display attributes, and
//               gradings — everything a client-document entity annex needs.
// All Entity additions are OPTIONAL, so packets that carry plain EntityRefs
// remain valid casepacket v1 (additive-only policy).
//
// The type vocabulary is adopted from LinkView's entity_type enum (the only
// production entity model in the suite); Waypoint devices travel as `asset`,
// HashLens selectors as `account`.

import { newId } from './ids.js'
import { validateGrading } from './grading.js'

export const ENTITY_TYPES = [
  { value: 'person', label: 'Person' },
  { value: 'organization', label: 'Organization' },
  { value: 'location', label: 'Location' },
  { value: 'account', label: 'Account' },
  { value: 'asset', label: 'Asset' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
]

// A reference, not a resolved identity: resolution stays human-gated and
// app-side (ADR-001 §6). `identifiers` carries app-native selectors, e.g.
// [{ scheme: 'waypoint.device_id', value: 'ab12…' }].
export function newEntityRef({ id, type = 'other', label, identifiers } = {}) {
  const ref = {
    id: id || newId(),
    type,
    label: label || '',
  }
  if (identifiers !== undefined) ref.identifiers = identifiers
  return ref
}

// Full entity register record (ADR-005). Only assessed/known fields are set —
// absent stays absent, mirroring gradings.
export function newEntity({ id, type = 'other', label, identifiers, aliases, description, attributes, gradings, extensions } = {}) {
  const entity = newEntityRef({ id, type, label, identifiers })
  if (aliases !== undefined) entity.aliases = aliases
  if (description !== undefined) entity.description = description
  if (attributes !== undefined) entity.attributes = attributes
  if (gradings !== undefined) entity.gradings = gradings
  if (extensions !== undefined) entity.extensions = extensions
  return entity
}

export function validateEntity(entity) {
  const problems = validateEntityRef(entity)
  if (problems.length && typeof entity !== 'object') return problems
  if (entity?.aliases !== undefined) {
    if (!Array.isArray(entity.aliases) || entity.aliases.some((a) => typeof a !== 'string')) {
      problems.push('entity.aliases must be an array of strings when present')
    }
  }
  if (entity?.attributes !== undefined) {
    if (!Array.isArray(entity.attributes)) {
      problems.push('entity.attributes must be an array when present')
    } else {
      for (const [i, attr] of entity.attributes.entries()) {
        if (attr == null || typeof attr !== 'object' || !attr.label || attr.value === undefined) {
          problems.push(`entity.attributes[${i}] must be { label, value }`)
        }
      }
    }
  }
  if (entity?.gradings !== undefined) {
    problems.push(...validateGrading(entity.gradings).map((p) => `entity.${p}`))
  }
  return problems
}

// Relationship between two entities in the same packet (ADR-005; optional,
// additive). Label-free graph semantics stay app-side — this is the portable
// register edge: source, target, and how to read the line.
export function newRelationship({ id, source_id, target_id, label, directed, gradings, extensions } = {}) {
  const rel = {
    id: id || newId(),
    source_id: source_id || '',
    target_id: target_id || '',
    label: label || '',
  }
  if (directed !== undefined) rel.directed = directed
  if (gradings !== undefined) rel.gradings = gradings
  if (extensions !== undefined) rel.extensions = extensions
  return rel
}

export function validateRelationship(rel) {
  const problems = []
  if (rel == null || typeof rel !== 'object') return ['relationship must be an object']
  if (!rel.id) problems.push('relationship.id is required')
  if (!rel.source_id) problems.push('relationship.source_id is required')
  if (!rel.target_id) problems.push('relationship.target_id is required')
  if (rel.gradings !== undefined) {
    problems.push(...validateGrading(rel.gradings).map((p) => `relationship.${p}`))
  }
  return problems
}

export function validateEntityRef(ref) {
  const problems = []
  if (ref == null || typeof ref !== 'object') return ['entity ref must be an object']
  if (!ref.id) problems.push('entity.id is required')
  if (!ENTITY_TYPES.some((o) => o.value === ref.type)) {
    problems.push(`entity.type: unknown value ${JSON.stringify(ref.type)}`)
  }
  if (ref.identifiers !== undefined) {
    if (!Array.isArray(ref.identifiers)) {
      problems.push('entity.identifiers must be an array when present')
    } else {
      for (const [i, ident] of ref.identifiers.entries()) {
        if (ident == null || typeof ident !== 'object' || !ident.scheme || ident.value === undefined) {
          problems.push(`entity.identifiers[${i}] must be { scheme, value }`)
        }
      }
    }
  }
  return problems
}
