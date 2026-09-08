import { describe, expect, test } from "bun:test"
import { Cause, Duration, Effect, Exit } from "effect"
import { HttpClient, HttpClientResponse } from "effect/unstable/http"
import {
  EXA_URL,
  PARALLEL_URL,
  ParallelSearchArgs,
  SearchArgs,
  call,
  parseResponse,
} from "../../src/tool/mcp-websearch"
import {
  callProvider,
  selectWebSearchProvider,
  webSearchModelName,
  webSearchProviderLabel,
} from "../../src/tool/websearch"

import { webSearchEnabled } from "../../src/tool/registry"
import { it } from "../lib/effect"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { MessageID, SessionID } from "../../src/session/schema"
import type * as Tool from "../../src/tool/tool"

const SESSION_ID = "ses_0196aabbccddeeff001122334455"

describe("websearch provider", () => {
  test("selects a stable provider per session", () => {
    expect(selectWebSearchProvider(SESSION_ID)).toBe(selectWebSearchProvider(SESSION_ID))
  })

  test("supports an operational override", () => {
    const original = process.env.OPENCODE_WEBSEARCH_PROVIDER

    try {
      process.env.OPENCODE_WEBSEARCH_PROVIDER = "parallel"
      expect(selectWebSearchProvider(SESSION_ID)).toBe("parallel")

      process.env.OPENCODE_WEBSEARCH_PROVIDER = "exa"
      expect(selectWebSearchProvider(SESSION_ID)).toBe("exa")
    } finally {
      if (original === undefined) delete process.env.OPENCODE_WEBSEARCH_PROVIDER
      else process.env.OPENCODE_WEBSEARCH_PROVIDER = original
    }
  })

  test("routes to Exa when the Exa flag is enabled", () => {
    expect(selectWebSearchProvider(SESSION_ID, { exa: true, parallel: false })).toBe("exa")
  })

  test("routes to Parallel when the Parallel flag is enabled", () => {
    expect(selectWebSearchProvider(SESSION_ID, { exa: false, parallel: true })).toBe("parallel")
  })

  test("is only enabled for opencode or explicit websearch provider flags", () => {
    expect(webSearchEnabled(ProviderV2.ID.opencode, { exa: false, parallel: false })).toBe(true)
    expect(webSearchEnabled(ProviderV2.ID.openai, { exa: false, parallel: false })).toBe(false)
    expect(webSearchEnabled(ProviderV2.ID.openai, { exa: true, parallel: false })).toBe(true)
    expect(webSearchEnabled(ProviderV2.ID.openai, { exa: false, parallel: true })).toBe(true)
  })

  test("uses branded labels", () => {
    expect(webSearchProviderLabel("parallel")).toBe("Parallel Web Search")
    expect(webSearchProviderLabel("exa")).toBe("Exa Web Search")
    expect(webSearchProviderLabel(undefined)).toBe("Web Search")
  })

  test("uses the provider API model id for Parallel analytics", () => {
    expect(
      webSearchModelName({
        model: {
          id: "claude-opus-4-7",
          api: { id: "claude-opus-4.7" },
        },
      }),
    ).toBe("claude-opus-4.7")
  })
})

describe("websearch MCP response parser", () => {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    result: {
      content: [
        {
          type: "text",
          text: "search results",
        },
      ],
    },
  })

  it.effect("parses plain JSON-RPC responses", () =>
    Effect.gen(function* () {
      const result = yield* parseResponse(payload)
      expect(result).toBe("search results")
    }),
  )

  it.effect("parses SSE JSON-RPC responses", () =>
    Effect.gen(function* () {
      const result = yield* parseResponse(`event: message\ndata: ${payload}\n\n`)
      expect(result).toBe("search results")
    }),
  )

  it.effect("ignores non-JSON SSE data frames", () =>
    Effect.gen(function* () {
      const result = yield* parseResponse(`data: [DONE]\ndata: ${payload}\n\n`)
      expect(result).toBe("search results")
    }),
  )
})

// Every field `call` accepts ends up in a different part of the outgoing
// request, so recording the request is what proves each one is still wired to
// the place it was wired to before.
interface RecordedRequest {
  url: string
  headers: Record<string, string>
  body: unknown
}

const recorder = (body: string, delay?: Duration.Input) => {
  const requests: RecordedRequest[] = []
  const client = HttpClient.make((request) =>
    Effect.gen(function* () {
      if (request.body._tag !== "Uint8Array") return yield* Effect.die(new Error(`unexpected body ${request.body._tag}`))
      requests.push({
        url: request.url,
        headers: request.headers,
        body: JSON.parse(new TextDecoder().decode(request.body.body)),
      })
      if (delay) yield* Effect.sleep(delay)
      return HttpClientResponse.fromWeb(request, new Response(body, { status: 200 }))
    }),
  )
  return { client, requests }
}

const mcpPayload = (text: string) =>
  JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text }] } })

