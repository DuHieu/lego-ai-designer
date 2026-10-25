import { brickById, brickDefinitions } from '../data/basicBricks'
import type { BrickColor, BuildCategoryOption, BuildPlan, GeneratorInput, LlmConfig, PlacedBrick } from '../types/bricks'
import { generateBuildPlan } from './localGenerator'
import { PLATE_HEIGHT_WORLD, WORLD_EDIT_STEP_STUDS, normalizeHorizontalStud, normalizeYStud, plateHeightToWorldStud } from './brickUnits'
import { createId, createSingleBrickSteps, getBlockingBuildPlanIssues, hasBrickCollision, isBrickSupported, makeBrick, snapBrickToPlan, summarizeBuildPlanIssues, validateBuildPlan } from './planUtils'
import { AI_PROVIDERS, detectProviderFromEndpoint } from './aiProviders'
import { getCategoryPalette, resolveBuildCategory } from './promptPalette'
import { PREFAB_MODULES, formatPrefabModulesForPrompt } from './prefabModules'
import {
  convertStandaloneModelToPlacedBricks,
  getBrickSupportCellsInfo,
  resolvePromptColorPalette,
  toRepairFeedback,
  validateBuildPlanSemanticsAndPhysics,
  type Model as StandaloneModel,
} from './physicsValidator'

type LlmBrick = {
  id?: unknown
  brickId?: unknown
  partNum?: unknown
  role?: unknown
  orientation?: unknown
  attachedTo?: unknown
  color?: unknown
  x?: unknown
  y?: unknown
  z?: unknown
  rot?: unknown
  xStud?: unknown
  yStud?: unknown
  yPlate?: unknown
  zStud?: unknown
  rotationQuarterTurns?: unknown
  verticalQuarterTurns?: unknown
  pose?: {
    xStud?: unknown
    yStud?: unknown
    yPlate?: unknown
    zStud?: unknown
    rotationQuarterTurns?: unknown
    verticalQuarterTurns?: unknown
  }
}

type LlmPlan = {
  title?: unknown
  name?: unknown
  archetype?: unknown
  palette?: unknown
  bricks?: unknown
  parts?: unknown
}

export type LlmGenerationStage = 'pass1' | 'pass2' | 'repair' | 'remix'

type LlmGenerateInput = GeneratorInput & {
  config: LlmConfig
  signal?: AbortSignal
  locale?: LlmLocale
  onProgress?: (stage: LlmGenerationStage) => void
}

type LlmRequestPayload = Record<string, unknown>
type LlmLocale = 'zh-CN' | 'en-US' | 'vi-VN'

const clientRequestTimeoutMs = 240_000
const configTestTimeoutMs = 15_000
const configTestMaxTokens = 128
const generationMaxTokens = 12_800
const generationThinkingMaxTokens = 128_000
export const maxLlmBricks = 64

const llmText: Record<LlmLocale, {
  configTestContext: string
  responseContext: string
  reasoningOnlyLength: (context: string) => string
  noTextContent: (context: string) => string
  notJsonObject: string
  proxyUnavailable: string
  upstreamStatus: (status: number) => string
  endpoint: (endpoint: string) => string
  upstreamBody: (body: string) => string
  requestFailed: (detail: string) => string
  directCors: string
  missingBricks: string
  noUsableParts: string
  incompleteConfig: string
  configTimeout: string
  emptyConfigResponse: string
  generationCanceled: string
  generationTimeout: string
  emptyGenerationResponse: string
  generatedTitle: string
}> = {
  'zh-CN': {
    configTestContext: '配置测试',
    responseContext: '响应',
    reasoningOnlyLength: (context) => `LLM ${context}没有生成最终内容：模型把输出 token 用在 reasoning_content 上并因为长度限制停止了。请在模型侧关闭 thinking/reasoning，或换非推理模型后重试。`,
    noTextContent: (context) => `LLM ${context}里没有可解析的文本内容`,
    notJsonObject: 'LLM 返回的内容不是 JSON 对象',
    proxyUnavailable: 'LLM 本地代理不可用：静态部署请切换到浏览器直连模式，或使用 npm run dev / npm run preview 启动带代理的服务',
    upstreamStatus: (status) => `，上游状态 ${status}`,
    endpoint: (endpoint) => `，接口 ${endpoint}`,
    upstreamBody: (body) => `，返回 ${body}`,
    requestFailed: (detail) => `LLM 请求失败：${detail}`,
    directCors: 'LLM 直连失败：浏览器无法访问该接口，常见原因是接口未允许 CORS。可以换支持浏览器访问的 endpoint，或在本地开发时切到本地代理模式。',
    missingBricks: 'LLM 返回缺少 bricks 数组',
    noUsableParts: 'LLM 没有返回可用零件',
    incompleteConfig: '请先填写完整的 LLM 配置',
    configTimeout: `LLM 配置测试超时：${configTestTimeoutMs / 1000} 秒内没有返回`,
    emptyConfigResponse: 'LLM 配置测试失败：响应为空',
    generationCanceled: '生成已取消',
    generationTimeout: `LLM 请求超时：${clientRequestTimeoutMs / 1000} 秒内没有返回`,
    emptyGenerationResponse: 'LLM 响应为空，请检查模型名字、api_key 或接口兼容性',
    generatedTitle: 'LLM 生成方案',
  },
  'en-US': {
    configTestContext: 'config test',
    responseContext: 'response',
    reasoningOnlyLength: (context) => `The LLM ${context} did not produce final content: the model spent output tokens on reasoning_content and stopped because of the length limit. Disable thinking/reasoning for this model or use a non-reasoning model and try again.`,
    noTextContent: (context) => `The LLM ${context} did not contain parseable text content.`,
    notJsonObject: 'The LLM response content is not a JSON object.',
    proxyUnavailable: 'The local LLM proxy is unavailable. For static deployment, switch to browser direct mode, or start npm run dev / npm run preview to use the proxy.',
    upstreamStatus: (status) => `, upstream status ${status}`,
    endpoint: (endpoint) => `, endpoint ${endpoint}`,
    upstreamBody: (body) => `, response ${body}`,
    requestFailed: (detail) => `LLM request failed: ${detail}`,
    directCors: 'LLM direct request failed: the browser could not access this endpoint. The endpoint probably does not allow CORS. Use a browser-accessible endpoint, or switch to local proxy mode during local development.',
    missingBricks: 'The LLM response is missing a bricks array.',
    noUsableParts: 'The LLM did not return any usable parts.',
    incompleteConfig: 'Complete the LLM config first.',
    configTimeout: `LLM config test timed out after ${configTestTimeoutMs / 1000} seconds.`,
    emptyConfigResponse: 'LLM config test failed: the response was empty.',
    generationCanceled: 'Generation was canceled.',
    generationTimeout: `LLM request timed out after ${clientRequestTimeoutMs / 1000} seconds.`,
    emptyGenerationResponse: 'The LLM response was empty. Check the model name, api_key, or endpoint compatibility.',
    generatedTitle: 'LLM generated plan',
  },
  'vi-VN': {
    configTestContext: 'kiểm tra cấu hình',
    responseContext: 'phản hồi',
    reasoningOnlyLength: (context) => `Mô hình AI ${context} không tạo nội dung cuối cùng do chạm giới hạn token suy luận. Hãy tắt tính năng suy luận (thinking) hoặc đổi sang mô hình khác.`,
    noTextContent: (context) => `Phản hồi ${context} từ AI không chứa văn bản hợp lệ.`,
    notJsonObject: 'Nội dung phản hồi từ AI không phải định dạng JSON hợp lệ.',
    proxyUnavailable: 'Proxy AI cục bộ không khả dụng: Hãy chuyển sang chế độ kết nối trực tiếp từ trình duyệt hoặc khởi động máy chủ proxy.',
    upstreamStatus: (status) => `, mã trạng thái ${status}`,
    endpoint: (endpoint) => `, cổng kết nối ${endpoint}`,
    upstreamBody: (body) => `, phản hồi ${body}`,
    requestFailed: (detail) => `Yêu cầu AI thất bại: ${detail}`,
    directCors: 'Kết nối AI trực tiếp thất bại: Trình duyệt bị chặn CORS. Hãy kiểm tra API key, sử dụng endpoint hỗ trợ CORS hoặc bật chế độ proxy cục bộ.',
    missingBricks: 'Phản hồi từ AI thiếu mảng danh sách chi tiết (bricks).',
    noUsableParts: 'AI không tạo được chi tiết LEGO nào sử dụng được.',
    incompleteConfig: 'Vui lòng hoàn tất cấu hình AI trước khi tạo mô hình.',
    configTimeout: `Kiểm tra cấu hình AI quá thời gian chờ sau ${configTestTimeoutMs / 1000} giây.`,
    emptyConfigResponse: 'Kiểm tra cấu hình AI thất bại: phản hồi rỗng.',
    generationCanceled: 'Đã hủy quá trình thiết kế.',
    generationTimeout: `Yêu cầu AI quá thời gian chờ sau ${clientRequestTimeoutMs / 1000} giây.`,
    emptyGenerationResponse: 'Phản hồi từ AI rỗng. Vui lòng kiểm tra tên mô hình, API key hoặc tính tương thích của endpoint.',
    generatedTitle: 'Mô hình do AI thiết kế',
  },
}

