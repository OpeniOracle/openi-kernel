import type { VocabOption } from './ontology.js'
import type { Grading } from './grading.js'
import type { EntityRef } from './entity.js'
import type { Authorship, Lineage } from './provenance.js'

export type ClaimDisposition =
  | 'open' | 'pursuing' | 'supported' | 'rejected' | 'escalated' | 'cleared'

export const CLAIM_DISPOSITIONS: VocabOption<ClaimDisposition>[]

export interface Claim {
  id: string
  statement: string
  gradings: Grading
  evidence_ids: string[]
  caveats: string[]
  disposition: ClaimDisposition
  authorship: Authorship
  created_at: string
  updated_at: string
  subject?: EntityRef
  recommended_action?: string
  notes?: string
  lineage?: Lineage
  /** App-local fields that must survive round-trips, namespaced by app. */
  extensions?: Record<string, unknown>
}

export function newClaim(init?: Partial<Claim>): Claim
export function validateClaim(claim: unknown): string[]
