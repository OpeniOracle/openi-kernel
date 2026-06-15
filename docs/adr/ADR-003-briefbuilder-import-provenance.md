# ADR-003 (DRAFT): Persisting imported kernel provenance in Brief Builder

- **Status:** Accepted — design only; schema + persist path not yet implemented
- **Date:** 2026-06-15
- **Scope:** Brief Builder data model only (localStorage + Supabase)
- **Depends on:** ADR-002 (Phase C Claim/Grading/Interchange); `bundleToFindingDrafts` (commit a04755f)
- **Decision driver:** `bundleToFindingDrafts` produces a `provenance` sidecar
  (authorship, all grading axes incl. ranking/verification, appExtensions,
  source claim id, source app, lineage, disposition) that the current
  `finding_cards` / `evidence_items` schema has nowhere to store. Decide how to
  persist it without losing meaning — and without over-building the schema.

> Design record only. Authorizes no schema change, no code, no migration.

---

## 1. Current model (what we have)

- Entities (repository contract): `briefs | evidence | findings | sections`.
- `finding_cards`: `id, brief_id, title, summary, risk_level, confidence,
  status, evidence_ids (jsonb[]), caveats, recommended_action, analyst_notes,
  created_at, updated_at`.
- `evidence_items`: `id, brief_id, title, type, source_url, uploaded_file_path,
  extracted_text, analyst_notes, timestamps`.
- **Two backends behind one contract:**
  - `localRepository` (`ROOT_KEY = 'briefbuilder.v1'`): `create()` spreads the
    given object and adds `id`/timestamps — it stores **arbitrary extra fields
    verbatim**. No schema, no migration.
  - `supabaseRepository`: maps entities to tables and inserts the object —
    Postgres **rejects unknown columns**. An extra `provenance` field would
    error unless the column exists.
- **The asymmetry is the crux:** localStorage tolerates new fields for free;
  Supabase requires the columns to exist. So "persist provenance" is really a
  Supabase-schema decision; localStorage just needs the persist code to write
  the same shape.

The ingest draft also carries a nested `evidence[]` (placeholder evidence items)
and `evidence_ids` referencing them — neither the nested array nor `provenance`
are columns today, so persisting a raw draft to Supabase would fail.

---

## 2. Options

**1. `provenance jsonb` on `finding_cards`.** Lossless, schema-stable as the
kernel evolves, accommodates any source app's axes/appExtensions, trivial in
localStorage. Not directly queryable without jsonb operators.

**2. Scalar columns `imported_claim_id` / `source_bundle_id` (+ `source_app`).**
Queryable, dedup-friendly, cheap — but captures only identity/lineage keys, not
the content (authorship, grading axes, appExtensions). Insufficient alone.

**3. Separate `finding_provenance` / `imported_claims` table.** Clean
separation, can store the full original claim/bundle once, scales to evidence
and to an import ledger/audit. But adds a table + FK + RLS + a read-time join,
and a second collection + manual join in localStorage. Speculative for a single
importer today.

**4. Fold into `analyst_notes` only.** Zero schema change (the draft already
writes a human-readable summary there). But lossy and unstructured — grading
axes/appExtensions/claim id become free text; no dedup, no round-trip, no
filter. Fails the "without losing meaning" goal.

---

## 3. Recommendation

**MVP: Option 1 + the high-value scalars of Option 2.** Add to `finding_cards`:
a `provenance jsonb` (the lossless blob) plus `imported_claim_id text` and
`source_app text` (and optional `source_bundle_id text`) as promoted, indexable
columns. Apply the same minimal pair to `evidence_items` (`provenance jsonb`,
`imported_ref text`, `source_app text`) so evidence lineage and id-remap
survive. Keep the existing human-readable summary in `analyst_notes` (useful in
the approval view). This is the smallest change that is **lossless**,
**queryable** (dedup/filter), **backend-symmetric**, and **future-proof** for
LinkView's richer axes — without a join.

**Long-term: evolve toward Option 3** (a `finding_provenance` or generic
`claim_imports` ledger that also stores the original bundle for re-derivation/
audit) once there are multiple real importers (Waypoint + LinkView), idempotent
re-import requirements, and audit needs. The MVP jsonb is **not a dead end**:
its contents are exactly what would migrate into that table later (jsonb → rows).

Rejected: Option 3 now (premature normalization for one importer — ADR-001 §8);
Option 4 alone (lossy — fails the goal).

---

## 4. Proposed schema changes (Supabase — additive, nullable, no backfill)

