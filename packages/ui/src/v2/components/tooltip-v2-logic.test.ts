import { describe, expect, test } from "bun:test"
import {
  isActivationKey,
  isFocusWithin,
  isTriggerPointerDown,
  resolveExpanded,
  resolveOpenChange,
  shouldReleaseBlock,
  syncThemeAttribute,
} from "./tooltip-v2-logic"

// Bun's test runtime has no DOM globals; isTriggerPointerDown only needs
// `instanceof Node` to resolve, so a bare stub constructor is sufficient.
if (typeof globalThis.Node === "undefined") {
  ;(globalThis as unknown as { Node: unknown }).Node = class {}
}

describe("isFocusWithin", () => {
  test("false when there is no root or no active element", () => {
    const root = { contains: () => true } as unknown as Element
    expect(isFocusWithin(undefined, root)).toBe(false)
    expect(isFocusWithin(root, null)).toBe(false)
  })

  test("delegates to root.contains when both are present", () => {
    const active = {} as Element
    const containing = { contains: () => true } as unknown as Element
    const notContaining = { contains: () => false } as unknown as Element
    expect(isFocusWithin(containing, active)).toBe(true)
    expect(isFocusWithin(notContaining, active)).toBe(false)
  })
})

describe("resolveExpanded", () => {
  test("false when root is missing or has no matching descendant", () => {
    expect(resolveExpanded(undefined)).toBe(false)
    expect(resolveExpanded({ querySelector: () => null } as unknown as Element)).toBe(false)
  })

  test("true when an expanded descendant is found", () => {
    expect(resolveExpanded({ querySelector: () => ({}) } as unknown as Element)).toBe(true)
  })
})

describe("shouldReleaseBlock", () => {
  test("keeps the block while expanded, hovered, or focused", () => {
    expect(shouldReleaseBlock({ expand: true, hovered: false, focused: false })).toBe(false)
    expect(shouldReleaseBlock({ expand: false, hovered: true, focused: false })).toBe(false)
    expect(shouldReleaseBlock({ expand: false, hovered: false, focused: true })).toBe(false)
  })

  test("releases the block only when none apply", () => {
    expect(shouldReleaseBlock({ expand: false, hovered: false, focused: false })).toBe(true)
  })
})

describe("resolveOpenChange", () => {
  test("ignores changes while forced open", () => {
    const result = resolveOpenChange({ open: true, forceOpen: true, blocked: false, justClickedTrigger: false })
    expect(result).toEqual({ justClickedTrigger: false })
  })

  test("ignores an open request while blocked", () => {
    const result = resolveOpenChange({ open: true, forceOpen: false, blocked: true, justClickedTrigger: false })
    expect(result).toEqual({ justClickedTrigger: false })
  })

  test("allows closing even while blocked", () => {
    const result = resolveOpenChange({ open: false, forceOpen: false, blocked: true, justClickedTrigger: false })
    expect(result).toEqual({ open: false, justClickedTrigger: false })
  })

  test("swallows the change right after a trigger click and clears the flag", () => {
    const result = resolveOpenChange({ open: true, forceOpen: false, blocked: false, justClickedTrigger: true })
    expect(result).toEqual({ justClickedTrigger: false })
  })

  test("applies the change when nothing blocks it", () => {
    const result = resolveOpenChange({ open: true, forceOpen: false, blocked: false, justClickedTrigger: false })
    expect(result).toEqual({ open: true, justClickedTrigger: false })
  })
})

describe("isActivationKey", () => {
  test("accepts Enter and Space", () => {
    expect(isActivationKey("Enter")).toBe(true)
    expect(isActivationKey(" ")).toBe(true)
  })

  test("rejects other keys", () => {
    expect(isActivationKey("Escape")).toBe(false)
    expect(isActivationKey("Tab")).toBe(false)
  })
})

describe("isTriggerPointerDown", () => {
  test("true when the target is the trigger itself", () => {
    const trigger = {} as Element
    expect(isTriggerPointerDown(trigger, trigger)).toBe(true)
  })

  test("true when the target is contained by the trigger", () => {
    const trigger = { contains: () => true } as unknown as Element
    const target = new Node()
    expect(isTriggerPointerDown(trigger, target)).toBe(true)
  })

  test("false when the target is a Node but not contained by the trigger", () => {
    const trigger = { contains: () => false } as unknown as Element
    expect(isTriggerPointerDown(trigger, new Node())).toBe(false)
  })

  test("false when the target is not a Node at all, or is null", () => {
    const trigger = { contains: () => true } as unknown as Element
    expect(isTriggerPointerDown(trigger, {} as EventTarget)).toBe(false)
    expect(isTriggerPointerDown(trigger, null)).toBe(false)
  })
})

describe("syncThemeAttribute", () => {
  test("does nothing when the root has no theme ancestor", () => {
    const root = { closest: () => null } as unknown as Element
    const target = { setAttribute: () => {} } as unknown as Element
    let called = false
    target.setAttribute = () => {
      called = true
    }
    syncThemeAttribute(root, target)
    expect(called).toBe(false)
  })

  test("copies the theme attribute onto the target", () => {
    const themed = { getAttribute: () => "dark" }
    const root = { closest: () => themed } as unknown as Element
    let appliedTheme: string | undefined
    const target = {
      setAttribute: (name: string, value: string) => {
        if (name === "data-theme") appliedTheme = value
      },
    } as unknown as Element
    syncThemeAttribute(root, target)
    expect(appliedTheme).toBe("dark")
  })
})
