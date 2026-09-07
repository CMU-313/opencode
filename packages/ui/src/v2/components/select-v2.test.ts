import { describe, expect, test } from "bun:test"
import { createHighlightTracker, formatSelectedValue, normalizeSelectValue } from "./select-v2-helpers"

describe("normalizeSelectValue", () => {
  test("returns null when next is null", () => {
    expect(normalizeSelectValue(null)).toBeNull()
  })

  test("returns the first item when next is an array", () => {
    expect(normalizeSelectValue(["a", "b"])).toBe("a")
  })

  test("returns null when next is an empty array", () => {
    expect(normalizeSelectValue([])).toBeNull()
  })

  test("returns the value unchanged when next is a single item", () => {
    expect(normalizeSelectValue("a")).toBe("a")
  })
})

describe("formatSelectedValue", () => {
  test("returns empty string when selected is null and no label", () => {
    expect(formatSelectedValue(null)).toBe("")
  })

  test("returns the raw value as a string when no label is provided", () => {
    expect(formatSelectedValue("apple")).toBe("apple")
  })

  test("uses the label function when provided and selected is not null", () => {
    const label = (item: string) => `Label: ${item}`
    expect(formatSelectedValue("apple", label)).toBe("Label: apple")
  })

  test("returns empty string when selected is null even if a label function is provided", () => {
    const label = (item: string) => `Label: ${item}`
    expect(formatSelectedValue(null, label)).toBe("")
  })
})

describe("createHighlightTracker", () => {
  test("move does nothing if onHighlight is not provided", () => {
    const { move } = createHighlightTracker<string>({})
    expect(() => move("apple")).not.toThrow()
  })

  test("move calls onHighlight with the item", () => {
    const calls: string[] = []
    const { move } = createHighlightTracker<string>({
      onHighlight: (item) => {
        calls.push(item)
        return undefined
      },
    })
    move("apple")
    expect(calls).toEqual(["apple"])
  })

  test("move does not re-trigger onHighlight for the same item twice in a row", () => {
    let callCount = 0
    const { move } = createHighlightTracker<string>({
      onHighlight: () => {
        callCount++
        return undefined
      },
    })
    move("apple")
    move("apple")
    expect(callCount).toBe(1)
  })

  test("move triggers onHighlight again when the item changes", () => {
    let callCount = 0
    const { move } = createHighlightTracker<string>({
      onHighlight: () => {
        callCount++
        return undefined
      },
    })
    move("apple")
    move("banana")
    expect(callCount).toBe(2)
  })

  test("move calls the previous cleanup function when highlighting a new item", () => {
    let cleanedUp = false
    const { move } = createHighlightTracker<string>({
      onHighlight: (item) => (item === "apple" ? () => (cleanedUp = true) : undefined),
    })
    move("apple")
    move("banana")
    expect(cleanedUp).toBe(true)
  })

  test("stop clears the current highlight and calls cleanup", () => {
    let cleanedUp = false
    const { move, stop } = createHighlightTracker<string>({
      onHighlight: () => () => (cleanedUp = true),
    })
    move("apple")
    stop()
    expect(cleanedUp).toBe(true)
  })

  test("move with undefined item calls stop", () => {
    let cleanedUp = false
    const { move } = createHighlightTracker<string>({
      onHighlight: () => () => (cleanedUp = true),
    })
    move("apple")
    move(undefined)
    expect(cleanedUp).toBe(true)
  })

  test("uses the value function to compute the key when provided", () => {
    const calls: string[] = []
    const { move } = createHighlightTracker<{ id: string }>({
      value: (item) => item.id,
      onHighlight: (item) => {
        calls.push(item.id)
        return undefined
      },
    })
    move({ id: "1" })
    move({ id: "1" })
    expect(calls).toEqual(["1"])
  })
})
