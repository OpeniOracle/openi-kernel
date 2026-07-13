# ADR-003: Kernel Phase B — Repository Contract and localStorage Storage Seam

- **Status:** Accepted (implemented in this change)
- **Date:** 2026-07-09
- **Extends:** ADR-001 (Phase B was planned there); ADR-002 unchanged.

## Decision

Add `@openi/kernel/repository`: a factory (`createLocalRepository`) producing
the async CRUD store that three apps had each re-implemented — one JSON blob
under a namespaced root key, corruption-safe reads with defensive shape
merging, id/timestamp stamping via kernel `ids`, newest-first listing,
field-equality filtering, and declarative delete cascades. Plus
`createMemoryStorage` so the contract is testable outside a browser.

Kernel version: **0.3.0** (additive).

## Evidence (two-consumer rule)

ADR-001 §3b documented the duplication when there were two copies; discovery
found a third. Verbatim parallel implementations:

- BriefBuilder `src/data/localRepository.js` (4 entities, brief-scoped
  cascade delete)
- Waypoint `src/waypoint/data/waypointRepository.js` — header comment:
  *"Mirrors BriefBuilder's repository pattern"*
- HashLens `src/data/localStore.ts` (same blob/readDb/writeDb seam beneath a
  domain-specific `CaseStore` interface)

## Migration rules (behavior-preserving, per the session guardrails)

1. **Storage keys and blob shapes do not change.** `briefbuilder.v1` and
   `waypoint.v1` blobs written before adoption load unchanged (covered by an
   adoption-safety test).
2. **App-facing APIs do not change.** BriefBuilder keeps `localRepository`
   (its `{ briefId }` filter maps onto the generic `where`); Waypoint keeps
   `waypointRepository` (`listCases` summary-stripping stays app-side —
   it is presentation, not storage).
3. **HashLens is deferred.** Its `CaseStore` is a domain interface (audited
   reveals, match runs), not a raw CRUD store; forcing it onto the generic
   contract now would be shape-changing. Its `localStore` internals are a
   candidate consumer for a later pass.

## Non-goals

- No query language beyond field equality — nothing in the suite needs more.
- No Supabase implementation in the kernel: server backends stay app-side
  (each app's auth/RLS posture differs); the kernel owns only the contract
  and the local seam.

## Addendum (2026-07-12, session 5): HashLens migration formally parked

Re-assessed after the entitlement work, as directed. The original deferral
reasons stand, and inspection adds a decisive one: HashLens's `localStore`
performs **multi-collection writes atomically** — each domain method
(`runMatch`, `saveSelectors`, audited reveals) assembles its changes and
issues a single `writeDb`, so a quota error or crash mid-method cannot leave
partial state. The kernel seam is deliberately per-operation atomic; backing
HashLens's methods with it would turn one atomic write into N sequential
writes and silently weaken that guarantee — a behavior change, not a
behavior-preserving refactor, purchased for deduplication with no
user-facing benefit.

**Decision: parked.** Revisit only if (a) the kernel contract grows an
explicit batched/transactional write (a real design task, not a retrofit),
or (b) HashLens replaces localStorage with a server backend, at which point
the contract conversation changes entirely. The entitlement work is
orthogonal — it touched auth policies and the app gate, not the storage
seam.
