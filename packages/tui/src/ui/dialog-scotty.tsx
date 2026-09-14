import { For } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "./dialog"
import { useBindings } from "../keymap"

// String.raw keeps the backslashes in the art literal.
const SCOTTY = String.raw`
        /|             ___
       / |            /   \
      /  |___________/  o  \
     |                      |
     |                   \__|
     |                      |
     |______________________|
       |  |            |  |
       |__|            |__|
`

// Drop the blank first and last rows the template literal adds.
const LINES = SCOTTY.split("\n").slice(1, -1)

export function DialogScotty() {
  const dialog = useDialog()
  const { theme } = useTheme()

  useBindings(() => ({
    bindings: [
      {
        key: "return",
        desc: "Close Scotty",
        group: "Dialog",
        cmd: () => dialog.clear(),
      },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Scotty the Scottish Terrier
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1}>
        <For each={LINES}>{(line) => <text fg={theme.primary}>{line}</text>}</For>
      </box>
    </box>
  )
}
