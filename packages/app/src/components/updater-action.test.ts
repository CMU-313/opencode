import { describe, expect, test } from "bun:test"
import type { UpdaterState } from "@/updater"
import { updaterAction } from "./updater-action"

describe("updaterAction", () => {
  const cases: {
    name: string
    state: UpdaterState | undefined
    expected: ReturnType<typeof updaterAction>
  }[] = [
    {
      name: "uses check now without an action when state is unavailable",
      state: undefined,
      expected: { label: "settings.updates.action.checkNow" },
    },
    {
      name: "uses check now without an action when updates are disabled",
      state: { status: "disabled" },
      expected: { label: "settings.updates.action.checkNow" },
    },
    {
      name: "allows checking when the updater is idle",
      state: { status: "idle" },
      expected: { label: "settings.updates.action.checkNow", run: "check" },
    },
    {
      name: "shows checking without an action while checking",
      state: { status: "checking" },
      expected: { label: "settings.updates.action.checking" },
    },
    {
      name: "shows downloading without an action while downloading",
      state: { status: "downloading", version: "1.2.3", percent: 50 },
      expected: { label: "settings.updates.action.downloading" },
    },
    {
      name: "allows installation when an update is ready",
      state: { status: "ready", version: "1.2.3" },
      expected: { label: "toast.update.action.installRestart", run: "install" },
    },
    {
      name: "shows installing without an action while installing",
      state: { status: "installing", version: "1.2.3" },
      expected: { label: "settings.updates.action.installing" },
    },
    {
      name: "allows another check when already up to date",
      state: { status: "up-to-date" },
      expected: { label: "settings.updates.action.checkNow", run: "check" },
    },
    {
      name: "allows retrying a check after an error",
      state: { status: "error", message: "Update failed" },
      expected: { label: "settings.updates.action.checkNow", run: "check" },
    },
  ]

  for (const item of cases) {
    test(item.name, () => {
      expect(updaterAction(item.state)).toEqual(item.expected)
    })
  }
})
