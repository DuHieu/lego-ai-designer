import { brickById } from '../data/basicBricks'
import type { BrickColor, BrickPose, BuildPlan, PlacedBrick } from '../types/bricks'
import { footprintToWorld } from './brickUnits'
import { createSingleBrickSteps, getBlockingBuildPlanIssues, summarizeBuildPlanIssues, validateBuildPlan } from './planUtils'

type ManualLocale = 'zh-CN' | 'en-US' | 'vi-VN'

const manualText: Record<ManualLocale, {
  lang: string
  titleSuffix: string
  source: string
  prompt: string
  none: string
  structureCheck: string
  totalPieces: string
  totalPages: string
  inventory: string
  addedParts: string
  horizontal: string
  vertical: string
  newPieceCaption: string
  sourceTemplateLocal: string
  sourceLlm: string
  pageTitle: (page: number, title: string) => string
  stepCount: (added: number, total: number) => string
  placeTitle: (name: string) => string
  placeDescription: (index: number, name: string) => string
  diagramAria: (page: number) => string
}> = {
  'zh-CN': {
    lang: 'zh-CN',
    titleSuffix: '搭建手册',
    source: '来源',
    prompt: '提示词',
    none: '无',
    structureCheck: '结构校验',
    totalPieces: '总零件',
    totalPages: '总页数',
    inventory: '总零件清单',
    addedParts: '新增零件',
    horizontal: '水平',
    vertical: '垂直',
    newPieceCaption: '橙色描边为本步新增零件',
    sourceTemplateLocal: '本地模板',
    sourceLlm: 'LLM 生成',
    pageTitle: (page, title) => `第 ${page} 页 · ${title}`,
    stepCount: (added, total) => `本步新增 ${added} 个，完成后累计 ${total} 个。`,
    placeTitle: (name) => `放置 ${name}`,
    placeDescription: (index, name) => `放置第 ${index + 1} 个零件：${name}。`,
    diagramAria: (page) => `第 ${page} 页等距示意图`,
  },
  'en-US': {
    lang: 'en-US',
    titleSuffix: 'Build Manual',
    source: 'Source',
    prompt: 'Prompt',
    none: 'none',
    structureCheck: 'Structure check',
    totalPieces: 'Total parts',
    totalPages: 'Total pages',
    inventory: 'Inventory',
    addedParts: 'Added parts',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
    newPieceCaption: 'Orange outline marks the new part in this step',
    sourceTemplateLocal: 'Local template',
    sourceLlm: 'LLM generated',
    pageTitle: (page, title) => `Page ${page} · ${title}`,
    stepCount: (added, total) => `${added} added, ${total} total after this step.`,
    placeTitle: (name) => `Place ${name}`,
    placeDescription: (index, name) => `Place part ${index + 1}: ${name}.`,
    diagramAria: (page) => `Isometric diagram for page ${page}`,
  },
  'vi-VN': {
    lang: 'vi-VN',
    titleSuffix: 'Hướng dẫn lắp ráp',
    source: 'Nguồn',
    prompt: 'Yêu cầu',
    none: 'Không có',
    structureCheck: 'Kiểm tra kết cấu',
    totalPieces: 'Tổng số chi tiết',
    totalPages: 'Tổng số bước',
    inventory: 'Danh mục chi tiết',
    addedParts: 'Chi tiết thêm mới',
    horizontal: 'Ngang',
    vertical: 'Dọc',
    newPieceCaption: 'Viền cam là chi tiết mới thêm trong bước này',
    sourceTemplateLocal: 'Mẫu có sẵn',
    sourceLlm: 'AI thiết kế',
    pageTitle: (page, title) => `Bước ${page} · ${title}`,
    stepCount: (added, total) => `Bước này thêm ${added} chi tiết, hoàn thành ${total} chi tiết.`,
    placeTitle: (name) => `Lắp ${name}`,
    placeDescription: (index, name) => `Đặt chi tiết thứ ${index + 1}: ${name}.`,
    diagramAria: (page) => `Sơ đồ hình chiếu trục đo bước ${page}`,
  },
}

