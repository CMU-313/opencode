import { Context } from "effect"

const opencodeOrigin = /^https:\/\/([a-z0-9-]+\.)*opencode\.ai$/

const allowedOriginPrefixes = ["http://localhost:", "http://127.0.0.1:", "oc://renderer"]

const allowedExactOrigins = new Set(["tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"])

export type CorsOptions = { readonly cors?: ReadonlyArray<string> }

export const CorsConfig = Context.Reference<CorsOptions | undefined>("@opencode/ServerCorsConfig", {
  defaultValue: () => undefined,
})

export function isAllowedCorsOrigin(input: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  return (
    allowedOriginPrefixes.some((prefix) => input.startsWith(prefix)) ||
    allowedExactOrigins.has(input) ||
    opencodeOrigin.test(input) ||
    (opts?.cors?.includes(input) ?? false)
  )
}

export function isAllowedRequestOrigin(input: string | undefined, host: string | undefined, opts?: CorsOptions) {
  if (!input) return true
  if (host && sameHost(input, host)) return true
  return isAllowedCorsOrigin(input, opts)
}

function sameHost(origin: string, host: string) {
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
