import { Effect } from "effect"
import type { LanguageModelV3 } from "@ai-sdk/provider"
import { define } from "../internal"
import { ProviderV2 } from "../../provider"

type MantleSDK = {
  languageModel: (modelID: string) => LanguageModelV3
  chat: (modelID: string) => LanguageModelV3
  responses: (modelID: string) => LanguageModelV3
}

// Bedrock cross-region inference profiles require regional prefixes only for
// specific model/region combinations. Keep the mapping narrow and avoid
// double-prefixing model IDs that models.dev already marks as global/us/eu/etc.
const CROSS_REGION_PREFIXES = ["global.", "us.", "eu.", "jp.", "apac.", "au."]
const US_MODELS = ["nova-micro", "nova-lite", "nova-pro", "nova-premier", "nova-2", "claude", "deepseek"]
const EU_REGIONS = ["eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1", "eu-central-1", "eu-south-1", "eu-south-2"]
const EU_MODELS = ["claude", "nova-lite", "nova-micro", "llama3", "pixtral"]
const AU_REGIONS = ["ap-southeast-2", "ap-southeast-4"]
const AU_MODELS = ["anthropic.claude-sonnet-4-5", "anthropic.claude-haiku"]
const APAC_MODELS = ["claude", "nova-lite", "nova-micro", "nova-pro"]

const matchesAny = (value: string, patterns: string[]) => patterns.some((pattern) => value.includes(pattern))

type PrefixResolver = (modelID: string, region: string) => string | undefined

const usPrefix: PrefixResolver = (modelID, region) =>
  !region.startsWith("us-gov") && matchesAny(modelID, US_MODELS) ? "us" : undefined

const euPrefix: PrefixResolver = (modelID, region) =>
  matchesAny(region, EU_REGIONS) && matchesAny(modelID, EU_MODELS) ? "eu" : undefined

const apPrefix: PrefixResolver = (modelID, region) => {
  if (AU_REGIONS.includes(region) && matchesAny(modelID, AU_MODELS)) return "au"
  const prefix = region === "ap-northeast-1" ? "jp" : "apac"
  return matchesAny(modelID, APAC_MODELS) ? prefix : undefined
}

const PREFIX_RESOLVERS: Record<string, PrefixResolver> = { us: usPrefix, eu: euPrefix, ap: apPrefix }

function resolveModelID(modelID: string, region: string | undefined) {
  if (CROSS_REGION_PREFIXES.some((prefix) => modelID.startsWith(prefix))) return modelID

  const resolvedRegion = region ?? "us-east-1"
  const resolver = PREFIX_RESOLVERS[resolvedRegion.split("-")[0]]
  const prefix = resolver?.(modelID, resolvedRegion)
  return prefix ? `${prefix}.${modelID}` : modelID
}

function selectMantleModel(sdk: MantleSDK, modelID: string) {
  if (modelID === "openai.gpt-oss-safeguard-20b" || modelID === "openai.gpt-oss-safeguard-120b")
    return sdk.chat(modelID)
  return sdk.responses(modelID)
}

export const AmazonBedrockPlugin = define({
  id: "amazon-bedrock",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.catalog.transform(
      Effect.fn(function* (evt) {
        for (const item of evt.provider.list()) {
          if (item.provider.api.type !== "aisdk") continue
          if (item.provider.api.package !== "@ai-sdk/amazon-bedrock") continue
          evt.provider.update(item.provider.id, (provider) => {
            if (provider.api.type !== "aisdk") return
            if (typeof provider.request.body.endpoint !== "string") return
            // The AI SDK expects a base URL, but users configure Bedrock private/VPC
            // endpoints as `endpoint`; move it into the catalog endpoint URL once.
            provider.api.url = provider.request.body.endpoint
            delete provider.request.body.endpoint
          })
        }
      }),
    )
    yield* ctx.aisdk.sdk(
      Effect.fn(function* (evt) {
        if (!["@ai-sdk/amazon-bedrock", "@ai-sdk/amazon-bedrock/mantle"].includes(evt.package)) return
        const options = { ...evt.options }
        const profile = typeof options.profile === "string" ? options.profile : process.env.AWS_PROFILE
        const region = typeof options.region === "string" ? options.region : (process.env.AWS_REGION ?? "us-east-1")
        const bearerToken =
          process.env.AWS_BEARER_TOKEN_BEDROCK ??
          (typeof options.bearerToken === "string" ? options.bearerToken : undefined)
        if (bearerToken && !process.env.AWS_BEARER_TOKEN_BEDROCK) process.env.AWS_BEARER_TOKEN_BEDROCK = bearerToken
        const containerCreds = Boolean(
          process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
        )

        options.region = region
        if (typeof options.endpoint === "string") options.baseURL = options.endpoint
        if (!bearerToken && options.credentialProvider === undefined) {
          // Do not gate SDK creation on explicit AWS env vars. The default chain
          // also handles ~/.aws/credentials, SSO, process creds, and instance roles.
          const { fromNodeProviderChain } = yield* Effect.promise(() => import("@aws-sdk/credential-providers"))
          options.credentialProvider = fromNodeProviderChain(profile ? { profile } : {})
        }

        if (evt.package === "@ai-sdk/amazon-bedrock/mantle") {
          const mod = yield* Effect.promise(() => import("@ai-sdk/amazon-bedrock/mantle"))
          evt.sdk = mod.createBedrockMantle(options)
          return
        }

        const mod = yield* Effect.promise(() => import("@ai-sdk/amazon-bedrock"))
        evt.sdk = mod.createAmazonBedrock(options)
      }),
    )
    yield* ctx.aisdk.language(
      Effect.fn(function* (evt) {
        if (evt.model.providerID !== ProviderV2.ID.amazonBedrock) return
        if (evt.model.api.type === "aisdk" && evt.model.api.package === "@ai-sdk/amazon-bedrock/mantle") {
          evt.language = selectMantleModel(evt.sdk, evt.model.api.id)
          return
        }
        const region = typeof evt.options.region === "string" ? evt.options.region : process.env.AWS_REGION
        evt.language = evt.sdk.languageModel(resolveModelID(evt.model.api.id, region))
      }),
    )
  }),
})
