import { describe, expect, test } from "bun:test"

process.env.GITHUB_REPOSITORY = "owner/repo"
process.env.GITHUB_TOKEN = "test-token"

const { main } = await import("./close-issues")
