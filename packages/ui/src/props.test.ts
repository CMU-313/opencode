import { describe, expect, test } from "bun:test"
import { withClassList } from "./props"

describe("withClassList", () => {
  test("handles omitted and empty classes", () => {
    expect(withClassList({}).classList).toEqual({ "": false })
    expect(withClassList({ class: "" }).classList).toEqual({ "": false })
    expect(withClassList({ classList: { active: true, hidden: false } }).classList).toEqual({
      active: true,
      hidden: false,
      "": false,
    })
  })

  test("merges multiple class names and preserves class precedence", () => {
    const props = withClassList({
      class: "badge selected",
      classList: { "badge selected": false, accent: true, hidden: false },
    })
    expect(props.classList).toEqual({ "badge selected": true, accent: true, hidden: false })
    expect("class" in props).toBe(false)
  })

  test("does not mutate the incoming class list", () => {
    const classes = Object.freeze({ badge: false })
    expect(withClassList({ class: "badge", classList: classes }).classList).toEqual({ badge: true })
    expect(classes).toEqual({ badge: false })
  })

  test("reads updated class and classList getters", () => {
    const state = { name: "first", classes: { active: true } }
    const props = withClassList({
      get class() {
        return state.name
      },
      get classList() {
        return state.classes
      },
    })
    expect(props.classList).toEqual({ first: true, active: true })
    state.name = "second"
    state.classes = { active: false }
    expect(props.classList).toEqual({ second: true, active: false })
    state.name = ""
    expect(props.classList).toEqual({ "": false, active: false })
  })

  test("forwards children, attributes, refs, and handlers unchanged", () => {
    const children = ["one", "two"]
    const ref = (element: HTMLFormElement) => element
    const onSubmit = (event: SubmitEvent) => event.defaultPrevented
    const props = withClassList({
      class: "shell",
      children,
      ref,
      onSubmit,
      id: "dock",
      "aria-label": "Dock",
      "data-testid": "shell",
    })
    expect(props.children).toBe(children)
    expect(props.ref).toBe(ref)
    expect(props.onSubmit).toBe(onSubmit)
    expect(props.id).toBe("dock")
    expect(props["aria-label"]).toBe("Dock")
    expect(props["data-testid"]).toBe("shell")
  })

  test("preserves lazy, reactive children and other forwarded props", () => {
    const state = { child: "first", id: "initial", reads: 0 }
    const props = withClassList({
      class: "tag",
      get children() {
        state.reads += 1
        return state.child
      },
      get id() {
        return state.id
      },
    })
    expect(state.reads).toBe(0)
    expect(props.children).toBe("first")
    expect(props.id).toBe("initial")
    state.child = "second"
    state.id = "updated"
    expect(props.children).toBe("second")
    expect(props.id).toBe("updated")
  })
})
