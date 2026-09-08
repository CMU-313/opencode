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

  test("closes issues older than the cutoff and stops at the first issue newer than the cutoff", async () => {
    const pages = [
      [makeIssue(1, 80), 
       makeIssue(2, 66), 
       makeIssue(3, 40), 
       makeIssue(4, 10)],
    ]
    // stop at issue 3
    let page = 0
    const commented: number[] = []
    const closed: number[] = []

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      if (method === "GET") {
        const body = pages[page] ?? []
        page++
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (method === "POST") {
        const match = String(url).match(/\/issues\/(\d+)\/comments$/)
        if (match) commented.push(Number(match[1]))
        return new Response("{}", { status: 201 })
      }
      if (method === "PATCH") {
        const match = String(url).match(/\/issues\/(\d+)$/)
        if (match) closed.push(Number(match[1]))
        return new Response("{}", { status: 200 })
      }
      throw new Error(`Unexpected fetch call: ${method} ${url}`)
    }) as typeof fetch

    await main()

    expect(closed).toEqual([1, 2])
    expect(commented).toEqual([1, 2])
  })

  test("keep stale issues created by the exempt bot", async () => {
    const pages = [
      [makeIssue(1, 90, { user: { login: "opencode-agent[bot]" } }), 
       makeIssue(2, 1)],
    ]
    let page = 0
    const closed: number[] = []

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      if (method === "GET") {
        const body = pages[page] ?? []
        page++
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (method === "PATCH") {
        const match = String(url).match(/\/issues\/(\d+)$/)
        if (match) closed.push(Number(match[1]))
        return new Response("{}", { status: 200 })
      }
      return new Response("{}", { status: 201 })
    }) as typeof fetch

    await main()

    expect(closed).toEqual([])
  })

  test("Keep stale issue opened by owner ", async () => {
    const pages = [
      [makeIssue(1,80),
       makeIssue(2, 75, { author_association: "OWNER" }), 
       makeIssue(3, 15)],
    ]
    let page = 0
    const closed: number[] = []

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      if (method === "GET") {
        const body = pages[page] ?? []
        page++
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (method === "PATCH") {
        const match = String(url).match(/\/issues\/(\d+)$/)
        if (match) closed.push(Number(match[1]))
        return new Response("{}", { status: 200 })
      }
      return new Response("{}", { status: 201 })
    }) as typeof fetch

    await main()

    expect(closed).toEqual([1])
  })

  test("Go to next page if issues on current page are all stale ", async () => {
    const page1 = Array.from({ length: 100 }, (_, k) => makeIssue(k + 1, 80))
    const page2 = [makeIssue(200, 10)]
    const pages = [page1, page2]
    let page = 0
    const closed: number[] = []

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET"
      if (method === "GET") {
        const body = pages[page] ?? []
        page++
        return new Response(JSON.stringify(body), { status: 200 })
      }
      if (method === "PATCH") {
        const match = String(url).match(/\/issues\/(\d+)$/)
        if (match) closed.push(Number(match[1]))
        return new Response("{}", { status: 200 })
      }
      return new Response("{}", { status: 201 })
    }) as typeof fetch

    await main()

    expect(closed.length).toBe(100)
  })

  


  


})





