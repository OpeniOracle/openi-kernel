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

import type { Grading } from './grading.js'

export interface EntityAttribute {
  label: string
  value: string
}

/** Full register record (ADR-005). All additions beyond EntityRef optional. */
export interface Entity extends EntityRef {
  aliases?: string[]
  description?: string
  attributes?: EntityAttribute[]
  gradings?: Grading
  extensions?: Record<string, unknown>
}

export interface Relationship {
  id: string
  source_id: string
  target_id: string
  label: string
  directed?: boolean
  gradings?: Grading
  extensions?: Record<string, unknown>
}

export function newEntity(init?: Partial<Entity>): Entity
export function validateEntity(entity: unknown): string[]
export function newRelationship(init?: Partial<Relationship>): Relationship
export function validateRelationship(rel: unknown): string[]
