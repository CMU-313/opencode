#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs/promises"

const model = "opencode/gpt-5.3-codex"

export interface PR {
  number: number
  title: string
  author: { login: string }
  labels: Array<{ name: string }>
}

export interface FailedPR {
  number: number
  title: string
  reason: string
}

export type Outcome =
  | { status: "applied" }
  | { status: "skipped" }
  | { status: "failed"; reason: string; comment: string }

export function fail(reason: string, comment: string = reason): Outcome {
  return { status: "failed", reason, comment }
}

async function commentOnPR(prNumber: number, reason: string) {
  const body = `⚠️ **Blocking Beta Release**

This PR cannot be merged into the beta branch due to: **${reason}**

Please resolve this issue to include this PR in the next beta release.`

  try {
    await $`gh pr comment ${prNumber} --body ${body}`
    console.log(`  Posted comment on PR #${prNumber}`)
  } catch (err) {
    console.log(`  Failed to post comment on PR #${prNumber}: ${err}`)
  }
}

async function conflicts() {
  const out = await $`git diff --name-only --diff-filter=U`.text().catch(() => "")
  return out
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
}

async function cleanup() {
  try {
    await $`git merge --abort`
  } catch {}
  try {
    await $`git checkout -- .`
  } catch {}
  try {
    await $`git clean -fd`
  } catch {}
}

export function lines(prs: PR[]) {
  return prs.map((x) => `- #${x.number}: ${x.title}`).join("\n") || "(none)"
}

function group(title: string) {
  if (process.env.GITHUB_ACTIONS !== "true") {
    console.log(title)
    return { [Symbol.dispose]() {} }
  }
  console.log(`::group::${title}`)
  return {
    [Symbol.dispose]() {
      console.log("::endgroup::")
    },
  }
}

async function typecheck() {
  console.log("  Running typecheck...")

  try {
    await $`bun typecheck`
    return true
  } catch (err) {
    console.log(`Typecheck failed: ${err}`)
    return false
  }
}

async function build() {
  console.log("  Running final build smoke check...")

  try {
    await $`./script/build.ts --single`.cwd("packages/opencode")
    return true
  } catch (err) {
    console.log(`Build failed: ${err}`)
    return false
  }
}

async function validate() {
  if (!(await typecheck())) return false
  if (!(await build())) return false
  return true
}

async function commitSmokeChanges() {
  const out = await $`git status --porcelain`.text()
  if (!out.trim()) {
    console.log("Smoke check passed")
    return true
  }

  try {
    await $`git add -A`
    await $`git commit -m "Fix beta integration"`
  } catch (err) {
    console.log(`Failed to commit smoke fixes: ${err}`)
    return false
  }

  if (!(await validate())) return false

  const left = await $`git status --porcelain`.text()
  if (!left.trim()) {
    console.log("Smoke check passed")
    return true
  }

  console.log(`Smoke check left uncommitted changes:\n${left}`)
  return false
}

async function install() {
  console.log("  Regenerating bun.lock...")

  try {
    await fs.rm("bun.lock", { force: true })
    await $`bun install`
    await $`git add bun.lock`
    return true
  } catch (err) {
    console.log(`Install failed: ${err}`)
    return false
  }
}

async function fix(pr: PR, files: string[], prs: PR[], applied: number[], idx: number) {
  console.log(`  Trying to auto-resolve ${files.length} conflict(s) with opencode...`)

  const done = lines(prs.filter((x) => applied.includes(x.number)))
  const next = lines(prs.slice(idx + 1))

  const prompt = [
    `Resolve the current git merge conflicts while merging PR #${pr.number} into the beta branch.`,
    `PR #${pr.number}: ${pr.title}`,
    `Start with these conflicted files: ${files.join(", ")}.`,
    `Merged PRs on HEAD:\n${done}`,
    `Pending PRs after this one (context only):\n${next}`,
    "IMPORTANT: The conflict resolution must be consistent with already-merged PRs.",
    "Pending PRs are context only; do not introduce their changes unless they are already present on HEAD.",
    "Prefer already-merged PRs over the base branch when resolving stacked conflicts.",
    "If bun.lock is conflicted, do not hand-merge it. Delete bun.lock and run bun install after the code conflicts are resolved.",
    "If a PR already deleted a file/directory, do not re-add it, instead apply changes in the new semantic location.",
    "If a PR already changed an import, keep that change.",
    "After resolving the conflicts, run `bun typecheck` at the repo root.",
    "If typecheck fails, you may also update any files reported by typecheck.",
    "Keep any non-conflict edits narrowly scoped to restoring a valid merged state for the current PR batch.",
    "Fix any merge-caused typecheck errors before finishing.",
    "Keep the merge in progress, do not abort the merge, and do not create a commit.",
    "When done, leave the working tree with no unmerged files and a passing typecheck.",
  ].join("\n")

  try {
    await $`opencode run -m ${model} ${prompt}`
  } catch (err) {
    console.log(`  opencode failed: ${err}`)
    return false
  }

  const left = await conflicts()
  if (left.length > 0) {
    console.log(`  Conflicts remain: ${left.join(", ")}`)
    return false
  }

  if (files.includes("bun.lock") && !(await install())) return false

  if (!(await typecheck())) return false

  console.log("  Conflicts resolved with opencode")
  return true
}

