import { describe, expect, test } from "bun:test"
import {
  buildIconTokens,
  buildScales,
  buildTextTokens,
  buildTokenContext,
  computeCompactBody,
  computeToneContext,
  getColors,
  surface,
  type ThemeColors,
  type ToneContext,
} from "./resolve"
import type { ResolvedTheme, ThemeVariant } from "./types"

describe("getColors", () => {
  test("resolves a palette variant into compact ThemeColors with fallbacks", () => {
    const variant: ThemeVariant = {
      palette: {
        neutral: "#808080",
        ink: "#202020",
        primary: "#3b82f6",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#0ea5e9",
      },
    }

    const colors = getColors(variant)

    expect(colors.compact).toBe(true)
    expect(colors.neutral).toBe("#808080")
    expect(colors.ink).toBe("#202020")
    expect(colors.accent).toBe("#0ea5e9") // falls back to palette.info
    expect(colors.interactive).toBe("#3b82f6") // falls back to palette.primary
  })

  test("resolves a seeds variant into non-compact ThemeColors", () => {
    const variant: ThemeVariant = {
      seeds: {
        neutral: "#808080",
        primary: "#3b82f6",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#0ea5e9",
        interactive: "#6366f1",
        diffAdd: "#16a34a",
        diffDelete: "#dc2626",
      },
    }

    const colors = getColors(variant)

    expect(colors.compact).toBe(false)
    expect(colors.ink).toBeUndefined()
    expect(colors.accent).toBe("#0ea5e9") // seeds always map accent from info
    expect(colors.interactive).toBe("#6366f1")
    expect(colors.diffAdd).toBe("#16a34a")
  })
})

const ink = "#202020" as const
const sampleColors: ThemeColors = {
  compact: true,
  neutral: "#808080",
  ink,
  primary: "#3b82f6",
  accent: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#0ea5e9",
  interactive: "#6366f1",
  diffAdd: "#16a34a",
  diffDelete: "#dc2626",
}

describe("buildScales", () => {
  test("generates dark-mode color scales", () => {
    const scales = buildScales(sampleColors, true)

    expect(scales.neutral).toEqual([
      "#525252", "#515151", "#505050", "#4f4f4f", "#4d4d4d", "#4a4a4a",
      "#474747", "#424242", "#3a3a3a", "#313131", "#272727", "#212121",
    ])
    expect(scales.primary).toEqual([
      "#000417", "#00071f", "#010d29", "#021437", "#021d4c", "#062b65",
      "#013b90", "#0752be", "#0061e4", "#2e7cfa", "#bcd5fe", "#fafafa",
    ])
    expect(scales.success).toEqual([
      "#000802", "#000d03", "#011405", "#001d08", "#04280f", "#023a16",
      "#065022", "#126c32", "#169847", "#22a851", "#36fb7c", "#effff1",
    ])
    expect(scales.amber).toEqual([
      "#0d0300", "#130500", "#1c0900", "#270f01", "#361701", "#4a2303",
      "#653208", "#874712", "#ba6113", "#cc6d1e", "#fdc7a4", "#fafafa",
    ])
    expect(scales.diffAdd).toEqual([
      "#000802", "#010d03", "#001404", "#011d08", "#01290d", "#043a16",
      "#0a5022", "#166c32", "#15813b", "#179d47", "#41fa7c", "#effff1",
    ])
  })

  test("generates light-mode color scales", () => {
    const scales = buildScales(sampleColors, false)

    expect(scales.neutral).toEqual([
      "#ececec", "#e7e7e7", "#e2e2e2", "#dcdcdc", "#d5d5d5", "#cbcbcb",
      "#bdbdbd", "#a9a9a9", "#8c8c8c", "#686868", "#414141", "#262626",
    ])
    expect(scales.primary).toEqual([
      "#fbfdff", "#f6faff", "#ecf3ff", "#dfebfe", "#cfe1fe", "#bbd4fe",
      "#a0c3fa", "#7aabfc", "#3c82f5", "#1e73f8", "#1459c4", "#00225a",
    ])
    expect(scales.success).toEqual([
      "#f8fff9", "#effef1", "#d8fede", "#b7fec4", "#8bfea5", "#67f48d",
      "#39e573", "#19cc5f", "#27c55f", "#2ab75a", "#077433", "#023011",
    ])
    expect(scales.amber).toEqual([
      "#fffcfb", "#fff8f5", "#ffefe7", "#fee4d7", "#fdd7c4", "#fcc5aa",
      "#fcab82", "#fb8745", "#eb7328", "#e16606", "#9a4301", "#421901",
    ])
    expect(scales.diffAdd).toEqual([
      "#f8fff9", "#eefff0", "#d9fede", "#b9fec4", "#98faac", "#7af195",
      "#58e17c", "#26cb60", "#1ba34b", "#1c9646", "#0f7433", "#033011",
    ])
  })
})

