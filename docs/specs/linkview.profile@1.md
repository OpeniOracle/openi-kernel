# `linkview.profile@1` — additive profile of `openi.bundle@1`

**Additive only.** The base `openi.bundle@1` schema, `validateBundle`, and every
Phase-C shape are **unchanged** (no version bump, no parallel standard). A
profile adds optional top-level fields + a second validator that runs *in
addition to* the base. Base bundles (Waypoint, BriefBuilder) are unaffected and
stay valid. Reference: `docs/reference/linkview-schema.reference.md`.

## 1. Declaration (opt-in)
- `bundle.schemaVersion` stays `"openi.bundle@1"`.
- New optional **`bundle.profiles`** — an **object keyed by profile id**, so a
  bundle can declare and parameterize multiple profiles:
  ```ts
  bundle.profiles?: {
    "linkview.profile@1"?: { capturedFrom?: string /* LinkView commit */ }
    [profileId: string]: object | undefined
  }
  ```
  Presence of the `"linkview.profile@1"` key activates the profile validator
  (`validateLinkviewProfile`). Absent ⇒ base validation only.

## 2. New optional top-level fields

### G1 — `bundle.relationships?: Relationship[]`  (graph edge — the new shape)
```ts
interface Relationship {
  id: string
  type: string                 // relationships.kind (e.g. "associated_with")
  from: string                 // EntityReference.id  (source_entity_id)
  to: string                   // EntityReference.id  (target_entity_id)
  directed?: boolean
  strength?: number
  label?: string               // summary / why_it_matters
  grading?: Grading            // { verification, corroboration } — see §3
  evidence?: EvidenceReference[]
  appExtensions?: { linkview?: { analyst_note?, client_notes?, observed_at? } }
}
```
`claim.subjects[]` remains the interim bridge for apps that don't emit edges.

### G2 — full Entity object for `bundle.entities[]` (extends EntityReference)
```ts
interface Entity extends EntityReference {           // id, type, label, resolved?
  aliases?: string[]
  identifiers?: { kind: string; value: string }[]    // from attributes jsonb + resolution selectors
  attributes?: Record<string, unknown>
  grading?: Grading                                  // { verification, corroboration }
  resolution?: { proposalId?, matchScore?, status?, selectors?: Record<string,string[]> }
  appExtensions?: { linkview?: { risk_level?, role?, analyst_notes?, client_notes? } }
}
```

### G3 — full Source object for `bundle.sources[]` (extends SourceReference)
```ts
interface Source extends SourceReference {           // id, title, kind, url
  // reliability AND credibility are INDEPENDENT axes, both preserved (§3):
  grading?: Grading            // { reliability: linkview.reliability@1, credibility: linkview.credibility@1 }
  capturedAt?: string
  appExtensions?: { linkview?: { notes? } }
}
```

### G4 — `bundle.deconflictions?: Deconfliction[]`  (deconfliction result)
```ts
interface Deconfliction {
  id?: string
  scheme: "linkview.deconfliction@1"
  kind: string                 // name_collision | weak_attribution | inferred_link | selector_ambiguous (extensible)
  severity: "warning" | "critical"   // LinkView `level`
  rationale: string            // the human-readable message
  refType: "entity" | "relationship" | "finding" | "claim"
  refId: string                // must resolve within the bundle
  involved?: string[]
}
```

### Lossless additions (refinements)

**`bundle.evidenceLinks?: EvidenceLink[]`** — explicit representation of
LinkView's polymorphic `evidence_links` join, preserved independently of
`findings.supporting_evidence`:
```ts
interface EvidenceLink { evidenceId: string; entityId?: string; relationshipId?: string; findingId?: string }
```
*Equivalent fallback (documented):* if an emitter prefers not to surface a
top-level array, it MAY carry the identical structure at
`bundle.appExtensions.linkview.evidenceLinks` — losslessly, same shape.

