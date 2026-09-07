import { expect, test } from "bun:test"
import { push } from "@/cli/cmd/run/splash"

test("push appends a cell with all fields to the lines array", () => {
  const lines: Array<{ left: number; top: number; text: string; fg: string; bg?: string; attrs?: number }> = []

  push(lines, { left: 3, top: 1, text: "hello", fg: "red", bg: "blue", attrs: 1 })

  expect(lines).toHaveLength(1)
  expect(lines[0]).toEqual({ left: 3, top: 1, text: "hello", fg: "red", bg: "blue", attrs: 1 })
})

test("push appends a cell without optional bg/attrs fields", () => {
  const lines: Array<{ left: number; top: number; text: string; fg: string; bg?: string; attrs?: number }> = []

  push(lines, { left: 0, top: 0, text: "x", fg: "green" })

  expect(lines).toHaveLength(1)
  expect(lines[0]).toEqual({ left: 0, top: 0, text: "x", fg: "green", bg: undefined, attrs: undefined })
})

test("push preserves existing entries and appends to the end", () => {
  const lines = [{ left: 1, top: 1, text: "first", fg: "white" }]

  push(lines, { left: 2, top: 2, text: "second", fg: "black" })

  expect(lines).toHaveLength(2)
  expect(lines[1].text).toBe("second")
})