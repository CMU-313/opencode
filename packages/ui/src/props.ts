import { type JSX, mergeProps, splitProps } from "solid-js"

export function withClassList<T extends Pick<JSX.HTMLAttributes<HTMLElement>, "class" | "classList">>(props: T) {
  const [, rest] = splitProps(props, ["class", "classList"])
  return mergeProps(rest, {
    get classList() {
      return {
        ...props.classList,
        [props.class ?? ""]: !!props.class,
      }
    },
  })
}
