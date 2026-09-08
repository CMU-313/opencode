import { describe, expect, test } from "bun:test"
import { SessionCompaction } from "../src/session/compaction"
import { ModelV2 } from "../src/model"
import { ProviderV2 } from "../src/provider"
import { SessionMessage } from "../src/session/message"
import { AgentAttachment, FileAttachment } from "../src/session/prompt"
import { SessionV2 } from "../src/session"
import { DateTime } from "effect"

test("compaction prompt preserves detailed work state and relevant files", () => {
  const prompt = SessionCompaction.buildPrompt({ context: ["conversation history"] })

  expect(prompt).toContain("## Work State\n### Completed")
  expect(prompt).toContain("### Active")
  expect(prompt).toContain("### Blocked")
  expect(prompt).toContain("## Relevant Files")
})

test("compaction describes tool media without embedding base64", () => {
  const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"

  const serialized = SessionCompaction.serializeToolContent([
    {
      type: "text",
      text: "Image read successfully",
    },
    {
      type: "file",
      uri: `data:image/png;base64,${base64}`,
      mime: "image/png",
      name: "pixel.png",
    },
  ])

  expect(serialized).toBe("Image read successfully\n[Attached image/png: pixel.png]")
  expect(serialized).not.toContain(base64)
})

describe("serialize", () => {
  const created = DateTime.makeUnsafe(0)

  const id = (value: string) => SessionMessage.ID.make(`msg_${value}`)

  const modelRef = {
    id: ModelV2.ID.make("model"),
    providerID: ProviderV2.ID.make("provider"),
  }

  const assistant = (content: SessionMessage.Assistant["content"]) =>
    SessionMessage.Assistant.make({
      id: id("assistant"),
      type: "assistant",
      agent: "build",
      model: modelRef,
      content,
      time: {
        created,
        completed: created,
      },
    })

  test("user message without files", () => {
    const message = SessionMessage.User.make({
      id: id("user"),
      type: "user",
      text: "Fix the bug",
      time: {
        created,
      },
    })

    expect(SessionCompaction.serialize(message)).toBe("[User]: Fix the bug")
  })

  test("user message appends one line per attached file, named or by uri", () => {
    const message = SessionMessage.User.make({
      id: id("user-files"),
      type: "user",
      text: "Inspect these",
      files: [
        FileAttachment.make({
          uri: "file:///a.png",
          mime: "image/png",
          name: "a.png",
        }),
        FileAttachment.make({
          uri: "file:///b.txt",
          mime: "text/plain",
        }),
      ],
      agents: [
        AgentAttachment.make({
          name: "build",
        }),
      ],
      time: {
        created,
      },
    })

    expect(SessionCompaction.serialize(message)).toBe(
      "[User]: Inspect these\n[Attached image/png: a.png]\n[Attached text/plain: file:///b.txt]",
    )
  })

  test("system message", () => {
    const message = SessionMessage.System.make({
      id: id("system"),
      type: "system",
      text: "Context refreshed",
      time: {
        created,
      },
    })

    expect(SessionCompaction.serialize(message)).toBe(
      "[System update]: Context refreshed",
    )
  })

  test("synthetic message", () => {
    const message = SessionMessage.Synthetic.make({
      id: id("synthetic"),
      type: "synthetic",
      sessionID: SessionV2.ID.make("ses_x"),
      text: "Injected context",
      time: {
        created,
      },
    })

    expect(SessionCompaction.serialize(message)).toBe(
      "[Synthetic context]: Injected context",
    )
  })

  test("shell message keeps short output verbatim", () => {
    const message = SessionMessage.Shell.make({
      id: id("shell"),
      type: "shell",
      callID: "shell-1",
      command: "pwd",
      output: "/project",
      time: {
        created,
        completed: created,
      },
    })

    expect(SessionCompaction.serialize(message)).toBe(
      "[Shell]: pwd\n/project",
    )
  })

  test("shell message truncates output past the 2000 char cap", () => {
    const message = SessionMessage.Shell.make({
      id: id("shell-long"),
      type: "shell",
      callID: "shell-2",
      command: "cat big.log",
      output: "x".repeat(5000),
      time: {
        created,
        completed: created,
      },
    })

    const result = SessionCompaction.serialize(message)

    expect(result).toBe(
      `[Shell]: cat big.log\n${"x".repeat(2000)}\n[truncated]`,
    )
  })

  test("assistant text part", () => {
    const message = assistant([
      SessionMessage.AssistantText.make({
        type: "text",
        id: "t",
        text: "Done",
      }),
    ])

    expect(SessionCompaction.serialize(message)).toBe(
      "[Assistant]: Done",
    )
  })

  test("assistant non-empty reasoning part", () => {
    const message = assistant([
      SessionMessage.AssistantReasoning.make({
        type: "reasoning",
        id: "r",
        text: "Think",
      }),
    ])

    expect(SessionCompaction.serialize(message)).toBe(
      "[Assistant reasoning]: Think",
    )
  })

  test("assistant empty reasoning part is dropped", () => {
    const message = assistant([
      SessionMessage.AssistantReasoning.make({
        type: "reasoning",
        id: "r",
        text: "",
      }),
    ])

    expect(SessionCompaction.serialize(message)).toBe("")
  })

  test("assistant pending tool call renders only the call line with its string input", () => {
    const message = assistant([
      SessionMessage.AssistantTool.make({
        type: "tool",
        id: "pending",
        name: "read",
        state: SessionMessage.ToolStatePending.make({
          status: "pending",
          input: '{"path":"README.md"}',
        }),
        time: {
          created,
        },
      }),
    ])

    expect(SessionCompaction.serialize(message)).toBe(
      '[Assistant tool call]: read({"path":"README.md"})',
    )
  })

  test("assistant completed tool call appends a truncated tool result with media described", () => {
    const message = assistant([
      SessionMessage.AssistantTool.make({
        type: "tool",
        id: "completed",
        name: "read",
        state: SessionMessage.ToolStateCompleted.make({
          status: "completed",
          input: {
            path: "README.md",
          },
          content: [
            {
              type: "text",
              text: "y".repeat(5000),
            },
            {
              type: "file",
              uri: "data:image/png;base64,aGVsbG8=",
              mime: "image/png",
              name: "hello.png",
            },
          ],
          structured: {},
        }),
        time: {
          created,
          completed: created,
        },
      }),
    ])

    const result = SessionCompaction.serialize(message)

    expect(result).toBe(
      `[Assistant tool call]: read({"path":"README.md"})\n[Tool result]: ${"y".repeat(2000)}\n[truncated]`,
    )

    expect(result).not.toContain("aGVsbG8=")
  })

  test("assistant errored tool call appends the error message", () => {
    const message = assistant([
      SessionMessage.AssistantTool.make({
        type: "tool",
        id: "errored",
        name: "read",
        state: SessionMessage.ToolStateError.make({
          status: "error",
          input: {
            path: "missing",
          },
          content: [],
          structured: {},
          error: {
            type: "unknown",
            message: "ENOENT: no such file",
          },
        }),
        time: {
          created,
          completed: created,
        },
      }),
    ])

    expect(SessionCompaction.serialize(message)).toBe(
      '[Assistant tool call]: read({"path":"missing"})\n[Tool error]: ENOENT: no such file',
    )
  })

  test("assistant message joins every rendered part with newlines", () => {
    const message = assistant([
      SessionMessage.AssistantText.make({
        type: "text",
        id: "t",
        text: "Looking",
      }),

      SessionMessage.AssistantReasoning.make({
        type: "reasoning",
        id: "r",
        text: "",
      }),

      SessionMessage.AssistantTool.make({
        type: "tool",
        id: "pending",
        name: "bash",
        state: SessionMessage.ToolStatePending.make({
          status: "pending",
          input: "ls",
        }),
        time: {
          created,
        },
      }),
    ])

    expect(SessionCompaction.serialize(message)).toBe(
      "[Assistant]: Looking\n[Assistant tool call]: bash(ls)",
    )
  })

  test.each([
    "agent-switched",
    "model-switched",
    "compaction",
  ] as const)(
    "%s message has no transcript representation",
    (type) => {
      const message =
        type === "agent-switched"
          ? SessionMessage.AgentSwitched.make({
              id: id("a"),
              type,
              agent: "build",
              time: {
                created,
              },
            })
          : type === "model-switched"
            ? SessionMessage.ModelSwitched.make({
                id: id("m"),
                type,
                model: modelRef,
                time: {
                  created,
                },
              })
            : SessionMessage.Compaction.make({
                id: id("c"),
                type,
                reason: "auto",
                summary: "s",
                recent: "r",
                time: {
                  created,
                },
              })

      expect(SessionCompaction.serialize(message)).toBe("")
    },
  )
})