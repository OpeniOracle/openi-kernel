import type { VocabOption } from './ontology.js'

export type EntityType =
  | 'person' | 'organization' | 'location' | 'account' | 'asset' | 'event' | 'other'

export const ENTITY_TYPES: VocabOption<EntityType>[]

export interface EntityIdentifier {
  /** App-namespaced scheme, e.g. "waypoint.device_id", "hashlens.selector". */
  scheme: string
  value: string
}

export interface EntityRef {
  id: string
  type: EntityType
  label: string
  identifiers?: EntityIdentifier[]
}

export function newEntityRef(init?: Partial<EntityRef>): EntityRef
export function validateEntityRef(ref: unknown): string[]
