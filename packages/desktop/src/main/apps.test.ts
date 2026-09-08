import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { checkAppExists, pickWindowsAppPath, resolveAppPath } from "./apps"

describe("checkAppExists", () => {
  test("returns true on win32 and linux without probing the filesystem", () => {
    if (process.platform === "darwin") return
    expect(checkAppExists("git")).toBe(true)
  })
})

describe("resolveAppPath", () => {
  test("returns the app name unchanged off Windows", () => {
    if (process.platform === "win32") return
    expect(resolveAppPath("git")).toBe("git")
  })
})

describe("pickWindowsAppPath", () => {
  test("returns null for empty where output", async () => {
    await expect(pickWindowsAppPath("missing-app", "")).resolves.toBeNull()
  })

  test("prefers a direct .exe path from where output", async () => {
    const root = await mkdtemp(join(tmpdir(), "opencode-apps-"))
    const exe = join(root, "git.exe")
    await writeFile(exe, "")

    try {
      await expect(pickWindowsAppPath("git", `${exe}\r\n${join(root, "git.cmd")}\r\n`)).resolves.toBe(exe)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("resolves a .cmd wrapper that points at an absolute exe", async () => {
    const root = await mkdtemp(join(tmpdir(), "opencode-apps-"))
    const exe = join(root, "tool.exe")
    const cmd = join(root, "tool.cmd")
    await writeFile(exe, "")
    await writeFile(cmd, `@echo off\r\n"${exe}" %*\r\n`)

    try {
      await expect(pickWindowsAppPath("tool", `${cmd}\r\n`)).resolves.toBe(exe)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("resolves an extensionless where hit via a sibling .bat wrapper", async () => {
    const root = await mkdtemp(join(tmpdir(), "opencode-apps-"))
    const shim = join(root, "tool")
    const exe = join(root, "tool.exe")
    const bat = join(root, "tool.bat")
    await writeFile(shim, "")
    await writeFile(exe, "")
    await writeFile(bat, `@echo off\r\n"${exe}" %*\r\n`)

    try {
      await expect(pickWindowsAppPath("tool", `${shim}\r\n`)).resolves.toBe(exe)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("resolves a .cmd wrapper that uses %~dp0 relative exe paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "opencode-apps-"))
    const bin = join(root, "bin")
    await mkdir(bin)
    const exe = join(bin, "tool.exe")
    const cmd = join(bin, "tool.cmd")
    await writeFile(exe, "")
    await writeFile(cmd, `@echo off\r\n"%~dp0\\tool.exe" %*\r\n`)

    try {
      await expect(pickWindowsAppPath("tool", `${cmd}\r\n`)).resolves.toBe(exe)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("falls back to fuzzy exe name matching near where paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "opencode-apps-"))
    const shim = join(root, "shim")
    await writeFile(shim, "")
    const exe = join(root, "GitHubDesktop.exe")
    await writeFile(exe, "")

    try {
      await expect(pickWindowsAppPath("github-desktop", `${shim}\r\n`)).resolves.toBe(exe)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("falls back to the first where path when nothing else matches", async () => {
    const root = await mkdtemp(join(tmpdir(), "opencode-apps-"))
    const first = join(root, "first")
    await writeFile(first, "")

    try {
      await expect(pickWindowsAppPath("zzz", `${first}\r\n`)).resolves.toBe(first)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
