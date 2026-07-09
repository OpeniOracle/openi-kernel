# Openi Ecosystem Map — Current State

Date: 2026-07-09. Compiled from full read-only discovery of the five connected
repositories. This is the factual baseline the overhaul plan
(`docs/OVERHAUL_PLAN.md`) is built on.

## Repos at a glance

| Repo | Product | Stack | Storage | Kernel? | Tests / gates | Maturity |
|---|---|---|---|---|---|---|
| `openi-kernel` | Shared primitives | Plain ESM JS, no build | — | is the kernel | none | Phase A only (ids + ontology) |
| `BriefBuilder` | Intelligence brief production | React 18 + Vite, **JS/JSX** | localStorage default; optional Supabase (`supabase/schema.sql`) | ✅ ids, ontology (git dep) | none | MVP, clean architecture |
| `waypoint` | Geofence / CTD lead generation | React 18 + Vite, **JS/JSX** | localStorage only (`waypoint.v1`) | ✅ ids, ontology (git dep) | none | Early MVP, strong design docs |
| `hashlens` | Hash / credential workbench | React 18 + Vite, **TS** | dual: localStorage or Supabase (11 tables, strict RLS) | ❌ (TODO stubs only) | 23 vitest tests, lint `--max-warnings=0`, typecheck | Solid MVP, security-first |
| `connect-uncover-insight` | **LinkView** — OSINT investigation workspace | TanStack Start (SSR, React 19, TS, Tailwind v4), Cloudflare Workers | Supabase (~45 migrations, ~35 tables, rigorous RLS) | ❌ (brand strings only) | vitest suites, CI (`verify` = format→lint→typecheck→test→build) | Most mature by far |

Naming note: the directive's "HashLens / Hardens" resolves to the `hashlens`
repo. `connect-uncover-insight` is LinkView (Lovable-generated repo name;
`package.json` name is still the template `tanstack_start_ts`).

Baseline quality gates verified in this environment (2026-07-09): BriefBuilder
build ✓, Waypoint build ✓, HashLens typecheck + 23 tests + build ✓. LinkView:
`bun install` fails here (Lovable private registry 403); `npm install` from the
public registry works — typecheck/build status recorded in the overhaul plan.

## Lineage

BriefBuilder was the original repo containing both BriefBuilder and Waypoint.
ADR-001 (this repo, `docs/adr/`) extracted Phase A of the kernel
(`ids`, `ontology`); Waypoint and the kernel were then split into their own
repos. HashLens and LinkView were built independently and share no code with
the rest — only conventions and brand strings.

## Per-repo profiles

### openi-kernel (`@openi/kernel` 0.1.0)

- Three files: `ids.js` (`newId`, `nowIso`), `ontology.js`
  (`CONFIDENCE_LEVELS` low|moderate|high, `labelFor`), `index.js` barrel.
- Plain ESM, no build step, no deps, no tests. Subpath exports `./ids`, `./ontology`.
- Consumed by BriefBuilder and Waypoint as a **git dependency with no ref pin**
  (`git+https://github.com/OpeniOracle/openi-kernel.git`) — consumers track the
  default branch; lockfiles pin the resolved commit.
- ADR-001 (+ Addendum A) governs expansion: phases B–F planned
  (persistence contract, Claim envelope, provenance/AI contract, Entity,
  interchange), two-real-consumers rule, app-specific grading axes stay local.

### BriefBuilder

- Entities: Brief, Evidence, Finding, Section (`src/data/repository.js`),
  swappable localStorage/Supabase backends. Root key `briefbuilder.v1`.
- Grading: `risk_level` (low|medium|high|critical) + kernel confidence.
  Provenance: `GENERATION_SOURCES` (ai_generated|analyst_edited|analyst_written),
  `FINDING_STATUSES` (ai_suggested|analyst_approved|rejected). AI is
  suggest-not-conclude with deterministic fallback (`src/services/aiService.js`).
- Export: Markdown only (`src/lib/exportMarkdown.js` + `ExportPanel`), with AI
  disclaimer and evidence reference list. No HTML/PDF/DOCX.
- Supabase: single `supabase/schema.sql` (not numbered migrations). Active RLS
  policy is "any authenticated user, full access to all rows" (Option A);
  per-analyst ownership is a commented-out Option B. Evidence storage bucket
  described in comments only; file upload is a metadata placeholder.
- Security: AI keys are `VITE_`-exposed and called **directly from the browser**
  (incl. `anthropic-dangerous-direct-browser-access`), documented as
  internal-network-only. Hardcoded default analyst email in `BriefContext.jsx`.
  No auth, no route guards. No XSS vectors found (no `dangerouslySetInnerHTML`).
