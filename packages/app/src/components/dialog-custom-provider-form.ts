const PROVIDER_ID = /^[a-z0-9][a-z0-9-_]*$/
const OPENAI_COMPATIBLE = "@ai-sdk/openai-compatible"

type Translator = (key: string, vars?: Record<string, string | number | boolean>) => string

export type ModelErr = {
  id?: string
  name?: string
}

export type HeaderErr = {
  key?: string
  value?: string
}

export type ModelRow = {
  row: string
  id: string
  name: string
  err: ModelErr
}

export type HeaderRow = {
  row: string
  key: string
  value: string
  err: HeaderErr
}

export type FormState = {
  providerID: string
  name: string
  baseURL: string
  apiKey: string
  models: ModelRow[]
  headers: HeaderRow[]
  err: {
    providerID?: string
    name?: string
    baseURL?: string
  }
}

function uniqueError(value: string, seen: Set<string>, t: Translator) {
  if (!value) return t("provider.custom.error.required")
  if (seen.has(value)) return t("provider.custom.error.duplicate")
  seen.add(value)
  return undefined
}

function validateModels(models: ModelRow[], t: Translator): ModelErr[] {
  const seen = new Set<string>()
  return models.map((m) => ({
    id: uniqueError(m.id.trim(), seen, t),
    name: m.name.trim() ? undefined : t("provider.custom.error.required"),
  }))
}

function validateHeaders(headers: HeaderRow[], t: Translator): HeaderErr[] {
  const seen = new Set<string>()
  return headers.map((h) => {
    const key = h.key.trim()
    const value = h.value.trim()
    if (!key && !value) return {}
    return {
      key: uniqueError(key.toLowerCase(), seen, t),
      value: value ? undefined : t("provider.custom.error.required"),
    }
  })
}

type ValidateArgs = {
  form: FormState
  t: Translator
  disabledProviders: string[]
  existingProviderIDs: Set<string>
}

export function validateCustomProvider(input: ValidateArgs) {
  const providerID = input.form.providerID.trim()
  const name = input.form.name.trim()
  const baseURL = input.form.baseURL.trim()
  const apiKey = input.form.apiKey.trim()

  const env = apiKey.match(/^\{env:([^}]+)\}$/)?.[1]?.trim()
  const key = apiKey && !env ? apiKey : undefined

  const idError = !providerID
    ? input.t("provider.custom.error.providerID.required")
    : !PROVIDER_ID.test(providerID)
      ? input.t("provider.custom.error.providerID.format")
      : undefined

  const nameError = !name ? input.t("provider.custom.error.name.required") : undefined
  const urlError = !baseURL
    ? input.t("provider.custom.error.baseURL.required")
    : !/^https?:\/\//.test(baseURL)
      ? input.t("provider.custom.error.baseURL.format")
      : undefined

  const disabled = input.disabledProviders.includes(providerID)
  const existsError = idError
    ? undefined
    : input.existingProviderIDs.has(providerID) && !disabled
      ? input.t("provider.custom.error.providerID.exists")
      : undefined

  const models = validateModels(input.form.models, input.t)
  const modelsValid = models.every((m) => !m.id && !m.name)
  const modelConfig = Object.fromEntries(input.form.models.map((m) => [m.id.trim(), { name: m.name.trim() }]))

  const headers = validateHeaders(input.form.headers, input.t)
  const headersValid = headers.every((h) => !h.key && !h.value)
  const headerConfig = Object.fromEntries(
    input.form.headers
      .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
      .filter((h) => !!h.key && !!h.value)
      .map((h) => [h.key, h.value]),
  )

  const err = {
    providerID: idError ?? existsError,
    name: nameError,
    baseURL: urlError,
  }

  const ok = !idError && !existsError && !nameError && !urlError && modelsValid && headersValid
  if (!ok) return { err, models, headers }

  return {
    err,
    models,
    headers,
    result: {
      providerID,
      name,
      key,
      config: {
        npm: OPENAI_COMPATIBLE,
        name,
        ...(env ? { env: [env] } : {}),
        options: {
          baseURL,
          ...(Object.keys(headerConfig).length ? { headers: headerConfig } : {}),
        },
        models: modelConfig,
      },
    },
  }
}

let row = 0

const nextRow = () => `row-${row++}`

export const modelRow = (): ModelRow => ({ row: nextRow(), id: "", name: "", err: {} })
export const headerRow = (): HeaderRow => ({ row: nextRow(), key: "", value: "", err: {} })