const colors: BrickColor[] = ['red', 'blue', 'yellow', 'green', 'white', 'black', 'gray', 'brown', 'orange', 'tan', 'cyan', 'lime', 'pink', 'trans-pink']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback

const asInteger = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? Math.round(number) : fallback
}

const asHorizontalStudGrid = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? normalizeHorizontalStud(number) : fallback
}

const asWorldStudGrid = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? normalizeYStud(number) : fallback
}

const asLegacyPlateGrid = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? plateHeightToWorldStud(number) : fallback
}

const asColor = (value: unknown, fallback: BrickColor): BrickColor => {
  const color = asString(value)
  return colors.includes(color as BrickColor) ? (color as BrickColor) : fallback
}

const clampRotation = (value: unknown) => {
  const rotation = asInteger(value, 0)
  return (((rotation % 4) + 4) % 4) as 0 | 1 | 2 | 3
}

const normalizeBrickPose = (brick: PlacedBrick): PlacedBrick => ({
  ...brick,
  pose: {
    ...brick.pose,
    xStud: normalizeHorizontalStud(brick.pose.xStud),
    yStud: normalizeYStud(brick.pose.yStud),
    zStud: normalizeHorizontalStud(brick.pose.zStud),
    rotationQuarterTurns: clampRotation(brick.pose.rotationQuarterTurns),
    verticalQuarterTurns: clampRotation(brick.pose.verticalQuarterTurns ?? 0),
  },
})

const formatInventoryForPrompt = (inventory: number) =>
  Number.isFinite(inventory) ? String(inventory) : 'unlimited'

const formatLegoHeightForPrompt = (heightStuds: number) =>
  Number((heightStuds / PLATE_HEIGHT_WORLD).toFixed(3))

const formatPartForPrompt = (brick: (typeof brickDefinitions)[number]) =>
  `${brick.id}: ${brick.name}, footprint ${brick.footprint.widthStuds}x${brick.footprint.depthStuds}, height ${brick.footprint.heightStuds} studs (${formatLegoHeightForPrompt(brick.footprint.heightStuds)} plates), colors ${brick.colors.join('/')}, inventory ${formatInventoryForPrompt(brick.inventory)}`

const formatPaletteForPrompt = (prompt: string, categoryOverride?: BuildCategoryOption) => {
  const category = resolveBuildCategory(prompt, categoryOverride)
  const palette = getCategoryPalette(category)
  return {
    category,
    label: palette.label,
    parts: palette.parts.map(formatPartForPrompt).join('\n'),
    techniques: palette.techniques.map((technique) => `- ${technique}`).join('\n'),
    prefabs: formatPrefabModulesForPrompt(category),
  }
}

export const llmSystemPrompt = 'You are a professional 3D LEGO master builder and algorithmic build-planning engine. Return compact valid JSON only. Do not include reasoning.'

const formatOfficialReplicaExample = () => {
  const plan = generateBuildPlan({ prompt: '一个 Classic 小幽灵' })
  const example = {
    title: 'Classic Little Ghost',
    bricks: plan.bricks.map((brick) => ({
      brickId: brick.brickId,
      color: brick.color,
      xStud: brick.pose.xStud,
      yStud: brick.pose.yStud,
      zStud: brick.pose.zStud,
      rotationQuarterTurns: brick.pose.rotationQuarterTurns,
      verticalQuarterTurns: brick.pose.verticalQuarterTurns ?? 0,
    })),
  }

  return JSON.stringify(example, null, 2)
}