- No tests, no lint, no typecheck. Scripts: dev/build/preview only.

### Waypoint

- One aggregate: the case (geofence investigation) — observations, coverage,
  population characterization, question-lens leads. Leads are **computed, not
  persisted**; persisted analyst state is dispositions/notes/manual promotions.
- App-local grading axes by design: device classes, coverage verdicts
  (usable|caveated|insufficient), lead priority (strong|worth_look|weak),
  dispositions (new|pursuing|escalated|cleared), signal weights.
- localStorage only (`waypoint.v1`). No Supabase, no auth, no export of any kind.
  "Export to BriefBuilder" is the roadmap's top named missing capability
  (Phase 4; scenarios doc repeatedly flags it).
- Rigorous import validation (`lib/observations.js`); pure, UI-free `lib/`
  modules (coverage, characterize, questions, time) — easily testable, untested.
- Heritage artifacts: `vite.config.js` header still says "BriefBuilder dev/build
  config"; `Modal.jsx` comment references the create-brief flow; hardcoded
  default analyst email in `WaypointContext.jsx`.

### HashLens

- Loop: paste → detect → hash/match → document → export. 11 Supabase tables,
  strict case-scoped RLS (SECURITY DEFINER helpers), append-only `reveal_logs`,
  hash-only mode enforced by DB trigger, audited reveal with typed reason.
- Dual backend behind one `CaseStore` interface (`src/data/store.ts`).
  Supabase email/password auth; local demo mode grants `isAdmin: true`.
- Export: client-safe CSV + self-contained print-ready HTML summary
  (`src/lib/export.ts`, hand-rolled `csvEscape`/`escapeHtml`).
- Integration seams are **inert stubs** (`src/integrations/index.ts`):
  `hasToolEntitlement()` returns `true`, `exportToBriefBuilder`,
  `exportGraphToLinkView`, `enrichSelector`, `buildCasePacket` all unwired,
  with comments pointing at `openi-kernel`.
- Duplicates kernel Phase-A primitives locally: `uuid()` + `nowIso()` in
  `src/lib/utils.ts`. Own hand-rolled shadcn-style `ui.tsx` + own palette.
- Best-tested pure logic in the suite (detect/hashing/normalize/matching/export).
  Backlog (`BACKLOG.md`) already names kernel ids/ontology adoption, BriefBuilder
  packet push, LinkView graph export as P1/P2 items.

### LinkView (connect-uncover-insight)

- Full OSINT case workspace: import (Maltego/GraphML/CSV/JSON) → entity
  resolution/merge → sources with **NATO Admiralty grading** (reliability A–F,
  credibility 1–6) → evidence/corroboration scoring (0–100, weighted by
  reliability) → Canvas → versioned Intelligence Products → client-safe shares.
- 9-value verification taxonomy (confirmed…deconfliction_required) — per
  ADR-001 Addendum A this is an app-local axis, **not** kernel confidence.
- Auth: Supabase email/password; every server function goes through
  `requireSupabaseAuth` middleware building a per-request RLS-scoped client.
  Service-role client used narrowly (anonymous share redemption + audit).
  zod v4 validation on every server-function input.
- Share tokens: 256-bit, stored hashed, expiry + max-views + revocation +
  hashed-IP audit. Client-safe serialization boundary with leak scanners.
  This is the strongest security work in the suite.
- **No sibling-app launch/SSO pattern exists** (here or anywhere): no launch
  tokens, no cross-app JWT, no entitlement handshake. The MCP OAuth routes are
  for external MCP clients, not sibling apps.
- Export: client-view JSON package + print-ready views; ingestion libs (xlsx,
  papaparse, jszip) are import-side only.
- De-facto in-repo kernel: `src/lib/methodology.ts` + `corroboration/scoring.ts`
  (pure, isomorphic). Nothing consumed from `@openi/kernel`.

## Design language — current reality vs. target

No repo currently implements the target design language (deep navy / bone /
single amber accent / Geist + Geist Mono). Four divergent systems exist:

| | BriefBuilder | Waypoint | HashLens | LinkView |
|---|---|---|---|---|
| Surfaces | navy-950 `#0a0f1c` … navy-500 | identical (copy of BB) | near-black `#0b0f17` | oklch near-black ≈ `#080a0e` |
| Text | slate-200 | slate-200 | slate-200 | ≈ `#c8cdd5` |
| Accent | blue `#3b82f6` | blue `#3b82f6` | sky `#38bdf8` | electric blue `#5b8def` + gold `#C9A227` |
| Amber usage | **reserved for AI provenance** (`ai.*` `#d8a657`) | same | warn state | gold = case accents/priority |
| Fonts | Inter (unlinked → system fallback) | Inter (same) | system sans + mono override | DM Sans / JetBrains Mono / **Source Serif Pro headings** |
| Mechanism | Tailwind 3 config + `bb-*` classes | copy of BB's | Tailwind 3 config + hand-rolled `ui.tsx` | Tailwind v4 `@theme` CSS custom properties (oklch) |
| Modes | dark only | dark only | dark only | dark-first (`.dark` no-op) |

