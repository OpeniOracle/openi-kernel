import { test } from 'node:test'
import assert from 'node:assert/strict'

import { newId, nowIso } from '../ids.js'
import { CONFIDENCE_LEVELS, labelFor } from '../ontology.js'
import {
  SEVERITY_LEVELS, RELIABILITY_LEVELS, CREDIBILITY_LEVELS,
  newGrading, validateGrading, gradingCode,
} from '../grading.js'
import { ENTITY_TYPES, newEntityRef, validateEntityRef } from '../entity.js'
import { newEvidenceRef, validateEvidenceRef } from '../evidence.js'
import { newClaim, validateClaim } from '../claim.js'
import { newAuthorship, validateAuthorship, GENERATION_SOURCES } from '../provenance.js'
import {
  buildCasePacket, serializeCasePacket, parseCasePacket,
  summarizeCasePacket, casePacketFilename,
} from '../casepacket.js'
import { escapeHtml, csvEscape, csvRow, toCsv, slugify } from '../format.js'
import { KERNEL_VERSION } from '../version.js'
import { docToMarkdown, docToHtml, gradingLegendSection, AI_CONTENT_DISCLAIMER } from '../export.js'
import { palette, semantic, fontFamilies } from '../tokens.js'
import preset from '../tailwind-preset.js'

test('ids: newId is unique and nowIso is ISO-8601', () => {
  assert.notEqual(newId(), newId())
  assert.match(nowIso(), /^\d{4}-\d{2}-\d{2}T/)
})

test('ontology: confidence scale unchanged (Phase A contract)', () => {
  assert.deepEqual(CONFIDENCE_LEVELS.map((o) => o.value), ['low', 'moderate', 'high'])
  assert.equal(labelFor(CONFIDENCE_LEVELS, 'moderate'), 'Moderate')
  assert.equal(labelFor(CONFIDENCE_LEVELS, 'missing'), 'missing')
})

test('grading: axes validate independently and never collapse', () => {
  assert.deepEqual(SEVERITY_LEVELS.map((o) => o.value), ['low', 'medium', 'high', 'critical'])
  assert.equal(RELIABILITY_LEVELS.length, 6)
  assert.equal(CREDIBILITY_LEVELS.length, 6)

  const g = newGrading({ confidence: 'high', severity: 'critical', reliability: 'B', credibility: 2 })
  assert.deepEqual(validateGrading(g), [])
  assert.equal(gradingCode(g), 'B2')

  assert.equal(validateGrading({ confidence: 'medium' }).length, 1, 'medium is severity vocab, not confidence')
  assert.equal(validateGrading({ severity: 'moderate' }).length, 1, 'moderate is confidence vocab, not severity')

  const ranked = newGrading({ ranking: { axis: 'waypoint.priority', value: 'strong' } })
  assert.deepEqual(validateGrading(ranked), [])
  assert.equal(validateGrading({ ranking: { axis: 'confidence', value: 'x' } }).length, 1,
    'ranking must not shadow kernel axes')
})

test('grading: absent axes stay absent', () => {
  const g = newGrading({ confidence: 'low' })
  assert.deepEqual(Object.keys(g), ['confidence'])
})

test('entity: refs validate type and identifiers', () => {
  assert.ok(ENTITY_TYPES.some((o) => o.value === 'person'))
  const ref = newEntityRef({ type: 'asset', label: 'Device ab12', identifiers: [{ scheme: 'waypoint.device_id', value: 'ab12' }] })
  assert.ok(ref.id)
  assert.deepEqual(validateEntityRef(ref), [])
  assert.equal(validateEntityRef({ id: 'x', type: 'starship' }).length, 1)
  assert.equal(validateEntityRef({ id: 'x', type: 'person', identifiers: [{}] }).length, 1)
})

test('evidence: hash requires algorithm', () => {
  const ev = newEvidenceRef({ kind: 'url', label: 'Post', locator: 'https://example.com' })
  assert.deepEqual(validateEvidenceRef(ev), [])
  assert.ok(ev.captured_at)
  const bad = newEvidenceRef({ kind: 'file', hash: 'abc123' })
  assert.equal(validateEvidenceRef(bad).length, 1)
})

test('provenance: authorship defaults to analyst_written', () => {
  const stamp = newAuthorship()
  assert.equal(stamp.generation_source, 'analyst_written')
  assert.deepEqual(validateAuthorship(stamp), [])
  assert.equal(validateAuthorship({ generation_source: 'robot' }).length, 1)
  assert.equal(GENERATION_SOURCES.length, 3)
})

test('claim: validates statement, gradings, subject, disposition', () => {
  const claim = newClaim({
    statement: 'Device ab12 kept returning after the event window.',
    subject: newEntityRef({ type: 'asset', label: 'ab12' }),
    gradings: newGrading({ confidence: 'moderate', ranking: { axis: 'waypoint.priority', value: 'strong' } }),
    evidence_ids: ['ev-1'],
    caveats: ['Coverage is bidstream-heavy overnight'],
    disposition: 'escalated',
  })
  assert.deepEqual(validateClaim(claim), [])
  assert.ok(claim.created_at && claim.updated_at)

  assert.ok(validateClaim({ id: 'x' }).length >= 1)
  assert.ok(validateClaim(newClaim({ statement: 'ok', disposition: 'bogus' })).length === 1)
})

