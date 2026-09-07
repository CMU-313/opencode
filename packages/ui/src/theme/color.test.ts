import { expect, test } from "bun:test"
import { fitOklch, oklchToRgb } from "./color"

test("fitOklch keeps an in-gamut color unchanged", () => {
  const color = { l: 0.5, c: 0, h: 180 }

  expect(fitOklch(color)).toEqual(color)
})

test("fitOklch reduces chroma for an out-of-gamut color", () => {
  const color = { l: 0.5, c: 1, h: 180 }

  const fitted = fitOklch(color)
  const rgb = oklchToRgb(fitted)

  expect(fitted.c).toBeLessThan(color.c)
  expect(fitted.l).toBe(color.l)
  expect(fitted.h).toBe(color.h)

  expect(rgb.r).toBeGreaterThanOrEqual(0)
  expect(rgb.r).toBeLessThanOrEqual(1)
  expect(rgb.g).toBeGreaterThanOrEqual(0)
  expect(rgb.g).toBeLessThanOrEqual(1)
  expect(rgb.b).toBeGreaterThanOrEqual(0)
  expect(rgb.b).toBeLessThanOrEqual(1)
})