import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"

const SCOTTY = [
  "      / \\__",
  "     (    @\\___",
  "     /         O",
  "    /   (_____/",
  "   /_____/   U",
].join("\n")

export function DialogScotty() {
  const { theme } = useTheme()

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Scotty #2
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <text fg={theme.text}>{SCOTTY}</text>
    </box>
  )
}