# @openi/kernel

The Openi Reasoning Kernel — single versioned source of truth for primitives
shared identically across the Openi suite. **Phase A only** (see
`docs/adr/ADR-001-openi-reasoning-kernel.md`):

- `@openi/kernel/ids` — `newId()`, `nowIso()`
- `@openi/kernel/ontology` — `CONFIDENCE_LEVELS` (`low | moderate | high`), `labelFor(vocab, value)`

Do not expand the kernel beyond these primitives without an ADR. App-specific
grading axes (BriefBuilder `risk_level`, Waypoint `priority`, LinkView's
verification taxonomy) stay app-local — ADR-001 §3e/§6 + Addendum A.
