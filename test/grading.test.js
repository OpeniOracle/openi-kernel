import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CONFIDENCE_LEVELS } from '../ontology.js'
import {
  GRADING_AXES,
  OPENI_CONFIDENCE_SCHEME,
  OPENI_CONFIDENCE_VOCAB,
  gradedValue,
  confidence,
} from '../grading.js'

test('GRADING_AXES are the five reserved, kernel-known axis names', () => {
  assert.deepEqual(GRADING_AXES, ['confidence', 'severity', 'verification', 'ranking', 'reliability'])
})

test('openi.confidence@1 vocabulary mirrors ontology CONFIDENCE_LEVELS (single source)', () => {
  assert.equal(OPENI_CONFIDENCE_VOCAB.scheme, OPENI_CONFIDENCE_SCHEME)
  assert.equal(OPENI_CONFIDENCE_VOCAB.axis, 'confidence')
  assert.equal(OPENI_CONFIDENCE_VOCAB.ordinal, true)
  assert.deepEqual(
    OPENI_CONFIDENCE_VOCAB.values.map((v) => v.value),
    CONFIDENCE_LEVELS.map((v) => v.value),
  )
})

test('gradedValue is self-describing and carries an optional label', () => {
  assert.deepEqual(gradedValue('linkview.verification@1', 'confirmed'), {
    scheme: 'linkview.verification@1',
    value: 'confirmed',
  })
  assert.deepEqual(gradedValue('admiralty.reliability@1', 'B', 'Usually reliable'), {
    scheme: 'admiralty.reliability@1',
    value: 'B',
    label: 'Usually reliable',
  })
})

test('confidence() uses the kernel scheme', () => {
  assert.deepEqual(confidence('moderate'), { scheme: OPENI_CONFIDENCE_SCHEME, value: 'moderate' })
})

test('gradedValue rejects an empty scheme or missing value', () => {
  assert.throws(() => gradedValue('', 'x'), /scheme/)
  assert.throws(() => gradedValue('s', undefined), /value/)
  assert.throws(() => gradedValue('s', null), /value/)
})
