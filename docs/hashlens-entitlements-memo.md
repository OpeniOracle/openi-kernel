# Memo: HashLens's always-true entitlement check

- **Date:** 2026-07-10 · **Scope:** `hashlens/src/integrations/index.ts#hasToolEntitlement`
- **Ask:** what a real check requires, whether fail-closed can ship now, and
  what platform integration would add. Assessment only — nothing built.

## Current state and why it matters

`hasToolEntitlement(userId, tool)` returns `true` unconditionally. Nothing
calls it on a gating path today, so there is no *live* vulnerability — but it
is a loaded footgun: the first developer who wires it into a route guard gets
a check that always passes, and the stub's shape ("returns a boolean,
resolved") makes that failure silent. HashLens otherwise has real security
posture (Supabase auth, case-scoped RLS, append-only audit), so this stub is
the weakest link the moment it is used.

## What a real check requires (against existing Supabase auth — no new infra)

HashLens already has the pieces:

1. **A grant table.** `profiles` already carries `role` (admin/analyst/viewer)
   via the `handle_new_user` trigger. The minimal real check is: an
   `entitlements` table (`user_id uuid`, `tool text`, `granted_by`,
   `created_at`), RLS "user can read own rows", writes restricted to admins
   (reuse the existing `is_admin` SECURITY DEFINER helper). Append-only
   migration; no existing table changes.
2. **Server-side enforcement, not client.** A client-side boolean is advisory
   UX only. The enforceable layer is RLS: the practical pattern is a
   `has_tool(uid, tool)` SECURITY DEFINER function used inside the policies
   of tool-scoped tables (as `is_case_member` already is). The client check
   then merely mirrors what RLS will enforce anyway.
3. **Local demo mode** (no Supabase) stays permissive by definition — it is a
   single-user sandbox; keep `true` there but *say so* in the return reason.

## Should fail-closed ship now?

**Yes for the client seam, with one nuance.** Change the stub to fail-closed
(`false` unless a grant is found) **at the same moment** the first caller is
added — shipping fail-closed while nothing calls it is free; shipping it
half-wired would lock every user out of a flow that previously worked, which
is also fine (deny-by-default) but must be coordinated with seeding grants
for existing users. Recommended sequence: add the entitlements migration +
seed grants for current analysts → flip the stub to a real lookup with
fail-closed default + a `reason` string → only then let features consume it.
Do not flip the boolean alone without the lookup: a hardcoded `false` bricks
nothing today but will be copy-pasted into the first gated feature.

## What platform integration would add later

A platform issuer (the deferred launch/SSO work) replaces the *source* of
grants, not the enforcement: short-lived launch tokens or JWT claims
(`tools: ["hashlens"]`) verified per call, with the Supabase table becoming a
cache/mirror. The seam designed above survives that swap — `has_tool()`
changes its lookup, callers don't change. Requirements to hold onto now:
per-call verification (no ambient trust), clock-skew-tolerant expiry,
audit of grant/deny decisions (mirror `reveal_logs`' append-only pattern).

## Recommendation

Queue a small HashLens change (next session): entitlements migration +
fail-closed `hasToolEntitlement` with reason strings + pgTAP-style RLS note
in SECURITY.md. Keep platform SSO out of scope until an issuer exists.
