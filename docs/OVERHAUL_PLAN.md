# Openi Ecosystem Overhaul — Prioritized Plan

Date: 2026-07-09. Grounded in `docs/ECOSYSTEM_MAP.md`. Scope is calibrated to
what exists (three JS/TS localStorage-first MVPs, one production-grade SSR app,
a two-file kernel), not to an imagined ideal.

## Decisions taken (recorded per the "pick the simplest option and move" rule)

1. **Kernel expands via ADR-002, kernel-first, dependency-free.** ADR-001
   forbids expansion without an ADR; ADR-002 (in `docs/adr/`) authorizes the
   Phase C/D/E/F surface this plan needs. The kernel stays plain ESM JS with
   zero runtime dependencies, plus hand-written `.d.ts` so TS apps (HashLens,
   later LinkView) get types. Tests use `node:test` (no framework added).
2. **Amber reconciliation.** The target design language makes amber the single
   signal accent; BriefBuilder/Waypoint currently reserve amber for AI
   provenance. Resolution: amber is the suite-wide signal/action accent; AI
   provenance keeps a *distinct treatment* (✦ glyph + explicit "AI" badge +
   border) so provenance never relies on color alone. This is also an
   accessibility improvement — color-only encoding was fragile.
3. **Geist introduced self-hosted via the `geist` npm package** (or vendored
   woff2 if the package proves Next-only), declared once in kernel tokens with
   a full system fallback stack. Today no app even links its declared fonts.
4. **LinkView is a source, not a target, this session.** Its Admiralty scale
   and entity-type enum are adopted *into* the kernel (contribution-upward,
   ADR-001 Addendum A). No LinkView code changes now — it is the most mature
   app, has its own coherent design, and retrofitting it is high-risk/low-gain
   until the kernel surface has proven itself in the three smaller apps.
5. **No launch/SSO invention.** No launch-token pattern exists in any repo.
   Building one is a platform-level decision requiring an issuer app that
   doesn't exist. Deferred; HashLens's stub entitlements stay stubs.
6. **Case packet is the interop unit** (`openi.casepacket.v1`): a versioned
   JSON envelope of claims + evidence + entities + provenance + case metadata.
   File-based exchange (export/download → import) first; no shared database,
   no cross-app network calls. This matches reality: apps don't share auth or
   storage, and analysts already move files.
7. **Kernel git-dependency pinning.** Consumers pin
   `#claude/openi-ecosystem-overhaul-xc5kca` during the overhaul so branch
   builds are reproducible; repoint to the default branch when kernel merges.
8. **BriefBuilder's Supabase RLS fix ships as append-only SQL + manual
   instructions** (`schema.sql` may already be applied somewhere; it is never
   rewritten).

## Workstreams

### WS1 — Kernel v0.2.0 (the foundation; everything else depends on it)

New modules, each versioned, documented, typed, tested:

- `grading` — named multi-axis grading (resolves ADR-001 §3e):
  `confidence` (existing low|moderate|high), `severity` (low|medium|high|
  critical — from BB `risk_level`), `source reliability` A–F + `credibility`
  1–6 (NATO Admiralty, from LinkView), plus room for app-defined ranking axes
  that must never be collapsed into confidence.
- `entity` — EntityRef `{ id, type, label, identifiers? }` with the canonical
  type enum (person|organization|location|account|asset|event|other — from
  LinkView, superset covers Waypoint devices as `asset` and HashLens selectors
  as `account`).
- `evidence` — evidence reference `{ id, kind, label, locator }` + integrity
  fields (content hash, hash algorithm, captured_at, capture metadata) — from
  HashLens's practice.
- `claim` — the Claim envelope per ADR-001 §5: subject (EntityRef), statement,
  gradings (named axes), evidence refs, caveats, authorship, disposition,
  lineage. Constructors + normalizers, not classes.
- `provenance` — unified authorship stamp: `generation_source`
  (ai_generated|analyst_edited|analyst_written), status vocabulary, lineage
  links (source → evidence → claim → product).
- `casepacket` — `openi.casepacket.v1` serialize/validate/deserialize; every
  packet self-describes producer app + kernel schema version.
- `export` — one branded export layer: `buildMarkdown(packet-ish doc model)`
  and `buildHtml(...)` (self-contained, print-to-PDF-ready, Openi-branded,
  escaped). DOCX deferred (heavy dependency).
- `format` — shared `escapeHtml`, `csvEscape`/`csvRow`, `slugify` (today
  re-implemented per app).
- `tokens` — design tokens as data (color scale, semantic roles, font stacks)
  + a Tailwind v3 preset (`@openi/kernel/tailwind-preset`) + a CSS custom
  properties file for non-Tailwind-3 consumers (LinkView later).
- `index.d.ts` per module; `node:test` suites; README + ADR-002.

