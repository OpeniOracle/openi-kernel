import type { VocabOption } from './ontology.js'

export type GenerationSource = 'ai_generated' | 'analyst_edited' | 'analyst_written'
export type ReviewStatus = 'ai_suggested' | 'analyst_approved' | 'rejected'
export type LineageRel = 'derived_from' | 'supports' | 'produced_by'

export const GENERATION_SOURCES: VocabOption<GenerationSource>[]
export const REVIEW_STATUSES: VocabOption<ReviewStatus>[]
export const LINEAGE_RELS: VocabOption<LineageRel>[]

export interface Authorship {
  generation_source: GenerationSource
  created_at: string
  author?: string
  tool?: string
}

export interface LineageRef {
  rel: LineageRel
  ref: string
}

export interface Lineage {
  app: string
  case_id?: string
  refs: LineageRef[]
}

export function newAuthorship(init?: Partial<Authorship>): Authorship
export function validateAuthorship(stamp: unknown): string[]
export function newLineage(init?: Partial<Lineage>): Lineage
