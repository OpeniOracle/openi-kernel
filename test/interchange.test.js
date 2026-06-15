import { test } from 'node:test'
import assert from 'node:assert/strict'

import { confidence, gradedValue } from '../grading.js'
import { makeClaim, makeEvidenceRef, makeEntityRef } from '../claim.js'
import {
  BUNDLE_SCHEMA,
  makeBundle,
  serializeBundle,
  deserializeBundle,
  validateBundle,
} from '../interchange.js'

// Vocabulary definitions for the two app-specific schemes used below. These
// travel inside the bundle so a receiver can interpret them without hardcoding.
const LINKVIEW_VERIFICATION = {
  scheme: 'linkview.verification@1',
  axis: 'verification',
  ordinal: true,
  values: [
    { value: 'confirmed', label: 'Confirmed', order: 5 },
    { value: 'likely', label: 'Likely', order: 4 },
    { value: 'possible', label: 'Possible', order: 3 },
    { value: 'unconfirmed', label: 'Unconfirmed', order: 2 },
    { value: 'disputed', label: 'Disputed', order: 1 },
    { value: 'deconfliction_required', label: 'Deconfliction required', order: 0 },
  ],
}
const WAYPOINT_RANKING = {
  scheme: 'waypoint.lead_priority@1',
  axis: 'ranking',
  ordinal: true,
  values: [
    { value: 'strong', label: 'Strong lead', order: 2 },
    { value: 'worth_look', label: 'Worth a look', order: 1 },
    { value: 'weak', label: 'Weak', order: 0 },
  ],
}
const ADMIRALTY_RELIABILITY = {
  scheme: 'admiralty.reliability@1',
  axis: 'reliability',
  ordinal: true,
  values: [
    { value: 'A', label: 'Completely reliable', order: 5 },
    { value: 'B', label: 'Usually reliable', order: 4 },
    { value: 'C', label: 'Fairly reliable', order: 3 },
    { value: 'D', label: 'Not usually reliable', order: 2 },
    { value: 'E', label: 'Unreliable', order: 1 },
    { value: 'F', label: 'Cannot be judged', order: 0 },
  ],
}

function exampleBundle() {
  const subject = makeEntityRef({ id: 'ent-1', type: 'device', label: 'maid-1234', resolved: false })
  const claim = makeClaim({
    id: 'claim-1',
    subject,
    statement: 'Device returned on 5 distinct days with no resident/worker routine.',
    grading: {
      confidence: confidence('moderate'),
      // app axes — kept whole, never collapsed into low/moderate/high
      verification: gradedValue('linkview.verification@1', 'likely'),
      ranking: gradedValue('waypoint.lead_priority@1', 'worth_look'),
    },
    evidence: [
      makeEvidenceRef({
        id: 'ev-1',
        ref: 'waypoint:case-9:signal:keeps_returning:maid-1234',
        kind: 'observation',
        locator: 'keeps_returning',
        grading: { reliability: gradedValue('admiralty.reliability@1', 'C') },
      }),
    ],
    disposition: { scheme: 'waypoint.lead_disposition@1', value: 'pursuing' },
    authorship: { author: 'analyst', createdAt: '2026-06-15T00:00:00.000Z' },
    lineage: { partOf: 'case-9', emittedBy: 'waypoint' },
    createdAt: '2026-06-15T00:00:00.000Z',
  })
  return makeBundle({
    emittedBy: 'waypoint',
    emittedAt: '2026-06-15T00:00:00.000Z',
    vocabularies: [LINKVIEW_VERIFICATION, WAYPOINT_RANKING, ADMIRALTY_RELIABILITY],
    claims: [claim],
  })
}

test('makeBundle sets schema + defaults', () => {
  const b = makeBundle({})
  assert.equal(b.schemaVersion, BUNDLE_SCHEMA)
  assert.deepEqual(b.claims, [])
  assert.ok(b.emittedAt)
})

test('a valid example bundle validates clean', () => {
  assert.deepEqual(validateBundle(exampleBundle()), [])
})

test('round-trip serialize -> deserialize preserves the bundle exactly', () => {
  const original = exampleBundle()
  const json = serializeBundle(original)
  const restored = deserializeBundle(json)
  assert.deepEqual(restored, original)
  // and it is stable across a second pass
  assert.equal(serializeBundle(restored), json)
})

test('round-trip preserves the LinkView verification axis without collapsing it', () => {
  const restored = deserializeBundle(serializeBundle(exampleBundle()))
  assert.deepEqual(restored.claims[0].grading.verification, {
    scheme: 'linkview.verification@1',
    value: 'likely',
  })
  // confidence stays its own axis, untouched
  assert.deepEqual(restored.claims[0].grading.confidence, {
    scheme: 'openi.confidence@1',
    value: 'moderate',
  })
})

test('validateBundle flags an app scheme with no vocabulary definition', () => {
  const b = exampleBundle()
  b.vocabularies = [WAYPOINT_RANKING, ADMIRALTY_RELIABILITY] // drop only the LinkView verification def
  const errors = validateBundle(b)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /linkview\.verification@1/)
  assert.throws(() => serializeBundle(b), /not defined in bundle\.vocabularies/)
})

test('openi.confidence@1 never needs a vocabulary definition', () => {
  const b = makeBundle({
    emittedBy: 'briefbuilder',
    emittedAt: '2026-06-15T00:00:00.000Z',
    claims: [
      makeClaim({
        id: 'c2',
        statement: 'only kernel confidence used',
        grading: { confidence: confidence('high') },
        createdAt: '2026-06-15T00:00:00.000Z',
        authorship: { author: 'analyst', createdAt: '2026-06-15T00:00:00.000Z' },
      }),
    ],
  })
  assert.deepEqual(validateBundle(b), [])
})

test('validateBundle catches structural problems', () => {
  assert.deepEqual(validateBundle(null), ['bundle must be an object'])
  assert.ok(validateBundle({ schemaVersion: 'wrong', claims: [] }).some((e) => /schemaVersion/.test(e)))
  const badClaim = makeBundle({
    emittedBy: 'x',
    emittedAt: 't',
    claims: [{ schemaVersion: 'openi.claim@1', id: '', statement: '', grading: {}, evidence: [], authorship: { author: 'nope' }, createdAt: '' }],
  })
  const errs = validateBundle(badClaim)
  assert.ok(errs.some((e) => /claims\[0\]\.id/.test(e)))
  assert.ok(errs.some((e) => /claims\[0\]\.statement/.test(e)))
  assert.ok(errs.some((e) => /authorship\.author/.test(e)))
})

test('deserializeBundle rejects malformed JSON', () => {
  assert.throws(() => deserializeBundle('{not json'), /not valid JSON/)
})
