import { describe, expect, test } from "bun:test"
import { formatChange } from "../../../script/stats-utils"

describe("formatChange", () => {
  test("formats a positive change", () => {
    expect(formatChange(1000)).toBe(" (+1,000)")
  })

  test("formats a negative change", () => {
    expect(formatChange(-1000)).toBe(" (-1,000)")
  })

  test("formats zero change", () => {
    expect(formatChange(0)).toBe(" (+0)")
  })
})