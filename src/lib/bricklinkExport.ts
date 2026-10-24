import { brickById } from '../data/basicBricks'
import type { BrickColor, PlacedBrick } from '../types/bricks'

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