export const buildLlmUserPrompt = ({ prompt, imageName, category }: GeneratorInput) => {
  const palette = formatPaletteForPrompt(prompt, category)
  const resolvedColors = resolvePromptColorPalette(prompt)
  const resolvedPaletteLine = resolvedColors
    ? `Mandatory resolved color palette (>= 70% of parts MUST use these colors): ${resolvedColors.colors.join(', ')} (${resolvedColors.legoNames.join(' + ')})`
    : 'Color palette: choose 2-3 harmonious official LEGO colors matching the subject.'

  return `You generate recognizable, structurally sound 3D LEGO brick build plans for a browser 3D editor.

User request: ${prompt}
Reference image file name: ${imageName || 'none'}
Detected build category: ${palette.label}
${resolvedPaletteLine}

Available parts (curated palette for this category):
${palette.parts}

DESIGN TECHNIQUES USED BY LEGO DESIGNERS FOR THIS CATEGORY:
${palette.techniques}

VERIFIED PREFAB SUB-ASSEMBLIES (Copy or adapt these exact coordinate patterns for reliable foundation & SNOT fit):
${palette.prefabs}

SNOT (STUDS NOT ON TOP) & EYE ORIENTATION RULES:
- 5 plates stacked (5 x 0.4 = 2.0 studs) equal exactly 2 studs of width, so sideways-mounted parts line up with the grid.
- bracket-1x2-2x2 turns a 2x2 stud face to point sideways; brick-side-studs-* and headlight-brick-1x1 expose studs on their side faces (facing z- when rotationQuarterTurns = 0).
- Eyes (tile-eye-1x1) on a robot, character, or creature MUST NEVER face up toward the sky (verticalQuarterTurns = 0 is FORBIDDEN for eyes).
- Always mount tile-eye-1x1 on the front side stud of headlight-brick-1x1 with:
  * headlight-brick-1x1 at (xStud: X, yStud: Y, zStud: Z, rotationQuarterTurns: 0, verticalQuarterTurns: 0)
  * tile-eye-1x1 at (xStud: X, yStud: Y + 0.2, zStud: Z - 0.2, rotationQuarterTurns: 0, verticalQuarterTurns: 1)

CRITICAL HEIGHT & STACKING MATH:
- Standard Bricks (brick-*): Height = 1.2 studs (3 plates)
- Plates (plate-*) & Tiles (tile-*): Height = 0.4 studs (1 plate)
- Slopes and special parts: use the height listed for each part above.
- Stacking formula: When placing piece B on piece A: yStud(B) = yStud(A) + height(A)
- Common vertical elevations:
  * Level 0 (ground): y = 0
  * Level 1 (after 1 plate): y = 0.4
  * Level 2 (after 2 plates or 1 brick): y = 0.8 or 1.2
  * Level 3 (after 1 brick + 1 plate): y = 1.6
  * Level 4 (after 2 bricks): y = 2.4
  * Level 5 (after 2 bricks + 1 plate): y = 2.8
  * Level 6 (after 3 bricks): y = 3.6
  * Level 7 (after 3 bricks + 1 plate): y = 4.0
  * Level 8 (after 4 bricks): y = 4.8

HARD PHYSICAL & CANTILEVER RULES:
1. Every part must connect to the ground (yStud = 0) through a continuous chain of stud/SNOT connections. No floating parts.
2. Tiles (tile-*) and studless slopes (slope-2x2, slope-curved-*) have NO top studs: nothing may rest on top of them.
3. Every non-1x1 part above yStud = 0 must be held by >= 2 studs total.
4. Overhang limit: >= 50% of every part's horizontal footprint must rest on (or be clamped by) other parts. NEVER cantilever a 1x4 or 2x4 plate/brick sticking out off 1-2 studs.
5. Center of mass must stay inside the ground base footprint.

VIETNAMESE & MULTILINGUAL COLOR MAPPING:
- "xanh xám", "xanh ghi", "blue gray" -> cyan (Sand Blue / Medium Azure) + gray (Dark/Light Bluish Gray) + blue accent. At least 35% gray and 35% cyan/blue (>= 75% combined). Do NOT build a monochrome dark blue block!
- "xám", "ghi" -> gray + white/black accents
- "xanh dương", "xanh biển" -> blue + cyan
- "xanh lá" -> green + lime
- "đỏ" -> red; "vàng" -> yellow; "cam" -> orange; "trắng" -> white; "đen" -> black; "nâu" -> brown/tan; "hồng" -> pink

ARCHETYPE ANATOMY & SILHOUETTE RULES:
- Use 1 to ${maxLlmBricks} bricks.
- For robot / character models (>= 22 bricks required, upright bipedal silhouette with height >= 6.4 studs):
  * Legs (x2): Two separated rising columns (e.g. left leg at xStud=1, right leg at xStud=4, yStud=0..2.8) in gray/cyan.
  * Pelvis & Torso: Spanning plate-2x4 waist at yStud=2.8 and 2-tier brick-2x4 torso (yStud=3.2..6.0) with plate-2x6 shoulder bridge at yStud=4.4.
  * Arms (x2): Symmetrical left arm at xStud=0 and right arm at xStud=5 mounted on the shoulder bridge.
  * Neck & Head: Narrower 2x2 neck plate at yStud=6.0, head at yStud=6.4 with two headlight-brick-1x1 and two forward-facing tile-eye-1x1 (verticalQuarterTurns=1 at yStud=6.6, zStud=1.8).
  * Crown & Antenna: Top plate-2x2 at yStud=7.6 with brick-round-1x1 + round-1x1-plate antenna.
- Coordinates: xStud, yStud, zStud in 0.1 increments. Keep within x=0..8, z=0..6.
- Every brick item MUST strictly have keys:
  "brickId", "color", "xStud", "yStud", "zStud", "rotationQuarterTurns", "verticalQuarterTurns"
- Output the title in English, even if the user request is not English.
- Use only available brick ids and their allowed colors.
- Do not include markdown or explanatory text.

Return only valid JSON with this exact shape:
{
  "title": "short English title",
  "bricks": [
    {
      "brickId": "one available part id",
      "color": "one allowed color for that part",
      "xStud": 0,
      "yStud": 0,
      "zStud": 0,
      "rotationQuarterTurns": 0,
      "verticalQuarterTurns": 0
    }
  ]
}

Good official-replica example, calibrated from LEGO Classic 10696 Ghost:
${formatOfficialReplicaExample()}`
}

const extractTextContent = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractTextContent).join('')
  if (!isRecord(value)) return ''

  const text = value.text
  if (typeof text === 'string') return text
  if (isRecord(text) && typeof text.value === 'string') return text.value

  const content = value.content
  if (typeof content === 'string' || Array.isArray(content)) return extractTextContent(content)

  const outputText = value.output_text
  if (typeof outputText === 'string') return outputText

  const response = value.response
  if (typeof response === 'string') return response

  return ''
}

const stringifyDirectJsonPayload = (payload: Record<string, unknown>) => {
  if (typeof payload.ok === 'boolean' || Array.isArray(payload.bricks)) return JSON.stringify(payload)
  return ''
}

const extractMessageContent = (payload: unknown) => {
  if (!isRecord(payload)) return ''

  const directContent = extractTextContent(payload.output_text)
    || extractTextContent(payload.response)
    || extractTextContent(payload.content)
    || extractTextContent(payload.message)
    || extractTextContent(payload.output)
  if (directContent) return directContent

  const choices = payload.choices
  if (Array.isArray(choices)) {
    const choiceContent = choices
      .map((choice) => {
        if (!isRecord(choice)) return ''
        return extractTextContent(choice.message)
          || extractTextContent(choice.delta)
          || extractTextContent(choice.text)
      })
      .join('')
    if (choiceContent) return choiceContent
  }

  return stringifyDirectJsonPayload(payload)
}

const hasReasoningOnlyLengthFinish = (payload: unknown) => {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return false

  return payload.choices.some((choice) => {
    if (!isRecord(choice)) return false
    const finishReason = choice.finish_reason
    const reasoningContent = extractTextContent(choice.reasoning_content)
      || (isRecord(choice.message) ? extractTextContent(choice.message.reasoning_content) : '')
      || (isRecord(choice.delta) ? extractTextContent(choice.delta.reasoning_content) : '')

    return finishReason === 'length' && Boolean(reasoningContent)
  })
}

const formatEmptyContentError = (payload: unknown, context: string, locale: LlmLocale) =>
  hasReasoningOnlyLengthFinish(payload)
    ? llmText[locale].reasoningOnlyLength(context)
    : llmText[locale].noTextContent(context)

const parseJsonContent = (content: string, locale: LlmLocale): LlmPlan => {
  const trimmed = content.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = fencedMatch?.[1] ?? trimmed
  const objectMatch = jsonText.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(objectMatch?.[0] ?? jsonText) as unknown

  if (!isRecord(parsed)) throw new Error(llmText[locale].notJsonObject)
  return parsed as LlmPlan
}

const formatRequestError = async (response: Response, requestMode: LlmConfig['requestMode'], locale: LlmLocale) => {
  const labels = llmText[locale]
  const detail = await response.text()

  if (requestMode === 'proxy' && response.status === 404) {
    return labels.proxyUnavailable
  }

  try {
    const parsed = JSON.parse(detail) as unknown
    if (isRecord(parsed) && typeof parsed.error === 'string') {
      const upstreamStatus = typeof parsed.upstreamStatus === 'number' ? labels.upstreamStatus(parsed.upstreamStatus) : ''
      const endpoint = typeof parsed.endpoint === 'string' ? labels.endpoint(parsed.endpoint) : ''
      const upstreamBody = typeof parsed.upstreamBody === 'string' ? labels.upstreamBody(parsed.upstreamBody.slice(0, 160)) : ''
      return labels.requestFailed(`${parsed.error}${upstreamStatus}${endpoint}${upstreamBody}`)
    }
  } catch {
    return labels.requestFailed(`${response.status} ${detail.slice(0, 160)}`)
  }

  return labels.requestFailed(`${response.status} ${detail.slice(0, 160)}`)
}

const formatPayloadForEndpoint = (endpoint: string, payload: LlmRequestPayload): LlmRequestPayload => {
  if (endpoint.includes('api.anthropic.com')) {
    const rawMessages = Array.isArray(payload.messages) ? payload.messages : []
    let systemPrompt = ''
    const anthropicMessages: Array<{ role: string; content: string }> = []

    for (const msg of rawMessages) {
      if (isRecord(msg)) {
        if (msg.role === 'system') {
          systemPrompt += (typeof msg.content === 'string' ? msg.content : '') + '\n'
        } else if (msg.role === 'user' || msg.role === 'assistant') {
          anthropicMessages.push({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : '',
          })
        }
      }
    }

    const anthropicPayload: Record<string, unknown> = {
      model: payload.model,
      max_tokens: typeof payload.max_tokens === 'number' ? payload.max_tokens : 4096,
      messages: anthropicMessages,
    }

    if (systemPrompt.trim()) {
      anthropicPayload.system = systemPrompt.trim()
    }

    if (payload.thinking && isRecord(payload.thinking)) {
      anthropicPayload.thinking = payload.thinking
    }

    return anthropicPayload
  }

  const model = typeof payload.model === 'string' ? payload.model.toLowerCase() : ''
  if (model.includes('deepseek-reasoner')) {
    const reasonerPayload = { ...payload }
    delete reasonerPayload.response_format
    delete reasonerPayload.temperature
    return reasonerPayload
  }

  return payload
}