describe("computeCompactBody", () => {
  test("shifts ink lighter for dark mode", () => {
    const body = computeCompactBody(sampleColors, ink, true)
    expect(body).toBe("#636363")
  })

  test("shifts ink darker for light mode", () => {
    const body = computeCompactBody(sampleColors, ink, false)
    expect(body).toBe("#1c1c1c")
  })
})

describe("computeToneContext", () => {
  test("builds tone context for dark mode", () => {
    const neutral = buildScales(sampleColors, true).neutral
    const tone = computeToneContext(sampleColors, {}, neutral, ink, true)

    expect(tone).toEqual({
      ink: "#202020",
      overlay: false,
      background: "#525252",
      isDark: true,
      compact: true,
    })
  })

  test("builds tone context for light mode", () => {
    const neutral = buildScales(sampleColors, false).neutral
    const tone = computeToneContext(sampleColors, {}, neutral, ink, false)

    expect(tone).toEqual({
      ink: "#202020",
      overlay: false,
      background: "#ececec",
      isDark: false,
      compact: true,
    })
  })
})

describe("surface", () => {
  test("computes alpha-blended surface tones for a dark tone context", () => {
    const tone: ToneContext = { ink: "#202020", overlay: false, background: "#141414", isDark: true, compact: true }
    const tones = surface(tone, "#6366f1", { base: 0.14, weak: 0.08, weaker: 0.18, strong: 0.26, stronger: 0.42 })

    expect(tones).toEqual({
      base: "#1f1f33",
      weak: "#1a1b26",
      weaker: "#22233c",
      strong: "#29294d",
      stronger: "#353671",
    })
  })

  test("computes alpha-blended surface tones for a light tone context", () => {
    const tone: ToneContext = { ink: "#202020", overlay: false, background: "#fefefe", isDark: false, compact: true }
    const tones = surface(tone, "#6366f1", { base: 0.12, weak: 0.08, weaker: 0.16, strong: 0.24, stronger: 0.36 })

    expect(tones).toEqual({
      base: "#ebecfc",
      weak: "#f2f2fd",
      weaker: "#e5e6fc",
      strong: "#d9dafb",
      stronger: "#c6c7f9",
    })
  })
})