const formatManualSource = (source: BuildPlan['source'], locale: ManualLocale) =>
  source === 'llm' ? manualText[locale].sourceLlm : manualText[locale].sourceTemplateLocal

export type ManualPartCount = {
  key: string
  brickId: string
  name: string
  color: BrickColor
  quantity: number
}

export type ManualPiece = {
  instanceId: string
  brickId: string
  name: string
  color: BrickColor
  pose: BrickPose
  footprint: {
    widthStuds: number
    depthStuds: number
    heightStuds: number
  }
  rotationDegrees: number
  verticalRotationDegrees: number
}

export type ManualStepPage = {
  stepNumber: number
  title: string
  description: string
  addPieces: ManualPiece[]
  stepInventory: ManualPartCount[]
  cumulativePieceIds: string[]
  cumulativePieces: ManualPiece[]
  validation: {
    ok: boolean
    issueCount: number
    blockingIssueCount: number
    warningIssueCount: number
    summary: string
  }
}

export type BuildManual = {
  schemaVersion: 3
  planId: string
  title: string
  prompt: string
  source: BuildPlan['source']
  validation: {
    ok: boolean
    issueCount: number
    blockingIssueCount: number
    warningIssueCount: number
    summary: string
  }
  totalPieces: number
  totalSteps: number
  inventory: ManualPartCount[]
  steps: ManualStepPage[]
}

const countPieces = (pieces: ManualPiece[]): ManualPartCount[] => {
  const counts = new Map<string, ManualPartCount>()

  for (const piece of pieces) {
    const key = `${piece.brickId}:${piece.color}`
    const current = counts.get(key)
    if (current) {
      current.quantity += 1
    } else {
      counts.set(key, {
        key,
        brickId: piece.brickId,
        name: piece.name,
        color: piece.color,
        quantity: 1,
      })
    }
  }

  return [...counts.values()].sort((source, target) =>
    source.name.localeCompare(target.name) || source.color.localeCompare(target.color),
  )
}

const toManualPiece = (brick: BuildPlan['bricks'][number]): ManualPiece => {
  const definition = brickById.get(brick.brickId)
  const footprint = definition
    ? footprintToWorld(definition, brick.pose.rotationQuarterTurns, brick.pose.verticalQuarterTurns ?? 0)
    : undefined

  return {
    instanceId: brick.id,
    brickId: brick.brickId,
    name: definition?.name ?? brick.brickId,
    color: brick.color,
    pose: { ...brick.pose },
    footprint: {
      widthStuds: footprint?.widthStuds ?? 1,
      depthStuds: footprint?.depthStuds ?? 1,
      heightStuds: footprint?.height ?? 0.4,
    },
    rotationDegrees: brick.pose.rotationQuarterTurns * 90,
    verticalRotationDegrees: (brick.pose.verticalQuarterTurns ?? 0) * 90,
  }
}

const makeCumulativePlan = (plan: BuildPlan, bricks: PlacedBrick[]): BuildPlan => ({
  ...plan,
  bricks,
  steps: createSingleBrickSteps(bricks),
})

const validateCumulativePlan = (plan: BuildPlan, bricks: PlacedBrick[], locale: ManualLocale) => {
  const issues = validateBuildPlan(makeCumulativePlan(plan, bricks))
  const blockingIssues = getBlockingBuildPlanIssues(issues)

  return {
    ok: blockingIssues.length === 0,
    issueCount: issues.length,
    blockingIssueCount: blockingIssues.length,
    warningIssueCount: issues.length - blockingIssues.length,
    summary: issues.length > 0 ? summarizeBuildPlanIssues(issues, locale) : summarizeBuildPlanIssues([], locale),
  }
}

const sortBuildCandidates = (source: PlacedBrick, target: PlacedBrick) =>
  source.pose.yStud - target.pose.yStud ||
  source.pose.zStud - target.pose.zStud ||
  source.pose.xStud - target.pose.xStud ||
  source.id.localeCompare(target.id)

