import { brickById } from '../data/basicBricks'

/**
 * Dynamic part palettes for LLM generation.
 *
 * Dumping the full library (~100 parts) into the prompt makes small models pick
 * parts at random. Instead we classify the request into a build category and
 * hand the model a curated palette plus the design techniques LEGO designers
 * actually use for that category (SNOT, curved slopes, tiling).
 */

export type BuildCategory = 'vehicle' | 'character' | 'creature' | 'building' | 'nature' | 'general'

type CategoryProfile = {
  label: string
  parts: string[]
  techniques: string[]
}

/** Structural core that every category may use. */
const coreParts = [
  'brick-1x1', 'brick-1x2', 'brick-1x3', 'brick-1x4', 'brick-1x6',
  'brick-2x2', 'brick-2x3', 'brick-2x4',
  'plate-1x1', 'plate-1x2', 'plate-1x3', 'plate-1x4', 'plate-1x6',
  'plate-2x2', 'plate-2x3', 'plate-2x4', 'plate-2x6', 'plate-4x4', 'plate-4x6',
  'tile-1x1', 'tile-1x2', 'tile-1x4', 'tile-2x4',
]

/** SNOT (Studs Not On Top) enablers available in the library. */
const snotParts = ['bracket-1x2-2x2', 'brick-side-studs-1x1', 'brick-side-studs-1x4', 'headlight-brick-1x1']

const sculptParts = [
  'slope-cheese-1x1', 'slope-1x2', 'slope-2x2', 'curved-slope-1x2',
  'slope-curved-2x1-low', 'slope-curved-3x1', 'slope-curved-4x1', 'inverted-slope-1x2', 'inverted-slope-2x2',
]

const profiles: Record<BuildCategory, CategoryProfile> = {
  vehicle: {
    label: 'vehicle (car / truck / plane / rocket / ship)',
    parts: [
      ...snotParts, ...sculptParts,
      'slope-curved-2x4', 'slope-curved-3x2', 'slope-curved-4x1-double', 'slope-1x2-low', 'slope-3x1-33',
      'inverted-slope-3x2', 'tile-grille-1x2', 'plate-2x8', 'plate-4x8', 'brick-2x8',
      'window-1x2x2', 'cone-1x1-groove', 'round-1x1-plate',
    ],
    techniques: [
      'Build a low chassis from long plates (plate-2x8 / plate-4x8) first, then the body on top.',
      'Shape the hood, roof and fenders with curved slopes (slope-curved-*) instead of stair-stepped bricks.',
      'Cover most exposed top studs with tiles (tile-*) for a smooth, painted look.',
      'Use headlight-brick-1x1 or brick-side-studs-* at the front/rear so lights and grilles face sideways (SNOT).',
      'Use inverted slopes under the nose / tail to taper the underside.',
      'Wheels and axles are disabled: imply wheel arches with slopes, do not add wheels.',
    ],
  },
  character: {
    label: 'character / robot / mecha / figure',
    parts: [
      ...snotParts, ...sculptParts,
      'tile-eye-1x1', 'tile-eye-centered-1x1', 'tile-eye-closed-1x1', 'tile-eye-offset-1x1',
      'brick-round-1x1', 'cone-1x1-groove', 'round-1x1-plate', 'plate-tooth-1x1',
      'plate-clip-open-1x1', 'plate-bar-end-1x2', 'tile-grille-1x2', 'plate-jumper-1x2',
      'minifig-legs', 'minifig-torso', 'minifig-head', 'minifig-cap',
    ],
    techniques: [
      'Anatomy from bottom to top: two separate feet, legs, a pelvis plate spanning both legs, torso, shoulders, arms, neck, head.',
      'Keep proportions chunky: torso about 2x4 studs, head about 2x2, legs about 1x2 each.',
      'Use brick-side-studs-* or headlight-brick-1x1 on the head front so eyes (tile-eye-*) face forward (SNOT).',
      'Use bracket-1x2-2x2 at the shoulders to mount arms or chest plates sideways.',
      'Add detail with tile-grille-1x2 (vents), cheese slopes (armor) and cone-1x1-groove (antennae).',
    ],
  },
  creature: {
    label: 'animal / creature',
    parts: [
      ...snotParts, ...sculptParts,
      'tile-eye-1x1', 'tile-eye-centered-1x1', 'tile-eye-closed-1x1',
      'curved-slope-1x2-left', 'curved-slope-1x2-right', 'slope-curved-3x2',
      'plate-tooth-1x1', 'brick-round-1x1', 'cone-1x1-groove', 'round-1x1-plate', 'arch-1x3x2-curved',
    ],
    techniques: [
      'Build a body block first, then attach head, legs and tail so they all touch the body.',
      'Use curved slopes for backs, heads and tails; avoid flat boxy silhouettes.',
      'Mount eyes sideways or forward with brick-side-studs-* / headlight-brick-1x1 (SNOT).',
      'Use plate-tooth-1x1 for beaks, claws, ears or spikes.',
    ],
  },
  building: {
    label: 'building / house / castle / architecture',
    parts: [
      ...snotParts,
      'slope-1x2', 'slope-2x2', 'slope-2x4', 'slope-2x1x2', 'slope-2x1x3', 'slope-2x2x3', 'slope-3x1-33', 'slope-cheese-1x1',
      'arch-1x4', 'arch-1x3x2-curved', 'window-1x2x2', 'window-1x2x2-rounded', 'window-shutter-rounded',
      'brick-2x8', 'plate-2x8', 'plate-4x8', 'plate-6x8', 'brick-round-1x1', 'cone-2x2', 'cone-truncated-2x2',
      'tile-grille-1x2', 'plate-jumper-1x2',
    ],
    techniques: [
      'Start from a base plate (plate-6x8 or plate-4x8) and build walls along its edges, leaving the inside hollow.',
      'Stagger bricks between layers (running bond) so walls lock together.',
      'Leave gaps in walls for window-* and arch-* parts.',
      'Build the roof with stacked slopes (slope-2x4, slope-2x2, slope-2x1x3) rising to a ridge.',
      'Use brick-side-studs-* to attach signs, lamps or shutters to wall faces (SNOT).',
    ],
  },
  nature: {
    label: 'plant / tree / flower / landscape',
    parts: [
      ...sculptParts, 'brick-round-1x1', 'cone-2x2', 'cone-1x1-groove', 'round-1x1-plate',
      'plate-tooth-1x1', 'plate-cross-3x3', 'slope-curved-3x2', 'plate-4x8', 'brick-side-studs-1x4',
    ],
    techniques: [
      'Use a small base plate, a trunk/stem column of brick-round-1x1 or brick-1x1, and a wider canopy on top.',
      'Make canopies and petals from curved slopes, cones and round plates in several shades.',
      'Use brick-side-studs-1x4 on the trunk to attach branches or leaves sideways (SNOT).',
    ],
  },
  general: {
    label: 'general object',
    parts: [...snotParts, ...sculptParts, 'tile-eye-1x1', 'brick-round-1x1', 'cone-2x2', 'round-1x1-plate', 'window-1x2x2'],
    techniques: [
      'Block out the overall silhouette with bricks, then refine edges with slopes and curved slopes.',
      'Cover visible top studs with tiles where a smooth finish fits the object.',
      'Use SNOT parts (bracket-1x2-2x2, brick-side-studs-*, headlight-brick-1x1) for details that must face sideways.',
    ],
  },
}

