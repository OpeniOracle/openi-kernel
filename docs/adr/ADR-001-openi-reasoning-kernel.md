# ADR-001: Openi Reasoning Kernel — Extracting Shared Platform Infrastructure

- **Status:** Proposed (not yet implemented)
- **Date:** 2026-06-06
- **Scope:** Openi analyst suite — Waypoint, LinkView, Trace, Exposure Lens,
  Spyglass, BriefBuilder
- **Context source:** the current `BriefBuilder` repository, which already
  contains two applications (BriefBuilder + Waypoint) sharing one codebase.
- **Decision driver:** determine whether Openi keeps building standalone
  applications or begins investing in shared platform infrastructure.

> This is an architecture decision record. It does not authorize implementation
> or refactoring. It is the durable reference the suite's platform direction is
> measured against.

---

## 1. Verdict

**Begin investing in a shared Reasoning Kernel now — kernel-first, not
platform-first.** Do not pause application work for a platform rewrite; instead
**harvest** the kernel from the duplication that already exists between
BriefBuilder and Waypoint, and build application #3 (Trace / Exposure Lens /
Spyglass / LinkView) *on top of* it rather than beside it.

The kernel owns **meaning** (identity, claims, gradings, provenance, ontology).
Applications own **analysis** (their domain engines) and **presentation** (their
product forms). The dividing line is already observable in the code.

---

## 2. Why the kernel should start now

Because the kernel is **already forming, unmanaged.** With only two applications
in the repo there is already a shared file, a duplicated persistence layer, a
copy-pasted confidence scale, two parallel "claim" objects, and an emerging
grading-vocabulary collision (§3). This is not a theoretical future risk; it is
present in `main` today.

The cost curve is decisive:

- **Today (2 apps):** extracting the shared primitives is a small refactor
  against two known consumers.
- **After Trace + Exposure Lens + Spyglass + LinkView:** it becomes a six-app
  reconciliation, each having independently re-invented confidence and
  provenance, with semantic debt baked into stored data and cross-tool exports.

The suite's intended moat is **cross-tool exchange of findings/evidence/
confidence/provenance/entities/assessments without losing meaning.** Every app
that ships before the kernel erodes that moat at its seams. Acting now is the
cheapest this decision will ever be.

---

## 3. Evidence: duplication, parallels, and collisions in the current codebase

All references are to the current repository.

### 3a. Already shared (informally)
- **`src/lib/ids.js`** (`newId`, `nowIso`) is imported by Waypoint via
  `../../lib/ids.js` in `src/waypoint/data/waypointRepository.js` and
  `src/waypoint/state/WaypointContext.jsx`. Waypoint is **not** standalone.

### 3b. Duplicated (with awareness, in comments)
- **Repository contract / storage seam.**
  `src/waypoint/data/waypointRepository.js` re-implements
  `src/data/localRepository.js` — same `readDb`/`writeDb`, same single
  `ROOT_KEY` JSON namespacing, same async `list/get/create/update/remove` shape.
  Its own header comment reads *"Mirrors BriefBuilder's repository pattern."*
- **Confidence scale.** `src/waypoint/lib/constants.js` defines
  `CONFIDENCE_LEVELS` = low/moderate/high with the comment *"same scale and
  order as BriefBuilder (CONFIDENCE_LEVELS)."* `src/lib/constants.js` defines the
  identical list.
- **Controlled-vocabulary helper.** `labelFor(vocab, value)` exists, identically,
  in both `src/lib/constants.js` and `src/waypoint/lib/constants.js`.
- **Evidence/provenance serialization.** `src/services/aiService.js`
  (`evidenceBlock`) and `src/lib/exportMarkdown.js` (`evidenceReferenceList`)
  independently render evidence references to text.

### 3c. Parallel objects under different names (the convergent Claim)
- BriefBuilder **Finding** (`src/components/FindingForm.jsx`,
  `src/services/aiService.js`):
  `{ title, summary, risk_level, confidence, evidence_ids, caveats,
  recommended_action, analyst_notes, status, brief_id }`
- Waypoint **Lead** (`src/waypoint/lib/questions.js`):
  `{ device_id, profile, signals[], signalCount, priority, disposition, note,
  manual }`
- Both are a **graded claim, backed by references, with an analyst disposition.**

### 3d. Parallel author-of-record / AI-provenance encodings
- BriefBuilder: `GENERATION_SOURCES` (ai_generated | analyst_edited |
  analyst_written) and `FINDING_STATUSES` (ai_suggested | analyst_approved |
  rejected); AI output enters as `ai_suggested` per `aiService.js`.
