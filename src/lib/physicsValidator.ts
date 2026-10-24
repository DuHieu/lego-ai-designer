// LEGO physics + semantic validator for AI-generated models.
// Zero external dependencies. Output is designed to be fed back to the LLM for self-repair.
//
// Coordinate system (standalone Model):
//   x, z : stud units (integer), z- = FRONT of the model
//   y    : plate units (integer), 0 = ground/baseplate. Brick = 3 plates.
//   rot  : 0 | 90 | 180 | 270 around Y. 90/270 swap width/depth.
//   orientation: "up" (studs up, default) | "front" (SNOT, studs face z-)

import { brickById } from '../data/basicBricks'
import { PLATE_HEIGHT_WORLD, footprintToWorld } from './brickUnits'
import { getBrickBounds } from './planUtils'
import { resolveBuildCategory } from './promptPalette'
import type { BrickColor, BuildCategoryOption, BuildPlan, PlacedBrick } from '../types/bricks'

export type Orientation = 'up' | 'front' | '+Z' | '-Z' | '+X' | '-X'

export interface Part {
  id: string
  partNum: string
  color: string
  role?: string // head | torso | arm | arms | leg | legs | eye | antenna | detail ...
  x: number
  y: number
  z: number
  rot?: 0 | 90 | 180 | 270
  orientation?: Orientation
  attachedTo?: string // required for sideways SNOT parts: id of host part
}

export interface Model {
  name: string
  archetype?: string // robot | animal | vehicle | building | generic
  palette?: string[] // allowed main colors resolved from the user prompt
  parts: Part[]
}

interface PartDef {
  name: string
  w: number
  d: number
  h: number
  topStuds: boolean
  sideStuds?: boolean
}

export const PART_LIBRARY: Record<string, PartDef> = {
  '3005': { name: '1x1 Brick', w: 1, d: 1, h: 3, topStuds: true },
  '3004': { name: '1x2 Brick', w: 2, d: 1, h: 3, topStuds: true },
  '3622': { name: '1x3 Brick', w: 3, d: 1, h: 3, topStuds: true },
  '3010': { name: '1x4 Brick', w: 4, d: 1, h: 3, topStuds: true },
  '3009': { name: '1x6 Brick', w: 6, d: 1, h: 3, topStuds: true },
  '3003': { name: '2x2 Brick', w: 2, d: 2, h: 3, topStuds: true },
  '3002': { name: '2x3 Brick', w: 3, d: 2, h: 3, topStuds: true },
  '3001': { name: '2x4 Brick', w: 4, d: 2, h: 3, topStuds: true },
  '3024': { name: '1x1 Plate', w: 1, d: 1, h: 1, topStuds: true },
  '3023': { name: '1x2 Plate', w: 2, d: 1, h: 1, topStuds: true },
  '3623': { name: '1x3 Plate', w: 3, d: 1, h: 1, topStuds: true },
  '3710': { name: '1x4 Plate', w: 4, d: 1, h: 1, topStuds: true },
  '3666': { name: '1x6 Plate', w: 6, d: 1, h: 1, topStuds: true },
  '3022': { name: '2x2 Plate', w: 2, d: 2, h: 1, topStuds: true },
  '3021': { name: '2x3 Plate', w: 3, d: 2, h: 1, topStuds: true },
  '3020': { name: '2x4 Plate', w: 4, d: 2, h: 1, topStuds: true },
  '3795': { name: '2x6 Plate', w: 6, d: 2, h: 1, topStuds: true },
  '3031': { name: '4x4 Plate', w: 4, d: 4, h: 1, topStuds: true },
  '3032': { name: '4x6 Plate', w: 6, d: 4, h: 1, topStuds: true },
  '3036': { name: '6x8 Plate', w: 8, d: 6, h: 1, topStuds: true },
  '3070': { name: '1x1 Tile', w: 1, d: 1, h: 1, topStuds: false },
  '3069': { name: '1x2 Tile', w: 2, d: 1, h: 1, topStuds: false },
  '2412': { name: '1x2 Grille Tile', w: 2, d: 1, h: 1, topStuds: false },
  '63864': { name: '1x3 Tile', w: 3, d: 1, h: 1, topStuds: false },
  '2431': { name: '1x4 Tile', w: 4, d: 1, h: 1, topStuds: false },
  '3068': { name: '2x2 Tile', w: 2, d: 2, h: 1, topStuds: false },
  '87079': { name: '2x4 Tile', w: 4, d: 2, h: 1, topStuds: false },
  '98138': { name: '1x1 Round Eye Tile', w: 1, d: 1, h: 1, topStuds: false },
  '4073': { name: '1x1 Round Plate', w: 1, d: 1, h: 1, topStuds: true },
  '3062': { name: '1x1 Round Brick', w: 1, d: 1, h: 3, topStuds: true },
  '54200': { name: '1x1 Cheese Slope', w: 1, d: 1, h: 2, topStuds: false },
  '3040': { name: '1x2 Slope 45', w: 2, d: 1, h: 3, topStuds: true },
  '3039': { name: '2x2 Slope 45', w: 2, d: 2, h: 3, topStuds: false },
  '3037': { name: '2x4 Slope 45', w: 4, d: 2, h: 3, topStuds: true },
  '11477': { name: '1x2 Curved Slope', w: 2, d: 1, h: 2, topStuds: false },
  '50950': { name: '1x3 Curved Slope', w: 3, d: 1, h: 3, topStuds: false },
  '93273': { name: '2x3 Curved Slope', w: 3, d: 2, h: 3, topStuds: false },
  '4070': { name: '1x1 Headlight Brick', w: 1, d: 1, h: 3, topStuds: true, sideStuds: true },
  '87087': { name: '1x1 Brick Stud on Side', w: 1, d: 1, h: 3, topStuds: true, sideStuds: true },
  '11211': { name: '1x2 Brick Studs on Side', w: 2, d: 1, h: 3, topStuds: true, sideStuds: true },
  '30414': { name: '1x4 Brick Studs on Side', w: 4, d: 1, h: 3, topStuds: true, sideStuds: true },
  '44728': { name: '1x2-2x2 Bracket', w: 2, d: 1, h: 1, topStuds: true, sideStuds: true },
}

