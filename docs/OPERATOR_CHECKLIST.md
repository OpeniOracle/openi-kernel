# Openi Suite — Operator Runbook

For an operator working in a **web browser**, no command line needed except
the two places noted. Do the sections **in order**. Two sections are
**🔒 SECURITY-CRITICAL** — read those fully before starting.

Status at last update (2026-07-12): **nothing below has been done yet** —
every item was verified still-outstanding against the live repos this session.

---

## 1. Publish the kernel version tags (GitHub Releases page)

**What it does:** marks the exact kernel commits that apps depend on, so
"v0.5.0" is findable instead of a raw commit hash.

**Steps** — for each row, go to
`https://github.com/OpeniOracle/openi-kernel/releases/new`:
1. "Choose a tag" → type the tag name → "Create new tag on publish".
2. Set the **Target** to the commit shown (click the target dropdown →
   paste the SHA).
3. Title = the tag name. Publish.

| Tag | Target commit |
|---|---|
| `v0.2.0` | `0b592d3` |
| `v0.3.0` | `a650ebb` |
| `v0.4.0` | `aa5b376` |
| `v0.5.0` | `db31c4c` |

**Confirm:** the Releases page lists all four; the Tags tab shows them.
**If it doesn't:** re-check the target SHA was pasted (GitHub defaults the
target to the latest commit otherwise). Wrong target → delete the release +
tag and redo that one.

## 2. Flip BriefBuilder's default branch (GitHub Settings)

**What it does:** makes `main` the branch new work starts from, replacing the
legacy `claude/briefbuilder-mvp-planning-YiOql`.

**Steps:** `https://github.com/OpeniOracle/BriefBuilder/settings/branches` →
"Default branch" → switch icon → choose **`main`** → Update → confirm.
Then `…/branches` → delete `claude/briefbuilder-mvp-planning-YiOql` (trash
icon).
**Confirm:** the repo home page shows `main` selected and the same file list.
`main` and the old branch are identical commits (`f255d54`), so nothing moves.
**If the branch won't delete:** it's still the default — the flip didn't
take; redo the switch first.

## 3. Delete the stale architecture branch (GitHub branches page)

**What it does:** removes an abandoned June design branch superseded by the
shipped casepacket format (rationale in CHANGELOG, session 3).

**Steps:** on each branches page below, find
`claude/openi-suite-architecture-2wx9y7` and click the trash icon:
- `https://github.com/OpeniOracle/openi-kernel/branches`
- `https://github.com/OpeniOracle/waypoint/branches`
- `https://github.com/OpeniOracle/connect-uncover-insight/branches`

**Confirm:** searching that name on each branches page returns nothing.

## 4. Delete the merged overhaul branches (after you're satisfied with `main`)

**What it does:** cleans up the working branches now that all work is merged.
Do this **last**, once the apps look right to you. On each repo's branches
page delete `claude/openi-ecosystem-overhaul-xc5kca` (all five repos).
**Confirm:** gone from each branches page; `main` unaffected.

---

## 🔒 5. SECURITY-CRITICAL — HashLens entitlement rollout (Supabase)

**What it does:** turns off "everyone gets in" and turns on per-user access
grants, without locking out anyone who already uses HashLens. **Do steps in
order; do not skip 5c.**

Open the HashLens project → **SQL Editor** → New query for each paste.

**5a. Create the grant table (safe, changes nothing yet).**
Paste the entire contents of `hashlens/supabase/migrations/0003_entitlements.sql`
→ Run.
*Expected:* "Success. No rows returned."

**5b. Verify everyone was granted (this is the no-lockout check).**
Paste and Run:
```sql
select
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.entitlements where tool = 'hashlens') as granted;
```
*Expected:* the two numbers are **equal**. If `granted` is smaller, stop —
do not do 5c; re-run 5a and re-check.

**5c. Turn on enforcement (the actual security flip).**
Only after 5b matches, paste
`hashlens/supabase/migrations/0004_entitlements_enforcement.sql` → Run.
*Expected:* "Success. No rows returned."
**Confirm:** sign in to HashLens as a normal analyst — cases still load. To
test denial, remove one test user's grant:
```sql
delete from public.entitlements where tool='hashlens'
  and user_id = (select id from public.profiles where email='<test user>');
```
That user should now see the "Access not granted" screen, not a blank page.

**5d. (only if this instance predates July 2026)** Paste
`hashlens/supabase/migrations/0002_case_packet_export_kind.sql` → Run.
**To grant a new user later:** SQL Editor →
`insert into public.entitlements (user_id, tool) values ('<their id>','hashlens');`

---

## 🔒 6. SECURITY-CRITICAL — BriefBuilder per-analyst isolation (Supabase)

**Only if BriefBuilder is deployed on Supabase** (the default build uses
in-browser storage and needs nothing here). **What it does:** stops every
signed-in user from seeing every brief; scopes briefs to their owner.

Open the BriefBuilder project → **SQL Editor**.

**6a. Backfill owners FIRST** (rows with no owner vanish for everyone after
6b — so set them now). For each existing analyst, run:
```sql
update public.briefs set owner = '<that analyst's auth user id>'
  where owner is null and assigned_analyst = '<their email>';
```
Then check nothing is left ownerless:
```sql
select count(*) from public.briefs where owner is null;
```
*Expected:* `0`. If not, assign the remaining rows before continuing.

**6b. Apply the ownership policy.** Paste
`BriefBuilder/supabase/upgrade-owner-rls.sql` → Run.
*Expected:* "Success. No rows returned."
**Confirm:** two analysts signed in see only their own briefs.

**6c. Entity register table (for LinkView-imported entities).** Paste
`BriefBuilder/supabase/upgrade-brief-entities.sql` → Run. It has two policy
variants in comments — since you did 6b, use the **owner** variant (uncomment
that block, comment the first). *Expected:* "Success. No rows returned."

**6d.** When an `evidence` storage bucket is later created, add its access
policies under Storage → Policies (not scriptable here).

---

## 7. LinkView deploy environment (Cloudflare/Lovable dashboard)

**What it does:** confirms the app has its database keys at build/deploy time
(the `.env` file is intentionally not in git). In the Lovable/Cloudflare
project settings, confirm these exist: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, and the
server-side `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` /
`SUPABASE_SERVICE_ROLE_KEY`. **Confirm:** a deploy succeeds and the app loads.

## 8. LinkView dependency update (needs a terminal — the one CLI item)

**What it does:** applies security patches (notably `undici`) that can't be
done from the browser because LinkView uses `bun`, whose lockfile only
updates via its CLI. On a machine with normal internet access:
```
git clone https://github.com/OpeniOracle/connect-uncover-insight
cd connect-uncover-insight && bun install && bun update && bun run verify
```
If `bun run verify` passes, commit `bun.lock` + `package.json` and push.
**Confirm:** `bun audit` reports no high-severity issues. See SUITE_STATUS.md
"Known gaps" for why this is lower-urgency than it looks (Workers runtime).
