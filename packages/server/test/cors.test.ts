import { describe, expect, test } from "bun:test"
import { isAllowedCorsOrigin, isAllowedRequestOrigin } from "../src/cors"

describe("isAllowedCorsOrigin", () => {

  test("allows missing origin", () => {
    expect(isAllowedCorsOrigin(undefined)).toBe(true)
    expect(isAllowedCorsOrigin("")).toBe(true)
  })

  test("allows localhost and 127.0.0.1 origins on any port", () => {
    expect(isAllowedCorsOrigin("http://localhost:3000")).toBe(true)
    expect(isAllowedCorsOrigin("http://127.0.0.1:5173")).toBe(true)
  })

  test("allows the desktop renderer origin", () => {
    expect(isAllowedCorsOrigin("oc://renderer")).toBe(true)
    expect(isAllowedCorsOrigin("oc://renderer/test")).toBe(true)
  })

  test("allows the exact tauri origins", () => {
    expect(isAllowedCorsOrigin("tauri://localhost")).toBe(true)
    expect(isAllowedCorsOrigin("http://tauri.localhost")).toBe(true)
    expect(isAllowedCorsOrigin("https://tauri.localhost")).toBe(true)
  })

  test("allows opencode.ai and its subdomains", () => {
    expect(isAllowedCorsOrigin("https://opencode.ai")).toBe(true)
    expect(isAllowedCorsOrigin("https://app.opencode.ai")).toBe(true)
    expect(isAllowedCorsOrigin("https://foo.bar.opencode.ai")).toBe(true)
  })

  test("rejects lookalike or unrelated origins", () => {
    expect(isAllowedCorsOrigin("https://evil.example")).toBe(false)
    expect(isAllowedCorsOrigin("https://notopencode.ai")).toBe(false)
    expect(isAllowedCorsOrigin("https://opencode.ai.evil.example")).toBe(false)
    expect(isAllowedCorsOrigin("http://tauri.localhost.evil.example")).toBe(false)
  })

  test("honors a custom cors allowlist", () => {
    const opts = { cors: ["https://custom.example"] }
    expect(isAllowedCorsOrigin("https://custom.example", opts)).toBe(true)
    expect(isAllowedCorsOrigin("https://other.example", opts)).toBe(false)
    expect(isAllowedCorsOrigin("https://other.example")).toBe(false)
  })
})

describe("isAllowedRequestOrigin", () => {
  test("allows missing origin", () => {
    expect(isAllowedRequestOrigin(undefined, "example.com")).toBe(true)
  })

  test("allows an origin that matches the request host", () => {
    expect(isAllowedRequestOrigin("https://example.com", "example.com")).toBe(true)
    expect(isAllowedRequestOrigin("https://example.com:8080", "example.com:8080")).toBe(true)
  })

  test("falls back to isAllowedCorsOrigin when the host does not match", () => {
    expect(isAllowedRequestOrigin("https://evil.example", "example.com")).toBe(false)
    expect(isAllowedRequestOrigin("http://localhost:3000", "example.com")).toBe(true)
  })

  test("treats an unparseable origin as not matching the host", () => {
    expect(isAllowedRequestOrigin("not-a-url", "example.com")).toBe(false)
  })
})