// Required body parts per archetype (by `role`).
export const ARCHETYPES: Record<string, { required: Record<string, number>; minParts: number }> = {
  robot: { required: { head: 1, torso: 1, arm: 2, leg: 2, eye: 2 }, minParts: 20 },
  animal: { required: { head: 1, torso: 1, leg: 4 }, minParts: 15 },
  vehicle: { required: { body: 1, wheel: 4 }, minParts: 15 },
  generic: { required: {}, minParts: 5 },
}

export interface Issue {
  code: string
  severity: 'error' | 'warning'
  partIds: string[]
  message: string
  fix: string
}

export interface Report {
  valid: boolean
  score: number // 0-100
  stats: { parts: number; grounded: number; paletteRatio: number }
  issues: Issue[]
}

interface Placed {
  p: Part
  def: PartDef
  w: number
  d: number
  cells: string[]
}

const key = (x: number, z: number) => `${x},${z}`

function place(p: Part, def: PartDef): Placed {
  const swap = p.rot === 90 || p.rot === 270
  const w = swap ? def.d : def.w
  const d = swap ? def.w : def.d
  const cells: string[] = []
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      cells.push(key(p.x + i, p.z + j))
    }
  }
  return { p, def, w, d, cells }
}

export function validate(model: Model): Report {
  const issues: Issue[] = []
  const add = (i: Issue) => issues.push(i)
  const placed: Placed[] = []
  const byId = new Map<string, Placed>()

  // 1. Schema / library check
  for (const p of model.parts) {
    const def = PART_LIBRARY[p.partNum]
    if (!def) {
      add({
        code: 'UNKNOWN_PART',
        severity: 'error',
        partIds: [p.id],
        message: `Part ${p.partNum} is not in the library.`,
        fix: `Replace with a part from the allowed list.`,
      })
      continue
    }
    if (![p.x, p.y, p.z].every(Number.isInteger) || p.y < 0) {
      add({
        code: 'BAD_COORD',
        severity: 'error',
        partIds: [p.id],
        message: `Coordinates must be integers and y >= 0.`,
        fix: `Snap to the stud/plate grid.`,
      })
      continue
    }
    if (byId.has(p.id)) {
      add({
        code: 'DUP_ID',
        severity: 'error',
        partIds: [p.id],
        message: `Duplicate id.`,
        fix: `Use unique ids.`,
      })
      continue
    }
    const pl = place(p, def)
    placed.push(pl)
    byId.set(p.id, pl)
  }

  const studPlaced = placed.filter((q) => (q.p.orientation ?? 'up') === 'up')
  const snotPlaced = placed.filter((q) => (q.p.orientation ?? 'up') !== 'up')

  // 2. Collision (voxel occupancy, stud-up parts only)
  const vox = new Map<string, string>()
  for (const q of studPlaced) {
    for (let y = q.p.y; y < q.p.y + q.def.h; y++) {
      for (const c of q.cells) {
        const k = `${c},${y}`
        const other = vox.get(k)
        if (other && other !== q.p.id) {
          add({
            code: 'COLLISION',
            severity: 'error',
            partIds: [other, q.p.id],
            message: `Parts overlap at cell (${c}) height ${y}.`,
            fix: `Move one part so volumes do not intersect.`,
          })
          y = Infinity
          break
        }
        vox.set(k, q.p.id)
      }
    }
  }

  // 3. Stud connections graph
  const adj = new Map<string, Map<string, number>>() // id -> (neighbor -> studs)
  const link = (a: string, b: string, n: number) => {
    if (!adj.has(a)) adj.set(a, new Map())
    if (!adj.has(b)) adj.set(b, new Map())
    adj.get(a)!.set(b, (adj.get(a)!.get(b) ?? 0) + n)
    adj.get(b)!.set(a, (adj.get(b)!.get(a) ?? 0) + n)
  }
  const topIndex = new Map<number, Placed[]>() // top height -> parts
  for (const q of studPlaced) {
    const t = q.p.y + q.def.h
    if (!topIndex.has(t)) topIndex.set(t, [])
    topIndex.get(t)!.push(q)
  }
  const supportCells = new Map<string, Set<string>>() // part id -> its cells resting on something
  for (const upper of studPlaced) {
    const below = topIndex.get(upper.p.y) ?? []
    const sup = new Set<string>()
    for (const lower of below) {
      const shared = upper.cells.filter((c) => lower.cells.includes(c))
      if (!shared.length) continue
      shared.forEach((c) => sup.add(c))
      if (lower.def.topStuds) link(lower.p.id, upper.p.id, shared.length)
    }
    supportCells.set(upper.p.id, sup)
  }

  // SNOT attachments
  for (const s of snotPlaced) {
    const host = s.p.attachedTo ? byId.get(s.p.attachedTo) : undefined
    const hostCanAttachSideways =
      Boolean(host) &&
      (Boolean(host!.def.sideStuds) || ((host!.p.orientation ?? 'up') !== 'up' && host!.def.topStuds))
    if (!host || !hostCanAttachSideways) {
      add({
        code: 'SNOT_NO_HOST',
        severity: 'error',
        partIds: [s.p.id],
        message: `Sideways part must attach to a host with side studs (4070, 87087, 30414) or a sideways stud plate.`,
        fix: `Set attachedTo to a side-stud part, or add one.`,
      })
      continue
    }
    const touchesZ = Math.abs(s.p.z - host.p.z) <= 1 || Math.abs(s.p.z + s.d - 1 - host.p.z) <= 1
    const touchesX = Math.abs(s.p.x - host.p.x) <= 1 || Math.abs(s.p.x + s.w - 1 - host.p.x) <= 1
    if (!touchesZ && !touchesX) {
      add({
        code: 'SNOT_NOT_ADJACENT',
        severity: 'error',
        partIds: [s.p.id, host.p.id],
        message: `Sideways part is not adjacent to its host.`,
        fix: `Place it adjacent to host in X or Z.`,
      })
      continue
    }
    link(host.p.id, s.p.id, 1)
  }

  // 4. Grounding (BFS from parts at y = 0)
  const grounded = new Set<string>()
  const queue = studPlaced.filter((q) => q.p.y === 0).map((q) => q.p.id)
  queue.forEach((id) => grounded.add(id))
  while (queue.length) {
    const id = queue.shift()!
    for (const n of adj.get(id)?.keys() ?? []) {
      if (!grounded.has(n)) {
        grounded.add(n)
        queue.push(n)
      }
    }
  }
  for (const q of placed) {
    if (!grounded.has(q.p.id)) {
      add({
        code: 'FLOATING',
        severity: 'error',
        partIds: [q.p.id],
        message: `${q.def.name} is not connected to the ground via studs.`,
        fix: `Rest it on studs of a part below (tiles/slopes have no top studs) or attach via SNOT.`,
      })
    }
  }

  // 5. Weak connection + overhang
  for (const q of studPlaced) {
    if (q.p.y === 0) continue
    const area = q.cells.length
    const conns = [...(adj.get(q.p.id)?.values() ?? [])]
    const total = conns.reduce((a, b) => a + b, 0)
    if (area > 1 && total < 2 && grounded.has(q.p.id)) {
      add({
        code: 'WEAK_CONNECTION',
        severity: 'warning',
        partIds: [q.p.id],
        message: `${q.def.name} is held by only ${total} stud.`,
        fix: `Use >= 2 studs of overlap.`,
      })
    }
    // Clamped from above also counts as support.
    const sup = new Set(supportCells.get(q.p.id) ?? [])
    for (const other of studPlaced) {
      if (other.p.y === q.p.y + q.def.h && q.def.topStuds) {
        other.cells.forEach((c) => {
          if (q.cells.includes(c) && (supportCells.get(other.p.id)?.size ?? 0) > 0) sup.add(c)
        })
      }
    }
    const ratio = sup.size / area
    const longest = Math.max(q.w, q.d)
    const unsupported = area - sup.size
    if (ratio < 0.5 && longest >= 3 && unsupported >= 2) {
      add({
        code: 'OVERHANG',
        severity: 'error',
        partIds: [q.p.id],
        message: `${q.def.name} has ${Math.round((1 - ratio) * 100)}% unsupported (cantilever).`,
        fix: `Support >= 50% of its footprint, shorten it, or clamp it with a part on top.`,
      })
    }
  }

  // 6. Tipping: center of mass inside ground footprint bounding box
  const ground = studPlaced.filter((q) => q.p.y === 0)
  if (ground.length) {
    let mx = 0
    let mz = 0
    let m = 0
    for (const q of studPlaced) {
      const mass = q.cells.length * q.def.h
      mx += (q.p.x + q.w / 2) * mass
      mz += (q.p.z + q.d / 2) * mass
      m += mass
    }
    mx /= m
    mz /= m
    const minX = Math.min(...ground.map((g) => g.p.x))
    const maxX = Math.max(...ground.map((g) => g.p.x + g.w))
    const minZ = Math.min(...ground.map((g) => g.p.z))
    const maxZ = Math.max(...ground.map((g) => g.p.z + g.d))
    if (mx < minX || mx > maxX || mz < minZ || mz > maxZ) {
      add({
        code: 'TIPPING',
        severity: 'warning',
        partIds: [],
        message: `Center of mass is outside the base footprint.`,
        fix: `Widen the base or rebalance the top.`,
      })
    }
  }

  // 7. Semantic checks
  const arch = ARCHETYPES[model.archetype ?? 'generic'] ?? ARCHETYPES.generic
  if (placed.length < arch.minParts) {
    add({
      code: 'TOO_FEW_PARTS',
      severity: 'warning',
      partIds: [],
      message: `${placed.length} parts; '${model.archetype}' needs >= ${arch.minParts} for recognizable detail.`,
      fix: `Add detail parts (tiles, plates, side studs).`,
    })
  }
  if (model.archetype === 'robot' && placed.length > 0) {
    const minX = Math.min(...placed.map((q) => q.p.x))
    const maxX = Math.max(...placed.map((q) => q.p.x + q.w))
    const maxY = Math.max(...placed.map((q) => q.p.y + q.def.h))
    if (maxY < (maxX - minX) * 1.5) {
      add({
        code: 'BAD_SILHOUETTE',
        severity: 'error',
        partIds: [],
        message: `Robot silhouette is horizontal (height=${maxY} plates vs width=${maxX - minX} studs).`,
        fix: `Build an upright bipedal robot taller than it is wide.`,
      })
    }
  }
  const matchesRole = (q: Placed, role: string) => {
    const r = (q.p.role ?? '').toLowerCase()
    if (role === 'arm') return r === 'arm' || r === 'arms'
    if (role === 'leg') return r === 'leg' || r === 'legs'
    if (role === 'eye') return r === 'eye' || r === 'eyes' || /^eye/i.test(q.p.id) || q.p.partNum === '98138'
    return r === role
  }
  for (const [role, n] of Object.entries(arch.required)) {
    const have = placed.filter((q) => matchesRole(q, role)).length
    if (have < n) {
      add({
        code: 'MISSING_ROLE',
        severity: 'error',
        partIds: [],
        message: `Archetype '${model.archetype}' needs ${n} part(s) with role '${role}', found ${have}.`,
        fix: `Add the '${role}' body part.`,
      })
    }
  }
  for (const q of placed.filter((q) => matchesRole(q, 'eye'))) {
    if ((q.p.orientation ?? 'up') === 'up') {
      add({
        code: 'EYE_FACING_UP',
        severity: 'error',
        partIds: [q.p.id],
        message: `Eye faces up instead of forward.`,
        fix: `Set orientation "front" and attach to a headlight brick (4070) or 87087 on the head.`,
      })
    }
  }
  let paletteRatio = 1
  if (model.palette?.length) {
    const inPal = placed.filter((q) => model.palette!.includes(q.p.color) || matchesRole(q, 'eye')).length
    paletteRatio = placed.length ? inPal / placed.length : 0
    if (paletteRatio < 0.7) {
      add({
        code: 'COLOR_MISMATCH',
        severity: 'warning',
        partIds: [],
        message: `Only ${Math.round(paletteRatio * 100)}% of parts use the requested palette ${model.palette.join('/')}.`,
        fix: `Recolor main structural parts to the palette.`,
      })
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.length - errors
  return {
    valid: errors === 0,
    score: Math.max(0, 100 - errors * 15 - warnings * 5),
    stats: {
      parts: placed.length,
      grounded: grounded.size,
      paletteRatio: Math.round(paletteRatio * 100) / 100,
    },
    issues,
  }
}

// Compact text for the repair prompt (token-efficient).
export function toRepairFeedback(r: Report): string {
  if (r.valid && !r.issues.length) return 'VALID'
  return r.issues
    .map((i) => `[${i.severity.toUpperCase()}] ${i.code} ${i.partIds.join(',')}: ${i.message} FIX: ${i.fix}`)
    .join('\n')
}

// ============================================================================
// Bridge between LEGO AI Designer's BuildPlan (PlacedBrick[]) and Validator
// ============================================================================

export type ResolvedPromptPalette = {
  colors: BrickColor[]
  allowedColors: BrickColor[]
  primaryColor: BrickColor
  secondaryColor?: BrickColor
  accentColor?: BrickColor
  legoNames: string[]
  requiresTwoToneBalance: boolean
  primaryColors: BrickColor[]
  secondaryColors: BrickColor[]
}

/**
 * Resolves Vietnamese, English, and Chinese color descriptions into official
 * LEGO AI Designer BrickColor palettes + LEGO / BrickLink color names.
 */
export function resolvePromptColorPalette(prompt: string): ResolvedPromptPalette | undefined {
  const text = prompt.toLowerCase()

  // Special compound color: "xanh xám", "xanh ghi", "blue gray", "blue-grey", "蓝灰"
  if (/xanh\s*xám|xanh\s*ghi|blue[\s-]*gr[ae]y|gr[ae]y[\s-]*blue|sand\s*blue|蓝灰/.test(text)) {
    return {
      colors: ['cyan', 'gray', 'blue'],
      allowedColors: ['cyan', 'gray', 'blue'],
      primaryColor: 'cyan',
      secondaryColor: 'gray',
      accentColor: 'blue',
      legoNames: ['Sand Blue (cyan)', 'Dark Bluish Gray (gray)', 'Blue (blue)'],
      requiresTwoToneBalance: true,
      primaryColors: ['cyan', 'blue'],
      secondaryColors: ['gray'],
    }
  }

  const matchedColors = new Set<BrickColor>()
  const legoNames = new Set<string>()
  const primaryColors: BrickColor[] = []
  const secondaryColors: BrickColor[] = []

  const rules: Array<{ pattern: RegExp; colors: BrickColor[]; names: string[] }> = [
    { pattern: /xanh\s*dương|xanh\s*biển|\bblue\b|蓝色/, colors: ['blue', 'cyan'], names: ['Blue', 'Medium Azure (cyan)'] },
    { pattern: /xanh\s*ngọc|\bcyan\b|\bazure\b|青色/, colors: ['cyan', 'blue'], names: ['Medium Azure (cyan)', 'Sand Blue'] },
    { pattern: /xanh\s*lá|\bgreen\b|绿色/, colors: ['green', 'lime'], names: ['Green', 'Bright Green (lime)'] },
    { pattern: /\bxám\b|\bghi\b|\bgr[ae]y\b|灰色/, colors: ['gray'], names: ['Dark/Light Bluish Gray (gray)'] },
    { pattern: /\bđỏ\b|\bred\b|红色/, colors: ['red'], names: ['Red'] },
    { pattern: /\bvàng\b|\byellow\b|黄色/, colors: ['yellow'], names: ['Yellow'] },
    { pattern: /\bcam\b|\borange\b|橙色/, colors: ['orange'], names: ['Orange'] },
    { pattern: /\btrắng\b|\bwhite\b|白色/, colors: ['white'], names: ['White'] },
    { pattern: /\bđen\b|\bblack\b|黑色/, colors: ['black'], names: ['Black'] },
    { pattern: /\bnâu\b|\bbrown\b|棕色/, colors: ['brown', 'tan'], names: ['Reddish Brown', 'Tan'] },
    { pattern: /\bhồng\b|\bpink\b|粉色/, colors: ['pink', 'trans-pink'], names: ['Bright Pink', 'Trans-Pink'] },
  ]

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      rule.colors.forEach((c, idx) => {
        matchedColors.add(c)
        if (idx === 0) {
          if (primaryColors.length === 0) primaryColors.push(c)
          else secondaryColors.push(c)
        }
      })
      rule.names.forEach((n) => legoNames.add(n))
    }
  }

  if (matchedColors.size === 0) return undefined
  const colorList = Array.from(matchedColors)

  return {
    colors: colorList,
    allowedColors: colorList,
    primaryColor: primaryColors[0] ?? colorList[0],
    secondaryColor: secondaryColors[0],
    accentColor: colorList[2] ?? colorList[1],
    legoNames: Array.from(legoNames),
    requiresTwoToneBalance: primaryColors.length > 0 && secondaryColors.length > 0,
    primaryColors,
    secondaryColors,
  }
}

