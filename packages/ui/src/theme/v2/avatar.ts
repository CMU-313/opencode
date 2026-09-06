import type { V2ColorValue } from "../types"

/** Fixed project avatar colors (OC-2); theme-independent like v1 `avatar-background-*`. */
export const V2_AVATAR_FG = "#ffffffff"

const V2_AVATAR_COLORS = {
  orange: {
    light: ["#ee7330ff", "#d16427ff"],
    dark: ["#723d22ff", "#ff8648ff"],
  },
  yellow: {
    light: ["#e7af36ff", "#cb9f34ff"],
    dark: ["#68552bff", "#e7af36ff"],
  },
  cyan: {
    light: ["#0096b8ff", "#007d9bff"],
    dark: ["#005a6eff", "#0096b8ff"],
  },
  green: {
    light: ["#2eaf5aff", "#198b43ff"],
    dark: ["#196130ff", "#49c970ff"],
  },
  red: {
    light: ["#d92e3cff", "#b82d35ff"],
    dark: ["#7a1f23ff", "#d92e3cff"],
  },
  pink: {
    light: ["#e4429eff", "#c83d8bff"],
    dark: ["#8c2d61ff", "#e4429eff"],
  },
  blue: {
    light: ["#3250dfff", "#2c47c8ff"],
    dark: ["#263fa9ff", "#7698fdff"],
  },
  purple: {
    light: ["#623be2ff", "#5230c2ff"],
    dark: ["#361f83ff", "#7152f4ff"],
  },
  gray: {
    light: ["#5c5c5cff", "#3a3a3aff"],
    dark: ["#5c5c5cff", "#aeaeaeff"],
  },
} as const

function createAvatarTheme(mode: "light" | "dark"): Record<string, V2ColorValue> {
  const theme: Record<string, V2ColorValue> = {
    "v2-avatar-fg": V2_AVATAR_FG,
  }

  for (const [color, variants] of Object.entries(V2_AVATAR_COLORS)) {
    const [background, border] = variants[mode]
    theme[`v2-avatar-bg-${color}`] = background
    theme[`v2-avatar-border-${color}`] = border
  }

  return theme
}

export const V2_AVATAR_LIGHT = createAvatarTheme("light")
export const V2_AVATAR_DARK = createAvatarTheme("dark")