import { describe, expect, test } from "bun:test"
import { fail, lines, report, run, syncState, type Outcome, type PR } from "./beta"

function pr(number: number, title = `PR ${number}`): PR {
  return { number, title, author: { login: "someone" }, labels: [{ name: "beta" }] }
}

describe("fail", () => {
  test("defaults the PR comment to the summary reason", () => {
    expect(fail("Fetch failed")).toEqual({
      status: "failed",
      reason: "Fetch failed",
      comment: "Fetch failed",
    })
  })

  test("keeps a distinct comment when one is supplied", () => {
    expect(fail("Merge conflicts", "Merge conflicts with dev branch")).toEqual({
      status: "failed",
      reason: "Merge conflicts",
      comment: "Merge conflicts with dev branch",
    })
  })
})

describe("syncState", () => {
  test("reports unsynced when the local tree is absent from beta", () => {
    expect(syncState("aaa", ["bbb", "ccc"])).toBe("unsynced")
  })

  test("reports current when the local tree is the tip of beta", () => {
    expect(syncState("aaa", ["aaa", "bbb"])).toBe("current")
  })

  test("reports superseded when commits exist after the matching tree", () => {
    expect(syncState("bbb", ["aaa", "bbb"])).toBe("superseded")
  })
})

describe("run", () => {
  test("collects every applied PR and comments on none of them", async () => {
    const comments: number[] = []
    const result = await run([pr(1), pr(2)], {
      apply: async () => ({ status: "applied" }) as Outcome,
      comment: async (n) => void comments.push(n),
    })

    expect(result.applied).toEqual([1, 2])
    expect(result.failed).toEqual([])
    expect(comments).toEqual([])
  })

  test("records a failure and comments with the comment text, not the reason", async () => {
    const comments: Array<[number, string]> = []
    const result = await run([pr(7, "Add widget")], {
      apply: async () => fail("Merge conflicts", "Merge conflicts with dev branch"),
      comment: async (n, reason) => void comments.push([n, reason]),
    })

    expect(result.applied).toEqual([])
    expect(result.failed).toEqual([{ number: 7, title: "Add widget", reason: "Merge conflicts" }])
    expect(comments).toEqual([[7, "Merge conflicts with dev branch"]])
  })

  test("treats a skipped PR as neither applied nor failed", async () => {
    const comments: number[] = []
    const result = await run([pr(3)], {
      apply: async () => ({ status: "skipped" }) as Outcome,
      comment: async (n) => void comments.push(n),
    })

    expect(result.applied).toEqual([])
    expect(result.failed).toEqual([])
    expect(comments).toEqual([])
  })

  test("keeps processing later PRs after an earlier one fails", async () => {
    const result = await run([pr(1), pr(2), pr(3)], {
      apply: async (target) =>
        target.number === 2 ? fail("Merge failed") : ({ status: "applied" } as Outcome),
      comment: async () => {},
    })

    expect(result.applied).toEqual([1, 3])
    expect(result.failed.map((x) => x.number)).toEqual([2])
  })

  test("passes the accumulated applied list and index into each apply call", async () => {
    const seen: Array<{ idx: number; applied: number[] }> = []
    await run([pr(10), pr(20)], {
      apply: async (_target, _all, applied, idx) => {
        seen.push({ idx, applied: [...applied] })
        return { status: "applied" } as Outcome
      },
      comment: async () => {},
    })

    expect(seen).toEqual([
      { idx: 0, applied: [] },
      { idx: 1, applied: [10] },
    ])
  })
})

describe("report", () => {
  test("summarizes without throwing so the caller controls exit behavior", () => {
    expect(report([1], [{ number: 2, title: "Broken", reason: "Merge failed" }])).toBeUndefined()
  })
})

describe("lines", () => {
  test("formats PRs one per line", () => {
    expect(lines([pr(1, "First"), pr(2, "Second")])).toBe("- #1: First\n- #2: Second")
  })

  test("falls back to a placeholder when there are no PRs", () => {
    expect(lines([])).toBe("(none)")
  })
})