Consolidation notes: BB/Waypoint's navy scale is the closest existing base for
"deep navy". Amber exists everywhere but means different things — BB/Waypoint's
"amber = AI-generated" convention must be reconciled with "amber = the signal
accent" (resolution recorded in the overhaul plan). Geist is used nowhere and
must be introduced (self-hosted; no repo currently even links its declared
fonts, so all four render system fallbacks today).

## Duplication and divergence targets

Every place two apps solve the same problem differently:

1. **ID + timestamp generation** — kernel owns it; HashLens re-implements
   (`src/lib/utils.ts`); LinkView uses DB `gen_random_uuid()` (fine per
   Addendum A §A.3.4).
2. **Repository/storage seam** — three parallel implementations of the same
   async CRUD + localStorage-JSON-blob + optional-Supabase pattern:
   BriefBuilder `src/data/*`, Waypoint `waypointRepository.js` ("mirrors
   BriefBuilder's pattern"), HashLens `src/data/store.ts`. ADR-001 Phase B.
3. **Design tokens + UI primitives** — BB/Waypoint literally copy-pasted
   (`bb-*` classes, identical tailwind.config); HashLens and LinkView each
   hand-rolled their own. Four sources of truth for one brand.
4. **Graded-claim shape** — BB Finding, Waypoint Lead (ADR-001 §5 mapping),
   HashLens MatchResult (numeric confidence heuristic), LinkView Finding +
   corroboration. No shared envelope; cross-app exchange is impossible without
   meaning loss (the §3e grading collision is live).
5. **Provenance/authorship encoding** — BB `generation_source`+`status`;
   Waypoint analyst-signal + dispositions; HashLens `origin`
   (discovered|generated) + append-only reveal audit; LinkView
   entity-merge/corroboration audit tables. Same contract, four encodings.
6. **Source grading** — LinkView has NATO Admiralty (A–F / 1–6); BriefBuilder
   evidence has no source grading at all; HashLens has source_label only.
   Admiralty is the defensible scale and exists in exactly one app.
7. **Export/reporting** — four behaviors: BB Markdown, HashLens CSV +
   print-HTML, LinkView JSON package + print views, Waypoint nothing. Escaping
   helpers (`escapeHtml`, `csvEscape`, `slugify`) re-implemented per app.
8. **Entity concept** — LinkView has a full entity model
   (person|organization|location|account|asset|event|other + relationships);
   BB has string fields; Waypoint has device selectors; HashLens has selectors.
   ADR-001 §3f: Entity must be designed centrally; LinkView's enum is the
   obvious canonical starting point.
9. **Auth & entitlements** — none (BB, Waypoint) vs. Supabase auth (HashLens,
   LinkView) vs. stub entitlements (HashLens `hasToolEntitlement() → true`).
   No launch/SSO pattern exists anywhere to conform to.
10. **Validation** — zod v4 everywhere (LinkView) vs. hand-rolled normalizers
    (everyone else). Kernel must stay dependency-free, so kernel-side
    validation is hand-rolled; apps keep their own edge validation.
11. **Default analyst identity** — the same personal email hardcoded in
    BriefBuilder and Waypoint source.

## Interop today

None at runtime. The only realized interop is BB/Waypoint importing kernel
Phase A. Everything else is stubs (HashLens `src/integrations/`), roadmap
entries (Waypoint Phase 4 "Export to BriefBuilder"), or backlog items
(HashLens P2: BriefBuilder packet push, LinkView graph export, kernel ids).
No common case/evidence packet format exists. No app can launch another.

## Maturity calibration

- **LinkView** — production-grade patterns; treat as the *source* of canonical
  designs (Admiralty grading, entity types, client-safe boundary, share
  tokens), not as a retrofit target this session.
- **HashLens** — disciplined MVP with real gates; cheap to bring onto kernel
  Phase A + shared tokens.
- **BriefBuilder** — clean MVP, no gates; best candidate for the shared export
  layer and packet import.
- **Waypoint** — earliest; its missing export is the highest-leverage interop
  gap in the suite.
- **Kernel** — deliberately minimal; expansion requires an ADR (ADR-002).
