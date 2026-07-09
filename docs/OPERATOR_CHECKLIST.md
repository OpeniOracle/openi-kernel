# Operator Checklist — outstanding manual steps

Updated 2026-07-09 (overhaul session 2). These require dashboard access or
permissions the automation environment does not have.

## Git / release

1. **Push the kernel `v0.2.0` tag.** The tag exists locally on kernel `main`
   (`0b592d3`); tag pushes return HTTP 403 through the session git proxy.
   From any checkout with tag-push rights:
   `git fetch origin main && git tag -a v0.2.0 0b592d3 -m "Kernel v0.2.0 — ADR-002 surface" && git push origin v0.2.0`
2. **Review + merge the Stage 2 feature branches**
   (`claude/openi-ecosystem-overhaul-xc5kca` in openi-kernel, BriefBuilder,
   waypoint, hashlens, connect-uncover-insight). Order: kernel first (tag
   the merge `v0.3.0`), then the apps. Consumer pins already reference the
   kernel commit SHA `b594b97`; optionally repoint them to the `v0.3.0` tag
   after it exists. Delete the feature branches after merging.
3. **Reconcile or archive `claude/openi-suite-architecture-2wx9y7`** (June;
   exists in openi-kernel, waypoint, connect-uncover-insight). It carries a
   parallel bundle-export design that overlaps with `openi.casepacket` v1 —
   decide which parts to harvest, then archive.

## BriefBuilder — Supabase (unchanged from session 1, still outstanding)

4. Run `supabase/upgrade-owner-rls.sql` in the SQL editor (Database → SQL)
   as postgres — replaces the permissive "any authenticated user" MVP
   policies with per-analyst ownership.
5. **Before** relying on it: backfill `owner` on existing `briefs` rows
   (see the file's backfill note) — rows with NULL owner become invisible
   to everyone except service_role.
6. If/when the private `evidence` storage bucket is created, add its
   storage policies by hand (Storage → Policies); they are not scriptable
   from SQL migrations in this project.

## HashLens — Supabase

7. Apply `supabase/migrations/0002_case_packet_export_kind.sql` (adds the
   `case_packet` export-kind to the audit vocabulary) wherever migrations
   are applied for the deployed instance.

## LinkView (connect-uncover-insight)

8. `.env` is now untracked. Confirm the deploy environment (Cloudflare
   Workers secrets / Lovable) provides the SUPABASE_* and VITE_SUPABASE_*
   variables at build/deploy time — see `.env.example` and `DEPLOY.md`. The
   committed values were the public-safe anon key (RLS-guarded); rotation
   is optional, not urgent.
9. CI note: `bun.lock` remains canonical; the npm fallback documented in
   `CONTRIBUTING.md` is for sandboxed verification only.
