# Openi Ecosystem — Change Log

## 2026-07-09 — Overhaul session 2: integrate, then elevate

### Stage 1 — integrated and stabilized (on default branches)
- Fresh gates green on every feature branch, then **session 1 merged**:
  kernel → `main` (merge commit `0b592d3`, tagged `v0.2.0` locally — tag
  push returns 403 in this environment, queued for the operator);
  BriefBuilder → `claude/briefbuilder-mvp-planning-YiOql` (its actual
  default — the repo has no `main`); Waypoint and HashLens → `main`.
- Consumer kernel pins repointed from the floating branch to the exact
  commit SHA. Post-merge gates green everywhere; the Waypoint →
  BriefBuilder casepacket round trip re-verified through merged code.
- PII/secret sweep across all five repos: personal email/name fully gone;
  only synthetic fixtures remain; no service-role keys anywhere. One
  finding: LinkView tracked `.env` (public-safe anon key) — untracked in
  the LinkView pass.
- Feature branches kept alive (they carry this session's Stage 2 work,
  which awaits review/merge); deletion deferred accordingly. A stale
  parallel branch `claude/openi-suite-architecture-2wx9y7` (June, its own
  bundle-export design) exists in three repos — flagged for reconciliation.

### Stage 2 (on feature branches, gates green, ready to merge)
- **UI facelift (2A).** Waypoint leads: disposition-colored rails, mono
  weight chips (STR/MOD/WK), amber discipline (signal = escalated/anomalous
  only), denser cards, Enter-to-save triage notes. BriefBuilder workspace:
  per-tab counts + pending-review dot, approved/total ratio, import modal
  previews every incoming claim. HashLens case results: matched-digest
  column with copy, sub-85% confidence flagged, ISO mono dates.
  Before/after screenshots captured.
- **Kernel v0.3.0 (2B, ADR-003).** `@openi/kernel/repository` — the
  localStorage storage seam three apps re-implemented; BriefBuilder and
  Waypoint migrated behavior-preserving (verified in-browser against
  pre-change blobs); HashLens deferred (domain-rich store, see ADR-003).
- **LinkView first contact (2C).** Suite tokens on its theme variables
  (surfaces/text/gold; `--primary` blue deferred — load-bearing in entity
  palette and charts), self-hosted Geist replacing the Google Fonts CDN,
  serifs retired, casepacket v1 export from the client view with the
  verification taxonomy on its own axis. Vendored kernel subset (commit
  `b594b97`) because bun cannot take the git dep here. No schema/CI changes.
- **Casepacket governance (2D).** `docs/casepacket-policy.md`: additive-only
  within v1, breaking bumps + ADR, importers reject unknown versions with
  an analyst-readable message, vendored copies must state their source.

## Queued backlog — next session

1. Merge this session's Stage 2 feature branches after review (kernel
   v0.3.0 first, then consumers — pins already reference the kernel SHA).
2. Push the `v0.2.0` tag (and tag v0.3.0 at its merge) — operator, see
   checklist.