const sequenceBricksForManual = (plan: BuildPlan, locale: ManualLocale) => {
  const orderedByPlan: Array<{
    brick: PlacedBrick
    validation: ManualStepPage['validation']
  }> = []
  const planOrderCumulative: PlacedBrick[] = []

  for (const brick of plan.bricks) {
    planOrderCumulative.push(brick)
    const validation = validateCumulativePlan(plan, planOrderCumulative, locale)
    if (!validation.ok) {
      orderedByPlan.length = 0
      break
    }

    orderedByPlan.push({ brick, validation })
  }

  if (orderedByPlan.length === plan.bricks.length) return orderedByPlan

  const remaining = [...plan.bricks].sort(sortBuildCandidates)
  const ordered: Array<{
    brick: PlacedBrick
    validation: ManualStepPage['validation']
  }> = []
  const cumulative: PlacedBrick[] = []

  while (remaining.length > 0) {
    let selectedIndex = -1
    let selectedValidation: ManualStepPage['validation'] | undefined

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index]
      const validation = validateCumulativePlan(plan, [...cumulative, candidate], locale)
      if (!validation.ok) continue

      selectedIndex = index
      selectedValidation = validation
      break
    }

    if (selectedIndex === -1) {
      selectedIndex = 0
      selectedValidation = validateCumulativePlan(plan, [...cumulative, remaining[0]], locale)
    }

    const [brick] = remaining.splice(selectedIndex, 1)
    cumulative.push(brick)
    ordered.push({
      brick,
      validation: selectedValidation ?? validateCumulativePlan(plan, cumulative, locale),
    })
  }

  return ordered
}

export const serializeBuildManual = (plan: BuildPlan, locale: ManualLocale = 'zh-CN'): BuildManual => {
  const labels = manualText[locale]
  const cumulativePieceIds = new Set<string>()
  const cumulativePieces: ManualPiece[] = []

  const steps: ManualStepPage[] = sequenceBricksForManual(plan, locale).map(({ brick, validation }, index) => {
    const piece = toManualPiece(brick)
    const addPieces = [piece]

    cumulativePieceIds.add(piece.instanceId)
    cumulativePieces.push(piece)

    return {
      stepNumber: index + 1,
      title: labels.placeTitle(piece.name),
      description: labels.placeDescription(index, piece.name),
      addPieces,
      stepInventory: countPieces(addPieces),
      cumulativePieceIds: [...cumulativePieceIds],
      cumulativePieces: [...cumulativePieces],
      validation,
    }
  })

  const allPieces = plan.bricks.map(toManualPiece)
  const issues = validateBuildPlan(plan)
  const blockingIssues = getBlockingBuildPlanIssues(issues)

  return {
    schemaVersion: 3,
    planId: plan.id,
    title: plan.title,
    prompt: plan.prompt,
    source: plan.source,
    validation: {
      ok: blockingIssues.length === 0,
      issueCount: issues.length,
      blockingIssueCount: blockingIssues.length,
      warningIssueCount: issues.length - blockingIssues.length,
      summary: issues.length > 0 ? summarizeBuildPlanIssues(issues, locale) : summarizeBuildPlanIssues([], locale),
    },
    totalPieces: plan.bricks.length,
    totalSteps: steps.length,
    inventory: countPieces(allPieces),
    steps,
  }
}

