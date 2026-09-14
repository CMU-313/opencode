import { TextAttributes } from "@opentui/core"
import { For } from "solid-js"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { useBindings } from "../keymap"

const scotty = [
  "        __ __",
  "       /  V  \\",
  "      |  o o  |",
  "      |   Δ   |",
  "       \\ === /",
  "     __/|   |\\__",
  "    /   |   |   \\",
  "   |    |   |    |",
  "   |____|   |____|",
]

export function ScottyLogo() {
  const dialog = useDialog()
  const { theme } = useTheme()

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "Close", group: "Dialog", cmd: () => dialog.clear() },
      { key: "escape", desc: "Close", group: "Dialog", cmd: () => dialog.clear() },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Scotty the Scottish Terrier
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc/enter
        </text>
      </box>
      <box>
        <For each={scotty}>
          {(line) => (
            <text fg={theme.text} attributes={TextAttributes.BOLD}>
              {line}
            </text>
          )}
        </For>
      </box>
      <text fg={theme.textMuted}>Go Tartans!</text>
    </box>
  )
}