test('casepacket: build → serialize → parse round-trip', () => {
  const ev = newEvidenceRef({ kind: 'observation', label: 'Signal: critical-time presence' })
  const claim = newClaim({ statement: 'Test claim', evidence_ids: [ev.id] })
  const packet = buildCasePacket({
    producer: { app: 'waypoint', app_version: '0.1.0' },
    caseInfo: { id: 'case-1', title: 'Pier 7 warehouse', analyst: 'analyst@example.org' },
    evidence: [ev],
    claims: [claim],
  })
  const { ok, packet: parsed, problems } = parseCasePacket(serializeCasePacket(packet))
  assert.deepEqual(problems, [])
  assert.equal(ok, true)
  assert.equal(parsed.case.title, 'Pier 7 warehouse')
  assert.equal(parsed.kernel_version, KERNEL_VERSION)

  const summary = summarizeCasePacket(parsed)
  assert.equal(summary.claims, 1)
  assert.equal(summary.producer, 'waypoint')
})

test('casepacket: rejects bad input without throwing', () => {
  assert.equal(parseCasePacket('not json').ok, false)
  assert.equal(parseCasePacket('{"format":"other"}').ok, false)
  const dangling = buildCasePacket({
    producer: { app: 'test' },
    caseInfo: { title: 'T' },
    claims: [newClaim({ statement: 'x', evidence_ids: ['missing-ev'] })],
  })
  const res = parseCasePacket(serializeCasePacket(dangling))
  assert.equal(res.ok, false)
  assert.ok(res.problems.some((p) => p.includes('missing evidence')))
})

test('casepacket: filename is slug-safe', () => {
  assert.equal(casePacketFilename('Pier 7 / Warehouse!'), 'pier-7-warehouse.openi-case.json')
  assert.equal(casePacketFilename(''), 'case.openi-case.json')
})

test('format: escaping and CSV safety', () => {
  assert.equal(escapeHtml(`<img src=x onerror='x'>&"`), '&lt;img src=x onerror=&#39;x&#39;&gt;&amp;&quot;')
  assert.equal(csvEscape('=cmd()'), "'=cmd()")
  assert.equal(csvEscape('a,"b"'), '"a,""b"""')
  assert.equal(csvRow(['a', 'b,c']), 'a,"b,c"')
  assert.equal(toCsv([['1', '2']], ['x', 'y']), 'x,y\n1,2\n')
  assert.equal(slugify('Überblick — Q3!'), 'uberblick-q3')
})

