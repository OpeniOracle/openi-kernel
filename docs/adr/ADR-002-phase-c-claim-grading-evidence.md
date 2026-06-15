# ADR-002: Phase C — The Claim Envelope, Multi-Axis Grading, and Evidence Reference

- **Status:** Proposed (design only — not authorized for implementation)
- **Date:** 2026-06-15
- **Depends on:** ADR-001 (Openi Reasoning Kernel), Phases A–B; ADR-001 Addendum A
- **Scope:** Openi suite — Brief Builder, Waypoint, LinkView (and future Trace,
  Exposure Lens, Spyglass)
- **Decision driver:** define the first *meaning-bearing* kernel primitives so a
  graded, evidence-backed, provenance-stamped assertion can move between apps
  without losing meaning — while keeping each app's analytic engine and grading
  vocabularies app-local.

> This is a design record. It authorizes no code, no app refactor, and no
> change to any stored schema. A separate change implements Phase C when
> approved. Per ADR-001 §8, nothing here is implemented before it has two real
> consumers — the Claim has three (§5).

---

## 1. Verdict

Define four kernel primitives as **interchange/emit targets**, not as a
replacement for any app's storage model:

1. **Grading** — a container of *named, independent axes*. No axis is ever
   collapsed into another. Each graded value is **self-describing** (carries the
   id+version of the vocabulary it came from), so a Waypoint `priority` can never
   be misread as a Brief Builder `confidence`, and LinkView's verification
   taxonomy travels intact.
2. **EvidenceReference** (+ **SourceReference**) — a stable, addressable pointer
   to a backing record, optionally graded (e.g. admiralty reliability).
3. **Claim** — the envelope that Brief Builder Finding, Waypoint Lead, and
   LinkView Finding all become *profiles of*: a subject, a statement, a Grading,
   backing evidence, an authorship stamp, an analyst disposition, and lineage.
4. **Interchange bundle** — a self-describing package of claims + evidence +
   sources + entity references + the vocabulary definitions they reference, so a
   receiver can interpret app-specific axes without hardcoding them.

Apps are **not** required to consume these. The first and only obligation is that
an app can *emit* its native objects into this shape and *ingest* a bundle into
its native objects — both losslessly.

---

## 2. The core idea: grading is a set of named axes, each self-describing

The collision ADR-001 §3e identified is that "moderate", "high", "strong" mean
different things on different axes in different apps. The fix is to stop treating
a grade as a bare value and start treating it as **(axis, scheme, value)**:

- **axis** — *what is being graded* (how-sure vs how-much-it-matters vs
  pursuit-order vs analytic-status vs source-grade).
- **scheme** — *which controlled vocabulary*, with a version (`openi.confidence@1`,
  `linkview.verification@1`, `admiralty.reliability@1`).
- **value** — the value within that scheme.

Five named axes have kernel-known semantics. All are optional; an app populates
only the axes it uses:

| Axis | Meaning | Today's sources | Default scheme |
|---|---|---|---|
| `confidence` | how sure we are | BB `confidence`, Waypoint `profile.confidence` + coverage ceiling | `openi.confidence@1` = low \| moderate \| high (the only kernel-shared vocab) |
| `severity` | how much it matters | BB `risk_level`, LinkView `risk_level` | app vocab (e.g. `briefbuilder.risk@1` = low \| medium \| high \| critical) |
| `verification` | analytic / corroboration status | LinkView `confidence_level` verification values | **app vocab — `linkview.verification@1`** (NOT collapsed; see §3) |
| `ranking` | app-defined pursuit ordering | Waypoint `priority` | app vocab (`waypoint.lead_priority@1` = strong \| worth_look \| weak) |
| `reliability` | source grade (lives on evidence/source) | LinkView admiralty `reliability` A–F + `credibility` 1–6 | app/standard vocab (`admiralty.reliability@1`, `admiralty.credibility@1`) |

The axis name is reserved and stable; the **scheme is owned by whoever defines
the values**. The kernel owns only `openi.confidence@1`. Everything else stays
app-local and rides along self-described.

---

## 3. LinkView's verification taxonomy stays its own axis (per ADR-001 Addendum A)

ADR-001 Addendum A established that LinkView's
`confirmed › likely › possible › unconfirmed › disputed › deconfliction_required`
is a **verification/analytic-status** axis, not a richer `confidence`. This ADR
honors that:

- LinkView's `confidence_level` column maps to the kernel **`verification`** axis
  under scheme `linkview.verification@1`, carrying the full enum **verbatim**.
- It is **never** mapped onto `openi.confidence@1` (low/moderate/high). Snapping
  it would silently restate every corroboration score and deconfliction.
- The kernel does not redefine these values. It only reserves the *axis name*
  `verification` and transports LinkView's vocabulary definition inside the
  bundle so receivers can render/order it.
