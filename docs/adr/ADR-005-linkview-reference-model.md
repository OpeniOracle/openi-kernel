# ADR-005 — LinkView Reference Model and Investigation Bundle Profile

- **Status:** Accepted (direction) — design only; profile module not implemented
- **Date:** 2026-06-15
- **Scope:** Openi suite — kernel contract; LinkView as reference model/proto-Core
- **Relationship to prior ADRs:** **Amends/clarifies** ADR-001 (kernel scope,
  §3e grading collisions, §6 kernel-vs-app line) and ADR-004 (proto-Core);
  **extends** ADR-002 (Phase-C Claim/Grading/Evidence). **Does not supersede** any
  prior ADR.
- **Companion docs:** `docs/reference/linkview-schema.reference.md` (live capture
  + ledger + drift watchlist) · `docs/specs/linkview.profile@1.md` (the profile).

> Direction/contract ADR. Authorizes no code, no schema change, no LinkView edit.

## 1. Context
LinkView is the suite's strongest investigation engine — parsing, entity
resolution, deconfliction, corroboration, evidence/source handling, and a real
**entity–relationship graph** — backed by Supabase with RLS, roles, and an audit
log. Per ADR-004 it is the **proto-Core and reference model**, not the kernel. A
read-only capture at LinkView commit `044b750` (companion reference) pins its
present-day shapes. Decision needed: how that model informs the kernel **without**
LinkView becoming the standard, **without** forcing its richer model into weaker
kernel primitives, and **without** disrupting Lovable's active MVP work.

## 2. Decision
Make LinkView the **reference model that informs the kernel contracts** via an
**additive `linkview.profile@1` of the existing `openi.bundle@1`** — not a
competing format. The kernel stays the **neutral contract + validation layer**;
LinkView's **algorithms stay LinkView-owned**.

- `openi.bundle@1` is **unchanged** — no version bump, no parallel standard.
- The profile is **opt-in** under **`bundle.profiles["linkview.profile@1"]`**
  (`bundle.profiles` is an object keyed by profile id). Its presence activates a
  second validator that runs *in addition to* the base `validateBundle`.

## 3. Gap analysis (verified against live LinkView) — all additive
The base bundle is claim/subject-centric; LinkView is entity/graph-centric. The
additions (full shapes in the spec):

- **G1 Relationships** — optional `relationships[]` graph edges. The only
  genuinely new top-level shape (`claim.subjects[]` is an interim bridge).
- **G2 Entity (full)** — full `Entity` object for `entities[]` (identifiers from
  `attributes` jsonb + resolution `selectors`, attributes, resolution provenance).
- **G3 Source (full)** — full `Source` object with admiralty `reliability` (A–F)
  and `credibility` (1–6) as **independent** grading axes.
- **G4 Deconfliction** — `deconflictions[]` result type `{kind, severity,
  rationale, refType, refId}`.
- **G5 Vocabularies** — register `linkview.{verification,reliability,credibility,
  corroboration,deconfliction}@1`.

**Lossless refinements (this revision):**
- **`evidenceLinks[]`** — explicit representation of LinkView's polymorphic
  `evidence_links` join (evidence ↔ entity|relationship|finding), independent of
  `findings.supporting_evidence`. (Documented `appExtensions.linkview.evidenceLinks`
  fallback with identical shape.)
- **`case`/Investigation object** — preserves the `cases` header (classification,
  subject, known_selectors/orgs/locations, deliverable_type, …). (Fallback:
  `appExtensions.linkview.case`.)
- **`timeline[]`** — preserves `timeline_events`.
- **Corroboration: both score and label preserved** — numeric score on
  `linkview.corroboration@1`, label/band on `verification`.
- **Raw verification preserved verbatim** under `linkview.verification@1`
  (9-value enum), never collapsed; any derived `openi.confidence@1` is a separate
  axis that leaves the raw value untouched.
- **Reliability and credibility preserved independently** as two axes.

## 4. Where the kernel evolves (and where it does NOT)
- **Evolves (additive):** optional Relationship/Entity/Source/Deconfliction/
  EvidenceLink/Investigation/TimelineEvent shapes + the profile validator +
  registered `linkview.*` vocabularies. The kernel *grows to describe* LinkView's
  richer model — the reference-model intent.
- **Does NOT change:** `openi.bundle@1` base, `validateBundle`, `Claim`,
  `Grading` (five reserved axes), `EvidenceReference`, base `EntityReference`.
  **Phase-C revision required: none** — confirmed by the capture. Relationships
  are *new*, not a Claim modification; multi-subject is already `claim.subjects[]`.
- **Verification stays its own axis** (ADR-001 Addendum A reaffirmed).
- **Open question (defer):** whether `credibility`/`corroboration` become reserved
  kernel axes or stay profile-local; whether a shared verification taxonomy is
  ever promoted (ADR-001 §A.4). Not settled here.

## 5. Ownership (clarifies ADR-001 §6)
- **Kernel (contract):** the shapes above, registered vocabularies, the profile
  validator, provenance/lineage, lossless serialization.
- **LinkView (app-local / `appExtensions.linkview`):** corroboration formula +
  weights, deconfliction + resolution algorithms, graph layout, client/analyst
  note split, Supabase/RLS/case membership.
- **Core (future, derived from this reference):** canonical store, cross-case
  identity, audit.

## 6. Backward-compatibility (verified, low risk)
- No `openi.bundle@1` bump; profile opt-in; base validator unchanged; base
  bundles stay valid.
- **Waypoint untouched** — `waypoint.*` schemes, `appExtensions.waypoint`,
  `emittedBy:'waypoint'`/id prefixes, and `waypoint.v1` storage keys are
  **permanent technical namespaces** (see §8).
- **BriefBuilder ingest forward-compatible** — `bundleToFindingDrafts` reads only
  `claims[]`, ignores the new optional fields until a later ingest-extension.

## 7. Lovable transition safety
- LinkView keeps building in Lovable; **no kernel/Core code enters the LinkView
  repo** while Lovable owns it.
- The LinkView→bundle **exporter is additive and Lovable-safe** (thin edge module
  reading existing tables); the **profile + validators live in the kernel** — so
  Lovable cannot overwrite them.
- The companion reference's **capture ledger + drift watchlist** is the frozen
  contract boundary; if a captured shape changes, the kernel profile's golden
  fixtures flag it for deliberate reconciliation.

## 8. Waypoint rename (recorded)
Display/product-offering rename **only**. Never rename `waypoint.*` schemes,
`appExtensions.waypoint`, `emittedBy`/id prefixes, or `waypoint.v1` keys — they
are embedded in persisted data and emitted bundles and referenced by BriefBuilder
ingest. Permanent internal namespaces.

## 9. Non-goals
- Not building Core, not editing LinkView, not building a BriefBuilder UI.
- Not bumping `openi.bundle@1`, not revising any Phase-C shape.
- Not promoting LinkView's verification taxonomy into the kernel as shared.
- Not adopting LinkView's corroboration/resolution algorithms into the kernel.

## 10. Immediate next implementation step (after approval)
Implement **`linkview.profile@1` in the kernel** as an additive validator + shape
module (`interchange.profile.linkview.js`) with **golden-fixture round-trip
tests** covering G1 (relationships[]), G2/G3 (Entity/Source), G4 (deconflictions[]),
the lossless additions (evidenceLinks[]/case/timeline[]), and G5 (registered
`linkview.*` vocabularies) — **no change to `openi.bundle@1` base, no LinkView
code, no BriefBuilder UI.** It becomes the single seam the (additive, Lovable-safe)
LinkView exporter and a later BriefBuilder ingest-extension both consume.
