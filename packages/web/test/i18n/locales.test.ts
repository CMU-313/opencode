import { describe, expect, test } from "bun:test"
import { matchLocale } from "../../src/i18n/locales"

describe("matchLocale", () => {
  test("returns null for empty input", () => {
    expect(matchLocale("")).toBe(null)
  })

  test("matches plain Chinese as simplified", () => {
    expect(matchLocale("zh")).toBe("zh-cn")
  })

  test("matches Chinese with hant marker as traditional", () => {
    expect(matchLocale("zh-hant")).toBe("zh-tw")
  })

  test("matches zh-tw directly as traditional", () => {
    expect(matchLocale("zh-tw")).toBe("zh-tw")
  })

  test("matches zh-hk as traditional", () => {
    expect(matchLocale("zh-hk")).toBe("zh-tw")
  })

  test("resolves an alias like en to root", () => {
    expect(matchLocale("en")).toBe("root")
  })

  test("resolves pt to pt-br via alias branch", () => {
    expect(matchLocale("pt")).toBe("pt-br")
  })

  test("matches unmapped pt-prefixed locale via startsWith fallback", () => {
    expect(matchLocale("pt-pt")).toBe("pt-br")
  })

  test("matches no/nb/nn variants to nb", () => {
    expect(matchLocale("no")).toBe("nb")
    expect(matchLocale("nb")).toBe("nb")
    expect(matchLocale("nn")).toBe("nb")
  })

  test("matches unmapped variant via starts-with prefix table", () => {
    expect(matchLocale("en-US")).toBe("root")
  })

  test("returns null when nothing matches", () => {
    expect(matchLocale("xx-unknown")).toBe(null)
  })
})