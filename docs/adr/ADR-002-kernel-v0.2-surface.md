# ADR-002: Kernel v0.2.0 — Grading, Claim, Evidence, Entity, Provenance, Interchange, Export, Tokens

- **Status:** Accepted (implemented in this change)
- **Date:** 2026-07-09
- **Supersedes nothing.** Extends ADR-001; Phase A surface is unchanged.
- **Context:** the 2026-07 ecosystem overhaul (`docs/ECOSYSTEM_MAP.md`,
  `docs/OVERHAUL_PLAN.md`). Full five-repo discovery preceded this ADR.

## Decision

Expand `@openi/kernel` from the Phase-A surface (ids + ontology) to v0.2.0,
adding nine modules. ADR-001 requires an ADR before any expansion; this is it.
Each addition satisfies the two-real-consumers rule (§ Evidence below) or is a
design-centrally primitive ADR-001 already designated (Entity, §3f).

New surface (all plain ESM, zero runtime dependencies, typed via `types/`):

| Module | Contents | ADR-001 phase |
|---|---|---|
| `grading` | Named multi-axis grading: confidence, severity, Admiralty reliability A–F + credibility 1–6, app-defined `ranking` | C (grading half) |
| `claim` | The Claim envelope + validation | C |
| `evidence` | Evidence reference with integrity fields (hash, capture metadata) | C |
| `entity` | EntityRef + canonical type enum | E |
| `provenance` | Authorship stamp (generation_source, review status), lineage | D (authorship half) |
| `casepacket` | `openi.casepacket` v1 — versioned serialize/validate/parse | F (interchange) |
| `export` | Branded document model → Markdown / self-contained print-ready HTML | new (see below) |
| `format` | `escapeHtml`, `csvEscape`, `toCsv`, `slugify` | new (see below) |
| `tokens` (+ `tailwind-preset`, `tokens.css`) | Openi design tokens: navy surfaces, bone text, amber signal accent, Geist stacks | new (see below) |

Not included (stays app-local or deferred): the repository/storage contract
(Phase B — deferred to its own change; touching every app's persistence in the
same release as this surface concentrates risk), the AI-assistance contract
(Phase D second half — BriefBuilder remains the only real consumer), LinkView's
9-value verification taxonomy (ADR-001 Addendum A §A.4 — future ADR), and all
app-specific vocabularies.

## Evidence per addition (two-consumer rule)

- **grading/claim/evidence/provenance:** ADR-001 §3b–§3e documented the
  BriefBuilder-Finding vs Waypoint-Lead parallel and the live `moderate`
  collision. Discovery added HashLens match results (numeric confidence
  heuristic) and LinkView findings (Admiralty + corroboration) as third and
  fourth parallel claim-like objects. Admiralty values are harvested verbatim
  from LinkView (`RELIABILITY_LEVELS`, credibility 1–6) — contribution-upward
  per Addendum A §A.3.3. Severity is BriefBuilder's `risk_level` vocabulary.
- **entity:** ADR-001 §3f designated central design. The type enum is
  LinkView's production `entity_type` enum verbatim; Waypoint devices map to
  `asset`, HashLens selectors to `account`.
- **casepacket:** three declared consumers before any implementation existed —
  Waypoint roadmap Phase 4 ("Export to BriefBuilder", its top-named gap),
  HashLens `buildCasePacket()` stub, BriefBuilder as the importing side.
- **export:** BriefBuilder (`exportMarkdown.js`) and HashLens
  (`buildClientSummaryHtml`) had already each built half of it, divergently.
- **format:** `escapeHtml`/`csvEscape` (HashLens) and `slugify` (BriefBuilder)
  re-implemented per app; escaping is security-relevant and belongs in one
  audited place.
- **tokens:** four divergent token sets for one brand (see ECOSYSTEM_MAP,
  "Design language"). BriefBuilder/Waypoint's set is literal copy-paste drift.

## Design rules encoded

1. **Named axes never collapse** (§3e): `validateGrading` rejects kernel-axis
   names in `ranking.axis`; vocabularies are disjoint on purpose (`medium` is
   severity-only, `moderate` confidence-only) so misfiled values fail loudly.
2. **Absent means unassessed.** No grading axis is defaulted.
3. **Claims carry app identity via `extensions`** and app axes via
   `ranking.axis` namespacing (`waypoint.priority`), so round-trips are
   lossless without kernel knowledge of app internals.
4. **Packets self-describe** (`format`/`version`/`kernel_version`/
   `produced_by`); `parseCasePacket` never throws — importers render problems.
5. **Amber convention:** `signal` amber is the suite accent. AI provenance
   keeps the ✦ glyph + explicit badge treatment (never color alone). The
   existing BriefBuilder/Waypoint amber (`#d8a657`) was adopted as the signal
   value, so their AI surfaces remain on-brand without churn.
6. **Kernel stays dependency-free**; tests use `node:test`.

## Consequences

- Version bumps to 0.2.0; consumers pin the git dependency to a ref and adopt
  deliberately. Phase-A imports are untouched.
- `tokens.css` duplicates `tokens.js` values by design (a CSS file cannot
  import JS); tokens changes must update both — acceptable while token churn
  is low.
- DOCX export is out of scope; print-ready HTML covers client-deliverable PDF
  via the browser. Revisit only on demonstrated client demand.
