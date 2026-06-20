import { test } from 'node:test'
import assert from 'node:assert/strict'

import { makeClaim, makeEvidenceRef, makeEntityRef } from '../claim.js'
import { confidence, gradedValue } from '../grading.js'
import { makeBundle, serializeBundle, deserializeBundle } from '../interchange.js'
import {
  LINKVIEW_PROFILE_ID,
  LINKVIEW_VERIFICATION_SCHEME,
  LINKVIEW_RELIABILITY_SCHEME,
  LINKVIEW_CREDIBILITY_SCHEME,
  LINKVIEW_CORROBORATION_SCHEME,
  LINKVIEW_DECONFLICTION_SCHEME,
  linkviewVocabularies,
  hasLinkviewProfile,
  validateLinkviewProfile,
} from '../interchange.profile.linkview.js'

// ── A realistic LinkView investigation bundle (golden fixture) ────────────────
function investigationBundle() {
  const personRef = makeEntityRef({ id: 'lv:ent:person-1', type: 'person', label: 'Tarek H.', resolved: true })

  const base = makeBundle({
    emittedBy: 'linkview',
    emittedAt: '2026-06-15T00:00:00.000Z',
    vocabularies: linkviewVocabularies(),
    claims: [
      makeClaim({
        id: 'lv:finding:1',
        subject: personRef,
        statement: 'Subject is affiliated with Acme Holdings.',
        grading: {
          // verification (LinkView) and confidence (kernel) coexist as distinct axes
          verification: gradedValue(LINKVIEW_VERIFICATION_SCHEME, 'confirmed'),
          confidence: confidence('high'),
        },
        evidence: [makeEvidenceRef({ id: 'lv:ev:1', ref: 'lv:evidence:1', kind: 'document', label: 'Registry filing' })],
        authorship: { author: 'analyst', createdAt: '2026-06-15T00:00:00.000Z' },
        lineage: { partOf: 'lv:case:9', emittedBy: 'linkview' },
        createdAt: '2026-06-15T00:00:00.000Z',
      }),
    ],
  })

  return {
    ...base,
    profiles: { [LINKVIEW_PROFILE_ID]: { capturedFrom: '044b750' } },
    case: {
      id: 'lv:case:9',
      name: 'Operation Example',
      codeName: 'EXAMPLE',
      classification: 'CONFIDENTIAL',
      status: 'active',
      priority: 'priority',
      subject: 'Tarek H.',
      investigationType: 'osint',
      knownSelectors: ['tarek@example.com'],
    },
    entities: [
      {
        id: 'lv:ent:person-1',
        type: 'person',
        label: 'Tarek H.',
        resolved: true,
        aliases: ['T. Hameidani'],
        identifiers: [{ kind: 'email', value: 'tarek@example.com' }],
        attributes: { city: 'Accra' },
        grading: {
          verification: gradedValue(LINKVIEW_VERIFICATION_SCHEME, 'likely'),
          corroboration: gradedValue(LINKVIEW_CORROBORATION_SCHEME, 82),
        },
        resolution: { proposalId: 'lv:prop:1', matchScore: 88, status: 'approved' },
        appExtensions: { linkview: { risk_level: 2, role: 'principal' } },
      },
      {
        id: 'lv:ent:org-1',
        type: 'organization',
        label: 'Acme Holdings',
        grading: { verification: gradedValue(LINKVIEW_VERIFICATION_SCHEME, 'possible') },
      },
    ],
    relationships: [
      {
        id: 'lv:rel:1',
        type: 'affiliated_with',
        from: 'lv:ent:person-1',
        to: 'lv:ent:org-1',
        directed: true,
        strength: 2,
        label: 'Director per registry filing',
        grading: {
          verification: gradedValue(LINKVIEW_VERIFICATION_SCHEME, 'possible'),
          corroboration: gradedValue(LINKVIEW_CORROBORATION_SCHEME, 64),
        },
        evidence: [makeEvidenceRef({ id: 'lv:ev:1', ref: 'lv:evidence:1', kind: 'document' })],
        appExtensions: { linkview: { analyst_note: 'single source', observed_at: '2026-05-01' } },
      },
    ],
    sources: [
      {
        id: 'lv:src:1',
        title: 'Companies registry',
        kind: 'document',
        url: 'https://registry.example/acme',
        grading: {
          reliability: gradedValue(LINKVIEW_RELIABILITY_SCHEME, 'B'),
          credibility: gradedValue(LINKVIEW_CREDIBILITY_SCHEME, 2),
        },
      },
    ],
    evidence: [
      makeEvidenceRef({
        id: 'lv:ev:1',
        ref: 'lv:evidence:1',
        kind: 'document',
        label: 'Registry filing',
        source: {
          id: 'lv:src:1',
          title: 'Companies registry',
          kind: 'document',
          grading: {
            reliability: gradedValue(LINKVIEW_RELIABILITY_SCHEME, 'B'),
            credibility: gradedValue(LINKVIEW_CREDIBILITY_SCHEME, 2),
          },
        },
      }),
    ],
    evidenceLinks: [
      { evidenceId: 'lv:ev:1', entityId: 'lv:ent:person-1' },
      { evidenceId: 'lv:ev:1', relationshipId: 'lv:rel:1' },
      { evidenceId: 'lv:ev:1', findingId: 'lv:finding:1' },
    ],
    timeline: [
      {
        id: 'lv:tl:1',
        occurredAt: '2026-05-01T12:00:00.000Z',
        title: 'Registry filing observed',
        eventType: 'observation',
        entityIds: ['lv:ent:person-1', 'lv:ent:org-1'],
        evidenceIds: ['lv:ev:1'],
        grading: { verification: gradedValue(LINKVIEW_VERIFICATION_SCHEME, 'confirmed') },
      },
    ],
    deconflictions: [
      {
        id: 'lv:dec:1',
        scheme: LINKVIEW_DECONFLICTION_SCHEME,
        kind: 'inferred_link',
        severity: 'warning',
        rationale: 'Relationship rests on a single documentary source.',
        refType: 'relationship',
        refId: 'lv:rel:1',
      },
    ],
  }
}