/**
 * Checks whether a single PlacedBrick has an illegal cantilevered overhang
 * (> 50% of its footprint unsupported when length >= 3 studs, or < 1 stud overlap).
 */
export function getBrickSupportCellsInfo(brick: PlacedBrick, allBricks: PlacedBrick[]) {
  const def = brickById.get(brick.brickId)
  if (!def) {
    return {
      area: 1,
      totalCells: 1,
      supportedCount: 1,
      longest: 1,
      ratio: 1,
      supportRatio: 1,
      unsupported: 0,
      isOverhang: false,
      isWeakConnection: false,
    }
  }

  const verticalTurns = ((brick.pose.verticalQuarterTurns ?? 0) % 4 + 4) % 4
  if (verticalTurns !== 0) {
    // SNOT side-mounted parts are held by side studs
    return {
      area: 1,
      totalCells: 1,
      supportedCount: 1,
      longest: 1,
      ratio: 1,
      supportRatio: 1,
      unsupported: 0,
      isOverhang: false,
      isWeakConnection: false,
    }
  }

  const fp = footprintToWorld(def, brick.pose.rotationQuarterTurns, 0)
  const w = Math.max(1, Math.round(fp.widthStuds))
  const d = Math.max(1, Math.round(fp.depthStuds))
  const area = w * d
  const longest = Math.max(w, d)

  if (brick.pose.yStud <= 0.001) {
    return {
      area,
      totalCells: area,
      supportedCount: area,
      longest,
      ratio: 1,
      supportRatio: 1,
      unsupported: 0,
      isOverhang: false,
      isWeakConnection: false,
    }
  }

  const cells: Array<{ x: number; z: number }> = []
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      cells.push({ x: Math.round(brick.pose.xStud) + dx, z: Math.round(brick.pose.zStud) + dz })
    }
  }

  const supportedSet = new Set<string>()
  const brickTopY = brick.pose.yStud + fp.height

  for (const other of allBricks) {
    if (other.id === brick.id) continue
    if (((other.pose.verticalQuarterTurns ?? 0) % 4) !== 0) continue
    const otherDef = brickById.get(other.brickId)
    if (!otherDef) continue
    const otherFp = footprintToWorld(otherDef, other.pose.rotationQuarterTurns, 0)
    const otherTopY = other.pose.yStud + otherFp.height

    const isSupportingFromBelow =
      Math.abs(otherTopY - brick.pose.yStud) <= 0.05 &&
      otherDef.kind !== 'tile' &&
      otherDef.id !== 'slope-2x2' &&
      !otherDef.id.startsWith('slope-curved-')

    const isClampingFromAbove =
      Math.abs(other.pose.yStud - brickTopY) <= 0.05 &&
      def.kind !== 'tile' &&
      def.id !== 'slope-2x2' &&
      !def.id.startsWith('slope-curved-')

    if (!isSupportingFromBelow && !isClampingFromAbove) continue

    const ow = Math.max(1, Math.round(otherFp.widthStuds))
    const od = Math.max(1, Math.round(otherFp.depthStuds))
    const ox = Math.round(other.pose.xStud)
    const oz = Math.round(other.pose.zStud)

    for (const cell of cells) {
      if (cell.x >= ox && cell.x < ox + ow && cell.z >= oz && cell.z < oz + od) {
        supportedSet.add(`${cell.x},${cell.z}`)
      }
    }
  }

  const supportedCount = supportedSet.size
  const ratio = supportedCount / area
  const unsupported = area - supportedCount
  const isOverhang = ratio < 0.5 && longest >= 3 && unsupported >= 2
  const isWeakConnection = area > 1 && supportedCount < 2

  return {
    area,
    totalCells: area,
    supportedCount,
    longest,
    ratio,
    supportRatio: ratio,
    unsupported,
    isOverhang,
    isWeakConnection,
  }
}

