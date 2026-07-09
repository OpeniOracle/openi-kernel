import type { VocabOption } from './ontology.js'

export type EvidenceKind = 'url' | 'file' | 'text' | 'dataset' | 'observation' | 'other'
export const EVIDENCE_KINDS: VocabOption<EvidenceKind>[]

export interface EvidenceCapture {
  method?: string
  collector?: string
  notes?: string
}

export interface EvidenceRef {
  id: string
  kind: EvidenceKind
  label: string
  captured_at: string
  locator?: string
  excerpt?: string
  hash?: string
  hash_algorithm?: string
  capture?: EvidenceCapture
}

export function newEvidenceRef(init?: Partial<EvidenceRef>): EvidenceRef
export function validateEvidenceRef(ref: unknown): string[]
