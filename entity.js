// Entity reference — the canonical "who/what is this about" primitive that no
// app owned (ADR-001 §3f). The type vocabulary is adopted from LinkView's
// entity_type enum (the only production entity model in the suite); Waypoint
// devices travel as `asset`, HashLens selectors as `account`.

import { newId } from './ids.js'

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
