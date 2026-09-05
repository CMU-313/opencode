import { describe, expect, test } from "bun:test"
import { buildScales, computeCompactBody, computeToneContext, getColors, surface, type ThemeColors, type ToneContext } from "./resolve"
import type { ThemeVariant } from "./types"

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