### WS2 — Shared design system adoption (BriefBuilder, Waypoint, HashLens)

Replace three local token sets with the kernel preset: deep-navy surfaces,
bone text, amber signal accent, Geist/Geist Mono self-hosted. Keep each app's
layout; change tokens and primitives only. Improvement statements: one source
of truth for brand (fixes 4-way drift), real fonts actually loaded (today:
system fallbacks everywhere), amber accent + explicit AI badging (provenance no
longer color-only), unchanged information density.

### WS3 — Interoperability (the analyst-visible payoff)

- **Waypoint → case packet export** (its roadmap's top missing capability):
  dispositioned leads become kernel Claims — priority stays a named app axis,
  coverage ceiling becomes caveats, signals become evidence, provenance
  carried. Download as `.openi-case.json`.
- **BriefBuilder ← case packet import**: create/extend a brief from a packet —
  claims land as findings (provenance preserved, analyst still approves),
  packet evidence lands as evidence items.
- **BriefBuilder export upgrade**: consume kernel `export` — adds branded HTML
  (print → PDF) beside Markdown; removes the app-local serializer drift.
- **HashLens**: adopt kernel `ids` + `format` (delete local duplicates); wire
  `buildCasePacket()` stub to a real packet export of match results.

### WS4 — Security & hygiene (small, targeted, this session)

- Remove the hardcoded personal analyst email from BriefBuilder and Waypoint
  (default to empty + remember last-used locally).
- BriefBuilder RLS: append-only `supabase/upgrade-owner-rls.sql` + manual
  dashboard instructions implementing per-analyst ownership (Option B).
- Waypoint fork leftovers (stale BriefBuilder comments) cleaned.
- Smoke tests (`node:test`, zero new deps) for the pure libs each change
  touches: BB `exportMarkdown`/import mapping, Waypoint packet export mapping.
- Pin kernel git deps to the overhaul branch (see decision 7).

## Sequencing

1. WS1 kernel (blocks everything).
2. WS2 + WS3 per app, one app at a time, quality gates after each:
   Waypoint (tokens + packet export) → BriefBuilder (tokens + import + export
   layer) → HashLens (tokens + ids/format + packet).
3. WS4 folded into each app's pass; kernel-dep pinning first in each.

Quality gates per repo before "done": typecheck (where configured), lint
(where configured), tests, production build. BB/Waypoint gain minimal
`node:test` scripts as their first-ever gates.

## Ranked backlog (candidates ranked impact ÷ effort; top items above the line were selected)

| # | Item | Impact | Effort | Status |
|---|---|---|---|---|
| 1 | Kernel primitives + tokens (WS1) | Very high — unblocks all sharing | M | **this session** |
| 2 | Waypoint→BB packet interop (WS3) | Very high — most-requested workflow | M | **this session** |
| 3 | Shared design system in BB/WP/HL (WS2) | High — brand unification, real fonts | M | **this session** |
| 4 | Kernel export layer + BB HTML/PDF export (WS3) | High — client-ready deliverables | M | **this session** |
| 5 | Hardcoded email + RLS guidance + smoke tests (WS4) | Medium — hygiene/security | S | **this session** |
| 6 | HashLens kernel adoption + packet export | Medium | S | **this session** |
| 7 | Kernel Phase B repository contract (3 consumers exist) | High | L | next session |
| 8 | LinkView token/kernel adoption + Geist | Medium | L | next session |
| 9 | HashLens → LinkView graph export | Medium | M | deferred |
| 10 | Platform launch/SSO + real entitlements | High | XL | deferred — needs platform issuer decision |
| 11 | BB AI proxy (move keys server-side) | High (security) | L | deferred — needs hosting decision; documented risk |
| 12 | DOCX export | Low | M | deferred — heavy dep, HTML→PDF covers client needs |
| 13 | HashLens server-side export/reveal enforcement (Edge Fn) | Medium | L | deferred (its own P0 backlog) |
| 14 | Waypoint Supabase backend | Low now | L | deferred |
| 15 | Monorepo migration | — | XL | rejected — git-dep + kernel versioning is the cheap route |

## Explicitly deferred / rejected (rationale)

- **SSO/launch tokens** — nothing to conform to; inventing it violates the
  "never invent parallel auth" guardrail (decision 5).
- **LinkView changes** — source of canon this session, not a retrofit target
  (decision 4).
- **Kernel Phase B (repository contract)** — real target with three consumers,
  but touching every app's persistence in the same session as the token +
  interop changes concentrates too much risk; next session, on top of a
  proven v0.2.0.
- **Monorepo / rewrite / new frameworks** — discovery shows no need; guardrail.
- **9-value verification taxonomy promotion** — stays app-local per ADR-001
  Addendum A §A.4; a future ADR owns that question.
