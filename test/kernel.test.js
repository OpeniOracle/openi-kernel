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
import { docToMarkdown, docToHtml, AI_CONTENT_DISCLAIMER } from '../export.js'
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
  assert.equal(parsed.kernel_version, '0.2.0')

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

test('tokens: palette, semantics, preset are consistent', () => {
  assert.equal(palette.navy[950], '#0a0f1c')
  assert.equal(semantic.accent, palette.signal.DEFAULT)
  assert.match(fontFamilies.sans, /^'Geist'/)
  assert.equal(preset.theme.extend.colors.accent.DEFAULT, palette.signal.DEFAULT)
  assert.equal(preset.theme.extend.fontFamily.sans[0], 'Geist')
  assert.equal(preset.theme.extend.colors.ai.DEFAULT, palette.signal.DEFAULT)
})
