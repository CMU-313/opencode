export type MentionKeyboardContext = {
  open: boolean
  hasItems: boolean
  close: () => void
  selectActive: () => void
  navigate: (event: KeyboardEvent) => void
}

export function handleMentionKeyDown(event: KeyboardEvent, context: MentionKeyboardContext) {
  if (!context.open) return false

  if (event.key === "Escape") {
    event.preventDefault()
    context.close()
    return true
  }

  if (event.key === "Tab") {
    if (context.hasItems) {
      event.preventDefault()
      context.selectActive()
    }
    return true
  }

  const nav = event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter"
  const ctrlNav =
    event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && (event.key === "n" || event.key === "p")
  if ((nav || ctrlNav) && context.hasItems) {
    context.navigate(event)
    event.preventDefault()
    return true
  }

  return false
}

export type EditorKeyboardContext = {
  blur: () => void
  cancel: () => void
  submit: () => void
}

export function handleEditorKeyDown(event: KeyboardEvent, context: EditorKeyboardContext) {
  if (event.key === "Escape") {
    event.preventDefault()
    context.blur()
    context.cancel()
    return
  }

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    context.submit()
  }
}