export const formatBuildManualMarkdown = (manual: BuildManual, locale: ManualLocale = 'zh-CN') => {
  const labels = manualText[locale]
  const lines = [
    `# ${manual.title} ${labels.titleSuffix}`,
    '',
    `- ${labels.source}: ${formatManualSource(manual.source, locale)}`,
    `- ${labels.prompt}: ${manual.prompt || labels.none}`,
    `- ${labels.structureCheck}: ${manual.validation.summary}`,
    `- ${labels.totalPieces}: ${manual.totalPieces}`,
    `- ${labels.totalPages}: ${manual.totalSteps}`,
    '',
    `## ${labels.inventory}`,
    ...manual.inventory.map((item) => `- ${item.name} (${item.brickId}) · ${item.color} × ${item.quantity}`),
    '',
  ]

  for (const step of manual.steps) {
    lines.push(`## ${labels.pageTitle(step.stepNumber, step.title)}`)
    lines.push(step.description)
    lines.push('')
    lines.push(`${labels.structureCheck}: ${step.validation.summary}`)
    lines.push('')
    lines.push(labels.stepCount(step.addPieces.length, step.cumulativePieces.length))
    lines.push('')
    lines.push(`### ${labels.addedParts}`)
    for (const piece of step.addPieces) {
      lines.push(
        `- ${piece.name} (${piece.brickId}) · ${piece.color} · x${piece.pose.xStud} y${piece.pose.yStud} z${piece.pose.zStud} · ${labels.horizontal} ${piece.rotationDegrees}° · ${labels.vertical} ${piece.verticalRotationDegrees}°`,
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

const escapeHtml = (value: string | number) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const manualColorHex: Record<BrickColor, string> = {
  red: '#ef4444',
  blue: '#2563eb',
  yellow: '#facc15',
  green: '#16a34a',
  white: '#f8fafc',
  black: '#111827',
  gray: '#94a3b8',
  brown: '#92400e',
  orange: '#f97316',
  tan: '#c4a46d',
  cyan: '#06b6d4',
  lime: '#84cc16',
  pink: '#ec4899',
  'trans-pink': '#f5a3c7',
}

const getPlanFootprint = (piece: ManualPiece) => {
  return {
    widthStuds: piece.footprint.widthStuds,
    depthStuds: piece.footprint.depthStuds,
  }
}

type DiagramPoint = {
  x: number
  y: number
}

type DiagramCuboid = {
  piece: ManualPiece
  isNew: boolean
  top: DiagramPoint[]
  right: DiagramPoint[]
  front: DiagramPoint[]
}

const pointList = (points: DiagramPoint[]) => points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')

const renderStepDiagram = (step: ManualStepPage, locale: ManualLocale) => {
  const labels = manualText[locale]
  if (step.cumulativePieces.length === 0) return ''

  const studX = 34
  const studZ = 17
  const heightScale = 7
  const padding = 32
  const newPieceIds = new Set(step.addPieces.map((piece) => piece.instanceId))

  const project = (xStud: number, zStud: number, yStud: number): DiagramPoint => ({
    x: (xStud - zStud) * studX,
    y: (xStud + zStud) * studZ - yStud * heightScale,
  })

  const cuboids: DiagramCuboid[] = [...step.cumulativePieces]
    .sort((source, target) =>
      (source.pose.xStud + source.pose.zStud + source.pose.yStud) -
      (target.pose.xStud + target.pose.zStud + target.pose.yStud),
    )
    .map((piece) => {
      const footprint = getPlanFootprint(piece)
      const x = piece.pose.xStud
      const y = piece.pose.yStud
      const z = piece.pose.zStud
      const width = footprint.widthStuds
      const depth = footprint.depthStuds
      const height = piece.footprint.heightStuds
      const isNew = newPieceIds.has(piece.instanceId)

      return {
        piece,
        isNew,
        top: [
          project(x, z, y + height),
          project(x + width, z, y + height),
          project(x + width, z + depth, y + height),
          project(x, z + depth, y + height),
        ],
        right: [
          project(x + width, z, y + height),
          project(x + width, z, y),
          project(x + width, z + depth, y),
          project(x + width, z + depth, y + height),
        ],
        front: [
          project(x, z + depth, y + height),
          project(x + width, z + depth, y + height),
          project(x + width, z + depth, y),
          project(x, z + depth, y),
        ],
      }
    })
  const projectedPoints = cuboids.flatMap((cuboid) => [...cuboid.top, ...cuboid.right, ...cuboid.front])
  const minX = Math.min(...projectedPoints.map((point) => point.x))
  const minY = Math.min(...projectedPoints.map((point) => point.y))
  const maxX = Math.max(...projectedPoints.map((point) => point.x))
  const maxY = Math.max(...projectedPoints.map((point) => point.y))
  const translateX = padding - minX
  const translateY = padding - minY
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2
  const pieces = cuboids
    .map((cuboid) => {
      const stroke = cuboid.isNew ? '#f97316' : '#334155'
      const strokeWidth = cuboid.isNew ? 4 : 1.2
      const color = manualColorHex[cuboid.piece.color]

      return `<g transform="translate(${translateX.toFixed(1)} ${translateY.toFixed(1)})">
          <title>${escapeHtml(cuboid.piece.name)} · ${escapeHtml(cuboid.piece.color)} · x${cuboid.piece.pose.xStud} y${cuboid.piece.pose.yStud} z${cuboid.piece.pose.zStud}</title>
          <polygon points="${pointList(cuboid.right)}" fill="${color}" fill-opacity="0.72" stroke="${stroke}" stroke-width="${strokeWidth}" />
          <polygon points="${pointList(cuboid.front)}" fill="${color}" fill-opacity="0.86" stroke="${stroke}" stroke-width="${strokeWidth}" />
          <polygon points="${pointList(cuboid.top)}" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" />
        </g>`
    })
    .join('\n        ')

  return `<figure class="diagram">
      <svg viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}" role="img" aria-label="${escapeHtml(labels.diagramAria(step.stepNumber))}">
        <rect width="${width}" height="${height}" rx="10" fill="#f8fafc" />
        ${pieces}
      </svg>
      <figcaption>${escapeHtml(labels.newPieceCaption)}</figcaption>
    </figure>`
}

export const formatBuildManualHtml = (manual: BuildManual, locale: ManualLocale = 'zh-CN') => {
  const labels = manualText[locale]

  return `<!doctype html>
<html lang="${labels.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(manual.title)} ${escapeHtml(labels.titleSuffix)}</title>
  <style>
    body { margin: 0; color: #172033; background: #f1f5f9; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 920px; margin: 0 auto; padding: 28px; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 30px; line-height: 1.15; }
    .meta, .step p, li small { color: #64748b; }
    .panel, .step { margin-top: 16px; padding: 16px; border: 1px solid #d8e0ea; border-radius: 8px; background: #fff; }
    .status { display: inline-block; margin-top: 10px; padding: 7px 10px; border-radius: 8px; background: ${manual.validation.ok ? (manual.validation.issueCount > 0 ? '#fef3c7' : '#dcfce7') : '#fee2e2'}; color: ${manual.validation.ok ? (manual.validation.issueCount > 0 ? '#92400e' : '#166534') : '#991b1b'}; font-weight: 750; }
    .step-status { display: inline-block; margin-top: 8px; padding: 5px 8px; border-radius: 7px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 750; }
    .step-status.notice { background: #fef3c7; color: #92400e; }
    .step-status.warn { background: #fee2e2; color: #991b1b; }
    ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; padding: 0; list-style: none; }
    li { padding: 10px; border: 1px solid #d8e0ea; border-radius: 7px; background: #f8fafc; }
    .step h2 { margin-bottom: 6px; font-size: 18px; }
    .count { margin-top: 10px; color: #475569; font-weight: 750; }
    .diagram { margin: 14px 0 0; }
    .diagram svg { display: block; width: 100%; max-height: 420px; border: 1px solid #d8e0ea; border-radius: 8px; background: #f8fafc; }
    .diagram figcaption { margin-top: 6px; color: #64748b; font-size: 12px; }
    .grid line { stroke: #d8e0ea; stroke-width: 1; }
    @media print { body { background: #fff; } main { padding: 0; } .step { break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(manual.title)} ${escapeHtml(labels.titleSuffix)}</h1>
    <p class="meta">${escapeHtml(labels.source)}: ${escapeHtml(formatManualSource(manual.source, locale))} · ${escapeHtml(labels.prompt)}: ${escapeHtml(manual.prompt || labels.none)} · ${escapeHtml(labels.totalPieces)}: ${manual.totalPieces} · ${escapeHtml(labels.totalPages)}: ${manual.totalSteps}</p>
    <p class="status">${escapeHtml(manual.validation.summary)}</p>
    <section class="panel">
      <h2>${escapeHtml(labels.inventory)}</h2>
      <ul>
        ${manual.inventory.map((item) => `<li><strong>${escapeHtml(item.name)}</strong><br /><small>${escapeHtml(item.brickId)} · ${escapeHtml(item.color)} × ${item.quantity}</small></li>`).join('\n        ')}
      </ul>
    </section>
    ${manual.steps.map((step) => `<section class="step">
      <h2>${escapeHtml(labels.pageTitle(step.stepNumber, step.title))}</h2>
      <p>${escapeHtml(step.description)}</p>
      <p class="step-status${step.validation.ok ? (step.validation.issueCount > 0 ? ' notice' : '') : ' warn'}">${escapeHtml(step.validation.summary)}</p>
      <p class="count">${escapeHtml(labels.stepCount(step.addPieces.length, step.cumulativePieces.length))}</p>
      ${renderStepDiagram(step, locale)}
      <ul>
        ${step.addPieces.map((piece) => `<li><strong>${escapeHtml(piece.name)}</strong><br /><small>${escapeHtml(piece.brickId)} · ${escapeHtml(piece.color)} · x${piece.pose.xStud} y${piece.pose.yStud} z${piece.pose.zStud} · ${escapeHtml(labels.horizontal)} ${piece.rotationDegrees}° · ${escapeHtml(labels.vertical)} ${piece.verticalRotationDegrees}°</small></li>`).join('\n        ')}
      </ul>
    </section>`).join('\n    ')}
  </main>
</body>
</html>`
}

const colorToLDrawCode: Record<string, number> = {
  black: 0,
  blue: 1,
  green: 2,
  red: 4,
  brown: 6,
  gray: 72,
  pink: 13,
  yellow: 14,
  white: 15,
  tan: 19,
  orange: 25,
  lime: 27,
  cyan: 322,
  'trans-pink': 44,
}

export const formatBuildManualLDraw = (manual: BuildManual): string => {
  const safeName = (manual.title || 'lego-model').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const lines: string[] = [
    `0 ${manual.title || 'LEGO Model'}`,
    `0 Name: ${safeName}.ldr`,
    `0 Author: LEGO AI Designer`,
    `0 !LICENSE MIT License`,
    `0 !HELP Step-by-step instructions generated with LEGO AI Designer`,
    `0 BFC CERTIFY CCW`,
    '',
  ]

  manual.steps.forEach((step, stepIndex) => {
    lines.push(`0 // ==========================================`)
    lines.push(`0 // STEP ${step.stepNumber}: ${step.title}`)
    lines.push(`0 // Description: ${step.description}`)
    lines.push(`0 // ==========================================`)

    step.addPieces.forEach((piece) => {
      const def = brickById.get(piece.brickId)
      const partNumber = def?.partNumber || piece.brickId
      const partFile = partNumber.endsWith('.dat') ? partNumber : `${partNumber}.dat`
      const colorCode = colorToLDrawCode[piece.color] ?? 16

      // Coordinates in LDraw LDU units (1 stud = 20 LDU, Y inverted)
      const xLdu = piece.pose.xStud * 20
      const yLdu = -piece.pose.yStud * 24
      const zLdu = piece.pose.zStud * 20

      // Rotation matrix based on rotationQuarterTurns (0: 0°, 1: 90°, 2: 180°, 3: 270°)
      const rot = (piece.pose.rotationQuarterTurns || 0) % 4
      let r11 = 1, r12 = 0, r13 = 0
      const r21 = 0, r22 = 1, r23 = 0
      let r31 = 0, r32 = 0, r33 = 1

      if (rot === 1) {
        r11 = 0; r12 = 0; r13 = 1
        r31 = -1; r32 = 0; r33 = 0
      } else if (rot === 2) {
        r11 = -1; r12 = 0; r13 = 0
        r31 = 0; r32 = 0; r33 = -1
      } else if (rot === 3) {
        r11 = 0; r12 = 0; r13 = -1
        r31 = 1; r32 = 0; r33 = 0
      }

      lines.push(`1 ${colorCode} ${xLdu} ${yLdu} ${zLdu} ${r11} ${r12} ${r13} ${r21} ${r22} ${r23} ${r31} ${r32} ${r33} ${partFile}`)
    })

    if (stepIndex < manual.steps.length - 1) {
      lines.push('0 STEP')
      lines.push('')
    }
  })

  return lines.join('\n')
}