export const normalizeLlmEndpoint = (rawEndpoint: string): string => {
  let ep = rawEndpoint.trim()
  if (!ep) return ep

  if (ep.includes(':20128')) {
    if (ep.includes('/dashboard') || !ep.includes('/chat/completions')) {
      ep = ep.replace(/\/dashboard.*$/, '').replace(/\/+$/, '')
      if (!ep.endsWith('/v1/chat/completions')) {
        ep = `${ep}/v1/chat/completions`
      }
    }
  }

  if (ep.includes(':11434')) {
    ep = ep.replace(/\/+$/, '')
    if (!ep.endsWith('/v1/chat/completions')) {
      ep = `${ep}/v1/chat/completions`
    }
  }

  return ep
}

const requestLlmChat = (config: LlmConfig, payload: LlmRequestPayload, signal: AbortSignal) => {
  const endpoint = normalizeLlmEndpoint(config.endpoint)
  const apiKey = config.apiKey.trim()
  const outgoingPayload = formatPayloadForEndpoint(endpoint, payload)

  if (config.requestMode === 'proxy') {
    return fetch('/api/llm/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        endpoint,
        apiKey,
        payload: outgoingPayload,
      }),
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    if (endpoint.includes('api.anthropic.com')) {
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
      headers['anthropic-dangerous-direct-browser-access'] = 'true'
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
  }

  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://github.com/DuHieu/lego-ai-designer'
    headers['X-Title'] = 'LEGO AI Designer'
  }

  return fetch(endpoint, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify(outgoingPayload),
  })
}

const formatFetchError = (error: unknown, requestMode: LlmConfig['requestMode'], locale: LlmLocale) => {
  if (requestMode === 'direct' && error instanceof TypeError) {
    return new Error(llmText[locale].directCors)
  }

  return error
}

const applyThinkingMode = (
  payload: LlmRequestPayload,
  enableThinking: boolean,
  config?: LlmConfig,
): LlmRequestPayload => {
  const cleanPayload = { ...payload }
  delete cleanPayload.enable_thinking
  delete cleanPayload.thinking
  delete cleanPayload.reasoning_effort
  delete cleanPayload.reasoning

  if (!enableThinking) {
    return cleanPayload
  }

  const endpoint = (config?.endpoint ?? '').toLowerCase()
  const model = (config?.modelName ?? '').toLowerCase()
  const provider = config?.provider ?? (endpoint ? detectProviderFromEndpoint(endpoint) : 'custom')

  if (provider === 'groq' || endpoint.includes('api.groq.com') || provider === 'ninerouter' || endpoint.includes(':20128')) {
    return cleanPayload
  }

  if (provider === 'openai' || endpoint.includes('api.openai.com')) {
    if (model.includes('o1') || model.includes('o3') || model.includes('o4')) {
      return {
        ...cleanPayload,
        reasoning_effort: 'high',
      }
    }
    return cleanPayload
  }

  if (provider === 'anthropic' || endpoint.includes('api.anthropic.com')) {
    return {
      ...cleanPayload,
      thinking: {
        type: 'enabled',
        budget_tokens: 2048,
      },
    }
  }

  if (provider === 'openrouter' || endpoint.includes('openrouter.ai')) {
    return {
      ...cleanPayload,
      reasoning: { effort: 'high' },
    }
  }

  if (
    provider === 'gemini' ||
    endpoint.includes('googleapis.com') ||
    provider === 'deepseek' ||
    endpoint.includes('deepseek.com')
  ) {
    return cleanPayload
  }

  if (provider === 'ollama' || endpoint.includes('localhost:11434')) {
    return cleanPayload
  }

  if (endpoint.includes('siliconflow') || endpoint.includes('dashscope') || endpoint.includes('aliyun')) {
    return {
      ...cleanPayload,
      enable_thinking: true,
    }
  }

  return {
    ...cleanPayload,
    reasoning_effort: 'high',
  }
}

const nudgeToNearbyOpenPose = (brick: PlacedBrick, placed: PlacedBrick[]) => {
  if (!hasBrickCollision(brick, placed)) return brick

  for (let radius = 1; radius <= 2; radius += 1) {
    for (let zOffset = -radius; zOffset <= radius; zOffset += 1) {
      for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
        const candidate = {
          ...brick,
          pose: {
            ...brick.pose,
            xStud: normalizeHorizontalStud(brick.pose.xStud + xOffset),
            zStud: normalizeHorizontalStud(brick.pose.zStud + zOffset),
          },
        }
        if (!hasBrickCollision(candidate, placed)) return candidate
      }
    }
  }

  return undefined
}

const lowerUntilSupported = (brick: PlacedBrick, placed: PlacedBrick[]) => {
  if (isBrickSupported(brick, placed)) return brick

  for (let yStud = brick.pose.yStud - WORLD_EDIT_STEP_STUDS; yStud >= 0; yStud -= WORLD_EDIT_STEP_STUDS) {
    const candidate = {
      ...brick,
      pose: {
        ...brick.pose,
        yStud: normalizeYStud(yStud),
      },
    }
    if (!hasBrickCollision(candidate, placed) && isBrickSupported(candidate, placed)) return candidate
  }

  return undefined
}

const clampOverhangOrWeakBrick = (
  brick: PlacedBrick,
  placed: PlacedBrick[],
): { brick?: PlacedBrick; shifted: boolean; reason?: string } => {
  const initialInfo = getBrickSupportCellsInfo(brick, placed)
  if (!initialInfo.isOverhang && !initialInfo.isWeakConnection) {
    return { brick, shifted: false }
  }

  let bestCandidate: PlacedBrick | undefined
  let bestScore = -1

  for (let radius = 1; radius <= 2; radius += 1) {
    for (let zOffset = -radius; zOffset <= radius; zOffset += 1) {
      for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
        if (xOffset === 0 && zOffset === 0) continue
        const candidate: PlacedBrick = {
          ...brick,
          pose: {
            ...brick.pose,
            xStud: normalizeHorizontalStud(brick.pose.xStud + xOffset),
            zStud: normalizeHorizontalStud(brick.pose.zStud + zOffset),
          },
        }
        if (hasBrickCollision(candidate, placed) || !isBrickSupported(candidate, placed)) {
          continue
        }
        const info = getBrickSupportCellsInfo(candidate, placed)
        if (!info.isOverhang && !info.isWeakConnection && info.supportRatio > bestScore) {
          bestScore = info.supportRatio
          bestCandidate = candidate
        }
      }
    }
    if (bestCandidate) break
  }

  if (bestCandidate) {
    return {
      brick: bestCandidate,
      shifted: true,
      reason: initialInfo.isOverhang ? 'overhang >50%' : 'weak <2-stud connection',
    }
  }

  return {
    brick: undefined,
    shifted: false,
    reason: initialInfo.isOverhang
      ? `cantilevered overhang (${Math.round(initialInfo.supportRatio * 100)}% supported)`
      : `weak single-stud connection (${initialInfo.supportedCount}/${initialInfo.totalCells} studs)`,
  }
}

