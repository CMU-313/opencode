import { type ComponentProps, splitProps } from "solid-js"
import { withClassList } from "../props"

export interface DockTrayProps extends ComponentProps<"div"> {
  attach?: "none" | "top"
}

export function DockShell(props: ComponentProps<"div">) {
  return <div {...withClassList(props)} data-dock-surface="shell" />
}

export function DockShellForm(props: ComponentProps<"form">) {
  return <form {...withClassList(props)} data-dock-surface="shell" />
}

export function DockTray(props: DockTrayProps) {
  const [split, rest] = splitProps(props, ["attach"])
  return <div {...withClassList(rest)} data-dock-surface="tray" data-dock-attach={split.attach || "none"} />
}