```sql
alter table public.finding_cards
  add column if not exists provenance        jsonb,  -- full kernel provenance sidecar
  add column if not exists imported_claim_id text,   -- kernel Claim.id (stable; dedup + lineage)
  add column if not exists source_app         text,  -- bundle.emittedBy: 'waypoint' | 'linkview' | ...
  add column if not exists source_bundle_id   text;  -- optional: bundle identity if bundles gain ids

alter table public.evidence_items
  add column if not exists provenance jsonb,          -- the EvidenceReference (kind, ref, locator, source, grading)
  add column if not exists imported_ref text,         -- EvidenceReference.ref (stable pointer; remap key)
  add column if not exists source_app   text;

create index if not exists finding_cards_imported_claim_id_idx on public.finding_cards (imported_claim_id);
create index if not exists finding_cards_source_app_idx        on public.finding_cards (source_app);
create index if not exists evidence_items_imported_ref_idx     on public.evidence_items (imported_ref);

-- OPTIONAL (idempotent re-import): makes "same claim into same brief" an upsert
-- target instead of a duplicate. Scope it to imported rows only.
create unique index if not exists finding_cards_brief_claim_uniq
  on public.finding_cards (brief_id, imported_claim_id)
  where imported_claim_id is not null;
```

- **RLS:** unchanged — new columns inherit each table's existing policy.
- **Native (non-imported) rows:** all new columns are nullable; existing rows
  read as `null`. No backfill.
- `provenance` jsonb stores the kernel sidecar verbatim: `{ claimId,
  schemaVersion, emittedBy, subject, authorship, disposition, grading,
  otherAxes, appExtensions, lineage }` — every axis (confidence/severity/
  ranking/verification) preserved as the kernel emitted it.

---

## 5. Evidence id remapping (persist algorithm — design only)

The draft's placeholder evidence ids are kernel `EvidenceReference.id`s, not
Brief Builder evidence-item ids. On persist:

1. For each draft, **create its evidence placeholders first** as `evidence_items`
   (repository assigns new ids), writing `imported_ref = EvidenceReference.ref`
   and `provenance = EvidenceReference`.
2. Build `placeholderId -> newEvidenceItemId`.
3. **Create the finding** with `evidence_ids` remapped to the new ids, plus
   `provenance`, `imported_claim_id`, `source_app`.
4. **Idempotency (optional):** before create, look up `evidence_items` by
   `(brief_id, imported_ref)` and the finding by `(brief_id, imported_claim_id)`;
   update instead of inserting a duplicate.

The persist step must **strip the draft's non-column fields** (the nested
`evidence[]` array, and — until columns exist — `provenance`) before handing the
object to `supabaseRepository.create`, or Supabase will reject the insert. Once
the columns above exist, `provenance` flows through; the nested `evidence[]`
array is always consumed by step 1, never written as a column.

---

## 6. localStorage implications

- **No migration.** `localRepository.create()` already stores arbitrary fields,
  so it persists `provenance`/`imported_claim_id`/`source_app` for free; old
  records simply lack them (read as `undefined`).
- The same persist algorithm (create evidence, then finding with remapped
  `evidence_ids`) works unchanged. Dedup lookups by `imported_claim_id`/
  `imported_ref` are array scans — fine at MVP scale.
- **Only Supabase needs the ALTERs.** Keep `schema.sql` and the localStorage
  shape writing the **same object**, so the two backends stay aligned.

---

## 7. Risks

- **jsonb opacity:** provenance not human-queryable without jsonb operators —
  mitigated by the promoted scalar columns + indexes for the common queries.
- **Backend drift:** localStorage free-form vs Supabase typed — mitigated by
  additive nullable columns and writing one shared object shape to both.
- **Dedup uniqueness:** the optional unique index could collide on a malformed
  duplicate claim id — scoped to `(brief_id, imported_claim_id) where not null`.
- **appExtensions bloat:** large extensions (e.g. Waypoint's full profile)
  inflate the jsonb — a content/trimming decision, not a schema one.
- **LinkView entities/relationships** don't map onto a "finding" cleanly —
  provenance jsonb can hold them, but true entity/relationship import is Phase E,
  out of scope here.

---

## 8. Should this be ADR-003 before implementation?

**Yes.** It is the suite's **first stored-schema change tied to kernel
interchange**, and it sets the precedent every app will follow (LinkView faces
the identical question when it ingests). Per ADR-001 §8 and "version the schema
from day one," a durable data-model decision — MVP jsonb+scalars now, ledger
table later, with a defined migration path — belongs in an ADR before the ALTER
lands. Recommended sequence: approve ADR-003 → implement schema + persist path
as a separate change → then (separately) wire the import action into the UI.
