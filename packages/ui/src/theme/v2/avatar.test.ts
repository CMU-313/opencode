import { describe, expect, test } from "bun:test"
import { V2_AVATAR_DARK, V2_AVATAR_FG, V2_AVATAR_LIGHT } from "./avatar"

describe("V2 avatar theme colors", () => {
  test("creates matching light and dark theme structures", () => {
    expect(Object.keys(V2_AVATAR_LIGHT)).toHaveLength(19)
    expect(Object.keys(V2_AVATAR_DARK)).toHaveLength(19)
    expect(Object.keys(V2_AVATAR_LIGHT)).toEqual(Object.keys(V2_AVATAR_DARK))
    expect(V2_AVATAR_LIGHT["v2-avatar-fg"]).toBe(V2_AVATAR_FG)
    expect(V2_AVATAR_DARK["v2-avatar-fg"]).toBe(V2_AVATAR_FG)
  })

  test.each([
    ["orange", "#ee7330ff", "#d16427ff", "#723d22ff", "#ff8648ff"],
    ["yellow", "#e7af36ff", "#cb9f34ff", "#68552bff", "#e7af36ff"],
    ["cyan", "#0096b8ff", "#007d9bff", "#005a6eff", "#0096b8ff"],
    ["green", "#2eaf5aff", "#198b43ff", "#196130ff", "#49c970ff"],
    ["red", "#d92e3cff", "#b82d35ff", "#7a1f23ff", "#d92e3cff"],
    ["pink", "#e4429eff", "#c83d8bff", "#8c2d61ff", "#e4429eff"],
    ["blue", "#3250dfff", "#2c47c8ff", "#263fa9ff", "#7698fdff"],
    ["purple", "#623be2ff", "#5230c2ff", "#361f83ff", "#7152f4ff"],
    ["gray", "#5c5c5cff", "#3a3a3aff", "#5c5c5cff", "#aeaeaeff"],
  ] as const)(
    "preserves the %s avatar colors",
    (color, lightBackground, lightBorder, darkBackground, darkBorder) => {
      expect(V2_AVATAR_LIGHT[`v2-avatar-bg-${color}`]).toBe(lightBackground)
      expect(V2_AVATAR_LIGHT[`v2-avatar-border-${color}`]).toBe(lightBorder)
      expect(V2_AVATAR_DARK[`v2-avatar-bg-${color}`]).toBe(darkBackground)
      expect(V2_AVATAR_DARK[`v2-avatar-border-${color}`]).toBe(darkBorder)
    },
  )
})