- Waypoint: a first-class manual signal with `questionId: 'analyst'` plus
  `LEAD_DISPOSITIONS` (new | pursuing | escalated | cleared).
- Same contract (analyst is author; AI/auto is distinguishable), two encodings.

### 3e. Naming / semantic collisions (the meaning-loss risk)
- **Three grading axes already exist, two of them colliding on a label:**
  - BriefBuilder `confidence`: low | **moderate** | high  *(how sure)*
  - BriefBuilder `risk_level`: low | medium | high | critical  *(how much it matters)*
  - Waypoint `priority`: strong | worth_look | weak  *(lead-pursuit ranking)*
  - Waypoint `confidence` (classification): low | **moderate** | high
- "moderate" therefore already denotes two different things depending on app and
  axis. Exporting a Waypoint Lead into a BriefBuilder Finding today would have to
  guess how `priority` maps onto `confidence`/`risk_level` — and would silently
  misstate the assessment. **This is the concrete reason gradings must be a
  named, multi-axis kernel primitive.**

### 3f. The missing primitive
- **No resolved Entity exists in either app.** BriefBuilder has string
  `client` and `assigned_analyst`; Waypoint has `device_id` selectors and
  `provenance.collector`. Nothing canonical ties "this device," "this finding's
  subject," and (future) "this LinkView node" to one identity. Entity must be
  **designed centrally** because it is the primitive every future app needs and
  no app currently owns.

---

## 4. Minimum kernel extraction inventory

The smallest set that makes lossless cross-tool exchange possible. Each item
lists what exists today and what the kernel must add.

| Primitive | Exists today | Kernel adds |
|---|---|---|
| **ids** | `lib/ids.js` (already shared) | Formal ownership; stable id format across apps |
| **ontology** | `labelFor` + `[{value,label}]` vocabularies, duplicated | One versioned source of truth; apps extend locally |
| **confidence scale** | `CONFIDENCE_LEVELS` duplicated | Single definition; part of the multi-axis Grading |
| **repository contract** | `localRepository` + Supabase selector; re-impl'd in Waypoint | One async CRUD + storage-seam interface, namespaced per app |
| **Claim envelope** | Finding + Lead (parallel) | One schema both become profiles of (§5 mapping) |
| **Entity reference** | *does not exist* | `{ id, type, label }` + human-gated resolution |
| **provenance model** | `generation_source`, `status`, `provenance{}`, lineage via `evidence_ids`/`finding_ids` | Unified authorship stamp + source→claim→product lineage |
| **AI assistance contract** | `aiService.js` (`ANALYST_RULES`, suggest-not-conclude, deterministic fallback) | Shared interface so every app's AI behaves identically and accountably |

**Grading (cross-cutting):** a named multi-axis set — `confidence` (how sure),
`severity`/`risk` (how much it matters), and an optional app-defined ranking
(e.g. lead `priority`) — so axes never collapse into each other on exchange
(§3e).

**Evidence reference (part of the Claim):** a stable, addressable pointer to a
source record — `{ ref, kind, label, locator }` — generalizing BriefBuilder's
`evidence_ids` + `source_url`/`uploaded_file_path` and Waypoint's
`signals`/observations.

---

## 5. Field mapping — BriefBuilder Finding → Waypoint Lead → Claim envelope

The two existing objects reconciled into one envelope. This table is the
concrete target for the Claim primitive.

| Claim envelope field | BriefBuilder Finding | Waypoint Lead | Notes |
|---|---|---|---|
| `id` | `id` | (derived per device; not persisted) | Lead must gain a stable id when promoted |
| `subject` (EntityRef) | implicit (brief `client` / topic) | `device_id` (selector) | **Both need the new Entity/Selector reference** |
| `statement` | `title` + `summary` | `signals[].reason` (aggregated) | Lead's statement is composed from its signals |
| `gradings.confidence` | `confidence` (low/mod/high) | `profile.confidence` (classification) | Same scale; different current meaning — keep explicit |
| `gradings.severity` | `risk_level` (low/med/high/critical) | — | Waypoint has no severity axis yet |
| `gradings.ranking` (app-defined) | — | `priority` (strong/worth_look/weak) | Must NOT be mapped onto confidence |
| `evidence[]` (refs) | `evidence_ids[]` → Evidence | `signals[]` (question + reason + weight) + observations | Waypoint's "evidence" is its signals/observations |
| `caveats` | `caveats` | (coverage ceiling, implicit) | Promote Waypoint's confidence ceiling into caveats on export |
| `recommended_action` | `recommended_action` | — | App-specific extension |
| `authorship.generation_source` | `status` (`ai_suggested`…) + `generation_source` | `signals[].questionId === 'analyst'` vs auto | Same contract, unify encoding |
| `disposition` | `status` (approved/rejected) | `disposition` (new/pursuing/escalated/cleared) | Reconcile into one disposition vocabulary (may stay app-profiled) |
| `notes` | `analyst_notes` | `note` | Working notes; not exported |
| `lineage` | `brief_id`; section `finding_ids` | `case` (`id`), `referencePoints` | source→claim→product chain |
| `created_at`/`updated_at` | present | present (on case) | from `ids.js` |

