# @openi/kernel

The Openi Reasoning Kernel — single versioned source of truth for primitives
shared identically across the Openi suite (BriefBuilder, Waypoint, HashLens,
LinkView). Plain ESM, zero runtime dependencies, typed via `types/`.

Surface is governed by ADRs — do not expand without one:

- **ADR-001** (`docs/adr/ADR-001-openi-reasoning-kernel.md`) — the kernel
  decision, phased plan, and Phase A (ids + ontology).
- **ADR-002** (`docs/adr/ADR-002-kernel-v0.2-surface.md`) — the v0.2.0 surface.

## Modules

| Import | Provides |
|---|---|
| `@openi/kernel/ids` | `newId()`, `nowIso()` |
| `@openi/kernel/ontology` | `CONFIDENCE_LEVELS` (low\|moderate\|high), `labelFor(vocab, value)` |
| `@openi/kernel/grading` | Multi-axis grading: confidence, severity, NATO Admiralty reliability/credibility, app-defined `ranking` (never collapsed) |
| `@openi/kernel/entity` | `EntityRef` + canonical `ENTITY_TYPES` |
| `@openi/kernel/evidence` | `EvidenceRef` with integrity fields (hash, capture metadata) |
| `@openi/kernel/claim` | The Claim envelope — graded, evidence-backed, provenance-stamped assertion |
| `@openi/kernel/provenance` | Authorship stamp (`GENERATION_SOURCES`, `REVIEW_STATUSES`), lineage |
| `@openi/kernel/casepacket` | `openi.casepacket` v1 interchange: build/serialize/parse/validate |
| `@openi/kernel/export` | Branded export layer: document model → Markdown / print-ready HTML |
| `@openi/kernel/format` | `escapeHtml`, `csvEscape`, `toCsv`, `slugify` |
| `@openi/kernel/tokens` | Design tokens (navy/bone/amber signal, Geist stacks) as data |
| `@openi/kernel/tailwind-preset` | Tailwind v3 preset exposing the tokens |
| `@openi/kernel/tokens.css` | Tokens as CSS custom properties (Tailwind v4 / plain CSS) |

App-specific vocabularies (Waypoint `priority`, LinkView's verification
taxonomy, device classes, brief types) stay app-local — see ADR-001 §3e/§6 +
Addendum A. App rankings travel on claims as
`gradings.ranking = { axis: 'app.axis_name', value }`.

## Development

```
npm test   # node:test, no dependencies
```

Consumers install via git dependency and should pin a ref:

```
"@openi/kernel": "git+https://github.com/OpeniOracle/openi-kernel.git#<ref>"
```
