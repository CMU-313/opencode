import { SyntaxStyle, TextAttributes, type ColorInput } from "@opentui/core"
import { type RunEntryTheme, type RunTheme } from "./theme"
import type { StreamCommit } from "./types"

function syntax(style?: SyntaxStyle): SyntaxStyle {
  return style ?? SyntaxStyle.fromTheme([])
}

export function entrySyntax(commit: StreamCommit, theme: RunTheme): SyntaxStyle {
  if (commit.kind === "reasoning") {
    return syntax(theme.block.subtleSyntax ?? theme.block.syntax)
  }

  return syntax(theme.block.syntax)
}

export function entryFailed(commit: StreamCommit): boolean {
  return commit.kind === "tool" && (commit.toolState === "error" || commit.part?.state.status === "error")
}

type EntryLookRule = {
  matches: (commit: StreamCommit) => boolean
  result: (theme: RunEntryTheme) => { fg: ColorInput; attrs?: number }
}

const entryLookRules: EntryLookRule[] = [
  {
    matches: (commit) => commit.kind === "user",
    result: (theme) => ({ fg: theme.user.body }),
  },
  {
    matches: (commit) => entryFailed(commit),
    result: (theme) => ({ fg: theme.error.body, attrs: TextAttributes.BOLD }),
  },
  {
    matches: (commit) => commit.phase === "final",
    result: (theme) => ({ fg: theme.system.body, attrs: TextAttributes.DIM }),
  },
  {
    matches: (commit) => commit.kind === "tool" && commit.phase === "start",
    result: (theme) => ({ fg: theme.tool.start ?? theme.tool.body }),
  },
  {
    matches: (commit) => commit.kind === "assistant",
    result: (theme) => ({ fg: theme.assistant.body }),
  },
  {
    matches: (commit) => commit.kind === "reasoning",
    result: (theme) => ({ fg: theme.reasoning.body, attrs: TextAttributes.DIM }),
  },
  {
    matches: (commit) => commit.kind === "error",
    result: (theme) => ({ fg: theme.error.body, attrs: TextAttributes.BOLD }),
  },
  {
    matches: (commit) => commit.kind === "tool",
    result: (theme) => ({ fg: theme.tool.body }),
  },
  {
    matches: () => true,
    result: (theme) => ({ fg: theme.system.body }),
  }, 
]

export function entryLook(commit: StreamCommit, theme: RunEntryTheme): { fg: ColorInput; attrs?: number } {
  const rule = entryLookRules.find((r) => r.matches(commit))!
  return rule.result(theme)
}

export function entryColor(commit: StreamCommit, theme: RunTheme): ColorInput {
  if (commit.kind === "assistant") {
    return theme.entry.assistant.body
  }

  if (commit.kind === "reasoning") {
    return theme.entry.reasoning.body
  }

  if (entryFailed(commit)) {
    return theme.entry.error.body
  }

  if (commit.kind === "tool") {
    return theme.block.text
  }

  return entryLook(commit, theme.entry).fg
}