const clone = () => JSON.parse(JSON.stringify(investigationBundle()))

// ── valid ─────────────────────────────────────────────────────────────────────
test('profile is detected and the golden fixture validates clean', () => {
  const b = investigationBundle()
  assert.equal(hasLinkviewProfile(b), true)
  assert.deepEqual(validateLinkviewProfile(b), [])
})

test('round-trip serialize -> deserialize preserves the whole bundle', () => {
  const b = investigationBundle()
  const json = serializeBundle(b)
  const restored = deserializeBundle(json)
  assert.deepEqual(restored, b)
  assert.equal(serializeBundle(restored), json) // stable
  assert.deepEqual(validateLinkviewProfile(restored), [])
})

test('verification stays distinct from openi.confidence', () => {
  const b = deserializeBundle(serializeBundle(investigationBundle()))
  const g = b.claims[0].grading
  assert.deepEqual(g.verification, { scheme: 'linkview.verification@1', value: 'confirmed' })
  assert.deepEqual(g.confidence, { scheme: 'openi.confidence@1', value: 'high' })
  assert.notEqual(g.verification.scheme, g.confidence.scheme)
})

test('corroboration score AND verification label both survive', () => {
  const b = deserializeBundle(serializeBundle(investigationBundle()))
  const g = b.entities[0].grading
  assert.deepEqual(g.verification, { scheme: 'linkview.verification@1', value: 'likely' }) // label
  assert.deepEqual(g.corroboration, { scheme: 'linkview.corroboration@1', value: 82 }) // numeric score
})

test('reliability and credibility are preserved independently on the source', () => {
  const b = deserializeBundle(serializeBundle(investigationBundle()))
  const g = b.sources[0].grading
  assert.deepEqual(g.reliability, { scheme: 'linkview.reliability@1', value: 'B' })
  assert.deepEqual(g.credibility, { scheme: 'linkview.credibility@1', value: 2 })
})

