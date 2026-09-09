import { describe, expect, mock, test } from "bun:test"
import type { AssistantMessage, Part, UserMessage } from "@opencode-ai/sdk/v2"
import { formatCommentNote } from "@/utils/comment-note"

mock.module("@opencode-ai/session-ui/message-part", () => ({
  renderable: () => true,
  groupParts: (refs: Array<{ messageID: string; part: { id: string } }>) =>
    refs.map((ref) => ({
      type: "part" as const,
      key: ref.part.id,
      ref: { messageID: ref.messageID, partID: ref.part.id },
    })),
}))

const { Timeline, TimelineRow } = await import("./rows")

function fakeUserMessage(overrides: Partial<UserMessage> = {}): UserMessage {
  return {
    id: "msg_user",
    sessionID: "ses_1",
    role: "user",
    time: { created: 1 },
    agent: "build",
    model: { providerID: "provider", modelID: "model" },
    ...overrides,
  }
}

function fakeCommentPart(userMessageID: string): Part {
  return {
    id: `${userMessageID}:comment:0`,
    sessionID: "ses_1",
    messageID: userMessageID,
    type: "text",
    synthetic: true,
    text: formatCommentNote({ path: "src/index.ts", comment: "please fix this" }),
  }
}

describe("Timeline.constructMessageRows", () => {
  test("adds a leading turn gap only when index is greater than zero", () => {
    const user = fakeUserMessage()

    const firstTurn = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => [],
      assistantMessages: [],
      index: 0,
      showReasoning: false,
      status: "idle",
      isActive: false,
      inlineComments: true,
    })
    expect(firstTurn).toEqual([new TimelineRow.UserMessage({ userMessageID: user.id, anchor: true })])

    const laterTurn = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => [],
      assistantMessages: [],
      index: 1,
      showReasoning: false,
      status: "idle",
      isActive: false,
      inlineComments: true,
    })
    expect(laterTurn).toEqual([
      new TimelineRow.TurnGap({ userMessageID: user.id }),
      new TimelineRow.UserMessage({ userMessageID: user.id, anchor: true }),
    ])
  })

  test("shows a comment strip and clears the user-message anchor only when comments render inline", () => {
    const user = fakeUserMessage()
    const parts = [fakeCommentPart(user.id)]

    const strip = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => parts,
      assistantMessages: [],
      index: 0,
      showReasoning: false,
      status: "idle",
      isActive: false,
      inlineComments: false,
    })
    expect(strip).toEqual([
      new TimelineRow.CommentStrip({ userMessageID: user.id }),
      new TimelineRow.UserMessage({ userMessageID: user.id, anchor: false }),
    ])

    const inline = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => parts,
      assistantMessages: [],
      index: 0,
      showReasoning: false,
      status: "idle",
      isActive: false,
      inlineComments: true,
    })
    expect(inline).toEqual([new TimelineRow.UserMessage({ userMessageID: user.id, anchor: true })])
  })

  test("renders a thinking row only while the active turn is busy with no reasoning parts yet", () => {
    const user = fakeUserMessage()

    const active = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => [],
      assistantMessages: [],
      index: 0,
      showReasoning: true,
      status: "busy",
      isActive: true,
      inlineComments: true,
    })
    expect(active).toEqual([
      new TimelineRow.UserMessage({ userMessageID: user.id, anchor: true }),
      new TimelineRow.Thinking({ userMessageID: user.id, reasoningHeading: undefined }),
    ])

    const inactive = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => [],
      assistantMessages: [],
      index: 0,
      showReasoning: true,
      status: "busy",
      isActive: false,
      inlineComments: true,
    })
    expect(inactive).toEqual([new TimelineRow.UserMessage({ userMessageID: user.id, anchor: true })])
  })

  test("renders a retry row when the active turn is retrying", () => {
    const user = fakeUserMessage()

    const rows = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => [],
      assistantMessages: [] as AssistantMessage[],
      index: 0,
      showReasoning: false,
      status: "retry",
      isActive: true,
      inlineComments: true,
    })
    expect(rows).toEqual([
      new TimelineRow.UserMessage({ userMessageID: user.id, anchor: true }),
      new TimelineRow.Retry({ userMessageID: user.id }),
    ])
  })

  test("renders a diff summary row from the user message's summary diffs", () => {
    const diffs = [{ file: "src/a.ts", additions: 1, deletions: 0 }]
    const user = fakeUserMessage({ summary: { diffs } })

    const rows = Timeline.constructMessageRows({
      userMessage: user,
      getMessageParts: () => [],
      assistantMessages: [],
      index: 0,
      showReasoning: false,
      status: "idle",
      isActive: false,
      inlineComments: true,
    })
    expect(rows).toEqual([
      new TimelineRow.UserMessage({ userMessageID: user.id, anchor: true }),
      new TimelineRow.DiffSummary({ userMessageID: user.id, diffs }),
    ])
  })
})
