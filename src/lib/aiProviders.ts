import type { AiProviderType } from '../types/bricks'

export type ProviderMeta = {
  id: AiProviderType
  name: string
  endpoint: string
  defaultModel: string
  recommendedModels: string[]
  keyPlaceholder: string
  docsUrl: string
  description: string
  requiresKey: boolean
}

export const AI_PROVIDERS: Record<AiProviderType, ProviderMeta> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    recommendedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1'],
    keyPlaceholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT-4o, GPT-4o-mini and o-series reasoning models.',
    requiresKey: true,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.5-flash',
    recommendedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Fast multimodal models via OpenAI-compatible endpoint.',
    requiresKey: true,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    recommendedModels: ['deepseek-chat', 'deepseek-reasoner'],
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    description: 'DeepSeek-V3 and DeepSeek-R1 reasoning models.',
    requiresKey: true,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-7-sonnet-20250219',
    recommendedModels: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Claude 3.7 & 3.5 Sonnet for detailed structural planning.',
    requiresKey: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    recommendedModels: [
      'anthropic/claude-3.7-sonnet',
      'openai/gpt-4o',
      'google/gemini-2.5-flash',
      'deepseek/deepseek-chat',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    description: 'Universal gateway providing access to 200+ AI models.',
    requiresKey: true,
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    recommendedModels: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    description: 'Ultra high-speed LPU inference.',
    requiresKey: true,
  },
  ninerouter: {
    id: 'ninerouter',
    name: '9router (Local)',
    endpoint: 'http://localhost:20128/v1/chat/completions',
    defaultModel: 'gh/gpt-4o-mini',
    recommendedModels: [
      'gh/gpt-4o-mini',
      'gh/gpt-4o',
      'cl/anthropic/claude-sonnet-4.6',
      'kc/google/gemini-2.5-flash',
      'kc/deepseek/deepseek-chat',
      'openrouter/qwen/qwen3.6-plus',
    ],
    keyPlaceholder: 'Không cần API key (9router cục bộ)',
    docsUrl: 'http://localhost:20128/dashboard',
    description: 'Kết nối qua 9router local gateway (port 20128). Hoàn toàn miễn phí & không cần API key.',
    requiresKey: false,
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local Offline)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'llama3.3',
    recommendedModels: ['llama3.3', 'qwen2.5:14b', 'deepseek-r1:8b', 'mistral'],
    keyPlaceholder: 'No API key needed for local Ollama',
    docsUrl: 'https://ollama.com',
    description: 'Runs completely offline on your computer. Free & private.',
    requiresKey: false,
  },
  custom: {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    endpoint: '',
    defaultModel: '',
    recommendedModels: [],
    keyPlaceholder: 'Optional API Key',
    docsUrl: '',
    description: 'Connect to vLLM, LMStudio, LocalAI, Azure, or private proxy.',
    requiresKey: false,
  },
}

export const detectProviderFromEndpoint = (endpoint: string): AiProviderType => {
  const ep = endpoint.toLowerCase()
  if (ep.includes('api.openai.com')) return 'openai'
  if (ep.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (ep.includes('api.deepseek.com')) return 'deepseek'
  if (ep.includes('api.anthropic.com')) return 'anthropic'
  if (ep.includes('openrouter.ai')) return 'openrouter'
  if (ep.includes('api.groq.com')) return 'groq'
  if (ep.includes('localhost:11434') || ep.includes('127.0.0.1:11434')) return 'ollama'
  if (ep.includes(':20128')) return 'ninerouter'
  return 'custom'
}
