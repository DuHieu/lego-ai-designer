import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const llmProxyTimeoutMs = 45_000

const readRequestBody = (request: import('node:http').IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })

const handleLlmProxyRequest = async (
  request: import('node:http').IncomingMessage,
  response: import('node:http').ServerResponse,
) => {
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const body = JSON.parse(await readRequestBody(request)) as {
      endpoint?: string
      apiKey?: string
      payload?: unknown
    }
    const rawEndpoint = body.endpoint?.trim()
    let endpoint = rawEndpoint
    if (endpoint?.includes(':20128') && (endpoint.includes('/dashboard') || !endpoint.includes('/chat/completions'))) {
      endpoint = `${endpoint.replace(/\/dashboard.*$/, '').replace(/\/+$/, '')}/v1/chat/completions`
    } else if (endpoint?.includes(':11434') && !endpoint.includes('/chat/completions')) {
      endpoint = `${endpoint.replace(/\/+$/, '')}/v1/chat/completions`
    }
    const apiKey = body.apiKey?.trim()

    if (!endpoint || !body.payload) {
      response.statusCode = 400
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ error: 'Missing endpoint or payload' }))
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), llmProxyTimeoutMs)
    let upstream: Response

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`
      }

      upstream = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body.payload),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    const text = await upstream.text()

    if (!upstream.ok) {
      response.statusCode = 502
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          error: 'Upstream LLM request failed',
          endpoint,
          upstreamStatus: upstream.status,
          upstreamBody: text.slice(0, 500),
        }),
      )
      return
    }

    response.statusCode = upstream.status
    response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    response.end(text)
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    response.statusCode = isTimeout ? 504 : 500
    response.setHeader('Content-Type', 'application/json')
    response.end(
      JSON.stringify({
        error: isTimeout ? 'Upstream LLM request timed out' : error instanceof Error ? error.message : 'LLM proxy failed',
        timeoutMs: isTimeout ? llmProxyTimeoutMs : undefined,
      }),
    )
  }
}

const llmProxyPlugin = () => ({
  name: 'llm-proxy',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use('/api/llm/chat', handleLlmProxyRequest)
  },
  configurePreviewServer(server: import('vite').PreviewServer) {
    server.middlewares.use('/api/llm/chat', handleLlmProxyRequest)
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: '/lego-ai-designer/',
  plugins: [react(), llmProxyPlugin()],
})
