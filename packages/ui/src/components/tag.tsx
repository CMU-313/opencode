import { type ComponentProps, splitProps } from "solid-js"
import { withClassList } from "../props"

export interface TagProps extends ComponentProps<"span"> {
  size?: "normal" | "large"
}

export function Tag(props: TagProps) {
  const [split, rest] = splitProps(props, ["size"])
  return <span {...withClassList(rest)} data-component="tag" data-size={split.size || "normal"} />
}
