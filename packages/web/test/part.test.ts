import { test, expect } from "bun:test"
import { getCompletedAt } from "../src/components/share/part"
import type { MessageV2 } from "opencode/session/message-v2"

function assistantMessage(overrides: Partial<{ completed: number }> = {}): MessageV2.Info {
  return {
    role: "assistant",
    time: { completed: overrides.completed },
  } as unknown as MessageV2.Info
}

function userMessage(): MessageV2.Info {
  return {
    role: "user",
  } as unknown as MessageV2.Info
}

test("returns completed time when last, assistant, and completed is set", () => {
  const message = assistantMessage({ completed: 1234567890 })
  expect(getCompletedAt({ last: true, message })).toBe(1234567890)
})

test("returns undefined when not the last part", () => {
  const message = assistantMessage({ completed: 1234567890 })
  expect(getCompletedAt({ last: false, message })).toBeUndefined()
})

test("returns undefined when message role is user", () => {
  const message = userMessage()
  expect(getCompletedAt({ last: true, message })).toBeUndefined()
})

test("returns undefined when assistant message has no completed time", () => {
  const message = assistantMessage()
  expect(getCompletedAt({ last: true, message })).toBeUndefined()
})