- Whether the suite later promotes a shared verification taxonomy is the open
  question ADR-001 §A.4 deferred — **out of scope here**.

LinkView's corroboration *engine* (scoring weights, diversity/reliability
factors, contradiction penalties, deconfliction rules, overrides + audit log)
remains entirely app-local analysis. Only its **graded result** is expressible in
kernel Grading (a `verification` value plus an optional numeric
`corroboration_score` axis under `linkview.corroboration@1`).

---

## 4. Proposed object shapes (TypeScript for clarity; not a commitment to TS)

The current kernel is plain ESM JS; the implementation language (JS+JSDoc vs TS
types) is an implementation-phase decision. These shapes define the contract.

```ts
type KernelId = string;        // newId() from @openi/kernel/ids
type IsoTimestamp = string;    // nowIso()

// ── Grading ────────────────────────────────────────────────────────────────
// A value that knows which vocabulary it came from. Survives interchange.
interface GradedValue {
  scheme: string;              // "openi.confidence@1" | "linkview.verification@1" | ...
  value: string | number;      // ordinal label or numeric score
  label?: string;              // display label resolved at write time (optional)
}

// Named, independent axes. All optional. Extensible for future axes.
interface Grading {
  confidence?: GradedValue;    // how sure          (kernel vocab: low|moderate|high)
  severity?: GradedValue;      // how much it matters
  verification?: GradedValue;  // analytic status   (LinkView taxonomy — app vocab)
  ranking?: GradedValue;       // app-defined order (Waypoint priority — app vocab)
  reliability?: GradedValue;   // source grade (usually on EvidenceReference/SourceReference)
  [axis: string]: GradedValue | undefined;  // future named axes, self-described
}

// ── Evidence & Source ────────────────────────────────────────────────────────
interface SourceReference {
  id?: KernelId;
  ref?: string;                // stable pointer to the source record (app-scoped)
  title?: string;
  kind?: string;               // "url" | "document" | "dataset" | "human" | "other"
  url?: string;
  grading?: Grading;           // reliability (admiralty A–F) + credibility (1–6)
  capturedAt?: IsoTimestamp;
}

interface EvidenceReference {
  id: KernelId;
  ref: string;                 // stable pointer to the underlying evidence record
  kind: string;                // "document"|"url"|"screenshot"|"dataset"|"observation"|"note"|...
  label?: string;
  locator?: string;            // where in the source: page, cell, time window, lat/lng, question id
  source?: SourceReference;    // provenance of this evidence
  grading?: Grading;           // per-evidence reliability/weight
  capturedAt?: IsoTimestamp;
}

// ── Subject (minimal EntityRef now; full Entity is Phase E) ───────────────────
interface EntityReference {
  id: KernelId;                // resolved entity id, or app-local id until resolved
  type: string;                // "person"|"organization"|"location"|"account"|"asset"|"event"|"device"|"other"
  label: string;
  resolved?: boolean;          // human-gated resolution flag (Phase E)
}

// ── Provenance / authorship / lineage ────────────────────────────────────────
type AuthorKind = "analyst" | "ai" | "automated" | "imported";

interface Authorship {
  author: AuthorKind;          // who/what produced this claim
  authorId?: string;           // analyst identity, if applicable
  generation?: string;         // "analyst_written"|"analyst_edited"|"ai_generated"|"ai_suggested"|"auto_derived"
  tool?: string;               // "briefbuilder.aiService@anthropic" | "waypoint.questions@1"
  createdAt: IsoTimestamp;
  updatedAt?: IsoTimestamp;
}

interface Lineage {
  derivedFrom?: KernelId[];    // evidence/claim ids this was built from (source→claim→product)
  partOf?: KernelId;           // container: brief_id | case_id
  emittedBy?: string;          // "waypoint" | "briefbuilder" | "linkview"
}

// Analyst workflow stance — kept separate from Grading. Self-describing.
interface Disposition {
  scheme: string;              // "briefbuilder.finding_status@1" | "waypoint.lead_disposition@1" | "linkview.finding_status@1"
  value: string;               // approved|rejected | new|pursuing|escalated|cleared | draft|review|published
  note?: string;
  by?: string;
  at?: IsoTimestamp;
}

// ── The Claim envelope ───────────────────────────────────────────────────────
interface Claim {
  id: KernelId;
  schemaVersion: string;       // "openi.claim@1"
  subject?: EntityReference;   // what the claim is about (often unresolved before Phase E)
  subjects?: EntityReference[];// for multi-subject claims (e.g. a relationship: [source, target])
  statement: string;           // the asserted proposition
  detail?: string;             // longer body / narrative
  grading: Grading;            // named multi-axis grading (every axis optional)
  evidence: EvidenceReference[];
  authorship: Authorship;
  disposition?: Disposition;
  lineage?: Lineage;
  caveats?: string;
  recommendedAction?: string;
  notes?: string;              // working notes (not for client export)
  tags?: string[];
  appExtensions?: Record<string, unknown>;  // lossless carry-through of app-only fields
  createdAt: IsoTimestamp;
  updatedAt?: IsoTimestamp;
}

// ── Interchange bundle ───────────────────────────────────────────────────────
interface VocabularyDefinition {
  scheme: string;              // "linkview.verification@1"
  axis: string;                // "verification"
  ordinal?: boolean;           // true if values are ordered
  values: { value: string | number; label: string; order?: number }[];
}

interface InterchangeBundle {
  schemaVersion: string;       // "openi.bundle@1"
  emittedBy: string;           // app id
  emittedAt: IsoTimestamp;
  vocabularies?: VocabularyDefinition[];  // defs for every non-kernel scheme referenced
  entities?: EntityReference[];
  sources?: SourceReference[];
  evidence?: EvidenceReference[];
  claims: Claim[];             // claims reference evidence/entities by id within the bundle
}
```

