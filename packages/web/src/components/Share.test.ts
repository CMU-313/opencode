import { describe, expect, test } from "bun:test"
import type { Message } from "opencode/session/message"
import { SessionID } from "opencode/session/schema"
import { fromV1 } from "./Share"

const sessionID = SessionID.make("ses_1")

function assistantMessage(parts: Message.MessagePart[], tool: Message.Info["metadata"]["tool"] = {}): Message.Info {
  return {
    id: "msg_1",
    role: "assistant",
    parts,
    metadata: {
      time: { created: 1, completed: 2 },
      sessionID,
      tool,
      assistant: {
        system: [],
        modelID: "claude",
        providerID: "anthropic",
        path: { cwd: "/repo", root: "/repo" },
        cost: 0.5,
        summary: false,
        tokens: { input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
      },
    },
  } as unknown as Message.Info
}

function userMessage(parts: Message.MessagePart[]): Message.Info {
  return {
    id: "msg_3",
    role: "user",
    parts,
    metadata: {
      time: { created: 1 },
      sessionID,
      tool: {},
    },
  } as unknown as Message.Info
}

describe("fromV1", () => {
  test("converts an assistant message with text and step-start parts", () => {
    const result = fromV1(assistantMessage([{ type: "step-start" }, { type: "text", text: "hello" }]))

    expect(result).toMatchObject({
      id: "msg_1",
      sessionID: "ses_1",
      role: "assistant",
      parentID: "",
      agent: "build",
      mode: "build",
      cost: 0.5,
      modelID: "claude",
      providerID: "anthropic",
    })
    expect(result.parts).toEqual([
      expect.objectContaining({ type: "step-start" }),
      expect.objectContaining({ type: "text", text: "hello" }),
    ])
  })

  test("converts an assistant tool-invocation part through each state", () => {
    const tool = { call_1: { title: "Read", time: { start: 1, end: 2 } } }

    const pending = fromV1(
      assistantMessage(
        [{ type: "tool-invocation", toolInvocation: { state: "partial-call", toolCallId: "call_1", toolName: "read", args: {} } }],
        tool,
      ),
    )
    expect(pending.parts[0]).toMatchObject({
      type: "tool",
      callID: "call_1",
      tool: "read",
      state: { status: "pending", input: {}, raw: "" },
    })

    const running = fromV1(
      assistantMessage(
        [
          {
            type: "tool-invocation",
            toolInvocation: { state: "call", toolCallId: "call_1", toolName: "read", args: { filePath: "a.ts" } },
          },
        ],
        tool,
      ),
    )
    expect(running.parts[0]).toMatchObject({
      type: "tool",
      state: { status: "running", input: { filePath: "a.ts" }, time: { start: 1 } },
    })

    const completed = fromV1(
      assistantMessage(
        [
          {
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              toolCallId: "call_1",
              toolName: "read",
              args: { filePath: "a.ts" },
              result: "contents",
            },
          },
        ],
        tool,
      ),
    )
    expect(completed.parts[0]).toMatchObject({
      type: "tool",
      state: { status: "completed", input: { filePath: "a.ts" }, output: "contents", title: "Read", time: { start: 1, end: 2 } },
    })
  })

  test("drops assistant part types it doesn't render", () => {
    const result = fromV1(assistantMessage([{ type: "reasoning", text: "thinking" }]))

    expect(result.parts).toEqual([])
  })

  test("converts a user message with text and file parts", () => {
    const result = fromV1(
      userMessage([
        { type: "text", text: "check this" },
        { type: "file", mediaType: "text/plain", filename: "note.txt", url: "file:///note.txt" },
      ]),
    )

    expect(result).toMatchObject({ id: "msg_3", sessionID: "ses_1", role: "user", agent: "user", model: { providerID: "", modelID: "" } })
    expect(result.parts).toEqual([
      expect.objectContaining({ type: "text", text: "check this" }),
      expect.objectContaining({ type: "file", mime: "text/plain", filename: "note.txt", url: "file:///note.txt" }),
    ])
  })

  test("drops user part types it doesn't render", () => {
    const result = fromV1(userMessage([{ type: "reasoning", text: "thinking" }]))

    expect(result.parts).toEqual([])
  })

  test("throws for an unknown message role", () => {
    const v1 = { ...userMessage([]), role: "system" } as unknown as Message.Info

    expect(() => fromV1(v1)).toThrow("unknown message type")
  })

  test("throws for an unknown tool invocation state", () => {
    const tool = { call_1: { title: "Read", time: { start: 1, end: 2 } } }
    const v1 = assistantMessage(
      [{ type: "tool-invocation", toolInvocation: { state: "unknown", toolCallId: "call_1", toolName: "read", args: {} } as never }],
      tool,
    )

    expect(() => fromV1(v1)).toThrow("unknown tool invocation state")
  })
})
