import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CLAIM_SCHEMA, makeClaim, makeEvidenceRef, makeEntityRef } from '../claim.js'
import { confidence } from '../grading.js'

test('makeClaim fills id/schemaVersion/timestamps and defaults', () => {
  const c = makeClaim({ statement: 'Device was present during the event window.' })
  assert.equal(c.schemaVersion, CLAIM_SCHEMA)
  assert.equal(typeof c.id, 'string')
  assert.ok(c.id.length > 0)
  assert.equal(c.statement, 'Device was present during the event window.')
  assert.deepEqual(c.grading, {})
  assert.deepEqual(c.evidence, [])
  assert.deepEqual(c.authorship, { author: 'analyst', createdAt: c.createdAt })
  assert.equal(typeof c.createdAt, 'string')
})

test('makeClaim passes through provided fields and does not invent optionals', () => {
  const c = makeClaim({
    statement: 'X',
    grading: { confidence: confidence('high') },
    caveats: 'rural data is sparse',
  })
  assert.deepEqual(c.grading, { confidence: { scheme: 'openi.confidence@1', value: 'high' } })
  assert.equal(c.caveats, 'rural data is sparse')
  assert.equal('detail' in c, false)
  assert.equal('disposition' in c, false)
})

test('makeClaim requires a non-empty statement', () => {
  assert.throws(() => makeClaim({}), /statement/)
  assert.throws(() => makeClaim({ statement: '   ' }), /statement/)
})

test('makeClaim does not mutate its input', () => {
  const input = { statement: 'X' }
  makeClaim(input)
  assert.deepEqual(input, { statement: 'X' })
})

test('makeEvidenceRef requires ref and kind', () => {
  const e = makeEvidenceRef({ ref: 'evidence:abc', kind: 'observation', locator: 'critical_time' })
  assert.equal(e.ref, 'evidence:abc')
  assert.equal(e.kind, 'observation')
  assert.equal(e.locator, 'critical_time')
  assert.ok(e.id)
  assert.throws(() => makeEvidenceRef({ kind: 'note' }), /ref/)
  assert.throws(() => makeEvidenceRef({ ref: 'x' }), /kind/)
})

test('makeEntityRef requires type and label', () => {
  const r = makeEntityRef({ type: 'device', label: 'maid-1234' })
  assert.equal(r.type, 'device')
  assert.equal(r.label, 'maid-1234')
  assert.ok(r.id)
  assert.throws(() => makeEntityRef({ label: 'x' }), /type/)
  assert.throws(() => makeEntityRef({ type: 'person' }), /label/)
})
