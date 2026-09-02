import { describe, expect, test } from "bun:test"
import { flattenToolArgs, formatToolArgValue } from "./part"

describe("formatToolArgValue", () => {
  test("renders null and undefined as empty string", () => {
    expect(formatToolArgValue(null)).toBe("")
    expect(formatToolArgValue(undefined)).toBe("")
  })

  test("stringifies primitives directly", () => {
    expect(formatToolArgValue("hi")).toBe("hi")
    expect(formatToolArgValue(3.14)).toBe("3.14")
    expect(formatToolArgValue(0)).toBe("0")
    expect(formatToolArgValue(false)).toBe("false")
    expect(formatToolArgValue(true)).toBe("true")
  })

  test("JSON-stringifies values that reach it as objects/arrays", () => {
    // walk() never actually passes objects/arrays to formatToolArgValue (it
    // recurses into them instead), so this only matters if the function is
    // ever called directly with a container value.
    expect(formatToolArgValue({ a: 1 })).toBe('{"a":1}')
    expect(formatToolArgValue([1, 2])).toBe("[1,2]")
  })

  test("falls back to String() when JSON.stringify returns undefined", () => {
    const fn = function foo() {}
    expect(formatToolArgValue(fn)).toBe(String(fn))

    const sym = Symbol("x")
    expect(formatToolArgValue(sym)).toBe("Symbol(x)")
  })
})

describe("flattenToolArgs", () => {
  test("flattens nested objects and arrays into dotted/bracketed paths", () => {
    expect(flattenToolArgs({ a: { b: { c: 1 } }, d: [{ e: 2 }, 3] })).toEqual([
      ["a.b.c", "1"],
      ["d[0].e", "2"],
      ["d[1]", "3"],
    ])
  })

  test("prefixes all paths when a prefix is given", () => {
    expect(flattenToolArgs({ x: 1 }, "root")).toEqual([["root.x", "1"]])
  })

  test("renders null and undefined property values as empty strings", () => {
    expect(flattenToolArgs({ a: null, b: undefined })).toEqual([
      ["a", ""],
      ["b", ""],
    ])
  })

  test("empty objects and arrays contribute no entries", () => {
    expect(flattenToolArgs({})).toEqual([])
    expect(flattenToolArgs({ a: [] })).toEqual([])
    expect(flattenToolArgs({ a: {} })).toEqual([])
  })

  test("a top-level primitive or null produces a single empty-path entry", () => {
    expect(flattenToolArgs("hello")).toEqual([["", "hello"]])
    expect(flattenToolArgs(42)).toEqual([["", "42"]])
    expect(flattenToolArgs(null)).toEqual([["", ""]])
  })

  test("a top-level array uses bracketed indices with no leading key", () => {
    expect(flattenToolArgs([1, 2, "x"])).toEqual([
      ["[0]", "1"],
      ["[1]", "2"],
      ["[2]", "x"],
    ])
  })

  test("flattens an array of objects per-index", () => {
    expect(flattenToolArgs({ items: [{ id: 1 }, { id: 2 }] })).toEqual([
      ["items[0].id", "1"],
      ["items[1].id", "2"],
    ])
  })

  test("sparse arrays skip holes (Array.prototype.forEach semantics)", () => {
    expect(flattenToolArgs({ a: [1, , 3] })).toEqual([
      ["a[0]", "1"],
      ["a[2]", "3"],
    ])
  })
})
