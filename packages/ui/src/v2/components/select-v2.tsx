import { Select as Kobalte } from "@kobalte/core/select"
import type { CollectionNode } from "@kobalte/core"
import { Show, createMemo, onCleanup, splitProps, type ComponentProps, type JSX } from "solid-js"
import { createHighlightTracker, formatSelectedValue, normalizeSelectValue } from "./select-v2-helpers"
import "./select-v2.css"

function groupOptions<T>(options: T[], groupBy?: (x: T) => string): { category: string; options: T[] }[] {
  if (!groupBy) {
    return [{ category: "", options }]
  }
  const map = new Map<string, T[]>()
  for (const opt of options) {
    const key = groupBy(opt)
    const arr = map.get(key)
    if (arr) arr.push(opt)
    else map.set(key, [opt])
  }
  return [...map.entries()].map(([category, opts]) => ({ category, options: opts }))
}

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M11 9.5L8 6.5L5 9.5"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

const CheckSmall = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M3.53564 8.17857L6.39279 11.75L12.4642 4.25"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

export type SelectV2Props<T> = Omit<
  ComponentProps<typeof Kobalte<T, { category: string; options: T[] }>>,
  "value" | "onSelect" | "children" | "options" | "itemComponent" | "sectionComponent" | "defaultValue" | "multiple"
> & {
  placeholder?: string
  options: T[]
  /** Selected option (single selection). */
  current?: T
  value?: (x: T) => string
  label?: (x: T) => string
  groupBy?: (x: T) => string
  onSelect?: (value: T | null) => void
  onHighlight?: (value: T | undefined) => void | (() => void)
  /** `base` / `large` match text-input-v2; `inline` is a compact settings-row trigger. */
  appearance?: "base" | "large" | "inline"
  invalid?: boolean
  numeric?: boolean
  children?: (item: T) => JSX.Element
  valueClass?: string
}

function SelectItemV2<T>(props: {
  itemProps: { item: CollectionNode<T> }
  local: { children?: (item: T) => JSX.Element; label?: (item: T) => string }
  onMove: (item: T | undefined) => void
}) {
  const rawValue = () => props.itemProps.item.rawValue

  const content = () =>
    props.local.children
      ? props.local.children(rawValue())
      : props.local.label
        ? props.local.label(rawValue())
        : String(rawValue() as string)

  return (
    <Kobalte.Item
      {...props.itemProps}
      data-component="menu-v2-item"
      onPointerEnter={() => props.onMove(rawValue())}
      onPointerMove={() => props.onMove(rawValue())}
      onFocus={() => props.onMove(rawValue())}
    >
      <Kobalte.ItemLabel data-slot="menu-v2-item-content" as="span">
        {content()}
      </Kobalte.ItemLabel>
      <Kobalte.ItemIndicator data-slot="menu-v2-item-indicator" forceMount>
        <CheckSmall />
      </Kobalte.ItemIndicator>
    </Kobalte.Item>
  )
}

export function SelectV2<T>(props: SelectV2Props<T>) {
  const [local, others] = splitProps(props, [
    "class",
    "classList",
    "placeholder",
    "options",
    "current",
    "value",
    "label",
    "groupBy",
    "onSelect",
    "onHighlight",
    "onOpenChange",
    "children",
    "appearance",
    "invalid",
    "numeric",
    "disabled",
    "valueClass",
    "placement",
    "gutter",
    "sameWidth",
    "flip",
    "slide",
    "fitViewport",
  ])

  const inline = () => (local.appearance ?? "base") === "inline"

  const { move, stop } = createHighlightTracker(local)
  onCleanup(stop)

  const grouped = createMemo(() => groupOptions(local.options, local.groupBy))

  return (
    <Kobalte<T, { category: string; options: T[] }>
      {...others}
      multiple={false}
      allowDuplicateSelectionEvents={false}
      disabled={local.disabled}
      data-component="select-v2-root"
      placement={local.placement ?? (inline() ? "bottom-end" : "bottom-start")}
      gutter={local.gutter ?? 4}
      sameWidth={local.sameWidth ?? !inline()}
      flip={local.flip ?? true}
      slide={local.slide ?? true}
      fitViewport={local.fitViewport ?? false}
      value={local.current}
      options={grouped()}
      optionValue={(x) => (local.value ? local.value(x) : String(x as string))}
      optionTextValue={(x) => (local.label ? local.label(x) : String(x as string))}
      optionGroupChildren="options"
      placeholder={local.placeholder}
      sectionComponent={(sectionProps) => (
        <Kobalte.Section>
          <Show when={sectionProps.section.rawValue.category}>
            <div data-slot="menu-v2-group-label">{sectionProps.section.rawValue.category}</div>
          </Show>
        </Kobalte.Section>
      )}
      itemComponent={(itemProps) => <SelectItemV2 itemProps={itemProps} local={local} onMove={move} />}
      onChange={(next) => {
        local.onSelect?.(normalizeSelectValue(next))
        stop()
      }}
      onOpenChange={(open) => {
        local.onOpenChange?.(open)
        if (!open) stop()
      }}
    >
      <Kobalte.Trigger
        as="div"
        data-component="select-v2"
        data-appearance={local.appearance ?? "base"}
        data-invalid={local.invalid ? "" : undefined}
        data-numeric={local.numeric ? "" : undefined}
        disabled={local.disabled}
        data-disabled={local.disabled ? "" : undefined}
        classList={{
          ...local.classList,
          [local.class ?? ""]: !!local.class,
        }}
      >
        <div data-slot="select-v2-value">
          <Kobalte.Value<T> data-slot="select-v2-value-text" class={local.valueClass}>
            {(st) => formatSelectedValue(st.selectedOption(), local.label)}
          </Kobalte.Value>
        </div>
        <span data-slot="select-v2-chevron" aria-hidden="true">
          <ChevronDown />
        </span>
      </Kobalte.Trigger>
      <Kobalte.Portal>
        <Kobalte.Content data-component="menu-v2-content" data-slot="select-v2-content">
          <Kobalte.Listbox data-slot="select-v2-listbox" />
        </Kobalte.Content>
      </Kobalte.Portal>
    </Kobalte>
  )
}
