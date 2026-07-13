# Openi Suite — Product Backlog (post-overhaul)

Re-triaged 2026-07-12 at overhaul close. Prioritized; each item states why it
matters, rough size (S/M/L), and dependencies. Operator/deployment actions
are NOT here — see `OPERATOR_CHECKLIST.md`.

## P0 — do first next session

1. **Land any session-5 work + run the operator rollout.** The two
   security-critical Supabase rollouts (HashLens entitlements, BriefBuilder
   owner-RLS) are written and code-tested but not live. Until applied, those
   apps' deployed instances are pre-hardening. *Size S (operator) · dep: a
   human with dashboard access.*

## P1 — highest product leverage

2. **LinkView casepacket importer.** It exports but can't import; making it a
   consumer completes the interchange mesh and lets Waypoint/HashLens leads
   flow into link analysis. *M · dep: none (kernel parse already vendored).*
3. **Waypoint packet importer.** Round-trip parity; lets a brief's entities/
   claims flow back for geospatial follow-up. *M · dep: none.*
4. **BriefBuilder entities tab.** Imported entity registers are annex-only
   today — no in-app view/edit. A first-class tab makes entities usable, not
   just printable. *M · dep: register import (shipped).*
5. **BriefBuilder AI server proxy.** The `VITE_`-exposed AI keys block any
   untrusted-network deployment — the single biggest deploy blocker.
   *L · dep: a hosting/runtime decision.*

## P2 — hardening and reach

6. **HashLens localStore atomicity-preserving kernel adoption.** Only if the
   kernel gains a batched/transactional write (see ADR-003 addendum);
   otherwise stays parked. *L · dep: kernel contract extension (own design
   task).*
7. **Kernel strict-UUID id helper.** Lets HashLens drop its local `uuid()`;
   small dedup. *S · dep: none.*
8. **HashLens → LinkView graph export.** Stub exists; a typed bundle→graph
   transform turns credential clusters into link-analysis input. *M · dep:
   LinkView importer (#2) for the round trip.*
9. **Kernel Phase C remainder (from linkview.profile@1):** full Source
   objects + deconfliction records. *M · dep: a second real consumer (the
   two-consumer rule) — hold until #2 or #8 needs them.*

## P3 — platform, deferred by design

10. **Launch tokens / SSO + suite-wide entitlements.** Needs a platform
    issuer app that does not exist; the HashLens entitlement seam is built to
    survive the swap. *XL · dep: product decision to build the issuer.*
11. **DOCX export.** Print-perfect HTML→PDF covers current client need;
    revisit on demonstrated demand (adds ~90 KB gz/bundle). *M · dep: client
    demand.*
12. **Cross-browser / real device testing.** Acceptance run is Chromium-only.
    *M · dep: none.*
13. **Waypoint Supabase backend.** localStorage-only by roadmap; needs the
    data-minimization work its own docs flag first. *L · dep: minimization
    design.*

## Closed by the overhaul (do not re-open)

- Design-token unification, action/signal color roles, document-grade export,
  the casepacket format + governance, the repository contract, LinkView on
  the kernel with drift protection, the Entity model + annex, fail-closed
  entitlement *design*, the demo/acceptance harness, PII removal, the
  stale-branch reconciliation. All shipped; see CHANGELOG + SUITE_STATUS.