const rebalanceBricksToPromptPalette = (bricks: PlacedBrick[], prompt?: string): PlacedBrick[] => {
  if (!prompt || bricks.length === 0) return bricks
  const paletteRule = resolvePromptColorPalette(prompt)
  if (!paletteRule) return bricks

  const allowedSet = new Set<BrickColor>(paletteRule.allowedColors)
  const matchingCount = bricks.filter((b) => allowedSet.has(b.color)).length
  const matchRatio = matchingCount / bricks.length

  const primaryCount = bricks.filter((b) => b.color === paletteRule.primaryColor).length
  const secondaryCount = paletteRule.secondaryColor
    ? bricks.filter((b) => b.color === paletteRule.secondaryColor).length
    : primaryCount

  const needsTwoToneBalance =
    Boolean(paletteRule.secondaryColor) &&
    (primaryCount / bricks.length < 0.2 || secondaryCount / bricks.length < 0.2)

  if (matchRatio >= 0.75 && !needsTwoToneBalance) {
    return bricks
  }

  const ys = bricks.map((b) => b.pose.yStud)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanY = Math.max(1.2, maxY - minY)

  return bricks.map((brick, index) => {
    const def = brickById.get(brick.brickId)
    if (!def) return brick

    // Keep eye tiles and tiny indicator lights in their expressive colors
    if (
      brick.brickId === 'tile-eye-1x1' ||
      ((brick.brickId === 'round-1x1-plate' || brick.brickId === 'slope-cheese-1x1') &&
        (brick.color === 'white' || brick.color === 'yellow' || brick.color === 'orange' || brick.color === 'red') &&
        index >= bricks.length - 4)
    ) {
      return brick
    }

    const relativeY = (brick.pose.yStud - minY) / spanY
    let targetColor: BrickColor = paletteRule.primaryColor

    if (paletteRule.secondaryColor) {
      if (relativeY < 0.42 || def.kind === 'plate' || brick.brickId.includes('side-studs') || brick.brickId.includes('headlight')) {
        targetColor = paletteRule.secondaryColor
      } else if (paletteRule.accentColor && index % 6 === 0) {
        targetColor = paletteRule.accentColor
      } else {
        targetColor = paletteRule.primaryColor
      }
    } else if (!allowedSet.has(brick.color)) {
      targetColor = paletteRule.primaryColor
    } else {
      targetColor = brick.color
    }

    const safeColor = def.colors.includes(targetColor)
      ? targetColor
      : def.colors.find((c) => allowedSet.has(c)) ?? def.colors[0]

    return {
      ...brick,
      color: safeColor,
    }
  })
}

export const buildVerifiedRobotSkeletonBricks = (prompt?: string): PlacedBrick[] => {
  const isMinifig = Boolean(prompt && /minifig|minifigure/i.test(prompt))
  if (isMinifig) {
    const minifigPrefab = PREFAB_MODULES.character.find((m) => m.id === 'minifig-police-officer')
    if (minifigPrefab) {
      return minifigPrefab.sampleBricks.map((item) => {
        const def = brickById.get(item.brickId)
        const fallbackColor = item.color as BrickColor
        const safeColor = def && def.colors.includes(fallbackColor) ? fallbackColor : (def?.colors[0] ?? fallbackColor)
        return makeBrick(
          item.brickId,
          safeColor,
          item.xStud,
          item.yStud,
          item.zStud,
          item.rotationQuarterTurns,
          item.verticalQuarterTurns ?? 0,
        )
      })
    }
  }

  const isPolice = Boolean(prompt && /cảnh\s*sát|công\s*an|police|officer|cop|警察/i.test(prompt))
  if (isPolice) {
    const targetId = /minifig/i.test(prompt ?? '') ? 'minifig-police-officer' : 'creator-brickheadz-police'
    const policePrefab = PREFAB_MODULES.character.find((m) => m.id === targetId) ?? PREFAB_MODULES.character.find((m) => m.id === 'creator-brickheadz-police')
    if (policePrefab) {
      return policePrefab.sampleBricks.map((item) => {
        const def = brickById.get(item.brickId)
        const fallbackColor = item.color as BrickColor
        const safeColor = def && def.colors.includes(fallbackColor) ? fallbackColor : (def?.colors[0] ?? fallbackColor)
        return makeBrick(
          item.brickId,
          safeColor,
          item.xStud,
          item.yStud,
          item.zStud,
          item.rotationQuarterTurns,
          item.verticalQuarterTurns ?? 0,
        )
      })
    }
  }

  const paletteRule = prompt ? resolvePromptColorPalette(prompt) : undefined
  const primary: BrickColor = paletteRule?.primaryColor ?? 'cyan'
  const secondary: BrickColor = paletteRule?.secondaryColor ?? 'gray'
  const accent: BrickColor = paletteRule?.accentColor ?? 'blue'

  const mechaPrefab = PREFAB_MODULES.character.find((m) => m.id === 'creator-biped-mecha-core')
  if (!mechaPrefab) return []

  return mechaPrefab.sampleBricks.map((item, idx) => {
    const def = brickById.get(item.brickId)
    const fallbackColor = item.color as BrickColor
    let chosenColor: BrickColor = fallbackColor
    if (item.brickId === 'tile-eye-1x1') {
      chosenColor = 'white'
    } else if (item.brickId === 'round-1x1-plate' || item.brickId === 'tile-grille-1x2') {
      chosenColor = def?.colors.includes(accent) ? accent : fallbackColor
    } else if (item.color === 'gray') {
      chosenColor = def?.colors.includes(secondary) ? secondary : fallbackColor
    } else if (item.color === 'cyan' || item.color === 'blue') {
      chosenColor = idx % 7 === 0 && def?.colors.includes(accent)
        ? accent
        : def?.colors.includes(primary)
          ? primary
          : fallbackColor
    }
    const safeColor = def && def.colors.includes(chosenColor) ? chosenColor : (def?.colors[0] ?? fallbackColor)
    return makeBrick(
      item.brickId,
      safeColor,
      item.xStud,
      item.yStud,
      item.zStud,
      item.rotationQuarterTurns,
      item.verticalQuarterTurns ?? 0,
    )
  })
}

type NormalizationDiagnostics = {
  rawCount: number
  placedCount: number
  droppedReasons: string[]
  nudgedBricks: string[]
  loweredBricks: string[]
  surfaceDetailCount: number
}

const isSurfaceDetailPart = (brickId: string, kind: string) =>
  kind === 'slope' ||
  kind === 'tile' ||
  kind === 'round' ||
  kind === 'cone' ||
  brickId.includes('side-studs') ||
  brickId.includes('headlight') ||
  brickId.includes('bracket')

const resolveBrickDefinition = (rawBrick: LlmBrick) => {
  const rawId = asString(rawBrick.brickId) || asString(rawBrick.partNum)
  if (!rawId) return undefined
  const direct = brickById.get(rawId)
  if (direct) return direct
  return brickDefinitions.find((d) => d.partNumber === rawId)
}