**Two design rules make interchange lossless:**
- `appExtensions` carries any field the shared schema does not model, so nothing
  is dropped on round-trip.
- The bundle ships a `VocabularyDefinition` for every non-kernel scheme it
  references, so a receiver can label/order LinkView's verification values (or
  Waypoint's ranking) without hardcoding them.

---

## 5. Mapping each current model into the Claim shape

### 5a. Brief Builder **Finding Card** → Claim
| Finding field | Claim target | Notes |
|---|---|---|
| `id` | `id` | |
| brief `client`/topic | `subject` (EntityReference) | implicit string today; unresolved until Phase E |
| `title` + `summary` | `statement` (+ `detail`) | |
| `confidence` | `grading.confidence` | scheme `openi.confidence@1` |
| `risk_level` | `grading.severity` | scheme `briefbuilder.risk@1` (low\|medium\|high\|critical) |
| `evidence_ids[]` | `evidence[]` | each → EvidenceReference to an Evidence Item |
| `status` = `ai_suggested` | `authorship.generation` = `ai_suggested` | AI authorship stamp |
| `status` = `analyst_approved`/`rejected` | `disposition` | scheme `briefbuilder.finding_status@1` |
| `caveats` | `caveats` | |
| `recommended_action` | `recommendedAction` | |
| `analyst_notes` | `notes` | |
| `brief_id` | `lineage.partOf` | |
| `created_at`/`updated_at` | timestamps | |

Brief Builder **Evidence Item** → EvidenceReference: `type`→`kind`,
`source_url`/`uploaded_file_path`→`ref`/`locator`, `extracted_text`→
`appExtensions`.

### 5b. Waypoint **Lead** → Claim
| Lead field | Claim target | Notes |
|---|---|---|
| `device_id` | `subject` (EntityReference, `type:"device"`) | unresolved device, not a person |
| (no persisted id) | `id` | **mint `newId()` on promotion** (Lead gains a stable id) |
| `signals[].reason` (aggregated) | `statement` | composed from its signals |
| `profile.confidence` | `grading.confidence` | scheme `openi.confidence@1` |
| `priority` (strong\|worth_look\|weak) | `grading.ranking` | scheme `waypoint.lead_priority@1` — **must NOT map to confidence** |
| coverage confidence ceiling | `caveats` (+ optionally cap `grading.confidence`) | promote the ceiling into caveats on emit |
| `signals[]` | `evidence[]` | each signal → EvidenceReference `kind:"observation"`, `locator`=question id/window, weight in `grading`/`appExtensions` |
| `disposition` (new\|pursuing\|escalated\|cleared) | `disposition` | scheme `waypoint.lead_disposition@1` |
| `manual` | `authorship.author` | `analyst` when manually promoted; else `automated` |
| `note` | `notes` | |
| case `id` | `lineage.partOf` | |

### 5c. LinkView **Finding** → Claim
| Finding field | Claim target | Notes |
|---|---|---|
| `id` | `id` | already a stable uuid |
| `related_entities[]` | `subject`/`subjects` (EntityReference) | **already resolved entities** — the mature case |
| `claim`/`title`/`body` | `statement`/`detail` | |
| `confidence` (verification enum) | `grading.verification` | scheme `linkview.verification@1` — **kept whole, never confidence** |
| `status` (draft\|review\|published) | `disposition` | scheme `linkview.finding_status@1` |
| `supporting_evidence[]` | `evidence[]` | → EvidenceReference; LinkView evidence carries `source` + admiralty `reliability` |
| `why_it_matters` | `detail` or `appExtensions` | |
| `analyst_notes`/`client_notes` | `notes` / `appExtensions` | client-visible split preserved in extensions |
| `case_id` | `lineage.partOf` | |

