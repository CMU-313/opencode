import { describe, expect, test } from "bun:test"
import { errorData, errorFormat, errorMessage } from "../../src/util/error"

describe("util.error", () => {
  test("formats native Error instances", () => {
    const err = new Error("boom")
    expect(errorMessage(err)).toBe("boom")
    expect(errorFormat(err)).toContain("boom")

    const data = errorData(err)
    expect(data.type).toBe("Error")
    expect(data.message).toBe("boom")
    expect(String(data.formatted)).toContain("boom")
  })

  test("extracts message from record-like values", () => {
    const err = { message: "bad input", code: "E_BAD" }
    expect(errorMessage(err)).toBe("bad input")

    const data = errorData(err)
    expect(data.message).toBe("bad input")
    expect(data.code).toBe("E_BAD")
  })

  test("never returns bare {} for opaque object errors", () => {
    expect(errorFormat({})).not.toBe("{}")
    expect(errorFormat({})).toContain("no message")

    class OpaqueError {}
    const opaque = new OpaqueError()
    Object.defineProperty(opaque, "secret", { value: "hidden", enumerable: false })
    expect(errorFormat(opaque)).not.toBe("{}")
    expect(errorFormat(opaque)).toContain("OpaqueError")
  })

  test("handles opaque throwables with custom toString", () => {
    const err = {
      toString() {
        return "ResolveMessage: Cannot resolve module"
      },
    }

    expect(errorMessage(err)).toBe("ResolveMessage: Cannot resolve module")

    const data = errorData(err)
    expect(data.message).toBe("ResolveMessage: Cannot resolve module")
    expect(String(data.formatted)).toContain("ResolveMessage")
  })

  test("formats serializable objects and primitive values", () => {
    expect(errorFormat({ code: "E_BAD", retry: false })).toContain('"code": "E_BAD"')
    expect(errorFormat("plain error")).toBe("plain error")
    expect(errorFormat(42)).toBe("42")
  })

  test("handles unserializable object errors", () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(errorFormat(circular)).toBe("Unexpected error (unserializable)")
  })
})
