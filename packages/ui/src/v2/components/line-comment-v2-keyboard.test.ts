import { describe, expect, test } from "bun:test"
import { handleEditorKeyDown, handleMentionKeyDown } from "./line-comment-v2-keyboard"

function keyDown(key: string, options: KeyboardEventInit = {}) {
  const event = {
    key,
    altKey: options.altKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true
    },
  }
  return event as unknown as KeyboardEvent
}

describe("handleMentionKeyDown", () => {
  test("does nothing when the mention menu is closed", () => {
    const event = keyDown("Escape")
    const closed: boolean[] = []

    expect(
      handleMentionKeyDown(event, {
        open: false,
        hasItems: true,
        close: () => closed.push(true),
        selectActive: () => {},
        navigate: () => {},
      }),
    ).toBe(false)
    expect(closed).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })

  test("closes the mention menu before editor Escape handling", () => {
    const event = keyDown("Escape")
    const closed: boolean[] = []

    expect(
      handleMentionKeyDown(event, {
        open: true,
        hasItems: true,
        close: () => closed.push(true),
        selectActive: () => {},
        navigate: () => {},
      }),
    ).toBe(true)
    expect(closed).toEqual([true])
    expect(event.defaultPrevented).toBe(true)
  })

  test("handles Tab and navigation only when suggestions exist", () => {
    const selected: boolean[] = []
    const navigated: string[] = []
    const context = {
      open: true,
      hasItems: true,
      close: () => {},
      selectActive: () => selected.push(true),
      navigate: (event: KeyboardEvent) => navigated.push(event.key),
    }

    expect(handleMentionKeyDown(keyDown("Tab"), context)).toBe(true)
    expect(handleMentionKeyDown(keyDown("ArrowDown"), context)).toBe(true)
    expect(handleMentionKeyDown(keyDown("n", { ctrlKey: true }), context)).toBe(true)
    expect(selected).toEqual([true])
    expect(navigated).toEqual(["ArrowDown", "n"])

    expect(handleMentionKeyDown(keyDown("Enter"), { ...context, hasItems: false })).toBe(false)
    expect(selected).toEqual([true])
  })
})

describe("handleEditorKeyDown", () => {
  test("cancels on Escape and submits plain Enter only", () => {
    const cancelled: boolean[] = []
    const submitted: boolean[] = []
    const blurred: boolean[] = []
    const context = {
      blur: () => blurred.push(true),
      cancel: () => cancelled.push(true),
      submit: () => submitted.push(true),
    }

    const escape = keyDown("Escape")
    handleEditorKeyDown(escape, context)
    handleEditorKeyDown(keyDown("Enter", { shiftKey: true }), context)
    const enter = keyDown("Enter")
    handleEditorKeyDown(enter, context)

    expect(blurred).toEqual([true])
    expect(cancelled).toEqual([true])
    expect(submitted).toEqual([true])
    expect(escape.defaultPrevented).toBe(true)
    expect(enter.defaultPrevented).toBe(true)
  })
})