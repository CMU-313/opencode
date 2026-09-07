import { type ComponentProps, splitProps } from "solid-js"
import { withClassList } from "../../props"
import "./badge-v2.css"

export interface TagProps extends ComponentProps<"span"> {
  variant?: "neutral" | "accent"
}

export function Tag(props: TagProps) {
  const [split, rest] = splitProps(props, ["variant"])
  return <span {...withClassList(rest)} data-component="tag" data-variant={split.variant ?? "neutral"} />
}
