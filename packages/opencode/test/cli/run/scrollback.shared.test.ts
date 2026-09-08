import { expect, test } from "bun:test"
import { TextAttributes } from "@opentui/core"
import { entryFailed, entryLook } from "@/cli/cmd/run/scrollback.shared"
import type { RunEntryTheme } from "@/cli/cmd/run/theme"
import type { StreamCommit } from "@/cli/cmd/run/types"

const mockTheme: RunEntryTheme = {
  system: { body: "system-color" },
  user: { body: "user-color" },
  assistant: { body: "assistant-color" },
  reasoning: { body: "reasoning-color" },
  tool: { body: "tool-color", start: "tool-start-color" },
  error: { body: "error-color" },
}

function baseCommit(overrides: Partial<StreamCommit>): StreamCommit {
  return {
    kind: "assistant",
    text: "",
    phase: "progress",
    source: "assistant",
    ...overrides,
  }
}

test("returns user color for user commits", () => {
  const commit = baseCommit({ kind: "user" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "user-color" })
})

test("returns error color and bold for failed tool commits", () => {
  const commit = baseCommit({ kind: "tool", toolState: "error" })
  expect(entryFailed(commit)).toBe(true) // sanity-check the trigger condition itself
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "error-color", attrs: TextAttributes.BOLD })
})

test("returns system color and dim for final phase commits", () => {
  const commit = baseCommit({ kind: "assistant", phase: "final" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "system-color", attrs: TextAttributes.DIM })
})

test("returns tool start color for tool start commits", () => {
  const commit = baseCommit({ kind: "tool", phase: "start" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "tool-start-color" })
})

test("returns assistant color for assistant commits", () => {
  const commit = baseCommit({ kind: "assistant", phase: "progress" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "assistant-color" })
})

test("returns reasoning color and dim for reasoning commits", () => {
  const commit = baseCommit({ kind: "reasoning", phase: "progress" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "reasoning-color", attrs: TextAttributes.DIM })
})

test("returns error color and bold for error-kind commits", () => {
  const commit = baseCommit({ kind: "error", phase: "progress" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "error-color", attrs: TextAttributes.BOLD })
})

test("returns tool color for non-start tool commits", () => {
  const commit = baseCommit({ kind: "tool", phase: "progress" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "tool-color" })
})

test("returns system color for system commits as fallback", () => {
  const commit = baseCommit({ kind: "system", phase: "progress" })
  expect(entryLook(commit, mockTheme)).toEqual({ fg: "system-color" })
})