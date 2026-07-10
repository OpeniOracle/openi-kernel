# Operator Checklist — outstanding manual steps

Living document. Updated 2026-07-10 (session 3). Only items the operator
alone can do remain; completed items are struck at the bottom.

## Git / GitHub (proxy blocks these from automation: tag pushes, branch deletion, settings)

1. **Push kernel tags** (exist locally in openi-kernel):
   `git push origin v0.2.0 && git push origin v0.3.0`
   (`v0.2.0` → 0b592d3, `v0.3.0` → a650ebb. Tag v0.4.0 when session-3
   Stage 2 merges — kernel commit b9727d7 carries it.)
2. **Flip BriefBuilder's default branch to `main`** (GitHub → Settings →
   Branches). The `main` branch exists and tracks the current default's
   head; after the flip, archive `claude/briefbuilder-mvp-planning-YiOql`.
3. **Delete the stale architecture branch** in openi-kernel, waypoint,
   connect-uncover-insight (rationale in CHANGELOG, session 3):
   `git push origin --delete claude/openi-suite-architecture-2wx9y7`
4. After reviewing/merging session-3 Stage 2 (feature branches
   `claude/openi-ecosystem-overhaul-xc5kca`, all five repos): delete those
   feature branches.

## Supabase live instances (never scripted per guardrails)

5. BriefBuilder: run `supabase/upgrade-owner-rls.sql` (SQL editor, as
   postgres) — per-analyst ownership replacing the permissive MVP policy.
   **First** backfill `owner` on existing `briefs` rows (see file notes);
   NULL-owner rows become invisible to non-service-role users.
6. BriefBuilder: when the private `evidence` storage bucket is created,
   add its storage policies by hand (Storage → Policies).
7. HashLens: apply `supabase/migrations/0002_case_packet_export_kind.sql`
   to the deployed instance.

## LinkView deploy environment

8. Confirm Cloudflare/Lovable supplies the SUPABASE_* and VITE_SUPABASE_*
   variables at build/deploy time (`.env` is untracked since session 2;
   see `.env.example` / `DEPLOY.md`). Anon-key rotation optional.

## Done / obsolete (for the record)

- ~~Merge session-2 feature branches~~ — done in session 3 (true merges,
  defaults green).
- ~~Create a conventional BriefBuilder `main`~~ — pushed in session 3
  (flip of the default remains, item 2).
- ~~Reconcile-or-archive analysis for the stale architecture branch~~ —
  rationale recorded in CHANGELOG session 3; only the deletion command
  remains (item 3).