/**
 * Evaluates a PlacedBrick BuildPlan against all physical and semantic archetype rules
 * (silhouette, body parts, forward SNOT eyes, overhang <= 50%, weak connections,
 * tipping center of mass, and Vietnamese/multilingual color fidelity).
 */
export function validateBuildPlanSemanticsAndPhysics(
  plan: BuildPlan,
  prompt: string,
  categoryOverride?: BuildCategoryOption,
): Report {
  const issues: Issue[] = []
  const add = (issue: Issue) => issues.push(issue)
  const bricks = plan.bricks
  const category = resolveBuildCategory(prompt, categoryOverride)
  const text = prompt.toLowerCase()
  const isRobot =
    category === 'character' ||
    /\brobot\b|\bmecha\b|\bdroid\b|\bডে\b|người\s*máy|rô[\s-]*bốt|机器人|机甲/.test(text)
  const archetype = isRobot
    ? 'robot'
    : category === 'creature'
      ? 'animal'
      : category === 'vehicle'
        ? 'vehicle'
        : 'generic'

  const archSpec = ARCHETYPES[archetype] ?? ARCHETYPES.generic

  // 1. Minimum parts check
  if (bricks.length < archSpec.minParts) {
    add({
      code: 'TOO_FEW_PARTS',
      severity: isRobot ? 'error' : 'warning',
      partIds: [],
      message: `Model has only ${bricks.length} parts; '${archetype}' requires >= ${archSpec.minParts} parts for a recognizable silhouette.`,
      fix: `Expand the build to ${archSpec.minParts}-32 parts with complete legs, torso, arms, head, and SNOT surface details.`,
    })
  }

  // 2. Overhang, Weak Connection & Studless Top Support checks
  let groundedCount = 0
  for (const brick of bricks) {
    const def = brickById.get(brick.brickId)
    if (!def) continue
    const info = getBrickSupportCellsInfo(brick, bricks)
    if (brick.pose.yStud <= 0.001 || info.supportedCount > 0 || (brick.pose.verticalQuarterTurns ?? 0) !== 0) {
      groundedCount += 1
    } else {
      add({
        code: 'FLOATING',
        severity: 'error',
        partIds: [brick.id],
        message: `${def.name} (${brick.brickId}) at y=${brick.pose.yStud} is floating or resting on a studless tile/slope.`,
        fix: `Rest it on top studs of a brick/plate below or attach via SNOT side studs.`,
      })
    }

    if (info.isOverhang) {
      add({
        code: 'OVERHANG',
        severity: 'error',
        partIds: [brick.id],
        message: `${def.name} (${brick.brickId}) at (${brick.pose.xStud}, ${brick.pose.yStud}, ${brick.pose.zStud}) has ${Math.round((1 - (info.ratio ?? 0)) * 100)}% unsupported cantilever.`,
        fix: `Shift ${brick.brickId} inward so >= 50% of its footprint rests on supporting bricks, or replace with a shorter piece.`,
      })
    } else if (brick.pose.yStud > 0.001 && (brick.pose.verticalQuarterTurns ?? 0) === 0 && info.area > 1 && info.supportedCount < 2) {
      add({
        code: 'WEAK_CONNECTION',
        severity: 'warning',
        partIds: [brick.id],
        message: `${def.name} (${brick.brickId}) is held by only ${info.supportedCount} stud.`,
        fix: `Overlap at least 2 studs with the layer below or clamp from above.`,
      })
    }
  }

  // 3. Bounding box & Upright Silhouette check for Robot / Character
  const allBounds = bricks.map(getBrickBounds).filter((b): b is NonNullable<typeof b> => Boolean(b))
  if (allBounds.length > 0) {
    const minX = Math.min(...allBounds.map((b) => b.minX))
    const maxX = Math.max(...allBounds.map((b) => b.maxX))
    const minY = Math.min(...allBounds.map((b) => b.minY))
    const maxY = Math.max(...allBounds.map((b) => b.maxY))
    const minZ = Math.min(...allBounds.map((b) => b.minZ))
    const maxZ = Math.max(...allBounds.map((b) => b.maxZ))
    const totalWidth = maxX - minX
    const totalHeight = maxY - minY
    const totalDepth = maxZ - minZ

    if (isRobot) {
      if (totalHeight < 5.2 || totalHeight <= totalDepth) {
        add({
          code: 'BAD_SILHOUETTE',
          severity: 'error',
          partIds: [],
          message: `Robot silhouette is too flat/horizontal (width=${totalWidth.toFixed(1)}, depth=${totalDepth.toFixed(1)}, height=${totalHeight.toFixed(1)} studs). Looks like a quadruped instead of an upright biped robot.`,
          fix: `Build an upright bipedal robot with height >= 6.0 studs (15-22 plates tall), separated left/right legs, torso, arms, and distinct head on top.`,
        })
      }

      // Check anatomy zones: legs (lower third), torso (middle), arms (left & right), head (top)
      const lowerBricks = bricks.filter((b) => b.pose.yStud < minY + totalHeight * 0.35)
      const leftLegBricks = lowerBricks.filter((b) => b.pose.xStud + 0.5 < minX + totalWidth / 2)
      const rightLegBricks = lowerBricks.filter((b) => b.pose.xStud + 0.5 >= minX + totalWidth / 2)
      if (leftLegBricks.length === 0 || rightLegBricks.length === 0) {
        add({
          code: 'MISSING_ROLE',
          severity: 'error',
          partIds: [],
          message: `Robot is missing two separated bipedal leg columns at the base.`,
          fix: `Place two distinct leg columns (e.g. at x=1 and x=4) rising from y=0 to y=2.8.`,
        })
      }

      const midBricks = bricks.filter(
        (b) => b.pose.yStud >= minY + totalHeight * 0.3 && b.pose.yStud <= minY + totalHeight * 0.78,
      )
      const leftArm = midBricks.some((b) => b.pose.xStud <= minX + 0.5)
      const rightArm = midBricks.some((b) => {
        const bBounds = getBrickBounds(b)
        return bBounds ? bBounds.maxX >= maxX - 0.5 : false
      })
      if (!leftArm || !rightArm || totalWidth < 4) {
        add({
          code: 'MISSING_ROLE',
          severity: 'error',
          partIds: [],
          message: `Robot is missing distinct left and right arms extending from the torso.`,
          fix: `Add symmetrical left and right arms (e.g. at x=0 and x=5) supported by a shoulder plate or side-stud bricks.`,
        })
      }

      const headBricks = bricks.filter((b) => b.pose.yStud >= minY + totalHeight * 0.65)
      if (headBricks.length < 3) {
        add({
          code: 'MISSING_ROLE',
          severity: 'error',
          partIds: [],
          message: `Robot is missing a distinct head assembly separated above the torso.`,
          fix: `Add a narrower 2x2 neck plate and a head block at the top with SNOT headlight bricks for eyes.`,
        })
      }
    }

    // 4. Eye orientation check (must face forward via SNOT, never facing the sky!)
    if (isRobot || archetype === 'animal') {
      const eyeCandidates = bricks.filter(
        (b) =>
          b.brickId === 'tile-eye-1x1' ||
          (b.brickId === 'round-1x1-plate' &&
            b.pose.yStud >= minY + totalHeight * 0.55 &&
            ['white', 'cyan', 'yellow', 'blue'].includes(b.color)),
      )
      const forwardEyes = eyeCandidates.filter((b) => ((b.pose.verticalQuarterTurns ?? 0) % 4) !== 0)
      const upwardEyes = eyeCandidates.filter(
        (b) =>
          ((b.pose.verticalQuarterTurns ?? 0) % 4) === 0 &&
          b.brickId === 'tile-eye-1x1',
      )

      if (upwardEyes.length > 0) {
        add({
          code: 'EYE_FACING_UP',
          severity: 'error',
          partIds: upwardEyes.map((b) => b.id),
          message: `Eye part(s) have verticalQuarterTurns=0 and face up toward the sky instead of forward.`,
          fix: `Mount tile-eye-1x1 with verticalQuarterTurns=1 on the front side stud of headlight-brick-1x1 (at yStud = host.yStud + 0.2, zStud = host.zStud - 0.2).`,
        })
      } else if (isRobot && forwardEyes.length < 2) {
        add({
          code: 'MISSING_ROLE',
          severity: 'error',
          partIds: [],
          message: `Robot needs 2 forward-facing SNOT eyes (found ${forwardEyes.length}).`,
          fix: `Place two headlight-brick-1x1 on the head and attach two tile-eye-1x1 with verticalQuarterTurns=1 on their front studs.`,
        })
      }
    }
  }

  // 5. Color Palette & Two-Tone Balance check
  let paletteRatio = 1
  const resolvedPalette = resolvePromptColorPalette(prompt)
  if (resolvedPalette && bricks.length > 0) {
    const matchingBricks = bricks.filter(
      (b) => resolvedPalette.colors.includes(b.color) || b.brickId === 'tile-eye-1x1',
    )
    paletteRatio = matchingBricks.length / bricks.length
    if (paletteRatio < 0.7) {
      add({
        code: 'COLOR_MISMATCH',
        severity: 'error',
        partIds: [],
        message: `Only ${Math.round(paletteRatio * 100)}% of parts match the requested palette (${resolvedPalette.legoNames.join(', ')}); required >= 70%.`,
        fix: `Recolor structural bricks to ${resolvedPalette.colors.join(' and ')}.`,
      })
    } else if (resolvedPalette.requiresTwoToneBalance) {
      const secondaryCount = bricks.filter((b) => resolvedPalette.secondaryColors.includes(b.color)).length
      const secondaryRatio = secondaryCount / bricks.length
      if (secondaryRatio < 0.25) {
        add({
          code: 'COLOR_MISMATCH',
          severity: 'error',
          partIds: [],
          message: `Prompt requested a two-tone palette (${resolvedPalette.legoNames.join(' + ')}), but secondary color (${resolvedPalette.secondaryColors.join('/')}) is only ${Math.round(secondaryRatio * 100)}%.`,
          fix: `Balance the palette: use ${resolvedPalette.secondaryColors.join('/')} for legs, joints, and trim (>= 30% of parts) and ${resolvedPalette.primaryColors.join('/')} for torso/head.`,
        })
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length
  const warnings = issues.length - errors
  return {
    valid: errors === 0,
    score: Math.max(0, 100 - errors * 15 - warnings * 5),
    stats: {
      parts: bricks.length,
      grounded: groundedCount,
      paletteRatio: Math.round(paletteRatio * 100) / 100,
    },
    issues,
  }
}

export function convertStandaloneModelToPlacedBricks(model: Model): PlacedBrick[] {
  const partNumToBrickId: Record<string, string> = {
    '3005': 'brick-1x1',
    '3004': 'brick-1x2',
    '3622': 'brick-1x3',
    '3010': 'brick-1x4',
    '3009': 'brick-1x6',
    '3003': 'brick-2x2',
    '3002': 'brick-2x3',
    '3001': 'brick-2x4',
    '3024': 'plate-1x1',
    '3023': 'plate-1x2',
    '3623': 'plate-1x3',
    '3710': 'plate-1x4',
    '3666': 'plate-1x6',
    '3022': 'plate-2x2',
    '3021': 'plate-2x3',
    '3020': 'plate-2x4',
    '3795': 'plate-2x6',
    '3031': 'plate-4x4',
    '3032': 'plate-4x6',
    '3036': 'plate-6x8',
    '3070': 'tile-1x1',
    '3069': 'tile-1x2',
    '2412': 'tile-grille-1x2',
    '63864': 'tile-1x3',
    '2431': 'tile-1x4',
    '3068': 'tile-2x2',
    '87079': 'tile-2x4',
    '98138': 'tile-eye-1x1',
    '4073': 'round-1x1-plate',
    '3062': 'brick-round-1x1',
    '54200': 'slope-cheese-1x1',
    '3040': 'slope-1x2',
    '3039': 'slope-2x2',
    '3037': 'slope-2x4',
    '11477': 'slope-curved-2x1',
    '50950': 'slope-curved-3x1',
    '93273': 'slope-curved-3x2',
    '4070': 'headlight-brick-1x1',
    '87087': 'brick-side-studs-1x1',
    '11211': 'brick-side-studs-1x2',
    '30414': 'brick-side-studs-1x4',
    '44728': 'bracket-1x2-2x2',
  }

  const mapColorName = (raw: string): BrickColor => {
    const lower = raw.toLowerCase()
    if (lower.includes('sand blue') || lower.includes('azure') || lower.includes('trans-light blue') || lower === 'cyan') return 'cyan'
    if (lower.includes('bluish gray') || lower.includes('bluish grey') || lower.includes('gray') || lower.includes('grey')) return 'gray'
    if (lower.includes('blue')) return 'blue'
    if (lower.includes('red')) return 'red'
    if (lower.includes('yellow')) return 'yellow'
    if (lower.includes('lime') || lower.includes('bright green')) return 'lime'
    if (lower.includes('green')) return 'green'
    if (lower.includes('white')) return 'white'
    if (lower.includes('black')) return 'black'
    if (lower.includes('brown')) return 'brown'
    if (lower.includes('tan')) return 'tan'
    if (lower.includes('orange')) return 'orange'
    if (lower.includes('trans-pink')) return 'trans-pink'
    if (lower.includes('pink') || lower.includes('purple')) return 'pink'
    return 'gray'
  }

  const hostById = new Map(model.parts.map((p) => [p.id, p]))

  return model.parts.map((p) => {
    const isEye = p.role === 'eye' && p.orientation === 'front'
    const brickId = isEye ? 'tile-eye-1x1' : (partNumToBrickId[p.partNum] ?? 'brick-1x1')
    const def = brickById.get(brickId)
    const desiredColor = isEye ? 'white' : mapColorName(p.color)
    const color = def && def.colors.includes(desiredColor) ? desiredColor : (def?.colors[0] ?? 'gray')
    const rotTurns = (((Math.round((p.rot ?? 0) / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3

    if (p.orientation === 'front') {
      const host = p.attachedTo ? hostById.get(p.attachedTo) : undefined
      const hostYStud = host ? Number((host.y * PLATE_HEIGHT_WORLD).toFixed(3)) : Number((p.y * PLATE_HEIGHT_WORLD).toFixed(3))
      const hostZStud = host ? host.z : p.z + 1
      const hostXStud = host ? host.x : p.x
      return {
        id: p.id,
        brickId,
        color,
        pose: {
          xStud: hostXStud,
          yStud: Number((hostYStud + 0.2).toFixed(3)),
          zStud: Number((hostZStud - 0.2).toFixed(3)),
          rotationQuarterTurns: 0,
          verticalQuarterTurns: 1,
        },
      }
    }

    return {
      id: p.id,
      brickId,
      color,
      pose: {
        xStud: p.x,
        yStud: Number((p.y * PLATE_HEIGHT_WORLD).toFixed(3)),
        zStud: p.z,
        rotationQuarterTurns: rotTurns,
        verticalQuarterTurns: 0,
      },
    }
  })
}