3. LinkView `--primary` → amber decision (needs a pass over entity palette
   + charts so amber-as-signal doesn't collide with gold case accents).
4. LinkView on the real `@openi/kernel` dependency once bun/registry
   allows; delete the vendored subset.
5. HashLens localStore onto the kernel repository seam (ADR-003 deferral).
6. Kernel strict-UUID helper so HashLens drops its local `uuid()`.
7. Waypoint packet import (round-trip parity); HashLens → LinkView graph
   export; BriefBuilder AI proxy; launch/SSO + entitlements (platform
   decision); reconcile/archive `claude/openi-suite-architecture-2wx9y7`.

## 2026-07-09 — Overhaul session 1 (branch `claude/openi-ecosystem-overhaul-xc5kca`, all repos)

### openi-kernel
- **v0.2.0** (ADR-002): new modules `grading` (multi-axis: confidence,
  severity, NATO Admiralty reliability/credibility, app-defined rankings that
  never collapse), `entity`, `evidence` (integrity fields), `claim`,
  `provenance`, `casepacket` (`openi.casepacket` v1 interchange), `export`
  (branded Markdown + print-ready HTML), `format` (escaping/CSV/slug),
  `tokens` + Tailwind preset + `tokens.css` (navy/bone/amber-signal/Geist).
- Hand-written `.d.ts` for all modules (strict-tsc verified); 16 `node:test`
  cases; `docs/ECOSYSTEM_MAP.md`, `docs/OVERHAUL_PLAN.md`, ADR-002.

### waypoint
- Kernel design tokens + self-hosted Geist (first actually-loaded font).
- **Case-packet export from the Leads tab** — the roadmap's top-named gap:
  escalated/pursuing leads (or all) download as `.openi-case.json`; priority
  travels as `waypoint.priority`, coverage ceiling becomes caveats, signals
  become evidence refs.
- Hardcoded personal analyst email removed; stale fork comments cleaned;
  first tests added (`npm test`, node:test, 4 cases).

### BriefBuilder
- Kernel design tokens + Geist.
- **Case-packet import from the Dashboard**: claims → finding cards with
  provenance preserved (ai_generated arrives pending review), evidence
  remapped, rankings never re-scored; inline errors, confirm-before-create.
- **Branded HTML export** (print → PDF) from the kernel export layer beside
  Markdown.
- `supabase/upgrade-owner-rls.sql`: append-only per-analyst RLS upgrade with
  manual dashboard steps. Hardcoded email removed; first tests added (5 cases).
- Verified end-to-end: Waypoint sample export → BriefBuilder import.

### hashlens
- Kernel design tokens (brand: app-local sky → suite amber) + Geist; kernel
  `nowIso` + `csvRow`/`escapeHtml` (adds formula-injection prefixing and
  single-quote escaping). `uuid()` deliberately stays local (PG uuid contract).
- **Client-safe case-packet export** on case results (masked values only —
  plaintext never crosses the boundary); numeric match confidence travels on
  its own `hashlens.match_confidence` axis; audited under a new `case_packet`
  export kind (append-only migration 0002). 27 tests total (4 new).

### connect-uncover-insight (LinkView)
- **No changes by decision** — source of canon this session (Admiralty scale,
  entity types harvested into the kernel), not a retrofit target. See
  OVERHAUL_PLAN decisions 4.

All quality gates verified per repo: typecheck/lint where configured, tests,
production build. Baselines were green before changes.

## Queued backlog — next session

1. **Kernel Phase B — repository/storage contract** (three parallel
   implementations exist: BriefBuilder, Waypoint, HashLens). Highest-value
   remaining dedup; deliberately kept out of this session's risk budget.
2. **LinkView adoption**: consume `tokens.css` (Tailwind v4), Geist decision
   (currently DM Sans + serif headings — needs a design call against "no
   serifs"), export its findings as case packets, and feed its 9-value
   verification taxonomy question into the Phase-C ADR (ADR-001 A.4).
3. **Kernel strict-UUID id helper** so HashLens can drop its local `uuid()`.
4. **HashLens → LinkView graph export** (stub exists, typed transform ready
   to test).
5. **Waypoint packet import** (currently export-only; round-trip parity).
6. **BriefBuilder AI proxy** — move `VITE_`-exposed AI keys behind a server
   (needs a hosting decision; risk documented in ECOSYSTEM_MAP).
7. **Launch/SSO + entitlements** — platform-level design (issuer app does not
   exist yet); HashLens entitlement stub stays inert until then.
8. **Repoint kernel git-deps** from `#claude/openi-ecosystem-overhaul-xc5kca`
   to the default branch when the kernel branch merges (BriefBuilder,
   Waypoint, HashLens `package.json`).
9. DOCX export, HashLens server-side export enforcement, Waypoint Supabase
   backend — deferred, re-rank next session.
