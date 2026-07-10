# Vendoring kernel modules (when a real dependency isn't possible)

Some consumers cannot take the kernel as a git dependency — today that is
LinkView (`connect-uncover-insight`): its canonical `bun.lock` cannot be
regenerated in the sandboxed build environment, so adding any dependency
would break its CI. For that case the sanctioned mechanism is **verbatim
vendoring with drift protection** (decision recorded session 3; supersedes
the hand-written subset from session 2).

## The mechanism (reference implementation: LinkView)

1. `scripts/sync-openi-kernel.mjs` copies a declared file list — the
   casepacket dependency closure, JS + `.d.ts`, **verbatim** — from a local
   kernel checkout into `src/vendor/openi-kernel/`, and writes
   `MANIFEST.json`: kernel version, source commit, `synced_at`, and a sha256
   per file.
2. A drift test (`src/vendor/openi-kernel/__tests__/drift.test.ts`) runs in
   the consumer's ordinary test step and fails if any vendored file's hash
   differs from the manifest, or if unmanifested files appear. Silent edits
   are impossible; the only way to change the copy is re-running the sync,
   which restamps the manifest.
3. App code imports through one thin re-export module
   (`src/lib/casepacket/kernel.ts`), so switching to a real dependency later
   is a one-file change.
4. Formatters must be configured to leave the vendored files untouched
   (they must stay byte-identical to upstream).

## Rules

- Never edit vendored files in the consumer repo — sync only.
- The manifest's `source_commit` must be a commit reachable on a kernel
  release branch/tag; record version bumps in the consumer's changelog.
- Per `docs/casepacket-policy.md` rule 6, vendored copies are updated by
  re-copying only, and any casepacket change must re-sync all vendored
  consumers before it ships.
