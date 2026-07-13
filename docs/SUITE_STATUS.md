# Openi Suite — Status Baseline (post-overhaul)

Written 2026-07-12 at the close of the five-session ecosystem overhaul.
**This is the opening context for every future session.** Trust this over
older session summaries; verify against the SHAs below.

## The baseline (exact versions)

| Repo | Default branch | Head at baseline | State |
|---|---|---|---|
| openi-kernel | `main` | `db31c4c` = **v0.5.0** (tag local-only, see runbook) | 26 tests |
| BriefBuilder | `claude/briefbuilder-mvp-planning-YiOql` (+ `main` mirrored, flip pending) | `f255d54` | 6 tests, build ✓ |
| waypoint | `main` | `953dffa` | 4 tests, build ✓ |
| hashlens | `main` | `366cca2` | 32 tests, typecheck+lint ✓, build ✓ |
| connect-uncover-insight (LinkView) | `main` | `62a3da1` | 151 tests (incl. drift check + Lovable-bot suites), full verify ✓ |

Kernel consumers pin the git dependency to the v0.5.0 merge SHA `db31c4c`;
LinkView vendors the kernel casepacket closure verbatim with a hash-checked
manifest stamped to the same commit. The acceptance run (docs/DEMO_RUNBOOK.md,
all four acts, executed through the real UIs by browser automation) **passed
against exactly these heads**.

## Architecture in brief

- **`@openi/kernel`** — plain-ESM, zero-dependency shared foundation: ids,
  ontology, multi-axis grading (confidence / severity / NATO Admiralty +
  app-defined ranking axes that never collapse), Claim envelope, Evidence
  refs with integrity fields, Entity records + relationships (ADR-005),
  provenance stamps, the `openi.casepacket` v1 interchange format with a
  written compatibility policy, a document-grade branded export layer
  (Markdown + print-perfect HTML), the localStorage repository contract, and
  the design tokens (navy/bone, action blue, signal amber, Geist) as data +
  Tailwind preset + CSS variables. Governance: ADR-001…005; expansion
  requires an ADR.
- **Interchange** — file-based casepackets; producers stamp format/version/
  producer; importers reject unknown versions with analyst-readable messages;
  app judgments travel on named axes and are never re-scored.
- **Apps** — Waypoint (geofence telemetry → triaged leads; packet exporter),
  BriefBuilder (packet importer → brief → client document with grading
  legend, provenance annex, entity annex), HashLens (hash/credential
  workbench; client-safe packet + summary; fail-closed entitlements),
  LinkView (OSINT workspace; entity-register packet exporter; production
  Supabase + CI; co-written by the Lovable bot).

## The original eight priorities — what shipped

1. **UI overhaul** — shipped: kernel tokens/fonts suite-wide, ADR-004
   action/signal color roles, instrument-grade primary views (lead rails +
   weight chips, workflow-state tabs, digest tables), document-like export
   preview. LinkView kept its structure, aligned on tokens/fonts/primary.
2. **Interoperability** — shipped for data: casepacket v1 across all four
   apps (3 exporters + 1 importer), two verified round trips. NOT shipped:
   launch/SSO (no platform issuer exists; deliberately not invented).
3. **Shared data structures** — shipped: kernel is the single source for
   shared primitives; app-local axes stay app-local by written policy.
4. **Cleaner workflows** — shipped where central: triage → packet → brief →
   PDF is a straight line; import previews claims/entities before creating
   anything.
5. **Analyst usability** — shipped: inline errors, mandatory rationales,
   Enter-to-save triage, denied-state screen, keyboard-legible mono data.
6. **Security hardening** — shipped: PII removed from source, fail-closed
   entitlements (migrations 0003/0004 + rollout), BriefBuilder owner-RLS
   upgrade script, client-safe boundaries (HashLens masking, LinkView
   synthetic-case export refusal), kernel-owned escaping with formula-
   injection hardening, `.env` untracked. Pending operator action: the two
   Supabase rollouts are written but NOT applied to any live instance.
7. **Exports/reporting** — shipped: one kernel export layer; BriefBuilder
   client document (letterhead, legend, annexes, print-perfect), HashLens
   client summary on the same layer. DOCX intentionally not built.
8. **Reusable components** — shipped as tokens + preset + export layer +
   repository contract; a shared React component library was deliberately
   NOT built (three JS/TS stacks + one Tailwind-v4 SSR app; the token layer
   is the right sharing level today).

## Known gaps and limitations (honest list)

- **Operator actions all pending** as of this baseline: tags exist only
  locally; stale architecture branch undeleted; BriefBuilder default flip
  pending; both Supabase security rollouts unapplied (HashLens entitlement
  enforcement and BriefBuilder owner-RLS are designed, tested in code, but
  NOT live anywhere).
- **BriefBuilder AI keys are browser-exposed by design** (`VITE_`-prefixed,
  documented internal-network-only). Needs a server proxy before any
  untrusted-network deployment. Unchanged through the overhaul.
- **LinkView imports nothing** — it exports casepackets but has no importer.
- **Waypoint has no packet importer** (export-only); no Supabase backend
  (localStorage only, by roadmap).
- **Entitlements govern HashLens only**; other apps have no auth (BB/WP) or
  their own Supabase auth (LinkView). Suite SSO remains a platform decision.
- **LinkView dependency audit** (prod deps): `undici` HIGH (7.x range, six
  advisories), `@tanstack/start-server-core` moderate, `js-yaml` moderate,
  `@babel/core`/`esbuild` build-time lows. All have upstream fixes, but the
  canonical lockfile is `bun.lock`, which cannot be regenerated in this
  environment — **needs `bun update` + verify on a machine with registry
  access** (runbook item). Actual exposure is tempered: the deploy target is
  Cloudflare Workers (workerd fetch at runtime, not undici) and esbuild's
  advisory is dev-server/Windows-only — but do not let that argument age;
  update the lockfile.
  Other repos: 0 production vulnerabilities (BriefBuilder's react-router
  open-redirect advisory patched this session).
- **Vendored kernel in LinkView** is drift-protected but still a copy; the
  bun git-dependency remains blocked by the environment (GitHub API tarball
  403). Retry `bun add` when off-proxy; the switch is a one-file change.
- **The demo/acceptance run automates Chromium only**; no cross-browser
  testing exists anywhere in the suite.
- **The Lovable bot actively writes to LinkView `main`** — always fetch and
  merge under before building on it.

## Standing environment facts (for future sessions in this tooling)

- Git proxy silently refuses tag pushes and remote branch deletions
  ("Everything up-to-date" while doing nothing) — verify remote state after
  every push.
- LinkView installs with npm here (Lovable bun registry 403s); `bun.lock`
  stays canonical; never commit `package-lock.json` there.
- Full history and rationale: `docs/CHANGELOG.md`, ADR-001…005,
  `docs/casepacket-policy.md`, `docs/vendoring.md`, `docs/DEMO_RUNBOOK.md`,
  `docs/OPERATOR_CHECKLIST.md` (browser-first runbook), `docs/BACKLOG.md`.
