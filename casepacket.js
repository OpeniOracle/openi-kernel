// Case packet — the portable interchange unit of the suite
// (`openi.casepacket` v1). A self-describing JSON envelope of case metadata,
// entities, evidence, and claims that any Openi app can export and any other
// can import without losing meaning (named grading axes, explicit provenance).
//
// File-based exchange by design: apps do not share auth or storage today, so
// the packet moves as a downloaded/uploaded `.openi-case.json` file.

import { nowIso } from './ids.js'
import { slugify } from './format.js'
import { KERNEL_VERSION } from './version.js'
import { validateClaim } from './claim.js'
import { validateEntityRef } from './entity.js'
import { validateEvidenceRef } from './evidence.js'

export const CASE_PACKET_FORMAT = 'openi.casepacket'
export const CASE_PACKET_VERSION = 1

export function buildCasePacket({
  producer,      // { app, app_version? }
  caseInfo,      // { id, title, summary?, analyst?, sensitivity?, created_at? }
  entities = [],
  evidence = [],
  claims = [],
  notes = [],
} = {}) {
  return {
    format: CASE_PACKET_FORMAT,
    version: CASE_PACKET_VERSION,
    kernel_version: KERNEL_VERSION,
    produced_by: {
      app: producer?.app || 'unknown',
      ...(producer?.app_version ? { app_version: producer.app_version } : {}),
    },
    produced_at: nowIso(),
    case: {
      id: caseInfo?.id || '',
      title: caseInfo?.title || 'Untitled case',
      ...(caseInfo?.summary !== undefined ? { summary: caseInfo.summary } : {}),
      ...(caseInfo?.analyst !== undefined ? { analyst: caseInfo.analyst } : {}),
      ...(caseInfo?.sensitivity !== undefined ? { sensitivity: caseInfo.sensitivity } : {}),
      ...(caseInfo?.created_at !== undefined ? { created_at: caseInfo.created_at } : {}),
    },
    entities,
    evidence,
    claims,
    notes,
  }
}

export function validateCasePacket(packet) {
  const problems = []
  if (packet == null || typeof packet !== 'object') return ['packet must be an object']
  if (packet.format !== CASE_PACKET_FORMAT) {
    problems.push(`packet.format must be "${CASE_PACKET_FORMAT}"`)
  }
  if (packet.version !== CASE_PACKET_VERSION) {
    problems.push(`packet.version ${JSON.stringify(packet.version)} is not supported (expected ${CASE_PACKET_VERSION})`)
  }
  if (!packet.case || typeof packet.case !== 'object' || !packet.case.title) {
    problems.push('packet.case.title is required')
  }
  for (const key of ['entities', 'evidence', 'claims', 'notes']) {
    if (!Array.isArray(packet[key])) problems.push(`packet.${key} must be an array`)
  }
  if (Array.isArray(packet.entities)) {
    packet.entities.forEach((e, i) =>
      problems.push(...validateEntityRef(e).map((p) => `packet.entities[${i}]: ${p}`)))
  }
  if (Array.isArray(packet.evidence)) {
    packet.evidence.forEach((e, i) =>
      problems.push(...validateEvidenceRef(e).map((p) => `packet.evidence[${i}]: ${p}`)))
  }
  if (Array.isArray(packet.claims)) {
    const evidenceIds = new Set((packet.evidence || []).map((e) => e.id))
    packet.claims.forEach((c, i) => {
      problems.push(...validateClaim(c).map((p) => `packet.claims[${i}]: ${p}`))
      for (const ref of c?.evidence_ids || []) {
        if (!evidenceIds.has(ref)) {
          problems.push(`packet.claims[${i}]: evidence_ids references missing evidence "${ref}"`)
        }
      }
    })
  }
  return problems
}

export function serializeCasePacket(packet) {
  return JSON.stringify(packet, null, 2)
}

// Never throws on malformed input — importers show `problems` inline.
export function parseCasePacket(json) {
  let packet
  try {
    packet = JSON.parse(json)
  } catch {
    return { ok: false, packet: null, problems: ['Not valid JSON'] }
  }
  const problems = validateCasePacket(packet)
  return { ok: problems.length === 0, packet, problems }
}

// Counts for import-preview UIs.
export function summarizeCasePacket(packet) {
  return {
    title: packet?.case?.title || '',
    producer: packet?.produced_by?.app || 'unknown',
    produced_at: packet?.produced_at || '',
    entities: packet?.entities?.length || 0,
    evidence: packet?.evidence?.length || 0,
    claims: packet?.claims?.length || 0,
    notes: packet?.notes?.length || 0,
  }
}

export function casePacketFilename(title) {
  return `${slugify(title, 'case')}.openi-case.json`
}