**`bundle.case?: Investigation`** — case context (LinkView `cases` header):
```ts
interface Investigation {
  id: string; name: string; codeName?: string; client?: string
  classification?: string; status?: string; priority?: string
  subject?: string; investigationType?: string; deliverableType?: string
  knownSelectors?: string[]; knownOrganizations?: string[]; knownLocations?: string[]
  summary?: string; description?: string
  appExtensions?: { linkview?: object }   // RLS/membership stays LinkView-local
}
```
*Fallback:* `bundle.appExtensions.linkview.case` with the same shape.

**`bundle.timeline?: TimelineEvent[]`** — preserves `timeline_events`:
```ts
interface TimelineEvent {
  id: string; occurredAt: string; title: string; description?: string
  eventType: string; entityIds?: string[]; evidenceIds?: string[]
  grading?: Grading            // { verification }
}
```

LinkView **findings** need no new shape — they map to base `claims[]`
(`supporting_evidence`→`claim.evidence[]`, `related_entities`→`claim.subjects[]`).

## 3. Grading: preserve everything independently (refinement)
A graded target (claim / entity / relationship / source / timeline) carries each
axis as an independent self-describing `GradedValue`. None overwrites another:
- **`verification`** = `linkview.verification@1`, the **raw LinkView
  `confidence_level` value, verbatim** (9-value enum). Never collapsed. If an
  emitter additionally derives a kernel `confidence` (`openi.confidence@1`), that
  derived value is a **separate axis** and the raw `verification` is untouched.
- **`corroboration`** = `linkview.corroboration@1`, numeric **score 0–100**.
  Carried **alongside** the label — both the engine `score` and its `label`/band
  are preserved (label on `verification`, score on `corroboration`).
- **`reliability`** = `linkview.reliability@1` (admiralty A–F) and
  **`credibility`** = `linkview.credibility@1` (1–6) are **two independent
  axes**, both preserved on the Source — never merged.

## 4. Registered `linkview.*` vocabularies (carried in `bundle.vocabularies`)
- `linkview.verification@1` — axis `verification`, ordinal, 9 values verbatim:
  low, medium, high, confirmed, likely, possible, unconfirmed, disputed, deconfliction_required.
- `linkview.reliability@1` — axis `reliability`, ordinal: A…F.
- `linkview.credibility@1` — axis `credibility`*, ordinal: 1…6 *(confirm range — reference §11)*.
- `linkview.corroboration@1` — axis `corroboration`*, numeric 0–100.
- `linkview.deconfliction@1` — the deconfliction `kind` vocabulary.

\* `credibility`, `corroboration` are **new extensible axis names** (Grading
allows `[axis: string]`), **not** added to the kernel's five reserved axes. Open
question (ADR-005 §4): promote to reserved or keep profile-local.

## 5. Validator — kernel module `interchange.profile.linkview.js`
`validateLinkviewProfile(bundle): string[]` — runs only when
`bundle.profiles["linkview.profile@1"]` is present. Checks:
1. base `validateBundle(bundle)` passes first (delegates; no duplication);
2. `relationships[].from/.to` resolve to `entities[].id` (or claim subjects);
   `directed`/`strength` types;
3. `entities[]`/`sources[]`/`timeline[]` match the shapes; their grading schemes
   obey the **lossless rule** (every non-`openi.confidence@1` scheme defined in
   `bundle.vocabularies`), extended to relationship/entity/source/timeline grading;
4. `deconflictions[].refId` and `evidenceLinks[].*Id` resolve within the bundle;
5. the used `linkview.*` vocabularies are present.

## 6. Ownership
- **Kernel (contract):** the Relationship/Entity/Source/Deconfliction/
  EvidenceLink/Investigation/TimelineEvent **shapes**, the registered
  vocabularies, the validator, lossless serialization.
- **LinkView (app-local / `appExtensions.linkview`):** corroboration formula +
  weights, deconfliction + resolution algorithms, graph layout, client/analyst
  note split, Supabase/RLS/case membership.
- **Core (future):** canonical store, cross-case identity, audit.

## 7. Backward-compat
- No `openi.bundle@1` bump; base validator unchanged; base bundles stay valid.
- Waypoint untouched (`waypoint.*`, `appExtensions.waypoint`, storage keys
  permanent).
- BriefBuilder ingest forward-compatible — reads only `claims[]`, ignores the new
  optional fields until a later ingest-extension consumes them.