const categoryPatterns: Array<[BuildCategory, RegExp]> = [
  ['vehicle', /car|truck|bus|vehicle|race|plane|jet|aircraft|rocket|spaceship|ship|boat|train|tank|bulldozer|excavator|xe|ô tô|oto|máy bay|tên lửa|tàu|thuyền|phi thuyền|汽车|车|飞机|火箭|船/i],
  ['character', /robot|mecha|droid|android|cyborg|figure|minifig|brickheadz|knight|warrior|astronaut|police|officer|cop|firefighter|doctor|pilot|người máy|chiến binh|hiệp sĩ|phi hành gia|cảnh sát|công an|lính cứu hỏa|bác sĩ|phi công|nhân vật|người|机器人|机甲|警察|人/i],
  ['creature', /animal|duck|dog|cat|bird|fish|dragon|dinosaur|bear|rabbit|pet|owl|con |vịt|chó|mèo|chim|cá|rồng|khủng long|gấu|thỏ|cú|动物|鸭|狗|猫|鸟|龙|鱼/i],
  ['building', /house|home|building|castle|tower|temple|church|shop|bridge|nhà|lâu đài|tháp|đền|chùa|cửa hàng|cầu|房|城堡|塔|桥/i],
  ['nature', /tree|flower|plant|forest|garden|cactus|cây|hoa|rừng|vườn|xương rồng|树|花|植物/i],
]

export const classifyBuildPrompt = (prompt: string): BuildCategory => {
  const text = prompt.toLowerCase()
  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(text)) return category
  }
  return 'general'
}

export const resolveBuildCategory = (prompt: string, override?: BuildCategory | 'auto'): BuildCategory => {
  if (override && override !== 'auto') {
    return override
  }
  return classifyBuildPrompt(prompt)
}

export const getCategoryPalette = (category: BuildCategory) => {
  const profile = profiles[category]
  const ids = [...new Set([...coreParts, ...profile.parts])]
  // Only keep parts that exist in the library so a typo never reaches the model.
  const parts = ids.map((id) => brickById.get(id)).filter((brick): brick is NonNullable<typeof brick> => Boolean(brick && brick.pack === 'lego'))
  return { label: profile.label, parts, techniques: profile.techniques }
}
