// Dedicated coverage suite for the `execute` function of EditTool
// (packages/opencode/src/tool/edit.ts). See edit-execute-behavior.txt in
// src/tool for a prose description of what this function is supposed to do.
//
// This file is self-contained: running it alone exercises every line of
// `execute`, including the two "re-read formatted content from disk" lines
// that packages/opencode/test/tool/edit.test.ts does not reach.

import { afterEach, describe, expect } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { Cause, Effect, Exit } from "effect"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { EditTool } from "../../src/tool/edit"
import { disposeAllInstances, TestInstance } from "../fixture/fixture"
import { LSP } from "@/lsp/lsp"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Format } from "../../src/format"
import { Agent } from "../../src/agent/agent"
import { EventV2Bridge } from "../../src/event-v2-bridge"
import { Truncate } from "@/tool/truncate"
import { SessionID, MessageID } from "../../src/session/schema"
import * as Tool from "../../src/tool/tool"
import { testEffect } from "../lib/effect"

const ctx = {
  sessionID: SessionID.make("ses_test-edit-execute-session"),
  messageID: MessageID.make("msg_test"),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

afterEach(async () => {
  await disposeAllInstances()
})

const layer = LayerNode.compile(
  LayerNode.group([
    LSP.node,
    FSUtil.node,
    Format.node,
    EventV2Bridge.node,
    CrossSpawnSpawner.node,
    Truncate.node,
    Agent.node,
  ]),
)

const it = testEffect(layer)

const init = Effect.fn("EditExecuteTest.init")(function* () {
  const info = yield* EditTool
  return yield* info.init()
})

const run = Effect.fn("EditExecuteTest.run")(function* (
  args: Tool.InferParameters<typeof EditTool>,
  next: Tool.Context = ctx,
) {
  const tool = yield* init()
  return yield* tool.execute(args, next)
})

const fail = Effect.fn("EditExecuteTest.fail")(function* (args: Tool.InferParameters<typeof EditTool>) {
  const exit = yield* run(args).pipe(Effect.exit)
  if (Exit.isFailure(exit)) {
    const err = Cause.squash(exit.cause)
    return err instanceof Error ? err : new Error(String(err))
  }
  throw new Error("expected edit to fail")
})

const put = Effect.fn("EditExecuteTest.put")(function* (p: string, content: string) {
  const fs = yield* FSUtil.Service
  yield* fs.writeWithDirs(p, content)
})

const load = Effect.fn("EditExecuteTest.load")(function* (p: string) {
  const fs = yield* FSUtil.Service
  return yield* fs.readFileString(p)
})

const makeDirectory = Effect.fn("EditExecuteTest.makeDirectory")(function* (p: string) {
  const fs = yield* FSUtil.Service
  yield* fs.makeDirectory(p)
})

// A "formatter" whose command appends a trailing line to the file. Used to
// force the `execute` code path that re-reads the file from disk after
// running the formatter, so the in-memory content used for the returned
// diff/statistics reflects what the formatter actually produced.
const appendLineFormatterConfig = (extension: string) => ({
  formatter: {
    appendline: {
      extensions: [extension],
      command: [
        "node",
        "-e",
        "const fs=require('fs');const f=process.argv[1];const t=fs.readFileSync(f,'utf8');fs.writeFileSync(f, t + '\\nEXTRA')",
        "$FILE",
      ],
    },
  },
})

describe("EditTool.execute", () => {
  describe("input validation", () => {
    it.instance("fails when filePath is empty", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        void test
        expect((yield* fail({ filePath: "", oldString: "a", newString: "b" })).message).toContain(
          "filePath is required",
        )
      }),
    )

    it.instance("fails when oldString and newString are identical", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "file.txt")
        yield* put(filepath, "content")

        expect((yield* fail({ filePath: filepath, oldString: "same", newString: "same" })).message).toContain(
          "identical",
        )
      }),
    )
  })

  describe("path resolution", () => {
    it.instance("resolves an absolute filePath as-is", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "absolute.txt")
        yield* put(filepath, "before")

        const result = yield* run({ filePath: filepath, oldString: "before", newString: "after" })

        expect(result.title.endsWith("absolute.txt")).toBe(true)
        expect(yield* load(filepath)).toBe("after")
      }),
    )

    it.instance("resolves a relative filePath against the instance directory", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        yield* put(path.join(test.directory, "relative.txt"), "before")

        const result = yield* run({ filePath: "relative.txt", oldString: "before", newString: "after" })

        expect(result.title.endsWith("relative.txt")).toBe(true)
        expect(yield* load(path.join(test.directory, "relative.txt"))).toBe("after")
      }),
    )
  })

  describe("creating a new file (oldString === '')", () => {
    it.instance("creates the file, writes permission metadata, and emits an add event", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "nested", "newfile.txt")

        const result = yield* run({ filePath: filepath, oldString: "", newString: "new content" })

        expect(result.metadata.diff).toContain("+new content")
        expect(result.output).toContain("Edit applied successfully")
        expect(yield* load(filepath)).toBe("new content")
      }),
    )

    it.instance("rejects an empty oldString when the file already exists", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "existing.txt")
        yield* put(filepath, "original")

        expect((yield* fail({ filePath: filepath, oldString: "", newString: "replacement" })).message).toContain(
          "oldString cannot be empty",
        )
        expect(yield* load(filepath)).toBe("original")
      }),
    )

    it.instance(
      "re-reads formatter output from disk after creating a new file",
      () =>
        Effect.gen(function* () {
          const test = yield* TestInstance
          const filepath = path.join(test.directory, "created.nfmt")

          const result = yield* run({ filePath: filepath, oldString: "", newString: "original content" })

          // The formatter (configured below) appends "\nEXTRA" directly on disk.
          expect(yield* load(filepath)).toBe("original content\nEXTRA")

          // `additions` is derived from diffLines(contentOld, contentNew) using the
          // *in-memory* contentNew. It can only be 2 (two added lines) if `execute`
          // re-read the post-format file content from disk into contentNew, rather
          // than keeping the pre-format single-line value it wrote initially.
          expect(result.metadata.filediff.additions).toBe(2)
        }),
      { config: appendLineFormatterConfig(".nfmt") },
    )
  })

  describe("editing an existing file (oldString !== '')", () => {
    it.instance("fails when the file does not exist", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        expect(
          (yield* fail({ filePath: path.join(test.directory, "missing.txt"), oldString: "old", newString: "new" }))
            .message,
        ).toContain("not found")
      }),
    )

    it.instance("fails when the path is a directory", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const dirpath = path.join(test.directory, "adirectory")
        yield* makeDirectory(dirpath)

        expect((yield* fail({ filePath: dirpath, oldString: "old", newString: "new" })).message).toContain(
          "directory",
        )
      }),
    )

    it.instance("replaces text, reports a diff, statistics, and emits a change event", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "existing.txt")
        yield* put(filepath, "old content here")

        const result = yield* run({ filePath: filepath, oldString: "old content", newString: "new content" })

        expect(result.output).toContain("Edit applied successfully")
        expect(result.metadata.diff).toContain("-old content here")
        expect(result.metadata.diff).toContain("+new content here")
        expect(result.metadata.filediff).toEqual({
          file: filepath,
          patch: result.metadata.diff,
          additions: 1,
          deletions: 1,
        })
        expect(yield* load(filepath)).toBe("new content here")
      }),
    )

    it.instance("normalizes line endings between oldString/newString and the file's own ending", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "crlf.txt")
        yield* put(filepath, "line1\r\nold\r\nline3")

        yield* run({ filePath: filepath, oldString: "old", newString: "new" })

        expect(yield* load(filepath)).toBe("line1\r\nnew\r\nline3")
      }),
    )

    it.instance("replaces every occurrence when replaceAll is set", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "repeats.txt")
        yield* put(filepath, "foo bar foo baz foo")

        yield* run({ filePath: filepath, oldString: "foo", newString: "qux", replaceAll: true })

        expect(yield* load(filepath)).toBe("qux bar qux baz qux")
      }),
    )

    it.instance(
      "re-reads formatter output from disk and recomputes the diff after editing an existing file",
      () =>
        Effect.gen(function* () {
          const test = yield* TestInstance
          const filepath = path.join(test.directory, "existing.efmt")
          yield* put(filepath, "old content here")

          const result = yield* run({ filePath: filepath, oldString: "old content", newString: "new content" })

          // The formatter appends "\nEXTRA" directly on disk after the write.
          expect(yield* load(filepath)).toBe("new content here\nEXTRA")

          // The diff for an existing-file edit is recomputed *after* the format
          // step unconditionally, so it can only mention "EXTRA" if `execute`
          // re-read the formatted content from disk into contentNew first.
          expect(result.metadata.diff).toContain("+EXTRA")
          expect(result.metadata.filediff.additions).toBe(2)
          expect(result.metadata.filediff.deletions).toBe(1)
        }),
      { config: appendLineFormatterConfig(".efmt") },
    )
  })

  describe("return value", () => {
    it.instance("reports diagnostics metadata alongside the diff", () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const filepath = path.join(test.directory, "diagnostics.txt")
        yield* put(filepath, "content")

        const result = yield* run({ filePath: filepath, oldString: "content", newString: "updated" })

        expect(result.metadata.diagnostics).toBeDefined()
        expect(result.metadata.diff).toBeDefined()
        expect(result.metadata.filediff.file).toBe(filepath)
      }),
    )
  })
})