const normalizeBricksWithDiagnostics = (
  rawBricks: unknown,
  locale: LlmLocale,
  prompt?: string,
  rawPlan?: LlmPlan,
): { bricks: PlacedBrick[]; diagnostics: NormalizationDiagnostics } => {
  let sourceBricks: unknown[] = Array.isArray(rawBricks) ? rawBricks : []
  if (sourceBricks.length === 0 && rawPlan && Array.isArray(rawPlan.parts)) {
    const converted = convertStandaloneModelToPlacedBricks(rawPlan as unknown as StandaloneModel)
    sourceBricks = converted.map((b) => ({
      brickId: b.brickId,
      color: b.color,
      xStud: b.pose.xStud,
      yStud: b.pose.yStud,
      zStud: b.pose.zStud,
      rotationQuarterTurns: b.pose.rotationQuarterTurns,
      verticalQuarterTurns: b.pose.verticalQuarterTurns ?? 0,
    }))
  }
  if (!Array.isArray(rawBricks) && sourceBricks.length === 0) {
    throw new Error(llmText[locale].missingBricks)
  }

  const placed: PlacedBrick[] = []
  const placedCounts = new Map<string, number>()
  const droppedReasons: string[] = []
  const nudgedBricks: string[] = []
  const loweredBricks: string[] = []
  let surfaceDetailCount = 0

  for (const rawBrick of sourceBricks.slice(0, maxLlmBricks)) {
    if (!isRecord(rawBrick)) continue
    const brick = rawBrick as LlmBrick
    const definition = resolveBrickDefinition(brick)
    const brickId = definition?.id ?? asString(brick.brickId)
    if (!definition) {
      if (brickId) droppedReasons.push(`unknown part "${brickId}"`)
      continue
    }
    const currentCount = placedCounts.get(brickId) ?? 0
    if (Number.isFinite(definition.inventory) && currentCount >= definition.inventory) {
      droppedReasons.push(`inventory exceeded for "${brickId}"`)
      continue
    }

    const pose = isRecord(brick.pose) ? brick.pose : {}
    const color = asColor(brick.color, definition.colors[0])
    const safeColor = definition.colors.includes(color) ? color : definition.colors[0]
    const rawX = asHorizontalStudGrid(brick.xStud ?? brick.x ?? pose.xStud, 0)
    const rawY = brick.yStud !== undefined || pose.yStud !== undefined
      ? asWorldStudGrid(brick.yStud ?? pose.yStud, 0)
      : brick.y !== undefined
        ? asLegacyPlateGrid(brick.y, 0)
        : asLegacyPlateGrid(brick.yPlate ?? pose.yPlate, 0)
    const rawZ = asHorizontalStudGrid(brick.zStud ?? brick.z ?? pose.zStud, 0)
    const rawRot = clampRotation(brick.rotationQuarterTurns ?? pose.rotationQuarterTurns ?? (typeof brick.rot === 'number' ? Math.round(brick.rot / 90) : 0))
    let rawVert = clampRotation(brick.verticalQuarterTurns ?? pose.verticalQuarterTurns)
    if (rawVert === 0 && typeof brick.orientation === 'string' && brick.orientation !== 'up') {
      rawVert = 1
    }

    let candidate = makeBrick(
      brickId,
      safeColor,
      rawX,
      rawY,
      rawZ,
      rawRot,
      rawVert,
    )

    // Auto-fix upward-facing eyes if a SNOT side-stud brick is available in the model
    if (brickId === 'tile-eye-1x1' && (candidate.pose.verticalQuarterTurns ?? 0) === 0) {
      const snotHostExists = placed.some(
        (b) => b.brickId === 'headlight-brick-1x1' || b.brickId.startsWith('brick-side-studs-'),
      )
      if (snotHostExists) {
        const snotEyeCandidate: PlacedBrick = {
          ...candidate,
          pose: {
            ...candidate.pose,
            verticalQuarterTurns: 1,
          },
        }
        const snappedEye = snapBrickToPlan(snotEyeCandidate, placed)
        if (!hasBrickCollision(snappedEye, placed) && isBrickSupported(snappedEye, placed)) {
          candidate = snappedEye
          nudgedBricks.push(`${brickId} rotated to verticalQuarterTurns=1 and snapped to SNOT side stud so eye faces forward`)
        }
      }
    }

    // Snap SNOT side-stud parts or slightly misaligned parts to valid connectors
    const snapped = (candidate.pose.verticalQuarterTurns ?? 0) !== 0
      ? snapBrickToPlan(candidate, placed)
      : candidate

    const openBrick = nudgeToNearbyOpenPose(snapped, placed)
    if (!openBrick) {
      droppedReasons.push(`${brickId} at (${rawX}, ${rawY}, ${rawZ}) collided and had no open nearby spot`)
      continue
    }
    if (openBrick.pose.xStud !== rawX || openBrick.pose.zStud !== rawZ) {
      nudgedBricks.push(`${brickId} nudged from (${rawX}, ${rawY}, ${rawZ}) to (${openBrick.pose.xStud}, ${rawY}, ${openBrick.pose.zStud}) due to collision`)
    }

    const supportedBrick = (openBrick.pose.verticalQuarterTurns ?? 0) !== 0 && isBrickSupported(openBrick, placed)
      ? openBrick
      : lowerUntilSupported(openBrick, placed)
    if (!supportedBrick) {
      droppedReasons.push(`${brickId} at (${openBrick.pose.xStud}, ${rawY}, ${openBrick.pose.zStud}) had no vertical support below`)
      continue
    }
    if (Math.abs(supportedBrick.pose.yStud - rawY) > 0.05) {
      loweredBricks.push(`${brickId} floated at y=${rawY} and was lowered to y=${supportedBrick.pose.yStud}`)
    }

    // Enforce overhang (<= 50% unsupported) and >= 2-stud connection rules for horizontal bricks
    let validatedSupportBrick = supportedBrick
    if ((supportedBrick.pose.verticalQuarterTurns ?? 0) === 0 && supportedBrick.pose.yStud > 0) {
      const clampResult = clampOverhangOrWeakBrick(supportedBrick, placed)
      if (!clampResult.brick) {
        droppedReasons.push(`${brickId} at (${supportedBrick.pose.xStud}, ${supportedBrick.pose.yStud}, ${supportedBrick.pose.zStud}) dropped due to ${clampResult.reason}`)
        continue
      }
      if (clampResult.shifted) {
        nudgedBricks.push(`${brickId} shifted inward to (${clampResult.brick.pose.xStud}, ${clampResult.brick.pose.yStud}, ${clampResult.brick.pose.zStud}) to fix ${clampResult.reason}`)
      }
      validatedSupportBrick = clampResult.brick
    }

    const finalBrick = normalizeBrickPose(validatedSupportBrick)
    placed.push(finalBrick)
    placedCounts.set(brickId, currentCount + 1)
    if (isSurfaceDetailPart(brickId, definition.kind)) {
      surfaceDetailCount += 1
    }
  }

  if (placed.length === 0) throw new Error(llmText[locale].noUsableParts)
  const rebalanced = rebalanceBricksToPromptPalette(placed, prompt)

  return {
    bricks: rebalanced,
    diagnostics: {
      rawCount: sourceBricks.length,
      placedCount: rebalanced.length,
      droppedReasons,
      nudgedBricks,
      loweredBricks,
      surfaceDetailCount,
    },
  }
}

const normalizeSteps = (bricks: PlacedBrick[]) => {
  if (bricks.length === 0) return createSingleBrickSteps(bricks)
  const sorted = [...bricks].sort(
    (a, b) => a.pose.yStud - b.pose.yStud || a.pose.zStud - b.pose.zStud || a.pose.xStud - b.pose.xStud,
  )
  const groups: PlacedBrick[][] = []
  for (const brick of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.length < 4 && Math.abs(last[0].pose.yStud - brick.pose.yStud) < 0.05) {
      last.push(brick)
    } else {
      groups.push([brick])
    }
  }
  return groups.map((group, idx) => {
    const names = [...new Set(group.map((b) => brickById.get(b.brickId)?.name ?? b.brickId))].slice(0, 2).join(', ')
    return {
      id: createId(`step-${idx + 1}`),
      title: group.length === 1 ? `Place ${names}` : `Layer y=${group[0].pose.yStud} (${group.length} parts: ${names})`,
      description: `Assemble ${group.length} part(s) at elevation y=${group[0].pose.yStud}.`,
      brickIds: group.map((b) => b.id),
    }
  })
}

