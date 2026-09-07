export function createHighlightTracker<T>(local: {
  value?: (item: T) => string
  onHighlight?: (item: T) => void | (() => void)
}) {
  const state: { key?: string; cleanup?: void | (() => void) } = {}

  const keyFor = (item: T) => (local.value ? local.value(item) : String(item as string))

  const stop = () => {
    state.cleanup?.()
    state.cleanup = undefined
    state.key = undefined
  }

  const move = (item: T | undefined) => {
    if (!local.onHighlight) return
    if (!item) {
      stop()
      return
    }
    const key = keyFor(item)
    if (state.key === key) return
    state.cleanup?.()
    state.cleanup = local.onHighlight(item)
    state.key = key
  }

  return { move, stop }
}

export function normalizeSelectValue<T>(next: T | T[] | null): T | null {
  if (next == null) return null
  return Array.isArray(next) ? ((next[0] as T) ?? null) : (next as T)
}

export function formatSelectedValue<T>(selected: T | null, label?: (item: T) => string): string {
  if (label && selected != null) return label(selected)
  return selected != null ? (selected as string) : ""
}
