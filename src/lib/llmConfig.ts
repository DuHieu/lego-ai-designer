import type { LlmConfig } from '../types/bricks'
import { AI_PROVIDERS, detectProviderFromEndpoint } from './aiProviders'

const storageKey = 'lego-ai-designer:llm-config'
const legacyStorageKey = 'brick-flow-agent:llm-config'

export const defaultLlmConfig: LlmConfig = {
  provider: 'openai',
  modelName: AI_PROVIDERS.openai.defaultModel,
  endpoint: AI_PROVIDERS.openai.endpoint,
  apiKey: '',
  requestMode: 'direct',
  enableThinking: false,
}

const isLlmRequestMode = (value: unknown): value is LlmConfig['requestMode'] =>
  value === 'direct' || value === 'proxy'

export const loadLlmConfig = (): LlmConfig => {
  if (typeof window === 'undefined') return defaultLlmConfig

  const stored = window.localStorage.getItem(storageKey) || window.localStorage.getItem(legacyStorageKey)
  if (!stored) return defaultLlmConfig

  try {
    const parsed = JSON.parse(stored) as Partial<LlmConfig>
    const endpoint = parsed.endpoint ?? defaultLlmConfig.endpoint
    const provider = parsed.provider ?? detectProviderFromEndpoint(endpoint)

    return {
      provider,
      modelName: parsed.modelName ?? AI_PROVIDERS[provider]?.defaultModel ?? '',
      endpoint,
      apiKey: parsed.apiKey ?? '',
      requestMode: isLlmRequestMode(parsed.requestMode) ? parsed.requestMode : defaultLlmConfig.requestMode,
      enableThinking: parsed.enableThinking === true,
    }
  } catch {
    return defaultLlmConfig
  }
}

export const saveLlmConfig = (config: LlmConfig) => {
  window.localStorage.setItem(storageKey, JSON.stringify(config))
}