LinkView **Source** → SourceReference (admiralty `reliability` A–F →
`grading.reliability` `admiralty.reliability@1`; `credibility` 1–6 →
`admiralty.credibility@1`). LinkView **Evidence** → EvidenceReference.
LinkView **Entity** → EntityReference (full Entity primitive is Phase E).
LinkView **Relationship** → a Claim with `subjects:[source,target]` and
`{kind,directed,strength}` in `appExtensions` (a dedicated Relationship
primitive is Phase E, with Entity). LinkView **Corroboration** output →
`grading.verification` + optional numeric `grading["corroboration_score"]`
(`linkview.corroboration@1`); the engine and `corroboration_overrides`/
`corroboration_audit_log` stay app-local.

---

## 6. What remains app-specific (unchanged from ADR-001 §6, made concrete)

- **Analytic engines:** Waypoint's observation/coverage/characterize/question-lens
  logic and device classes; Brief Builder's templates, sections/draft model and
  Markdown renderer; LinkView's corroboration scoring, deconfliction, resolution
  clustering, and graph/timeline UI. *They emit Claims; they are not Claims.*
- **Vocabulary values** for `severity` (`critical`), `ranking` (lead bands),
  `verification` (LinkView taxonomy), `reliability` (admiralty) — registered as
  app schemes, transported self-described. Only `openi.confidence@1` is kernel.
- **Storage schemas:** no app changes its tables/localStorage. The kernel shapes
  are an emit/ingest boundary, not a persistence model.
- **Disposition lifecycles:** approval vs pursuit vs publication stay distinct
  schemes; the kernel transports them, it does not unify them into one vocabulary.

---

## 7. Migration risks

1. **Entity prematurity.** `subject` depends on Phase E resolution. *Mitigation:*
   EntityReference is a minimal reference (`id,type,label,resolved?`); Phase C
   never requires resolution and never blocks on it.
2. **Verification mis-tagging.** LinkView's `confidence_level` enum mixes
   how-sure and verification values. *Mitigation:* map the whole column to the
   `verification` axis under `linkview.verification@1`; do not split per value.
3. **Grading axis sprawl.** Uncontrolled axis names/scheme ids erode the moat.
   *Mitigation:* reserve exactly five kernel-known axis names; everything else via
   the extensible map plus a registered, versioned vocabulary.
4. **Ordinal vs numeric.** Admiralty letters are ordinal; corroboration scores
   are 0–100. *Mitigation:* `GradedValue.value: string|number` + the vocabulary
   def declares `ordinal` and order.
5. **Lossy round-trip.** Receivers may ignore `appExtensions`/bundle vocab.
   *Mitigation:* round-trip equality tests are part of the Phase-C definition of
   done; serialize→deserialize must reproduce the source object.
6. **Disposition/grading confusion.** *Mitigation:* they are separate fields with
   separate schemes; never merge.
7. **Schema churn coupling apps early.** *Mitigation:* version every schema/scheme
   from day one (`openi.claim@1`, `openi.bundle@1`); apps adopt emit/ingest at
   their own pace; no storage migration.
8. **Over-reach beyond two consumers.** *Mitigation:* Claim has three real
   consumers (§5); Entity/Relationship primitives are explicitly deferred to
   Phase E where they too will have ≥2 consumers.

---

## 8. Recommended first low-risk implementation step (after approval)

Mirror exactly how Phase A shipped — **types + helpers, zero forced consumers:**

1. **Kernel Phase-C surface, no app wiring.** Add `@openi/kernel/claim` (the
   shapes above as JS + JSDoc or TS types), `@openi/kernel/grading` (the five
   axis names + `openi.confidence@1` + a `GradedValue` constructor), and
   `@openi/kernel/interchange` (pure `serializeBundle`/`deserializeBundle` +
   `validateBundle`, with round-trip tests). No app imports it yet. Fully
   reversible.
2. **One narrow, read-only emitter as proof.** Implement a pure
   `leadToClaim(lead, case)` mapping in Waypoint (unit-tested, **not** wired into
   the UI) that produces an `openi.bundle@1` from a Lead. Waypoint is the
   simplest emitter and already has "export to Brief Builder" on its roadmap.
   This validates the envelope against one real model with zero user-facing
   change and no storage change.

Only after that proves out do we consider a Brief Builder *ingest* of the bundle
(Lead→Finding) — the first cross-app exchange, and the payoff this ADR exists to
enable.

> Not authorized by this ADR: implementing the kernel Phase-C modules, wiring any
> app to them, or changing any stored schema. This document records the design;
> a separate change implements step 1 above when approved.
