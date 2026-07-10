# ADR-005: Phase C Entity — the full entity record and packet relationships

- **Status:** Accepted (implemented in kernel v0.5.0)
- **Date:** 2026-07-10
- **Extends:** ADR-002 (EntityRef); completes the entity half of ADR-001
  Phase C/E. Primary design input: the `linkview.profile@1` spec harvested
  from the retired `openi-suite-architecture` branch, adapted to casepacket
  conventions (snake_case, `gradings` with app ranking axes, `extensions`).

## Decision

Two additive extensions, both **inside casepacket v1** (no version bump —
verified against the compatibility policy):

1. **`Entity`** — a full register record extending `EntityRef` with optional
   `aliases[]`, `description`, `attributes[{label,value}]`, `gradings`
   (entity-level; app verification axes travel as `ranking`, never restated),
   and `extensions`. `packet.entities` accepts either tier; `validateEntity`
   supersedes `validateEntityRef` in packet validation and accepts plain refs
   unchanged.
2. **`packet.relationships?`** — optional edges between packet entities:
   `{ id, source_id, target_id, label, directed?, gradings?, extensions? }`.
   Absent ⇒ valid v1 (all existing producers unaffected); present ⇒ edges
   must resolve to packet entities.

Plus a presentation builder: `entityAnnexSections(entities, relationships)`
in the export layer — the client-document register (labels resolved, statuses
reported verbatim from the producing tool's own axis).

## Why additive is honest here

- Old importers ignore unknown fields (policy rule 2) and lose only the new
  optional detail — no meaning is silently changed.
- Old packets validate unchanged under the new validator (covered by tests).
- `summarizeCasePacket` reports `relationships: 0` for old packets.

## Two-consumer rule

- **Producer:** LinkView exports its entity register (aliases, summaries,
  verification status on `linkview.verification`, relationships).
- **Consumer:** BriefBuilder imports the register into a brief and renders
  the entity annex in the client document.
- Waypoint/HashLens keep emitting plain EntityRefs — nothing to change.

## Explicitly not in scope (stays app-side or future)

- Entity **resolution/merge** (proposals, match scores) — LinkView's domain
  engine; the kernel carries results, not the process.
- Full Source objects and deconfliction records from the harvested spec —
  no second consumer yet; queue for when one exists.
- Cross-packet entity identity — a future interchange concern (ADR-001 §4).