**Reading of the mapping:** ~80% aligns one-to-one. The real work is (a)
introducing `subject`/Entity, (b) representing gradings as named axes so
`priority` ≠ `confidence`, and (c) unifying the authorship/disposition encoding.

---

## 6. Kernel vs. application-specific

**Kernel (meaning):**
- ids, timestamps
- ontology / controlled vocabularies (+ versioning) and `labelFor`
- the Claim envelope, Evidence reference, multi-axis Grading
- the Entity reference + human-gated resolution
- the provenance/authorship stamp + lineage
- the repository contract + storage seam
- the AI-assistance contract (rules, suggest-not-conclude, structured
  normalization, deterministic fallback)
- the lossless interchange (serialize/deserialize claims+evidence+entities)
- audit/authorization (seed)

**Application-specific (analysis + presentation):**
- **Waypoint:** observation model, geospatial logic, `collectionTypes`,
  `characterize`, `coverage`, the question-lens engine. *Emit Claims; aren't Claims.*
- **BriefBuilder:** brief templates, section/draft model, the Markdown product
  renderer (`exportMarkdown`), brief types.
- **App-extended vocabularies:** `DEVICE_CLASSES`, `COLLECTION_METHODS`,
  `BRIEF_TYPES`, `EVIDENCE_TYPES`, section templates — extend the ontology
  locally; do not move into the kernel.
- **Future apps:** LinkView graph layout, Trace timeline reconstruction,
  Exposure Lens collection, Spyglass search/monitoring — domain compute + UI.

**The line:** the analytic engine is app-specific; the graded,
evidence-backed, provenance-stamped Claim it produces is kernel-shared.

---

## 7. Phased extraction sequence

Cheapest / most-duplicated first; nothing speculative before it has two real
consumers.

1. **Phase A — Foundations (lowest risk, already duplicated).**
   Extract `ids` + the `ontology` (vocabularies + `labelFor` + the confidence
   scale). Two consumers exist; behavior is identical; no schema change.
2. **Phase B — Persistence.**
   Extract the repository contract + storage seam behind one interface; Waypoint
   and BriefBuilder become consumers. Still no domain change.
3. **Phase C — The Claim model.**
   Define the Claim envelope, multi-axis Grading, and Evidence reference. Make
   Finding and Lead *profiles* of it (per §5). Resolve the grading collision
   here. This is the first primitive that changes how apps think.
4. **Phase D — Provenance + AI contract.**
   Unify authorship/lineage; extract the `aiService` contract so Waypoint's
   (future) AI and BriefBuilder's share it.
5. **Phase E — Entity reference + resolution.**
   Introduce the Entity primitive and human-gated resolution. Sequenced last of
   the core because it is new design, not extraction — but it must land before
   LinkView/Trace, which are entity-centric.
6. **Phase F — Interchange + audit.**
   Lossless structured exchange across apps; audit/authorization hardening.

Application #3 should be built against Phases A–C at minimum.

---

## 8. Risks of extracting too early

