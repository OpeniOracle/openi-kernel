# ADR-004 — Openi Core as System of Record and LinkView as Proto-Core

- **Status:** Accepted (direction) — design only; no implementation authorized
- **Date:** 2026-06-15
- **Scope:** Openi Intelligence Suite — Kernel, Waypoint, LinkView, Brief Builder
- **Depends on:** ADR-001 (Reasoning Kernel), ADR-002 (Phase C Claim/Grading/
  Evidence), ADR-003 (Brief Builder import provenance)
- **Decision driver:** with the kernel contract proven (Phase A + C) and a
  working cross-app proof loop (Waypoint Lead → openi.bundle@1 → Brief Builder
  draft), decide the suite's long-term data architecture: who is the system of
  record, where the shared primitives live, and what each app owns.

> Direction-setting ADR. It authorizes no code, no schema change, and no repo
> refactor. It records the target architecture and the migration sequence the
> suite is measured against. Each implementation phase is a separate, approved
> change.

---

## 1. Context

Today the four components have sharply different maturity and storage:

- **Kernel** — a tiny, dependency-free shared *library/contract*: `ids`,
  `ontology`, and the Phase-C `claim`/`grading`/`interchange` primitives. It is
  the shared *language*, not a database. It is consumed by vendoring (Waypoint
  and Brief Builder carry a copy; LinkView contributes upward, doesn't consume).
- **LinkView** — the only component with a real **server-side database**:
  Supabase/Postgres with `cases, entities, relationships, sources, evidence,
  evidence_links, findings, timeline_events`, an import/resolution pipeline, a
  corroboration engine (+ overrides + audit log), RLS, roles, and Lovable+
  Supabase auth. It already implements the entity/evidence/relationship/
  corroboration model the rest of the suite lacks.
- **Waypoint** — client-only **localStorage**, zero-config. A CTD collection and
  lead-development *engine*: import → coverage → population → leads. Emits
  graded, evidence-backed claims (Leads); deliberately has no entity resolution.
- **Brief Builder** — client-only **localStorage** (Supabase optional). An
  intelligence *production* surface: briefs, findings, sections, Markdown export,
  author-of-record AI discipline. Consumes claims; produces products.

The suite's moat (ADR-001) is **lossless exchange of entities/evidence/claims/
gradings/provenance across tools**. Two facts force a decision now: (a) three of
the four components cannot share data because their storage is incompatible
(Postgres+RLS vs localStorage); (b) the one mature data model (LinkView's) is
trapped inside one app. Either the suite picks a shared system of record, or it
fragments into per-app silos exactly as more tools arrive.

---

## 2. Decision

The suite evolves toward a **three-layer architecture**:

1. **Kernel — the shared language/contract.** Types, vocabularies, the Claim
   envelope, multi-axis Grading, Evidence/Entity references, and lossless
   interchange (serialize/validate). Already exists; stays a versioned contract.
2. **Openi Core — the neutral system of record.** A shared service implementing
   the kernel contract over a canonical store: entities, relationships, evidence,
   sources, claims, provenance, lineage, audit, and auth/RLS. **No application is
   the system of record; Core is.**
3. **Applications — clients (engines and surfaces) over Core**, all speaking the
   kernel language:
   - **Waypoint** — CTD collection and lead-development engine. Emits entities +
     claims into Core.
   - **LinkView** — case management, entity resolution, corroboration, and graph
     investigation surface. Reads/writes the entity/evidence/relationship graph;
     its corroboration engine writes graded claims into Core.
   - **Brief Builder** — production/output layer. Reads claims/evidence/entities
     from Core; produces briefs/findings/sections; writes products + lineage back.

**Core is bootstrapped by generalizing LinkView's backend** — the
**proto-Core / reference implementation** — not by building a greenfield service.

---

## 3. Why LinkView is the proto-Core but NOT the long-term app-owned SoR

LinkView's backend is the seed because it already implements ~80% of Core
(entities, relationships, sources, evidence, findings, corroboration, RLS, auth)
and is the only proven, multi-user, server-side data model in the suite.
Rebuilding that greenfield would be waste and risk.

But the long-term system of record must be a **neutral Core**, not LinkView's
app backend, for four reasons:

1. **No app should own the moat.** If LinkView's backend is the SoR, the suite's
   canonical data is coupled to one app's release cycle, UI concerns, and
   roadmap. Cross-tool meaning becomes hostage to a product surface.
2. **Schema neutrality.** LinkView's tables carry LinkView-specific concerns
   (client-view fields, its verification taxonomy, graph/UI shaping). Core must
   expose the kernel-shaped primitives cleanly, with app-specific extensions held
   at the edges (per ADR-002 `appExtensions` + bundle vocabularies), so Waypoint
   and Brief Builder are not forced into LinkView's app model.
3. **Symmetry of clients.** In the target, LinkView is *also* a Core client. A
   neutral Core makes Waypoint, LinkView, and Brief Builder peers over one store;
   an app-owned SoR makes two apps second-class clients of a third.
4. **Governance & lifecycle.** Auth, RLS, audit, retention, and the
   interchange/versioning contract are platform responsibilities (ADR-001 §6
   audit/authorization seed; Phase F). They belong to a service governed as
   infrastructure, not to an application.

So: **LinkView's backend = proto-Core and reference schema; the destination = a
neutral Core extracted from it, with LinkView as its first client.**

---

## 4. What Core owns (the system of record)

- **Entities** + **Relationships** (the identity graph; human-gated resolution —
  kernel Phase E), modeled on LinkView's `entities`/`relationships`.
- **Evidence** + **Sources** (with source grading, e.g. admiralty reliability/
  credibility), modeled on LinkView's `evidence`/`sources`.
- **Claims** (the kernel Claim envelope: multi-axis grading, evidence refs,
  provenance, disposition, lineage) — the unification of Brief Builder Finding +
  Waypoint Lead + LinkView Finding.
- **Provenance, authorship, and lineage** (source → claim → product chain),
  including imported-claim identity per ADR-003.
- **Interchange** (serialize/validate openi.bundle@1) and **audit**.
- **Identity, auth, RLS, retention** — platform governance.

Core owns **meaning and custody**. It does not own analysis or presentation.

---

## 5. What each app owns

- **Waypoint** — collection + analysis for CTD: observation model, coverage,
  characterization, the question-lens engine, lead development. *Emits* entities
  (devices) and claims (leads) into Core; owns none of the canonical store.
- **LinkView** — the investigation surface: **case management**, **entity
  resolution**, **corroboration** (scoring, deconfliction, overrides, audit), and
  **graph/timeline analysis**. Reads/writes the Core graph; its corroboration
  *outputs* are claim gradings in Core, while the *engine* and its verification
  taxonomy stay app-local (ADR-002 §3, a contribution-upward candidate).
- **Brief Builder** — **intelligence production**: brief templates, sections,
  draft model, author-of-record AI discipline, product rendering/export. Consumes
  Core claims/evidence/entities; produces briefs and writes products + lineage
  back to Core.

The line (ADR-001 §6 restated): **analytic engines and product forms are
app-owned; the graded, evidence-backed, provenance-stamped data they exchange is
Core-owned, in the kernel language.**

---

## 6. Interim integration — through kernel bundles (now)

Before Core exists, apps cooperate via the **kernel interchange contract**
(openi.bundle@1), exactly as the proof loop already demonstrates:

- Waypoint `leadsToBundle()` emits an openi.bundle@1 (shipped).
- Brief Builder `bundleToFindingDrafts()` ingests it into `ai_suggested` drafts
  (shipped), preserving authorship/grading axes/appExtensions in a provenance
  sidecar (ADR-003).

This file/clipboard/endpoint-level bundle exchange lets the suite deliver
cross-tool value **without a shared backend**, keeps each app's zero-config
posture, and validates the kernel schema against real emitters/consumers before
any storage migration. LinkView gains a symmetric `bundle` emit/ingest at the
edge of its backend as the next interchange consumer.

---

## 7. Long-term integration — Core-backed (target)

Once Core exists, bundles become the **interchange/export format**, and the
primary path is **shared persistence**: apps read/write Core via an API that
speaks the kernel contract. Entities and evidence resolve to one identity across
tools; claims carry all axes intact; corroboration and production operate on the
same graph; lineage is end-to-end. The interim bundle exchange does not get
thrown away — it remains the offline/cross-org/air-gap interchange path and the
audit artifact.

---

## 8. Migration sequence (harvest, don't rewrite — ADR-001 §7/§8)

1. **Deepen interchange (now).** Keep the bundle path; add LinkView bundle
   emit/ingest so all three apps speak openi.bundle@1. Land ADR-003's provenance
   persistence in Brief Builder. *No backend change.*
2. **Generalize LinkView's backend into a Core API.** Expose entities, evidence,
   sources, claims behind a kernel-contract-shaped API; LinkView becomes its
   first client. *Schema is harvested, not rebuilt.*
3. **Point Brief Builder at Core for reads** (claims/evidence/entities) behind
   its existing swappable repository seam — the cheapest second consumer, since
   its data layer is already backend-agnostic.
4. **Point Waypoint at Core for writes** (emit entities + claims) once Phase-E
   entity resolution exists in Core; Waypoint keeps localStorage for raw
   observations (volume) and promotes only claims/entities.
5. **Promote Core to a neutral service.** Extract it from the LinkView codebase
   into its own deployable, governed as infrastructure (auth/RLS/audit/
   retention). LinkView becomes a peer client.
6. **Interchange + audit hardening (kernel Phase F).** Lossless cross-org export,
   audit/authorization, retention policy.

Sequencing rule: **entities and evidence first** (the shared primitives), claims
next, corroboration last; **two real consumers before any extraction.**

---

## 9. Risks

- **Loss of zero-config.** Waypoint/Brief Builder are zero-setup localStorage
  MVPs; making them Core clients adds network/auth/offline complexity.
  *Mitigation:* keep the bundle path and the swappable repository seam; move read
  paths before write paths; allow local-only operation with bundle sync.
- **"Extract Core" becomes "rewrite LinkView."** *Mitigation:* harvest the
  existing schema behind an API; LinkView stays running as the first client; no
  greenfield service until Core has ≥2 real consumers.
- **Schema coupling to one app.** Core inheriting LinkView-specific fields/
  taxonomy. *Mitigation:* kernel-shaped core tables; app specifics ride in
  `appExtensions` + bundle vocabularies; LinkView's verification taxonomy stays
  app-local pending a Phase-C grading decision.
- **Premature centralization.** Building Core before consumers exist (ADR-001
  §8). *Mitigation:* the migration is consumer-driven; each step needs a real
  second consumer.
- **Auth/identity divergence.** LinkView has Lovable+Supabase auth/roles;
  Waypoint/Brief Builder have none. *Mitigation:* Core owns identity; the
  hub/launcher (LinkView) brokers sessions; apps adopt Core auth as they become
  clients.
- **Data-meaning drift during transition.** Two stores (localStorage + Core) in
  flight. *Mitigation:* one shared write shape; version every schema/scheme;
  reconcile via bundles.

---

## 10. Non-goals

- Not building a greenfield Core service now.
- Not rewriting LinkView, Waypoint, or Brief Builder.
- Not changing any stored schema in this ADR (ADR-003 covers the first, separate,
  Brief-Builder-local schema step).
- Not forcing Waypoint/Brief Builder onto a server immediately, nor removing
  their localStorage mode.
- Not promoting LinkView's verification taxonomy into the kernel here (a Phase-C
  grading decision).
- Not designing the Core API surface or the launcher/shell UX in detail (separate
  ADRs).

---

## 11. Immediate next implementation decision after approval

**Add a symmetric kernel-bundle seam to LinkView** — an `openi.bundle@1` emit
(case claims/entities/evidence → bundle) and ingest (bundle → staged
entities/evidence/claims) at the edge of its existing backend, mirroring the
Waypoint emitter and Brief Builder ingest. This is the smallest, lowest-risk step
that (a) makes all three apps speak the interchange contract, (b) exercises the
kernel schema against LinkView's mature model (surfacing what Core must own), and
(c) requires no Core service and no schema migration. It is the concrete bridge
between today's bundle interchange and tomorrow's Core, and the cheapest way to
learn what Core's entity/evidence/claim API must look like before building it.

(Runner-up, parallelizable: implement ADR-003's provenance persistence in Brief
Builder, so ingested claims survive with meaning before any Core exists.)
