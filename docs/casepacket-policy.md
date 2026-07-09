# openi.casepacket — Compatibility Policy

`openi.casepacket` v1 is a contract across the suite (Waypoint and HashLens
export it; BriefBuilder imports it; LinkView export is landing). This policy
governs how it may change.

## Rules

1. **Within v1, changes are additive-only.** New optional fields may be added
   to packets, claims, evidence, or entities. Existing fields must never be
   removed, renamed, retyped, or have their semantics narrowed or redefined.
2. **Importers must tolerate unknown fields** (ignore, and where practical
   preserve them on round-trip — `extensions` and `ranking.axis` namespacing
   exist for exactly this).
3. **Anything breaking bumps `version` to 2 and requires an ADR** — the ADR
   states the migration story for v1 packets before any code changes.
4. **Exporters state what they produce:** every packet self-describes with
   `format`, `version`, `kernel_version`, and `produced_by` (already enforced
   by `buildCasePacket`).
5. **Importers reject versions they don't understand** with a clear,
   analyst-readable message (`parseCasePacket` produces it; importer UIs must
   surface it inline, not swallow it). Importers must not attempt best-effort
   parsing of a newer major version.
6. **Vendored copies** of the packet primitives (e.g. LinkView while its
   package manager cannot take the git dependency) must state the kernel
   version + commit they were copied from, and are updated only by re-copying
   from the kernel — never edited independently.

## Review checklist for any casepacket change

- [ ] Additive within v1 (or version bumped + ADR written)?
- [ ] `validateCasePacket` updated, with tests for old payloads still passing?
- [ ] All exporters (Waypoint, HashLens, LinkView) still produce valid packets?
- [ ] BriefBuilder import of a pre-change packet still succeeds?
- [ ] Vendored copies re-synced?
