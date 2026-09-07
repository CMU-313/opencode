export function isFocusWithin(root: Element | null | undefined, active: Element | null): boolean {
  if (!root || !active) return false
  return root.contains(active)
}

export function resolveExpanded(root: Pick<Element, "querySelector"> | null | undefined): boolean {
  return !!root?.querySelector('[aria-expanded="true"], [data-expanded]')
}

export function shouldReleaseBlock(input: { expand: boolean; hovered: boolean; focused: boolean }): boolean {
  return !input.expand && !input.hovered && !input.focused
}

export interface ResolveOpenChangeInput {
  open: boolean
  forceOpen: boolean | undefined
  blocked: boolean
  justClickedTrigger: boolean
}

export interface ResolveOpenChangeResult {
  open?: boolean
  justClickedTrigger: boolean
}

export function resolveOpenChange(input: ResolveOpenChangeInput): ResolveOpenChangeResult {
  if (input.forceOpen) return { justClickedTrigger: input.justClickedTrigger }
  if (input.blocked && input.open) return { justClickedTrigger: input.justClickedTrigger }
  if (input.justClickedTrigger) return { justClickedTrigger: false }
  return { open: input.open, justClickedTrigger: input.justClickedTrigger }
}

export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " "
}

export function isTriggerPointerDown(trigger: Element | null | undefined, target: EventTarget | null): boolean {
  if (trigger === target) return true
  return target instanceof Node && !!trigger?.contains(target)
}

export function syncThemeAttribute(root: Element | null | undefined, target: Element) {
  const theme = root?.closest("[data-theme]")?.getAttribute("data-theme")
  if (theme) target.setAttribute("data-theme", theme)
}