describe("buildTextTokens", () => {
  test("populates text tokens for dark mode", () => {
    const ctx = buildTokenContext(sampleColors, {}, true)
    const tokens: ResolvedTheme = {}
    buildTextTokens(ctx, tokens)

    expect(tokens).toEqual({
      "text-base": "#636363",
      "text-weak": "#454545",
      "text-weaker": "#2e2e2e",
      "text-strong": "#efefef",
      "text-invert-base": "#272727",
      "text-invert-weak": "#3a3a3a",
      "text-invert-weaker": "#424242",
      "text-invert-strong": "#212121",
      "text-interactive-base": "#c9d1fc",
      "text-on-brand-base": "#ffffff",
      "text-on-interactive-base": "#ffffff",
      "text-on-interactive-weak": "#ffffff",
      "text-on-success-base": "#ffffff",
      "text-on-critical-base": "#ffffff",
      "text-on-critical-weak": "#ffffff",
      "text-on-critical-strong": "#000000",
      "text-on-warning-base": "#ffffff",
      "text-on-info-base": "#ffffff",
      "text-on-info-weak": "#ffffff",
      "text-on-info-strong": "#000000",
      "text-on-warning-weak": "#ffffff",
      "text-on-warning-strong": "#000000",
      "text-on-success-weak": "#ffffff",
      "text-on-success-strong": "#000000",
      "text-on-brand-weak": "#ffffff",
      "text-on-brand-weaker": "#ffffff",
      "text-on-brand-strong": "#000000",
      "text-diff-add-base": "#41fa7c",
      "text-diff-add-strong": "#166c32",
      "text-diff-delete-base": "#ee2527",
      "text-diff-delete-strong": "#fafafa",
    })
  })

  test("populates text tokens for light mode", () => {
    const ctx = buildTokenContext(sampleColors, {}, false)
    const tokens: ResolvedTheme = {}
    buildTextTokens(ctx, tokens)

    expect(tokens).toEqual({
      "text-base": "#1c1c1c",
      "text-weak": "#373737",
      "text-weaker": "#515151",
      "text-strong": "#0c0c0c",
      "text-invert-base": "#e7e7e7",
      "text-invert-weak": "#e2e2e2",
      "text-invert-weaker": "#dcdcdc",
      "text-invert-strong": "#ececec",
      "text-interactive-base": "#5953f3",
      "text-on-brand-base": "#000000",
      "text-on-interactive-base": "#000000",
      "text-on-interactive-weak": "#000000",
      "text-on-success-base": "#000000",
      "text-on-critical-base": "#000000",
      "text-on-critical-weak": "#000000",
      "text-on-critical-strong": "#ffffff",
      "text-on-warning-base": "#000000",
      "text-on-info-base": "#000000",
      "text-on-info-weak": "#000000",
      "text-on-info-strong": "#ffffff",
      "text-on-warning-weak": "#000000",
      "text-on-warning-strong": "#ffffff",
      "text-on-success-weak": "#000000",
      "text-on-success-strong": "#ffffff",
      "text-on-brand-weak": "#000000",
      "text-on-brand-weaker": "#000000",
      "text-on-brand-strong": "#000000",
      "text-diff-add-base": "#0f7433",
      "text-diff-add-strong": "#033011",
      "text-diff-delete-base": "#d10315",
      "text-diff-delete-strong": "#4d0606",
    })
  })
})

