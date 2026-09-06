import { describe, expect, test } from "bun:test"
import { validateCustomProvider, type FormState } from "./dialog-custom-provider-form"

const t = (key: string) => key

describe("validateCustomProvider", () => {
  test("builds trimmed config payload", () => {
    const result = validateCustomProvider({
      form: {
        providerID: "custom-provider",
        name: " Custom Provider ",
        baseURL: "https://api.example.com ",
        apiKey: " {env: CUSTOM_PROVIDER_KEY} ",
        models: [{ row: "m0", id: " model-a ", name: " Model A ", err: {} }],
        headers: [
          { row: "h0", key: " X-Test ", value: " enabled ", err: {} },
          { row: "h1", key: "", value: "", err: {} },
        ],
        err: {},
      },
      t,
      disabledProviders: [],
      existingProviderIDs: new Set(),
    })

    expect(result.result).toEqual({
      providerID: "custom-provider",
      name: "Custom Provider",
      key: undefined,
      config: {
        npm: "@ai-sdk/openai-compatible",
        name: "Custom Provider",
        env: ["CUSTOM_PROVIDER_KEY"],
        options: {
          baseURL: "https://api.example.com",
          headers: {
            "X-Test": "enabled",
          },
        },
        models: {
          "model-a": { name: "Model A" },
        },
      },
    })
  })

  test("flags duplicate rows and allows reconnecting disabled providers", () => {
    const result = validateCustomProvider({
      form: {
        providerID: "custom-provider",
        name: "Provider",
        baseURL: "https://api.example.com",
        apiKey: "secret",
        models: [
          { row: "m0", id: "model-a", name: "Model A", err: {} },
          { row: "m1", id: "model-a", name: "Model A 2", err: {} },
        ],
        headers: [
          { row: "h0", key: "Authorization", value: "one", err: {} },
          { row: "h1", key: "authorization", value: "two", err: {} },
        ],
        err: {},
      },
      t,
      disabledProviders: ["custom-provider"],
      existingProviderIDs: new Set(["custom-provider"]),
    })

    expect(result.result).toBeUndefined()
    expect(result.err.providerID).toBeUndefined()
    expect(result.models[1]).toEqual({
      id: "provider.custom.error.duplicate",
      name: undefined,
    })
    expect(result.headers[1]).toEqual({
      key: "provider.custom.error.duplicate",
      value: undefined,
    })
  })
})


const base: FormState = {
  providerID: "custom-provider",
  name: "Provider",
  baseURL: "https://api.example.com",
  apiKey: "secret",
  models: [{ row: "m0", id: "model-a", name: "Model A", err: {} }],
  headers: [],
  err: {},
}

const run = (form: Partial<FormState>, extra: Partial<Parameters<typeof validateCustomProvider>[0]> = {}) =>
  validateCustomProvider({
    form: { ...base, ...form },
    t,
    disabledProviders: [],
    existingProviderIDs: new Set(),
    ...extra,
  })

describe("validateCustomProvider field errors", () => {
  test("requires providerID", () => {
    expect(run({ providerID: " " }).err.providerID).toBe("provider.custom.error.providerID.required")
  })

  test("rejects malformed providerID", () => {
    expect(run({ providerID: "Bad ID" }).err.providerID).toBe("provider.custom.error.providerID.format")
  })

  test("rejects providerID that already exists and is not disabled", () => {
    const result = run({}, { existingProviderIDs: new Set(["custom-provider"]) })
    expect(result.err.providerID).toBe("provider.custom.error.providerID.exists")
    expect(result.result).toBeUndefined()
  })

  test("requires name", () => {
    expect(run({ name: "" }).err.name).toBe("provider.custom.error.name.required")
  })

  test("requires baseURL", () => {
    expect(run({ baseURL: "" }).err.baseURL).toBe("provider.custom.error.baseURL.required")
  })

  test("rejects baseURL without http(s) scheme", () => {
    expect(run({ baseURL: "api.example.com" }).err.baseURL).toBe("provider.custom.error.baseURL.format")
  })

  test("requires model id and name", () => {
    const result = run({ models: [{ row: "m0", id: "", name: " ", err: {} }] })
    expect(result.models[0]).toEqual({
      id: "provider.custom.error.required",
      name: "provider.custom.error.required",
    })
    expect(result.result).toBeUndefined()
  })

  test("requires header key when value is present", () => {
    const result = run({ headers: [{ row: "h0", key: "", value: "token", err: {} }] })
    expect(result.headers[0]).toEqual({
      key: "provider.custom.error.required",
      value: undefined,
    })
    expect(result.result).toBeUndefined()
  })

  test("uses plain api key when not an env reference", () => {
    expect(run({ apiKey: " secret " }).result?.key).toBe("secret")
  })
})