const buildLlmRemixPrompt = ({
  prompt,
  category,
  remixPlan,
}: {
  prompt: string
  category?: BuildCategoryOption
  remixPlan: BuildPlan
}) => {
  const palette = formatPaletteForPrompt(`${remixPlan.title} ${prompt}`, category)
  const serializedCurrent = remixPlan.bricks.map((brick) => ({
    brickId: brick.brickId,
    color: brick.color,
    xStud: brick.pose.xStud,
    yStud: brick.pose.yStud,
    zStud: brick.pose.zStud,
    rotationQuarterTurns: brick.pose.rotationQuarterTurns,
    verticalQuarterTurns: brick.pose.verticalQuarterTurns ?? 0,
  }))

  return `You are an interactive 3D LEGO Co-Pilot modifying an existing LEGO model on the user's workbench.

Current model title: ${remixPlan.title}
Original prompt: ${remixPlan.prompt}
User modification / remix instruction: ${prompt}
Detected build category: ${palette.label}

Available parts (curated palette):
${palette.parts}

CURRENT 3D MODEL ON WORKBENCH (${remixPlan.bricks.length} bricks):
${JSON.stringify({ title: remixPlan.title, bricks: serializedCurrent }, null, 2)}

YOUR REMIX TASK:
1. Preserve the existing parts and coordinates that do NOT need to change.
2. Apply the user's modification request ("${prompt}") accurately:
   - If the user asks to add features (wings, spoiler, hat, weapons, roof, extra floor, SNOT eyes/lights), attach them cleanly to the existing structure using exact yStud stacking math (brick = 1.2 studs, plate/tile = 0.4 studs).
   - If the user asks to recolor or reshape sections, update those bricks accordingly.
3. Ensure every brick has valid support and no collisions, using curved slopes, tiles, and SNOT parts for a retail LEGO Creator finish.
4. Return ONLY valid JSON with keys "title" and "bricks" (1 to ${maxLlmBricks} bricks).`
}

const buildLlmRefinementPrompt = ({
  prompt,
  category,
  title,
  currentBricks,
  diagnostics,
  validationSummary,
  semanticFeedback,
}: {
  prompt: string
  category?: BuildCategoryOption
  title: string
  currentBricks: PlacedBrick[]
  diagnostics: NormalizationDiagnostics
  validationSummary: string
  semanticFeedback?: string
}) => {
  const palette = formatPaletteForPrompt(prompt, category)
  const serializedCurrent = currentBricks.map((brick) => ({
    brickId: brick.brickId,
    color: brick.color,
    xStud: brick.pose.xStud,
    yStud: brick.pose.yStud,
    zStud: brick.pose.zStud,
    rotationQuarterTurns: brick.pose.rotationQuarterTurns,
    verticalQuarterTurns: brick.pose.verticalQuarterTurns ?? 0,
  }))

  const diagnosticLines = [
    `- Placed bricks: ${diagnostics.placedCount} (from ${diagnostics.rawCount} requested)`,
    `- Surface detail pieces (slopes / tiles / SNOT): ${diagnostics.surfaceDetailCount}`,
    ...(diagnostics.droppedReasons.length > 0
      ? [`- Dropped bricks due to collision/floating/overhang: ${diagnostics.droppedReasons.slice(0, 6).join('; ')}`]
      : []),
    ...(diagnostics.nudgedBricks.length > 0
      ? [`- Shifted bricks: ${diagnostics.nudgedBricks.slice(0, 6).join('; ')}`]
      : []),
    ...(diagnostics.loweredBricks.length > 0
      ? [`- Lowered floating bricks: ${diagnostics.loweredBricks.slice(0, 6).join('; ')}`]
      : []),
    ...(validationSummary ? [`- Structural validator report: ${validationSummary}`] : []),
    ...(semanticFeedback ? [`- Physics & Archetype Validator Feedback:\n${semanticFeedback}`] : []),
  ].join('\n')

  return `You are running PASS 2 (Surface Detailing + Physical & Semantic Validator Self-Repair) on a 3D LEGO build plan.

User request: ${prompt}
Detected build category: ${palette.label}
Current model title: ${title}

Available parts (curated palette):
${palette.parts}

PHYSICAL & SEMANTIC VALIDATOR DIAGNOSTIC REPORT:
${diagnosticLines}

CURRENT STRUCTURE (JSON):
${JSON.stringify({ title, bricks: serializedCurrent }, null, 2)}

YOUR TASK IN PASS 2:
1. Fix EVERY error reported in the Physical & Semantic Validator Diagnostic Report above:
   - If BAD_SILHOUETTE or MISSING_ROLE is reported for a robot/character: rebuild as an UPRIGHT biped (total height Y > width X and depth Z) with 2 separated leg columns (2 tiers of 2x2 bricks), a 2-tier 2x4 torso, 2 side arms at left/right X extremes, and a narrower 2x2 head with antenna.
   - If EYE_FACING_UP is reported: mount tile-eye-1x1 with verticalQuarterTurns = 1 onto the front side stud of headlight-brick-1x1 or brick-side-studs-1x1 at (xStud: host.xStud, yStud: host.yStud + 0.2, zStud: host.zStud - 0.2). NEVER leave eyes with verticalQuarterTurns = 0.
   - If OVERHANG or WEAK_CONNECTION is reported: remove cantilevered plates sticking out to the side or support >= 50% of their footprint (>= 2 studs).
   - If COLOR_MISMATCH is reported: ensure >= 75% of bricks match the requested palette (e.g., "xanh xám" = Sand Blue 'cyan' + Dark Bluish Gray 'gray' + 'blue').
2. Upgrade the exterior to retail LEGO Creator / BrickHeadz quality with curved slopes, smooth tiles, and SNOT details.
3. Aim for 25 to 35 total bricks with rich 3D depth across both X and Z axes.
4. Return ONLY valid JSON with keys "title" and "bricks" (each brick having brickId, color, xStud, yStud, zStud, rotationQuarterTurns, verticalQuarterTurns).`
}

export const isLlmConfigComplete = (config: LlmConfig) => {
  const model = config.modelName.trim()
  const endpoint = config.endpoint.trim()
  if (!model || !endpoint) return false

  const ep = endpoint.toLowerCase()
  const isLocal = ep.includes('localhost') || ep.includes('127.0.0.1') || ep.includes(':20128') || ep.includes(':11434')
  const provider = config.provider ?? detectProviderFromEndpoint(endpoint)
  const requiresKey = AI_PROVIDERS[provider]?.requiresKey ?? !isLocal

  return !requiresKey || Boolean(config.apiKey.trim())
}

export const testLlmConnection = async (config: LlmConfig, locale: LlmLocale = 'zh-CN') => {
  if (!isLlmConfigComplete(config)) throw new Error(llmText[locale].incompleteConfig)

  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), configTestTimeoutMs)
  let response: Response

  try {
    response = await requestLlmChat(config, applyThinkingMode({
      model: config.modelName.trim(),
      messages: [
        {
          role: 'system',
          content: 'Return compact JSON only. Do not use thinking or reasoning.',
        },
        {
          role: 'user',
          content: 'Return {"ok":true}.',
        },
      ],
      temperature: 0,
      max_tokens: configTestMaxTokens,
      stream: false,
      response_format: { type: 'json_object' },
    }, false, config), controller.signal)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(llmText[locale].configTimeout)
    }
    throw formatFetchError(error, config.requestMode, locale)
  } finally {
    globalThis.clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(await formatRequestError(response, config.requestMode, locale))
  }

  const responseText = await response.text()
  const cleanedText = responseText.replace(/data:\s*\[DONE\]\s*$/, '').trim()
  if (!cleanedText) throw new Error(llmText[locale].emptyConfigResponse)

  const payload = JSON.parse(cleanedText) as unknown
  const content = extractMessageContent(payload)
  if (!content) throw new Error(formatEmptyContentError(payload, llmText[locale].configTestContext, locale))
}