test('export: markdown includes disclaimer and sections', () => {
  const md = docToMarkdown({
    title: 'Exposure Brief',
    sensitivity: 'Confidential',
    has_ai_content: true,
    meta: [{ label: 'Client', value: 'Acme' }],
    sections: [
      { heading: 'Findings', paragraphs: ['One.'], list: ['a', 'b'] },
      { heading: 'Evidence', table: { headers: ['Ref', 'Label'], rows: [['1', 'Post']] } },
    ],
  })
  assert.match(md, /^# Exposure Brief/)
  assert.ok(md.includes(AI_CONTENT_DISCLAIMER))
  assert.ok(md.includes('**Sensitivity:** Confidential'))
  assert.ok(md.includes('| Ref | Label |'))
})

test('export: html is escaped and self-contained', () => {
  const html = docToHtml({
    title: '<script>alert(1)</script>',
    sections: [{ heading: 'H', paragraphs: ['<b>not bold</b>'] }],
  })
  assert.ok(!html.includes('<script>alert'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('&lt;b&gt;not bold&lt;/b&gt;'))
  assert.ok(html.includes('@media print'))
  assert.ok(!/src=|href=|url\(/.test(html), 'no external asset references')
})

test('export: does not mutate the caller doc model', () => {
  const doc = { title: 'T', sensitivity: 'Internal', meta: [{ label: 'A', value: '1' }], sections: [] }
  docToMarkdown(doc)
  docToHtml(doc)
  assert.equal(doc.meta.length, 1)
})

test('tokens: action/signal roles are distinct and preset maps them (ADR-004)', () => {
  assert.equal(palette.navy[950], '#0a0f1c')
  assert.equal(palette.action.DEFAULT, '#3b82f6')
  assert.notEqual(palette.action.DEFAULT, palette.signal.DEFAULT)
  assert.equal(semantic.action, palette.action.DEFAULT)
  assert.equal(semantic.signal, palette.signal.DEFAULT)
  assert.equal(semantic.accent, palette.signal.DEFAULT, 'legacy alias keeps amber for data consumers')
  assert.match(fontFamilies.sans, /^'Geist'/)
  assert.equal(preset.theme.extend.colors.accent.DEFAULT, palette.action.DEFAULT, 'accent utilities are the action color')
  assert.equal(preset.theme.extend.colors.action.DEFAULT, palette.action.DEFAULT)
  assert.equal(preset.theme.extend.colors.signal.DEFAULT, palette.signal.DEFAULT)
  assert.equal(preset.theme.extend.colors.ai.DEFAULT, palette.signal.DEFAULT)
  assert.equal(preset.theme.extend.fontFamily.sans[0], 'Geist')
})

test('export: paper theme previews as the printed document; legend + annex supported', () => {
  const legend = gradingLegendSection()
  assert.ok(legend.table.rows.length === 4)
  const html = docToHtml({
    title: 'Client Brief',
    document_id: 'OPI-2026-0042',
    prepared_for: 'Acme Corp',
    sections: [legend],
  }, { theme: 'paper' })
  assert.ok(html.includes('color-scheme: light'), 'paper theme renders light on screen')
  assert.ok(html.includes('OPI-2026-0042'))
  assert.ok(html.includes('Prepared for Acme Corp'))
  assert.ok(html.includes('class="annex"'))
  assert.ok(html.includes('@page'))
  const dark = docToHtml({ title: 'X', sections: [] })
  assert.ok(dark.includes('color-scheme: dark'), 'default stays the instrument look')
})

test('entity: full record and relationships validate; plain refs stay valid (ADR-005)', async () => {
  const { newEntity, validateEntity, newRelationship, validateRelationship } = await import('../entity.js')
  const org = newEntity({ type: 'organization', label: 'Meridian Freight Ltd', aliases: ['MFL'], description: 'Shell consignee', gradings: { ranking: { axis: 'linkview.verification', value: 'likely' } } })
  assert.deepEqual(validateEntity(org), [])
  assert.deepEqual(validateEntity(newEntityRef({ type: 'person', label: 'Plain ref' })), [], 'EntityRef remains a valid entity')
  assert.equal(validateEntity({ id: 'x', type: 'person', label: 'A', aliases: [1] }).length, 1)
  assert.equal(validateEntity({ id: 'x', type: 'person', label: 'A', attributes: [{}] }).length, 1)

  const rel = newRelationship({ source_id: org.id, target_id: 'e2', label: 'consignee of' })
  assert.deepEqual(validateRelationship(rel), [])
  assert.equal(validateRelationship({ id: 'r', source_id: '', target_id: 'b' }).length, 1)
})

test('casepacket: relationships are additive — absent valid, present must resolve (ADR-005)', async () => {
  const { newEntity, newRelationship } = await import('../entity.js')
  const a = newEntity({ type: 'person', label: 'Dana Voss' })
  const b = newEntity({ type: 'organization', label: 'Meridian Freight Ltd' })
  const packet = buildCasePacket({
    producer: { app: 'linkview' },
    caseInfo: { title: 'Register test' },
    entities: [a, b],
    relationships: [newRelationship({ source_id: a.id, target_id: b.id, label: 'director of' })],
  })
  const res = parseCasePacket(serializeCasePacket(packet))
  assert.deepEqual(res.problems, [])
  assert.equal(summarizeCasePacket(res.packet).relationships, 1)

  // pre-ADR-005 packet (no relationships key) stays valid
  const legacy = buildCasePacket({ producer: { app: 'waypoint' }, caseInfo: { title: 'Old' } })
  assert.equal('relationships' in legacy, false)
  assert.deepEqual(parseCasePacket(serializeCasePacket(legacy)).problems, [])

  // dangling edge fails loudly
  const bad = buildCasePacket({
    producer: { app: 'linkview' }, caseInfo: { title: 'Bad' }, entities: [a],
    relationships: [newRelationship({ source_id: a.id, target_id: 'ghost', label: 'x' })],
  })
  assert.ok(parseCasePacket(serializeCasePacket(bad)).problems.some((p) => p.includes('missing entity')))
})

test('export: entity annex renders register and label-resolved relationships', async () => {
  const { entityAnnexSections } = await import('../export.js')
  const { newEntity, newRelationship } = await import('../entity.js')
  const a = newEntity({ id: 'e-a', type: 'person', label: 'Dana Voss', aliases: ['D. Voss'] })
  const b = newEntity({ id: 'e-b', type: 'organization', label: 'Meridian Freight Ltd', description: 'Consignee' })
  const sections = entityAnnexSections([a, b], [newRelationship({ source_id: 'e-a', target_id: 'e-b', label: 'director of' })])
  assert.equal(sections.length, 2)
  assert.ok(sections.every((s) => s.annex))
  assert.deepEqual(sections[1].table.rows[0], ['Dana Voss', 'director of', 'Meridian Freight Ltd'])
  const html = docToHtml({ title: 'T', sections }, { theme: 'paper' })
  assert.ok(html.includes('Meridian Freight Ltd'))
  assert.deepEqual(entityAnnexSections([], []), [], 'no entities → no annex')
})