describe("buildIconTokens", () => {
  // icon-base/hover/active/selected/focus fall back to text-* tokens when compact && !isDark,
  // so buildTextTokens is run first to seed those, matching how createToken orders builders.
  test("populates icon tokens for dark mode", () => {
    const ctx = buildTokenContext(sampleColors, {}, true)
    const tokens: ResolvedTheme = {}
    buildTextTokens(ctx, tokens)
    buildIconTokens(ctx, tokens)

    expect(tokens).toMatchObject({
      "icon-base": "#313131",
      "icon-hover": "#272727",
      "icon-active": "#212121",
      "icon-selected": "#212121",
      "icon-disabled": "#474747",
      "icon-focus": "#212121",
      "icon-invert-base": "#525252",
      "icon-weak-base": "#4a4a4a",
      "icon-weak-hover": "#212121",
      "icon-weak-active": "#3a3a3a",
      "icon-weak-selected": "#3a3a3a",
      "icon-weak-disabled": "#4f4f4f",
      "icon-weak-focus": "#3a3a3a",
      "icon-strong-base": "#212121",
      "icon-strong-hover": "#f6f3f3",
      "icon-strong-active": "#fcfcfc",
      "icon-strong-selected": "#fdfcfc",
      "icon-strong-disabled": "#424242",
      "icon-strong-focus": "#fdfcfc",
      "icon-brand-base": "#ffffff",
      "icon-interactive-base": "#5443fb",
      "icon-success-base": "#169847",
      "icon-success-hover": "#22a851",
      "icon-success-active": "#36fb7c",
      "icon-warning-base": "#ba6113",
      "icon-warning-hover": "#cc6d1e",
      "icon-warning-active": "#fdc7a4",
      "icon-critical-base": "#ca0620",
      "icon-critical-hover": "#eb2c34",
      "icon-critical-active": "#fec3bd",
      "icon-info-base": "#067fb4",
      "icon-info-hover": "#158dc6",
      "icon-info-active": "#aadbfb",
      "icon-agent-plan-base": "#067fb4",
      "icon-agent-docs-base": "#ba6113",
      "icon-agent-ask-base": "#3d70f8",
      "icon-agent-build-base": "#c9d1fc",
      "icon-on-brand-base": "#ffffff",
      "icon-on-brand-hover": "#000000",
      "icon-on-brand-selected": "#000000",
      "icon-on-interactive-base": "#ffffff",
      "icon-on-success-base": "#ffffff",
      "icon-on-success-hover": "#000000",
      "icon-on-success-selected": "#000000",
      "icon-on-warning-base": "#ffffff",
      "icon-on-warning-hover": "#000000",
      "icon-on-warning-selected": "#000000",
      "icon-on-critical-base": "#ffffff",
      "icon-on-critical-hover": "#000000",
      "icon-on-critical-selected": "#000000",
      "icon-on-info-base": "#ffffff",
      "icon-on-info-hover": "#000000",
      "icon-on-info-selected": "#000000",
      "icon-diff-add-base": "#41fa7c",
      "icon-diff-add-hover": "#179d47",
      "icon-diff-add-active": "#41fa7c",
      "icon-diff-delete-base": "#ee2527",
      "icon-diff-delete-hover": "#fbc4bd",
      "icon-diff-modified-base": "#ffba92",
    })
  })

  test("populates icon tokens for light mode", () => {
    const ctx = buildTokenContext(sampleColors, {}, false)
    const tokens: ResolvedTheme = {}
    buildTextTokens(ctx, tokens)
    buildIconTokens(ctx, tokens)

    expect(tokens).toMatchObject({
      "icon-base": "#373737",
      "icon-hover": "#1c1c1c",
      "icon-active": "#0c0c0c",
      "icon-selected": "#0c0c0c",
      "icon-disabled": "#a9a9a9",
      "icon-focus": "#0c0c0c",
      "icon-invert-base": "#ffffff",
      "icon-weak-base": "#bdbdbd",
      "icon-weak-hover": "#a9a9a9",
      "icon-weak-active": "#8c8c8c",
      "icon-weak-selected": "#686868",
      "icon-weak-disabled": "#cbcbcb",
      "icon-weak-focus": "#8c8c8c",
      "icon-strong-base": "#262626",
      "icon-strong-hover": "#151313",
      "icon-strong-active": "#020202",
      "icon-strong-selected": "#020202",
      "icon-strong-disabled": "#a9a9a9",
      "icon-strong-focus": "#020202",
      "icon-brand-base": "#262626",
      "icon-interactive-base": "#6261fc",
      "icon-success-base": "#39e573",
      "icon-success-hover": "#2ab75a",
      "icon-success-active": "#077433",
      "icon-warning-base": "#fcab82",
      "icon-warning-hover": "#e16606",
      "icon-warning-active": "#9a4301",
      "icon-critical-base": "#ed172b",
      "icon-critical-hover": "#ed172b",
      "icon-critical-active": "#b7001a",
      "icon-info-base": "#7ccbfd",
      "icon-info-hover": "#40b6f7",
      "icon-info-active": "#0e6893",
      "icon-agent-plan-base": "#15a5e8",
      "icon-agent-docs-base": "#eb7328",
      "icon-agent-ask-base": "#759fff",
      "icon-agent-build-base": "#6261fc",
      "icon-on-brand-base": "#000000",
      "icon-on-brand-hover": "#000000",
      "icon-on-brand-selected": "#000000",
      "icon-on-interactive-base": "#000000",
      "icon-on-success-base": "#000000",
      "icon-on-success-hover": "#ffffff",
      "icon-on-success-selected": "#ffffff",
      "icon-on-warning-base": "#000000",
      "icon-on-warning-hover": "#ffffff",
      "icon-on-warning-selected": "#ffffff",
      "icon-on-critical-base": "#000000",
      "icon-on-critical-hover": "#ffffff",
      "icon-on-critical-selected": "#ffffff",
      "icon-on-info-base": "#000000",
      "icon-on-info-hover": "#ffffff",
      "icon-on-info-selected": "#ffffff",
      "icon-diff-add-base": "#0f7433",
      "icon-diff-add-hover": "#033011",
      "icon-diff-add-active": "#033011",
      "icon-diff-delete-base": "#d10315",
      "icon-diff-delete-hover": "#b21a1b",
      "icon-diff-modified-base": "#FF8C00",
    })
  })
})
