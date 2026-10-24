import { brickById } from '../data/basicBricks'
import type { BrickColor, PlacedBrick } from '../types/bricks'
import { PLATE_HEIGHT_WORLD, footprintToWorld } from './brickUnits'

/**
 * BrickLink Wanted List export.
 *
 * Produces the XML format accepted by BrickLink "Wanted > Upload" so a user can
 * buy every part of a generated model in one go.
 * Format reference: https://www.bricklink.com/help.asp?helpID=207
 */

/** Closest BrickLink color id for each editor color. */
const bricklinkColorId: Record<BrickColor, number> = {
  white: 1,
  tan: 2,
  yellow: 3,
  orange: 4,
  red: 5,
  green: 6,
  blue: 7,
  black: 11,
  lime: 34,
  pink: 104, // Bright Pink
  'trans-pink': 50, // Trans-Dark Pink
  gray: 86, // Light Bluish Gray
  brown: 88, // Reddish Brown
  cyan: 156, // Medium Azure
}

/**
 * LDraw numbers that BrickLink catalogs under a suffixed id.
 * Only aliases that are certain are listed; everything else passes through.
 */
const bricklinkPartAlias: Record<string, string> = {
  '2412': '2412b', // Tile 1x2 Grille with groove
  '3062': '3062b', // Brick Round 1x1 open stud
  '3069': '3069b', // Tile 1x2 with groove
  '3070': '3070b', // Tile 1x1 with groove
}

export type WantedListLine = {
  partNumber: string
  colorId: number
  color: BrickColor
  name: string
  quantity: number
}

export const buildWantedList = (bricks: PlacedBrick[]): WantedListLine[] => {
  const lines = new Map<string, WantedListLine>()

  for (const brick of bricks) {
    const definition = brickById.get(brick.brickId)
    // Non-LEGO packs (e.g. Minecraft voxels) have no real-world part.
    if (!definition || definition.pack !== 'lego') continue

    const partNumber = bricklinkPartAlias[definition.partNumber] ?? definition.partNumber
    const colorId = bricklinkColorId[brick.color]
    const key = `${partNumber}:${colorId}`
    const existing = lines.get(key)

    if (existing) {
      existing.quantity += 1
    } else {
      lines.set(key, { partNumber, colorId, color: brick.color, name: definition.name, quantity: 1 })
    }
  }

  return [...lines.values()].sort((a, b) => a.partNumber.localeCompare(b.partNumber) || a.colorId - b.colorId)
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const formatBricklinkWantedListXml = (bricks: PlacedBrick[], remarks?: string) => {
  const items = buildWantedList(bricks).map((line) => [
    '  <ITEM>',
    '    <ITEMTYPE>P</ITEMTYPE>',
    `    <ITEMID>${escapeXml(line.partNumber)}</ITEMID>`,
    `    <COLOR>${line.colorId}</COLOR>`,
    `    <MINQTY>${line.quantity}</MINQTY>`,
    '    <CONDITION>X</CONDITION>',
    ...(remarks ? [`    <REMARKS>${escapeXml(remarks)}</REMARKS>`] : []),
    '  </ITEM>',
  ].join('\n'))

  return ['<INVENTORY>', ...items, '</INVENTORY>', ''].join('\n')
}

export type ModelPhysicalSpecs = {
  widthStuds: number
  depthStuds: number
  heightStuds: number
  heightPlates: number
  widthMm: number
  depthMm: number
  heightMm: number
  weightGrams: number
  estimatedUsd: number
  estimatedVnd: number
  distinctLots: number
  breakdown: {
    bricks: number
    plates: number
    slopes: number
    tiles: number
    snot: number
  }
}

export const calculateModelPhysicalSpecs = (bricks: PlacedBrick[]): ModelPhysicalSpecs => {
  if (bricks.length === 0) {
    return {
      widthStuds: 0,
      depthStuds: 0,
      heightStuds: 0,
      heightPlates: 0,
      widthMm: 0,
      depthMm: 0,
      heightMm: 0,
      weightGrams: 0,
      estimatedUsd: 0,
      estimatedVnd: 0,
      distinctLots: 0,
      breakdown: { bricks: 0, plates: 0, slopes: 0, tiles: 0, snot: 0 },
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let minZ = Number.POSITIVE_INFINITY
  let maxZ = Number.NEGATIVE_INFINITY

  let weightGrams = 0
  let estimatedUsd = 0
  const breakdown = { bricks: 0, plates: 0, slopes: 0, tiles: 0, snot: 0 }

  for (const brick of bricks) {
    const def = brickById.get(brick.brickId)
    if (!def) continue

    const fp = footprintToWorld(def, brick.pose.rotationQuarterTurns, brick.pose.verticalQuarterTurns ?? 0)
    minX = Math.min(minX, brick.pose.xStud)
    maxX = Math.max(maxX, brick.pose.xStud + fp.width)
    minY = Math.min(minY, brick.pose.yStud)
    maxY = Math.max(maxY, brick.pose.yStud + fp.height)
    minZ = Math.min(minZ, brick.pose.zStud)
    maxZ = Math.max(maxZ, brick.pose.zStud + fp.depth)

    const studArea = def.footprint.widthStuds * def.footprint.depthStuds
    const platesTall = def.footprint.heightStuds / PLATE_HEIGHT_WORLD
    weightGrams += studArea * platesTall * 0.14

    const isSnot =
      brick.brickId.includes('side-studs') ||
      brick.brickId.includes('headlight') ||
      brick.brickId.includes('bracket')

    if (isSnot) {
      breakdown.snot += 1
      estimatedUsd += 0.12 + studArea * 0.02
    } else if (def.kind === 'slope') {
      breakdown.slopes += 1
      estimatedUsd += 0.09 + studArea * 0.018
    } else if (def.kind === 'tile') {
      breakdown.tiles += 1
      estimatedUsd += 0.07 + studArea * 0.015
    } else if (def.kind === 'plate') {
      breakdown.plates += 1
      estimatedUsd += 0.06 + studArea * 0.014
    } else {
      breakdown.bricks += 1
      estimatedUsd += 0.08 + studArea * 0.018
    }
  }

  const widthStuds = Number(Math.max(0, maxX - minX).toFixed(1))
  const depthStuds = Number(Math.max(0, maxZ - minZ).toFixed(1))
  const heightStuds = Number(Math.max(0, maxY - minY).toFixed(1))
  const heightPlates = Number((heightStuds / PLATE_HEIGHT_WORLD).toFixed(1))
  const wantedLots = buildWantedList(bricks).length

  return {
    widthStuds,
    depthStuds,
    heightStuds,
    heightPlates,
    widthMm: Number((widthStuds * 8).toFixed(1)),
    depthMm: Number((depthStuds * 8).toFixed(1)),
    heightMm: Number((heightPlates * 3.2).toFixed(1)),
    weightGrams: Number(Math.max(1, weightGrams).toFixed(1)),
    estimatedUsd: Number(estimatedUsd.toFixed(2)),
    estimatedVnd: Math.round((estimatedUsd * 25500) / 1000) * 1000,
    distinctLots: wantedLots,
    breakdown,
  }
}