describe("websearch MCP call", () => {
  it.effect("sends every argument to the slot it belongs in", () =>
    Effect.gen(function* () {
      const http = recorder(mcpPayload("call results"))

      const result = yield* call({
        http: http.client,
        url: "https://example.test/mcp",
        tool: "web_search_exa",
        args: SearchArgs,
        value: { query: "effect schema", type: "fast", numResults: 3, livecrawl: "preferred" },
        timeout: "25 seconds",
        headers: { "X-Test": "header-value" },
      })

      expect(result).toBe("call results")
      expect(http.requests).toHaveLength(1)
      // url, tool, value and args each land somewhere different: the request
      // target, params.name, params.arguments, and the schema that encodes them.
      expect(http.requests[0]?.url).toBe("https://example.test/mcp")
      expect(http.requests[0]?.body).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "web_search_exa",
          arguments: { query: "effect schema", type: "fast", numResults: 3, livecrawl: "preferred" },
        },
      })
      expect(http.requests[0]?.headers).toMatchObject({ "x-test": "header-value" })
    }),
  )

  it.effect("omits optional headers without sending an undefined value", () =>
    Effect.gen(function* () {
      const http = recorder(mcpPayload("no headers"))

      expect(
        yield* call({
          http: http.client,
          url: "https://example.test/mcp",
          tool: "web_search",
          args: ParallelSearchArgs,
          value: { objective: "effect", search_queries: ["effect"] },
          timeout: "25 seconds",
        }),
      ).toBe("no headers")
      expect(http.requests[0]?.headers).toMatchObject({ accept: "application/json, text/event-stream" })
    }),
  )

  it.live("dies with the tool name when the request outlives the timeout", () =>
    Effect.gen(function* () {
      const http = recorder(mcpPayload("too slow"), "2 seconds")

      const exit = yield* Effect.exit(
        call({
          http: http.client,
          url: "https://example.test/mcp",
          tool: "web_search_exa",
          args: SearchArgs,
          value: { query: "slow", type: "auto", numResults: 1, livecrawl: "fallback" },
          timeout: "10 millis",
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const messages = Cause.prettyErrors(exit.cause).map((error) => error.message)
        expect(messages.some((message) => message.includes("web_search_exa request timed out"))).toBe(true)
      }
    }),
  )
})

const ctx = {
  sessionID: SessionID.make("ses_test-websearch"),
  messageID: MessageID.make("msg_test"),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
} satisfies Tool.Context

describe("websearch provider dispatch", () => {
  it.effect("routes Exa through the Exa endpoint with defaulted controls", () =>
    Effect.gen(function* () {
      const http = recorder(mcpPayload("exa results"))

      expect(yield* callProvider(http.client, "exa", { query: "effect typescript" }, ctx)).toBe("exa results")
      expect(http.requests[0]?.url).toBe(EXA_URL)
      expect(http.requests[0]?.body).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "web_search_exa",
          arguments: {
            query: "effect typescript",
            type: "auto",
            numResults: 8,
            livecrawl: "fallback",
            // an omitted optional argument still encodes as an explicit null
            contextMaxCharacters: null,
          },
        },
      })
    }),
  )

  it.effect("forwards explicit Exa controls instead of the defaults", () =>
    Effect.gen(function* () {
      const http = recorder(mcpPayload("exa results"))

      yield* callProvider(
        http.client,
        "exa",
        { query: "effect layers", type: "deep", numResults: 2, livecrawl: "preferred", contextMaxCharacters: 1500 },
        ctx,
      )

      expect(http.requests[0]?.body).toMatchObject({
        params: {
          arguments: {
            query: "effect layers",
            type: "deep",
            numResults: 2,
            livecrawl: "preferred",
            contextMaxCharacters: 1500,
          },
        },
      })
    }),
  )

  it.effect("routes Parallel through its endpoint with session and auth headers", () =>
    Effect.gen(function* () {
      const original = process.env.PARALLEL_API_KEY
      process.env.PARALLEL_API_KEY = "parallel-secret"
      const http = recorder(mcpPayload("parallel results"))

      const result = yield* Effect.ensuring(
        callProvider(http.client, "parallel", { query: "effect fibers" }, { ...ctx, extra: { model: { id: "opus" } } }),
        Effect.sync(() => {
          if (original === undefined) delete process.env.PARALLEL_API_KEY
          else process.env.PARALLEL_API_KEY = original
        }),
      )

      expect(result).toBe("parallel results")
      expect(http.requests[0]?.url).toBe(PARALLEL_URL)
      expect(http.requests[0]?.headers).toMatchObject({ authorization: "Bearer parallel-secret" })
      expect(http.requests[0]?.body).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "web_search",
          arguments: {
            objective: "effect fibers",
            search_queries: ["effect fibers"],
            session_id: ctx.sessionID,
            model_name: "opus",
          },
        },
      })
    }),
  )
})
