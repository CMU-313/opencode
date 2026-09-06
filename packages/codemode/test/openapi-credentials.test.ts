import { describe, expect, test } from "bun:test"
import { ToolError } from "../src/tool-error.js"
import { apiKeyEntry, credentialEntry } from "../src/openapi/runtime.js"
import type { SecurityScheme } from "../src/openapi/types.js"

const httpScheme: SecurityScheme = { type: "http", scheme: "bearer" }
const headerScheme: SecurityScheme = { type: "apiKey", in: "header", name: "X-Api-Key" }
const queryScheme: SecurityScheme = { type: "apiKey", in: "query", name: "api_key" }
const cookieScheme: SecurityScheme = { type: "apiKey", in: "cookie", name: "session" }

describe("credentialEntry", () => {
  test("carries a bearer token as an authorization header", () => {
    expect(credentialEntry("scheme", httpScheme, { type: "bearer", token: "secret" })).toEqual({
      carrier: "header",
      name: "authorization",
      value: "Bearer secret",
    })
  })

  test("base64-encodes basic credentials, including non-Latin-1 characters", () => {
    expect(credentialEntry("scheme", httpScheme, { type: "basic", username: "user", password: "pass" })).toEqual({
      carrier: "header",
      name: "authorization",
      value: `Basic ${Buffer.from("user:pass", "utf8").toString("base64")}`,
    })
    // btoa throws on these code points; the implementation must stay on Buffer.
    expect(credentialEntry("scheme", httpScheme, { type: "basic", username: "üser", password: "pü" })).toEqual({
      carrier: "header",
      name: "authorization",
      value: `Basic ${Buffer.from("üser:pü", "utf8").toString("base64")}`,
    })
  })

  test("lowercases an explicit header credential name", () => {
    expect(credentialEntry("scheme", httpScheme, { type: "header", name: "X-Custom", value: "v" })).toEqual({
      carrier: "header",
      name: "x-custom",
      value: "v",
    })
  })

  test("takes the carrier for an apiKey credential from the scheme declaration", () => {
    expect(credentialEntry("scheme", queryScheme, { type: "apiKey", value: "secret" })).toEqual({
      carrier: "query",
      name: "api_key",
      value: "secret",
    })
    expect(credentialEntry("scheme", headerScheme, { type: "apiKey", value: "secret" })).toEqual({
      carrier: "header",
      name: "x-api-key",
      value: "secret",
    })
  })

  test("propagates scheme validation failures from apiKey credentials", () => {
    const result = credentialEntry("bearerScheme", httpScheme, { type: "apiKey", value: "secret" })
    expect(result).toBeInstanceOf(ToolError)
  })
})

describe("apiKeyEntry", () => {
  test("lowercases header names but preserves query names verbatim", () => {
    expect(apiKeyEntry("scheme", headerScheme, "secret")).toEqual({
      carrier: "header",
      name: "x-api-key",
      value: "secret",
    })
    expect(apiKeyEntry("scheme", queryScheme, "secret")).toEqual({
      carrier: "query",
      name: "api_key",
      value: "secret",
    })
  })

  test("preserves a prototype-named query parameter as data", () => {
    expect(apiKeyEntry("scheme", { type: "apiKey", in: "query", name: "__proto__" }, "secret")).toEqual({
      carrier: "query",
      name: "__proto__",
      value: "secret",
    })
  })

  test("rejects an apiKey credential resolved for a non-apiKey scheme", () => {
    const result = apiKeyEntry("bearerScheme", httpScheme, "secret")
    expect(result).toBeInstanceOf(ToolError)
    expect((result as ToolError).message).toContain("is not an apiKey scheme")
  })

  test("fails closed on cookie-carried apiKey schemes", () => {
    const result = apiKeyEntry("session", cookieScheme, "secret")
    expect(result).toBeInstanceOf(ToolError)
    expect((result as ToolError).message).toContain("Cookie authentication")
  })
})
