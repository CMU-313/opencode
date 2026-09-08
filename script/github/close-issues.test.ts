import { describe, expect, test } from "bun:test"

process.env.GITHUB_REPOSITORY = "owner/repo"
process.env.GITHUB_TOKEN = "test-token"

const { main } = await import("./close-issues")

type Issue = {
  number: number
  updated_at: string
  author_association: string
  user: { login: string } | null
}

function makeIssue(number: number, daysOld: number, overrides: Partial<Issue> = {}): Issue {
  return {
    number,
    updated_at: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString(),
    author_association: "NONE",
    user: { login: "someone" },
    ...overrides,
  }
}
