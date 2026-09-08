import { execFile } from "node:child_process"
import { access, readFile, readdir } from "node:fs/promises"
import { dirname, extname, join } from "node:path"
import util from "node:util"

const execFilePromise = util.promisify(execFile)

const exists = (path: string) =>
  access(path)
    .then(() => true)
    .catch(() => false)

export function checkAppExists(appName: string) {
  if (process.platform === "win32") return true
  if (process.platform === "linux") return true
  return checkMacosApp(appName)
}

export function resolveAppPath(appName: string) {
  if (process.platform !== "win32") return appName
  return resolveWindowsAppPath(appName)
}

async function checkMacosApp(appName: string) {
  const locations = [`/Applications/${appName}.app`, `/System/Applications/${appName}.app`]

  const home = process.env.HOME
  if (home) locations.push(`${home}/Applications/${appName}.app`)

  for (const location of locations) {
    if (await exists(location)) return true
  }

  return execFilePromise("which", [appName])
    .then(() => true)
    .catch(() => false)
}

function hasExt(path: string, ext: string) {
  return extname(path).toLowerCase() === `.${ext}`
}

function normalizeKey(value: string) {
  return value
    .split("")
    .filter((ch) => /[a-z0-9]/i.test(ch))
    .map((ch) => ch.toLowerCase())
    .join("")
}

function resolveRelativeExe(base: string, token: string) {
  const lower = token.toLowerCase()
  const index = lower.indexOf("%~dp0")
  if (index < 0) return null

  const suffix = token.slice(index + 5)
  let current = base
  for (const part of suffix
    .replace(/\//g, "\\")
    .split("\\")
    .filter((segment) => segment && segment !== ".")) {
    current = part === ".." ? dirname(current) : join(current, part)
  }
  return current
}

async function resolveCmd(path: string) {
  const content = await readFile(path, "utf8")
  for (const token of content.split('"').map((value) => value.trim())) {
    if (!token.toLowerCase().includes(".exe")) continue

    const relative = resolveRelativeExe(dirname(path), token)
    if (relative && (await exists(relative))) return relative
    if (await exists(token)) return token
  }
  return null
}

async function resolveFromScripts(paths: string[]) {
  for (const path of paths) {
    if (hasExt(path, "cmd") || hasExt(path, "bat")) {
      const resolved = await resolveCmd(path)
      if (resolved) return resolved
    }

    if (extname(path)) continue

    for (const script of [`${path}.cmd`, `${path}.bat`]) {
      if (!(await exists(script))) continue
      const resolved = await resolveCmd(script)
      if (resolved) return resolved
    }
  }
  return null
}

async function resolveByFuzzyName(appName: string, paths: string[]) {
  const key = normalizeKey(appName)
  if (!key) return null

  for (const path of paths) {
    const dirs = [dirname(path), dirname(dirname(path)), dirname(dirname(dirname(path)))]
    for (const dir of dirs) {
      try {
        for (const entry of await readdir(dir)) {
          const candidate = join(dir, entry)
          if (!hasExt(candidate, "exe")) continue
          const name = normalizeKey(entry.replace(/\.exe$/i, ""))
          if (name.includes(key) || key.includes(name)) return candidate
        }
      } catch {
        continue
      }
    }
  }
  return null
}

/** Resolve an app path from `where`-style candidate lines. Exported for tests. */
export async function pickWindowsAppPath(appName: string, whereOutput: string) {
  const paths = whereOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const exe = paths.find((path) => hasExt(path, "exe"))
  if (exe) return exe

  return (await resolveFromScripts(paths)) ?? (await resolveByFuzzyName(appName, paths)) ?? paths[0] ?? null
}

async function resolveWindowsAppPath(appName: string): Promise<string | null> {
  let output: string
  try {
    output = await execFilePromise("where", [appName]).then((r) => r.stdout.toString())
  } catch {
    return null
  }

  return pickWindowsAppPath(appName, output)
}
