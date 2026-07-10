import type { Claim } from './claim.js'
import type { Entity, EntityRef, Relationship } from './entity.js'
import type { EvidenceRef } from './evidence.js'

export const CASE_PACKET_FORMAT: 'openi.casepacket'
export const CASE_PACKET_VERSION: 1

export interface CasePacketProducer {
  app: string
  app_version?: string
}

export interface CasePacketCase {
  id: string
  title: string
  summary?: string
  analyst?: string
  sensitivity?: string
  created_at?: string
}

export interface CasePacket {
  format: 'openi.casepacket'
  version: 1
  kernel_version: string
  produced_by: CasePacketProducer
  produced_at: string
  case: CasePacketCase
  entities: (EntityRef | Entity)[]
  relationships?: Relationship[]
  evidence: EvidenceRef[]
  claims: Claim[]
  notes: string[]
}

export interface CasePacketSummary {
  title: string
  producer: string
  produced_at: string
  entities: number
  evidence: number
  claims: number
  notes: number
  relationships: number
}

export function buildCasePacket(init: {
  producer: CasePacketProducer
  caseInfo: Partial<CasePacketCase> & { title?: string }
  entities?: (EntityRef | Entity)[]
  evidence?: EvidenceRef[]
  claims?: Claim[]
  notes?: string[]
  relationships?: Relationship[]
}): CasePacket

export function validateCasePacket(packet: unknown): string[]
export function serializeCasePacket(packet: CasePacket): string
export function parseCasePacket(json: string): {
  ok: boolean
  packet: CasePacket | null
  problems: string[]
}
export function summarizeCasePacket(packet: CasePacket): CasePacketSummary
export function casePacketFilename(title?: string): string
