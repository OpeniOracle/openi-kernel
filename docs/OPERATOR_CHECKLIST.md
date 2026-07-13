# Operator Checklist — outstanding manual steps

Living document. Updated 2026-07-10 (session 4, post reality-check: **none
of the prior items had been done** — all verified against the remotes).

## Git / GitHub (proxy blocks these from automation — re-verified session 4)

1. **Push kernel tags** (all exist locally in openi-kernel):
   `git push origin v0.2.0 v0.3.0 v0.4.0`
   (v0.2.0 → 0b592d3 · v0.3.0 → a650ebb · v0.4.0 → aa5b376. Tag v0.5.0 when
   session-4 Stage 2 merges — kernel commit 6d7c992 carries it.)
2. **Flip BriefBuilder's default branch to `main`** (GitHub → Settings →
   Branches). `main` is kept fast-forwarded to the legacy default's head;
   after the flip, archive `claude/briefbuilder-mvp-planning-YiOql`.
3. **Delete the stale architecture branch** (rationale: CHANGELOG session 3):
   `git push origin --delete claude/openi-suite-architecture-2wx9y7`
   (openi-kernel, waypoint, connect-uncover-insight)
4. After merging session-4 Stage 2: delete the
   `claude/openi-ecosystem-overhaul-xc5kca` feature branches (all five).

## HashLens entitlement rollout (ordered — do not skip steps)

5. Apply `supabase/migrations/0003_entitlements.sql` (SQL editor). Additive;
   no behavior change.
6. Verify seeding: `select count(*) from public.entitlements where
   tool='hashlens';` must equal `select count(*) from public.profiles;`.
7. Deploy the session-4 HashLens build (fail-closed client check + denied
   screen). Still no lockout: every profile is seeded.
8. Only after 5–7 are confirmed: apply
   `supabase/migrations/0004_entitlements_enforcement.sql` — the RLS flip.
   To revoke a user afterwards: delete their entitlements row.
9. Also apply `supabase/migrations/0002_case_packet_export_kind.sql` if the
   deployed instance predates session 2.

## BriefBuilder — Supabase (only if/when a Supabase deployment is used)

10. `supabase/upgrade-owner-rls.sql` (backfill `owner` first — see file).
11. `supabase/upgrade-brief-entities.sql` (entity register table; pick the
    policy variant matching your RLS generation — see file comments).
12. Evidence storage-bucket policies by hand when that bucket is created.

## LinkView deploy environment

13. Confirm Cloudflare/Lovable supplies SUPABASE_* / VITE_SUPABASE_* at
    build/deploy (`.env` untracked since session 2).

## Done / obsolete

- ~~Session-2 and session-3 merges~~ — landed (sessions 3 and 4, defaults
  green, round trips verified).
- ~~Reconcile-or-archive analysis for the stale branch~~ — recorded; only
  the deletion command remains (item 3).
