import { expect, test } from "bun:test";
import * as themes from "./index";

test("theme module exports are intact", () => {
  expect(themes.DEFAULT_THEMES).toBeDefined();
  expect(themes.amoledTheme).toBeDefined();
  expect(themes.draculaTheme).toBeDefined();
});