import { Tooltip as KobalteTooltip } from "@kobalte/core/tooltip"
import { createEffect, Match, onCleanup, splitProps, Switch, type JSX } from "solid-js"
import type { ComponentProps } from "solid-js"
import { createStore } from "solid-js/store"
import "./tooltip-v2.css"
import {
  isActivationKey,
  isFocusWithin,
  isTriggerPointerDown,
  resolveExpanded,
  resolveOpenChange,
  shouldReleaseBlock,
  syncThemeAttribute,
} from "./tooltip-v2-logic"

export interface TooltipV2Props extends ComponentProps<typeof KobalteTooltip> {
  value: JSX.Element
  class?: string
  contentClass?: string
  contentStyle?: JSX.CSSProperties
  inactive?: boolean
  forceOpen?: boolean
}

export function TooltipV2(props: TooltipV2Props) {
  let ref: HTMLDivElement | undefined
  const [state, setState] = createStore({
    open: false,
    block: false,
    expand: false,
  })
  const [local, others] = splitProps(props, [
    "children",
    "class",
    "contentClass",
    "contentStyle",
    "inactive",
    "forceOpen",
    "ignoreSafeArea",
    "value",
  ])

  const close = () => setState("open", false)

  const drop = (expand = state.expand) => {
    const hovered = !!ref?.matches(":hover")
    const focused = isFocusWithin(ref, document.activeElement)
    if (!shouldReleaseBlock({ expand, hovered, focused })) return
    setState("block", false)
  }

  const sync = () => {
    const expand = resolveExpanded(ref)
    setState("expand", expand)
    if (expand) {
      setState("block", true)
      close()
      return
    }
    drop(expand)
  }

  const arm = () => {
    setState("block", true)
    close()
  }

  const leave = () => {
    if (!isFocusWithin(ref, document.activeElement)) close()
    drop()
  }

  createEffect(() => {
    if (!ref) return
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(ref, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-expanded", "data-expanded"],
    })
    onCleanup(() => obs.disconnect())
  })

  let justClickedTrigger = false

  const onOpenChange = (open: boolean) => {
    const result = resolveOpenChange({
      open,
      forceOpen: local.forceOpen,
      blocked: state.block,
      justClickedTrigger,
    })
    justClickedTrigger = result.justClickedTrigger
    if (result.open !== undefined) setState("open", result.open)
  }

  return (
    <Switch>
      <Match when={local.inactive}>{local.children}</Match>
      <Match when={true}>
        <KobalteTooltip
          gutter={4}
          openDelay={400}
          skipDelayDuration={300}
          {...others}
          closeDelay={0}
          ignoreSafeArea={local.ignoreSafeArea ?? true}
          open={local.forceOpen || state.open}
          onOpenChange={onOpenChange}
        >
          <KobalteTooltip.Trigger
            ref={ref}
            as="div"
            data-component="tooltip-v2-trigger"
            class={local.class}
            onPointerDownCapture={arm}
            onKeyDownCapture={(event: KeyboardEvent) => {
              if (!isActivationKey(event.key)) return
              arm()
            }}
            onPointerLeave={leave}
            onFocusOut={() => requestAnimationFrame(() => drop())}
          >
            {local.children}
          </KobalteTooltip.Trigger>
          <KobalteTooltip.Portal>
            <KobalteTooltip.Content
              ref={(el) => syncThemeAttribute(ref, el)}
              data-component="tooltip-v2"
              data-placement={props.placement}
              data-force-open={local.forceOpen}
              class={local.contentClass}
              style={local.contentStyle}
              onPointerDownOutside={(e) => {
                if (isTriggerPointerDown(ref, e.target)) justClickedTrigger = true
                e.preventDefault()
              }}
            >
              {local.value}
            </KobalteTooltip.Content>
          </KobalteTooltip.Portal>
        </KobalteTooltip>
      </Match>
    </Switch>
  )
}
