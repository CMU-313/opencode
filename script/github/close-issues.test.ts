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

describe("Close issue", () => {
  test("Error when there is no page of issues", async () => {
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      if (method === "GET") return new Response("nope", { status: 500, statusText: "Server Error" })
      return new Response("{}", { status: 200 })
    }) as typeof fetch

    await expect(main()).rejects.toThrow()
  })

  test("Error when closing issue is unsuccessful ", async () => {
    const pages = [[makeIssue(1, 80)]]
    let page = 0

    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      if (method === "GET") {
        const body = pages[page] ?? []
        page++
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (method === "POST") return new Response("nope", { status: 500, statusText: "Server Error" })
      return new Response("{}", { status: 200 })
    }) as typeof fetch

    await expect(main()).rejects.toThrow()
  })



})





