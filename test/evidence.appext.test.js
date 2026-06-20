import { test } from 'node:test'
import assert from 'node:assert/strict'

import { makeClaim, makeEvidenceRef, makeEntityRef } from '../claim.js'
import { gradedValue, confidence } from '../grading.js'
import { makeBundle, serializeBundle, deserializeBundle, validateBundle } from '../interchange.js'
import {
  LINKVIEW_PROFILE_ID,
  LINKVIEW_VERIFICATION_SCHEME,
  LINKVIEW_FINDING_STATUS_SCHEME,
  LINKVIEW_FINDING_STATUS_VOCAB,
  linkviewVocabularies,
  validateLinkviewProfile,
} from '../interchange.profile.linkview.js'

// 1. appExtensions survives factory creation + bundle round-trip
test('makeEvidenceRef preserves appExtensions; survives round-trip', () => {
  const ev = makeEvidenceRef({
    ref: 'r', kind: 'document',
    appExtensions: { linkview: { body: 'excerpt', reliability: 'verified', tags: ['primary'] } },
  })
  assert.deepEqual(ev.appExtensions, { linkview: { body: 'excerpt', reliability: 'verified', tags: ['primary'] } })

  const b = makeBundle({
    emittedBy: 'x', emittedAt: 't',
    claims: [makeClaim({ id: 'c1', statement: 'S.', evidence: [ev], authorship: { author: 'analyst', createdAt: 't' }, createdAt: 't' })],
  })
  assert.deepEqual(validateBundle(b), [])
  const restored = deserializeBundle(serializeBundle(b))
  assert.deepEqual(restored.claims[0].evidence[0].appExtensions, ev.appExtensions)
})

// 2. invalid non-object appExtensions is rejected (claim evidence, base validator)
test('validateBundle rejects non-object appExtensions on claim evidence', () => {
  const b = makeBundle({
    emittedBy: 'x', emittedAt: 't',
    claims: [makeClaim({ id: 'c1', statement: 'S.', evidence: [{ id: 'e1', ref: 'r', kind: 'note', appExtensions: 'nope' }], authorship: { author: 'analyst', createdAt: 't' }, createdAt: 't' })],
  })
  assert.ok(validateBundle(b).some((e) => /evidence\[0\]\.appExtensions must be an object/.test(e)))
})

// 3. invalid non-object appExtensions is rejected (top-level evidence[], profile validator)
test('validateLinkviewProfile rejects non-object appExtensions on top-level evidence', () => {
  const b = makeBundle({ emittedBy: 'linkview', emittedAt: 't', vocabularies: linkviewVocabularies(),
    claims: [makeClaim({ id: 'c1', statement: 'S.', authorship: { author: 'analyst', createdAt: 't' }, createdAt: 't' })] })
  b.profiles = { [LINKVIEW_PROFILE_ID]: {} }
  b.evidence = [{ id: 'ev1', ref: 'linkview:evidence:ev1', kind: 'document', appExtensions: 7 }]
  assert.ok(validateLinkviewProfile(b).some((e) => /evidence\[0\]\.appExtensions must be an object/.test(e)))
})

// 4. a LinkView-style evidence reference validates with formal appExtensions (no undocumented extras)
test('LinkView evidence with formal appExtensions validates clean', () => {
  const b = makeBundle({ emittedBy: 'linkview', emittedAt: 't', vocabularies: linkviewVocabularies(),
    claims: [makeClaim({ id: 'f1', statement: 'Affiliated.', grading: { verification: gradedValue(LINKVIEW_VERIFICATION_SCHEME, 'confirmed') }, disposition: { scheme: LINKVIEW_FINDING_STATUS_SCHEME, value: 'review' }, authorship: { author: 'analyst', createdAt: 't' }, createdAt: 't' })] })
  b.profiles = { [LINKVIEW_PROFILE_ID]: {} }
  b.evidence = [
    makeEvidenceRef({
      id: 'ev1', ref: 'linkview:evidence:ev1', kind: 'document', label: 'Filing',
      grading: { verification: gradedValue(LINKVIEW_VERIFICATION_SCHEME, 'confirmed') },
      appExtensions: { linkview: { body: 'text', file_url: 'u', reliability: 'verified', internal_notes: 'x', client_notes: 'y', tags: ['primary'] } },
    }),
  ]
  assert.deepEqual(validateLinkviewProfile(b), [])
})

// 5. existing Waypoint and Brief Builder style base bundles remain valid unchanged
test('Waypoint-style and BriefBuilder-style base bundles remain valid (no appExtensions on evidence)', () => {
  const waypoint = makeBundle({
    emittedBy: 'waypoint', emittedAt: 't',
    vocabularies: [{ scheme: 'waypoint.lead_priority@1', axis: 'ranking', ordinal: true, values: [{ value: 'worth_look', label: 'Worth a look', order: 1 }] }],
    claims: [makeClaim({ id: 'c1', statement: 'lead', grading: { ranking: gradedValue('waypoint.lead_priority@1', 'worth_look') }, evidence: [makeEvidenceRef({ id: 'e1', ref: 'r', kind: 'observation' })], authorship: { author: 'automated', createdAt: 't' }, createdAt: 't' })],
  })
  const briefbuilder = makeBundle({
    emittedBy: 'briefbuilder', emittedAt: 't',
    claims: [makeClaim({ id: 'c2', statement: 'finding', grading: { confidence: confidence('high') }, authorship: { author: 'analyst', createdAt: 't' }, createdAt: 't' })],
  })
  assert.deepEqual(validateBundle(waypoint), [])
  assert.deepEqual(validateBundle(briefbuilder), [])
  // and they are unaffected by the linkview profile (no-op when not declared)
  assert.deepEqual(validateLinkviewProfile(waypoint), [])
  assert.deepEqual(validateLinkviewProfile(briefbuilder), [])
})

// 6. finding-status vocabulary is carried and does NOT affect grading validation
test('linkview.finding_status@1 is carried; grading lossless rule is unaffected', () => {
  assert.ok(linkviewVocabularies().some((v) => v.scheme === LINKVIEW_FINDING_STATUS_SCHEME))
  assert.equal(LINKVIEW_FINDING_STATUS_VOCAB.axis, 'disposition')

  // a claim whose disposition uses the finding-status scheme validates (disposition is not graded)
  const ok = makeBundle({ emittedBy: 'linkview', emittedAt: 't', vocabularies: linkviewVocabularies(),
    claims: [makeClaim({ id: 'c1', statement: 'S.', disposition: { scheme: LINKVIEW_FINDING_STATUS_SCHEME, value: 'published' }, authorship: { author: 'analyst', createdAt: 't' }, createdAt: 't' })] })
  ok.profiles = { [LINKVIEW_PROFILE_ID]: {} }
  assert.deepEqual(validateLinkviewProfile(ok), [])

  // registering finding_status must NOT let an undefined GRADING scheme slip through
  const bad = makeBundle({ emittedBy: 'linkview', emittedAt: 't', vocabularies: linkviewVocabularies(),
    claims: [makeClaim({ id: 'c2', statement: 'S.', grading: { verification: gradedValue('made.up@1', 'x') }, authorship: { author: 'analyst', createdAt: 't' }, createdAt: 't' })] })
  assert.ok(validateBundle(bad).some((e) => /made\.up@1.*not defined in bundle\.vocabularies/.test(e)))
})