- **Premature abstraction from one example.** Extracting a primitive shaped by
  only BriefBuilder (or only Waypoint) bakes in a single app's assumptions
  (e.g. assuming every Claim has a `risk_level`, which Waypoint's Lead lacks).
- **Speculative generality.** Building Entity/audit machinery before a second
  real consumer exists risks designing for imagined needs.
- **Coupling the apps to an immature kernel** slows both while the schema churns.
- **Mitigation:** only extract a primitive once it has **two real consumers**;
  keep Phase A–B (pure duplication) ahead of Phase C–E (new design); version the
  ontology and Claim schema from day one.

## 9. Risks of waiting too long

- **Semantic divergence locked into stored data.** Each new app invents its own
  confidence/priority/disposition encoding; the §3e collision multiplies and
  becomes un-migratable once persisted.
- **The moat erodes at every seam.** Cross-tool exchange — the suite's core
  value — silently loses meaning, exactly when more tools exist to exchange
  between.
- **N-way reconciliation.** Unifying six divergent claim models later is far
  more expensive and risky than reconciling two now.
- **Entity debt.** Building LinkView/Trace (entity-centric) without a shared
  Entity forces a painful retrofit or permanent per-app identity silos.

## 10. Next recommended implementation step

**Phase A only:** extract a single shared `kernel/ontology` + `kernel/ids`
module — the controlled vocabularies (with the confidence scale) and the
id/timestamp helpers — and make BriefBuilder and Waypoint both consume it,
deleting the duplicated definitions. No schema changes, no domain logic, two
existing consumers, immediately reversible.

This proves the extraction pattern against the lowest-risk, already-duplicated
surface, and establishes the `kernel/` home that Phases B–F populate. It is the
smallest possible step that converts the *accidental* kernel into a *managed*
one.

> Not authorized by this ADR: implementing the kernel, refactoring the apps, or
> changing any stored schema. This document records the decision and the plan;
> a separate change implements Phase A when approved.

---

## Addendum A (2026-06-08): LinkView taxonomy stays app-local; the implemented Phase-A surface, confirmed

This addendum records two facts established after the original ADR — the actual
implemented kernel surface, and a read-only inspection of LinkView
(`OpeniOracle/connect-uncover-insight`) — and the decision they force. The body
above is unchanged; this is appended, not edited.

### A.1 The Phase-A kernel surface is now implemented — and it is minimal
Phase A (§7.1, §10) has shipped. The **entire** shared surface, verified in this
repository, is:
- `src/kernel/ids.js` — `newId()` (`crypto.randomUUID` + fallback), `nowIso()`.
- `src/kernel/ontology.js` — `CONFIDENCE_LEVELS = [low, moderate, high]` and the
  generic `labelFor(vocab, value)`.

There is **no `EntityType`, no Claim envelope, and no richer confidence
vocabulary** in the kernel yet — those remain Phases C/E. Any integration
planning that assumes the kernel already defines a canonical entity type or a
multi-value verification taxonomy is mistaken about today's surface.

### A.2 LinkView's confidence taxonomy is a *different axis*, not richer confidence
Read-only inspection of LinkView (a TanStack Start + Supabase OSINT workspace;
analytical core in `src/lib/methodology.ts`, server layer in
`src/lib/linkview.functions.ts`, PG `confidence_level` enum in
`supabase/migrations/*`) shows a 9-value taxonomy:
`confirmed › likely › possible › unconfirmed › disputed › deconfliction_required`.

This is a **verification / analytic-status axis**, not the kernel's how-sure
`low | moderate | high`. They are not the same vocabulary at different fidelity.
Per §3e and §6, this places LinkView's taxonomy alongside BriefBuilder's
`risk_level` and Waypoint's `priority` as an **app-specific grading axis that
stays app-local** — it is *not* something LinkView consumes from Phase A.

### A.3 Decision
1. **LinkView's verification taxonomy remains app-local.** Do not align it to the
   kernel's `low | moderate | high`; snapping it would silently restate every
   corroboration score and deconfliction the app already produces.
2. **LinkView's own internal de-duplication is endorsed and is a separate concern
   from the kernel.** Collapsing its triplicated definitions (PG enum + Zod
   schema + UI label map) into one app-local module is sound hygiene and creates
   a *structural* seam (one module to import), not a *semantic* one (shared
   values). It keeps LinkView's taxonomy as its own source of truth.
3. **The kernel relationship for LinkView is contribution-upward, not
   consumption.** Its verification taxonomy, its NATO admiralty source grading
   (reliability A–F / credibility 1–6), and `methodology.ts` (corroboration
   scoring + deconfliction) are candidate **inputs to Phase C** (the multi-axis
   Grading + Claim envelope), to be considered once LinkView is a second real
   consumer (the two-consumer rule, §8).
4. **Ids:** LinkView mints row ids via Postgres `gen_random_uuid()` server-side,
   so it does not need kernel `newId()` today. Cross-app id-format alignment
   (§4) is a Phase-F interchange concern, not a Phase-A consumption.

### A.4 Open question for a future ADR (not resolved here)
Whether the suite's shared confidence axis stays **minimal** (`low | moderate |
high`, each app keeping richer local axes) or is **promoted** to a richer shared
verification taxonomy in a later phase. LinkView's 9-value taxonomy and the
current 3-value kernel scale are the two candidate models. This is an ADR-level
decision and must not be settled implicitly by either app's refactor; it belongs
with the Phase-C grading work.