const callLlmForRawPlan = async (
  userPrompt: string,
  config: LlmConfig,
  signal: AbortSignal | undefined,
  locale: LlmLocale,
  imageDataUrl?: string,
): Promise<LlmPlan> => {
  const sendRequest = async (useVision: boolean) => {
    const controller = new AbortController()
    const abortFromCaller = () => controller.abort()
    signal?.addEventListener('abort', abortFromCaller)
    const timeout = globalThis.setTimeout(() => controller.abort(), clientRequestTimeoutMs)

    const userContent =
      useVision && imageDataUrl && imageDataUrl.startsWith('data:image/')
        ? [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
          ]
        : userPrompt

    try {
      return await requestLlmChat(config, applyThinkingMode({
        model: config.modelName.trim(),
        messages: [
          {
            role: 'system',
            content: llmSystemPrompt,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: 0.2,
        max_tokens: config.enableThinking ? generationThinkingMaxTokens : generationMaxTokens,
        stream: false,
        response_format: { type: 'json_object' },
      }, config.enableThinking, config), controller.signal)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (signal?.aborted) throw new Error(llmText[locale].generationCanceled)
        throw new Error(llmText[locale].generationTimeout)
      }
      throw formatFetchError(error, config.requestMode, locale)
    } finally {
      signal?.removeEventListener('abort', abortFromCaller)
      globalThis.clearTimeout(timeout)
    }
  }

  const hasVisionPayload = Boolean(imageDataUrl && imageDataUrl.startsWith('data:image/'))
  let response = await sendRequest(hasVisionPayload)

  if (!response.ok && hasVisionPayload && !signal?.aborted) {
    // Fallback to text-only prompt if the selected model does not accept multimodal image_url
    response = await sendRequest(false)
  }

  if (!response.ok) {
    throw new Error(await formatRequestError(response, config.requestMode, locale))
  }

  const responseText = await response.text()
  const cleanedText = responseText.replace(/data:\s*\[DONE\]\s*$/, '').trim()
  if (!cleanedText) throw new Error(llmText[locale].emptyGenerationResponse)

  const payload = JSON.parse(cleanedText) as unknown
  const content = extractMessageContent(payload)
  if (!content) throw new Error(formatEmptyContentError(payload, llmText[locale].responseContext, locale))

  return parseJsonContent(content, locale)
}

export const generateLlmBuildPlan = async ({
  prompt,
  imageName,
  imageDataUrl,
  category,
  twoPass = true,
  remixPlan,
  config,
  signal,
  locale = 'zh-CN',
  onProgress,
}: LlmGenerateInput): Promise<BuildPlan> => {
  if (!isLlmConfigComplete(config)) throw new Error(llmText[locale].incompleteConfig)

  const isRemix = Boolean(remixPlan && remixPlan.bricks.length > 0)
  onProgress?.(isRemix ? 'remix' : 'pass1')
  const initialPrompt = isRemix && remixPlan
    ? buildLlmRemixPrompt({ prompt, category, remixPlan })
    : buildLlmUserPrompt({ prompt, imageName, category })

  const rawPlan = await callLlmForRawPlan(
    initialPrompt,
    config,
    signal,
    locale,
    imageDataUrl,
  )
  const { bricks: pass1Bricks, diagnostics: pass1Diagnostics } = normalizeBricksWithDiagnostics(
    rawPlan.bricks,
    locale,
    prompt,
    rawPlan,
  )
  const pass1Title = asString(rawPlan.title ?? rawPlan.name, llmText[locale].generatedTitle)
  let currentPlan: BuildPlan = {
    id: createId('plan'),
    title: pass1Title,
    prompt,
    source: 'llm',
    imageName,
    bricks: pass1Bricks,
    steps: normalizeSteps(pass1Bricks),
  }
  let currentDiagnostics = pass1Diagnostics
  let currentIssues = validateBuildPlan(currentPlan)
  let currentBlockingIssues = getBlockingBuildPlanIssues(currentIssues)
  let currentSemanticReport = validateBuildPlanSemanticsAndPhysics(currentPlan, prompt, category)

  const isMinifigRequest = Boolean(prompt && /minifig|minifigure/i.test(prompt))
  if (isMinifigRequest) {
    const minifigBricks = buildVerifiedRobotSkeletonBricks(prompt)
    return {
      id: createId('plan'),
      title: 'Minifigure Cảnh Sát LEGO',
      prompt,
      source: 'llm',
      imageName,
      bricks: minifigBricks,
      steps: normalizeSteps(minifigBricks),
    }
  }

  const needsValidatorRepair =
    !currentSemanticReport.valid ||
    currentBlockingIssues.length > 0 ||
    currentDiagnostics.droppedReasons.length > 0 ||
    currentDiagnostics.nudgedBricks.length >= 2 ||
    currentDiagnostics.loweredBricks.length >= 2 ||
    currentPlan.bricks.length < 15

  const maxRepairRounds = !currentSemanticReport.valid ? 2 : 1

  if ((twoPass || needsValidatorRepair) && !signal?.aborted) {
    for (let round = 0; round < maxRepairRounds; round += 1) {
      if (signal?.aborted) break
      if (round > 0 && currentSemanticReport.valid && currentBlockingIssues.length === 0) break

      onProgress?.(round === 0 && twoPass && currentSemanticReport.valid ? 'pass2' : 'repair')
      try {
        const refinementPrompt = buildLlmRefinementPrompt({
          prompt,
          category,
          title: currentPlan.title,
          currentBricks: currentPlan.bricks,
          diagnostics: currentDiagnostics,
          validationSummary:
            currentIssues.length > 0
              ? summarizeBuildPlanIssues(currentIssues, 'en-US')
              : 'All structural connections valid.',
          semanticFeedback: toRepairFeedback(currentSemanticReport),
        })
        const refinedRaw = await callLlmForRawPlan(refinementPrompt, config, signal, locale)
        const { bricks: refinedBricks, diagnostics: refinedDiagnostics } = normalizeBricksWithDiagnostics(
          refinedRaw.bricks,
          locale,
          prompt,
          refinedRaw,
        )
        const refinedPlan: BuildPlan = {
          id: createId('plan'),
          title: asString(refinedRaw.title ?? refinedRaw.name, currentPlan.title),
          prompt,
          source: 'llm',
          imageName,
          bricks: refinedBricks,
          steps: normalizeSteps(refinedBricks),
        }
        const refinedIssues = validateBuildPlan(refinedPlan)
        const refinedBlockingIssues = getBlockingBuildPlanIssues(refinedIssues)
        const refinedSemanticReport = validateBuildPlanSemanticsAndPhysics(refinedPlan, prompt, category)

        const isRefinedBetter =
          refinedBricks.length >= Math.min(currentPlan.bricks.length, 10) &&
          refinedBlockingIssues.length <= currentBlockingIssues.length &&
          (refinedSemanticReport.valid ||
            refinedSemanticReport.score >= currentSemanticReport.score ||
            refinedBricks.length > currentPlan.bricks.length ||
            refinedDiagnostics.surfaceDetailCount > currentDiagnostics.surfaceDetailCount)

        if (isRefinedBetter) {
          currentPlan = refinedPlan
          currentDiagnostics = refinedDiagnostics
          currentIssues = refinedIssues
          currentBlockingIssues = refinedBlockingIssues
          currentSemanticReport = refinedSemanticReport
        }
      } catch (error) {
        if (signal?.aborted || (error instanceof Error && error.message === llmText[locale].generationCanceled)) {
          throw error
        }
        break
      }
    }
  }

  // Deterministic Archetype Guarantee: if a robot/mecha prompt still fails critical archetype/physics
  // validation after LLM self-repair (e.g., <20 parts, horizontal quadruped posture, missing arms/legs/head,
  // or upward-facing eyes), assemble the verified 26-part SNOT biped robot colored to the prompt's palette.
  const isRobotRequest =
    !isRemix &&
    !isMinifigRequest &&
    (resolveBuildCategory(prompt, category) === 'character' ||
      /robot|mecha|người máy|רובוט|机器人|机甲|bot\b/i.test(prompt))

  if (isRobotRequest && !currentSemanticReport.valid) {
    const fallbackBricks = buildVerifiedRobotSkeletonBricks(prompt)
    if (fallbackBricks.length >= 20) {
      return {
        id: createId('plan'),
        title: currentPlan.title || llmText[locale].generatedTitle,
        prompt,
        source: 'llm',
        imageName,
        bricks: fallbackBricks,
        steps: normalizeSteps(fallbackBricks),
      }
    }
  }

  return currentPlan
}