async function smoke(prs: PR[], applied: number[]) {
  console.log("\nRunning final smoke check...")

  if (await validate()) return commitSmokeChanges()

  console.log("\nTrying to fix final smoke check with opencode...")

  const done = lines(prs.filter((x) => applied.includes(x.number)))
  const prompt = [
    "The beta merge batch is complete, but the deterministic final smoke check failed.",
    `Merged PRs on HEAD:\n${done}`,
    "Run `bun typecheck` at the repo root.",
    "Run `./script/build.ts --single` in `packages/opencode`.",
    "Fix any merge-caused issues until both commands pass.",
    "Do not create a commit.",
  ].join("\n")

  try {
    await $`opencode run -m ${model} ${prompt}`
  } catch (err) {
    console.log(`Smoke fix failed: ${err}`)
    return false
  }

  if (!(await validate())) return false
  return commitSmokeChanges()
}

async function fetchPRs() {
  console.log("Fetching open PRs with beta label...")

  const stdout =
    await $`gh pr list --state open --draft=false --label beta --json number,title,author,labels --limit 100`.text()
  const prs: PR[] = JSON.parse(stdout).sort((a: PR, b: PR) => a.number - b.number)

  console.log(`Found ${prs.length} open PRs with beta label`)
  return prs
}

async function reset() {
  console.log("Fetching latest dev branch...")
  await $`git fetch origin dev`

  console.log("Checking out beta branch...")
  await $`git checkout -B beta origin/dev`
}

async function merge(pr: PR, prs: PR[], applied: number[], idx: number): Promise<Outcome | null> {
  console.log("  Merging...")

  try {
    await $`git merge --no-commit --no-ff pr/${pr.number}`
    return null
  } catch {}

  const files = await conflicts()
  if (files.length === 0) {
    console.log("  Failed to merge")
    await cleanup()
    return fail("Merge failed")
  }

  console.log("  Failed to merge (conflicts)")
  if (await fix(pr, files, prs, applied, idx)) return null

  await cleanup()
  return fail("Merge conflicts", "Merge conflicts with dev branch")
}

async function commit(pr: PR): Promise<Outcome> {
  try {
    await $`git rev-parse -q --verify MERGE_HEAD`.text()
  } catch {
    console.log("  No changes, skipping")
    return { status: "skipped" }
  }

  try {
    await $`git add -A`
  } catch {
    console.log("  Failed to stage changes")
    return fail("Staging failed", "Failed to stage changes")
  }

  const commitMsg = `Apply PR #${pr.number}: ${pr.title}`
  try {
    await $`git commit -m ${commitMsg}`
  } catch (err) {
    console.log(`  Failed to commit: ${err}`)
    return fail("Commit failed", "Failed to commit changes")
  }

  console.log("  Applied successfully")
  return { status: "applied" }
}

async function apply(pr: PR, prs: PR[], applied: number[], idx: number): Promise<Outcome> {
  console.log("  Fetching PR head...")

  try {
    await $`git fetch origin pull/${pr.number}/head:pr/${pr.number}`
  } catch (err) {
    console.log(`  Failed to fetch: ${err}`)
    return fail("Fetch failed")
  }

  const failure = await merge(pr, prs, applied, idx)
  if (failure) return failure

  return commit(pr)
}

export interface RunDeps {
  apply: (pr: PR, prs: PR[], applied: number[], idx: number) => Promise<Outcome>
  comment: (prNumber: number, reason: string) => Promise<void>
}

export async function run(prs: PR[], deps: RunDeps = { apply, comment: commentOnPR }) {
  const applied: number[] = []
  const failed: FailedPR[] = []

  for (const [idx, pr] of prs.entries()) {
    console.log()
    using _ = group(`Processing PR ${idx + 1}/${prs.length} #${pr.number}: ${pr.title}`)

    const outcome = await deps.apply(pr, prs, applied, idx)
    if (outcome.status === "applied") applied.push(pr.number)
    if (outcome.status === "failed") {
      failed.push({ number: pr.number, title: pr.title, reason: outcome.reason })
      await deps.comment(pr.number, outcome.comment)
    }
  }

  return { applied, failed }
}

export function report(applied: number[], failed: FailedPR[]) {
  console.log("\n--- Summary ---")
  console.log(`Applied: ${applied.length} PRs`)
  applied.forEach((num) => console.log(`  - PR #${num}`))

  if (failed.length === 0) return
  console.log(`Failed: ${failed.length} PRs`)
  failed.forEach((f) => console.log(`  - PR #${f.number}: ${f.reason}`))
}

export type SyncState = "unsynced" | "current" | "superseded"

export function syncState(tree: string, remote: string[]): SyncState {
  const idx = remote.indexOf(tree)
  if (idx === -1) return "unsynced"
  return idx === 0 ? "current" : "superseded"
}

async function synced(label: string) {
  await $`git fetch origin beta`

  const tree = (await $`git rev-parse beta^{tree}`.text()).trim()
  const remote = (await $`git log origin/dev..origin/beta --format=%T`.text()).split("\n")

  const state = syncState(tree, remote)
  if (state === "unsynced") return false

  if (state === "current") console.log(`Beta branch has identical${label} contents, no push needed`)
  else console.log(`Beta branch contains this${label} sync, but additional commits exist after it. Leaving beta as is.`)

  return true
}

async function main() {
  const prs = await fetchPRs()
  if (prs.length === 0) {
    console.log("No team PRs to merge")
    return
  }

  await reset()

  const { applied, failed } = await run(prs)
  report(applied, failed)
  if (failed.length > 0) throw new Error(`${failed.length} PR(s) failed to merge`)

  console.log("\nChecking if beta branch has changes...")
  if (await synced("")) return

  if (!(await smoke(prs, applied))) throw new Error("Final smoke check failed")
  if (await synced(" validated")) return

  console.log("Force pushing validated beta branch...")
  await $`git push origin beta --force --no-verify`

  console.log("Successfully synced beta branch")
}

if (process.argv[1]?.endsWith("beta.ts")) {
  main().catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
}