test('evidenceLinks preserve graph lineage (evidence -> entity/relationship/finding)', () => {
  const b = deserializeBundle(serializeBundle(investigationBundle()))
  assert.equal(b.evidenceLinks.length, 3)
  assert.deepEqual(b.evidenceLinks[0], { evidenceId: 'lv:ev:1', entityId: 'lv:ent:person-1' })
  assert.deepEqual(b.evidenceLinks[1], { evidenceId: 'lv:ev:1', relationshipId: 'lv:rel:1' })
})

test('case and timeline context survive', () => {
  const b = deserializeBundle(serializeBundle(investigationBundle()))
  assert.equal(b.case.id, 'lv:case:9')
  assert.equal(b.case.name, 'Operation Example')
  assert.equal(b.timeline[0].id, 'lv:tl:1')
  assert.deepEqual(b.timeline[0].entityIds, ['lv:ent:person-1', 'lv:ent:org-1'])
})

// ── invalid cases ─────────────────────────────────────────────────────────────
test('relationship endpoint must resolve to an entity', () => {
  const b = clone()
  b.relationships[0].from = 'lv:ent:ghost'
  const errs = validateLinkviewProfile(b)
  assert.ok(errs.some((e) => /relationships\[0\]\.from .*does not resolve/.test(e)), errs.join('\n'))
})

test('deconfliction refId must resolve within the bundle', () => {
  const b = clone()
  b.deconflictions[0].refId = 'lv:rel:nope'
  assert.ok(validateLinkviewProfile(b).some((e) => /deconflictions\[0\]\.refId .*does not resolve/.test(e)))
})

test('a used linkview vocabulary must be defined (lossless rule)', () => {
  const b = clone()
  b.vocabularies = b.vocabularies.filter((v) => v.scheme !== LINKVIEW_VERIFICATION_SCHEME)
  const errs = validateLinkviewProfile(b)
  assert.ok(errs.some((e) => /linkview\.verification@1.*not defined in bundle\.vocabularies/.test(e)), errs.join('\n'))
})

test('evidenceLink.evidenceId must resolve and must target something', () => {
  const b1 = clone()
  b1.evidenceLinks[0].evidenceId = 'lv:ev:nope'
  assert.ok(validateLinkviewProfile(b1).some((e) => /evidenceLinks\[0\]\.evidenceId .*does not resolve/.test(e)))
  const b2 = clone()
  delete b2.evidenceLinks[0].entityId
  assert.ok(validateLinkviewProfile(b2).some((e) => /must link to at least one/.test(e)))
})

test('profile arrays must be arrays; bad shapes are caught', () => {
  const b = clone()
  b.entities = { not: 'an array' }
  assert.ok(validateLinkviewProfile(b).some((e) => /bundle\.entities must be an array/.test(e)))
  const b2 = clone()
  b2.deconflictions[0].severity = 'meh'
  assert.ok(validateLinkviewProfile(b2).some((e) => /severity must be/.test(e)))
})

// ── backward compatibility ────────────────────────────────────────────────────
test('a base bundle without the profile is validated base-only (no-op profile)', () => {
  const baseBundle = makeBundle({
    emittedBy: 'waypoint',
    emittedAt: 't',
    vocabularies: [{ scheme: 'waypoint.lead_priority@1', axis: 'ranking', ordinal: true, values: [{ value: 'worth_look', label: 'Worth a look', order: 1 }] }],
    claims: [
      makeClaim({ id: 'c1', statement: 'S.', grading: { ranking: gradedValue('waypoint.lead_priority@1', 'worth_look') }, authorship: { author: 'automated', createdAt: 't' }, createdAt: 't' }),
    ],
  })
  assert.equal(hasLinkviewProfile(baseBundle), false)
  assert.deepEqual(validateLinkviewProfile(baseBundle), []) // base passes; no profile checks applied
})
