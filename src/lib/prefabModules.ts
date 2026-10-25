import type { BuildCategory } from './promptPalette'

export type PrefabModule = {
  id: string
  name: string
  category: BuildCategory
  description: string
  sampleBricks: Array<{
    brickId: string
    color: string
    xStud: number
    yStud: number
    zStud: number
    rotationQuarterTurns: 0 | 1 | 2 | 3
    verticalQuarterTurns: 0 | 1 | 2 | 3
  }>
}

/**
 * Verified LEGO Creator / Speed Champions / BrickHeadz micro-assemblies.
 * Every coordinate is aligned to the 0.4-stud plate / 1.2-stud brick vertical grid
 * so the LLM can copy or adapt the exact relative offsets without floating parts.
 */
export const PREFAB_MODULES: Record<BuildCategory, PrefabModule[]> = {
  vehicle: [
    {
      id: 'speed-champions-chassis-nose',
      name: 'Speed Champions Low Chassis & Curved Hood Assembly',
      category: 'vehicle',
      description: 'Low plate chassis (y=0) with SNOT headlight bricks at the nose (y=0.4) and aerodynamic curved slopes over the hood and fenders (y=1.6).',
      sampleBricks: [
        { brickId: 'plate-2x6', color: 'black', xStud: 2, yStud: 0, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'plate-1x4', color: 'gray', xStud: 1, yStud: 0, zStud: 0, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'headlight-brick-1x1', color: 'red', xStud: 1, yStud: 0.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x2', color: 'red', xStud: 2, yStud: 0.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'headlight-brick-1x1', color: 'red', xStud: 4, yStud: 0.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-curved-4x1', color: 'red', xStud: 1, yStud: 1.6, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-curved-3x2', color: 'white', xStud: 2, yStud: 1.6, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-curved-4x1', color: 'red', xStud: 4, yStud: 1.6, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
      ],
    },
  ],
  character: [
    {
      id: 'creator-biped-mecha-core',
      name: 'Creator Upright Bipedal Robot (26-Part Sand-Blue & Bluish-Gray Skeleton with SNOT Forward Eyes)',
      category: 'character',
      description: 'Two separated 2-tier legs (x=1 and x=4, y=0..2.8), spanning pelvis (y=2.8), 2-tier torso with shoulder bridge (y=3.2..5.6), left & right arms (x=0 and x=5), 2x2 neck (y=5.6), SNOT headlight head (y=6.0) with forward-facing eyes (y=6.2, z=1.8, verticalQuarterTurns=1), and top antenna.',
      sampleBricks: [
        { brickId: 'plate-1x2', color: 'gray', xStud: 1, yStud: 0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'plate-1x2', color: 'gray', xStud: 4, yStud: 0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'gray', xStud: 1, yStud: 0.4, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'gray', xStud: 4, yStud: 0.4, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'cyan', xStud: 1, yStud: 1.6, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'cyan', xStud: 4, yStud: 1.6, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'plate-2x4', color: 'gray', xStud: 1, yStud: 2.8, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x4', color: 'cyan', xStud: 1, yStud: 3.2, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'plate-2x6', color: 'gray', xStud: 0, yStud: 4.4, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x4', color: 'cyan', xStud: 1, yStud: 4.8, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'gray', xStud: 0, yStud: 4.8, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'gray', xStud: 5, yStud: 4.8, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'slope-cheese-1x1', color: 'blue', xStud: 0, yStud: 6.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-cheese-1x1', color: 'blue', xStud: 5, yStud: 6.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'round-1x1-plate', color: 'cyan', xStud: 0, yStud: 6.0, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'round-1x1-plate', color: 'cyan', xStud: 5, yStud: 6.0, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'tile-1x2', color: 'gray', xStud: 1, yStud: 6.0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'tile-1x2', color: 'gray', xStud: 4, yStud: 6.0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'plate-2x2', color: 'gray', xStud: 2, yStud: 6.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'cyan', xStud: 2, yStud: 6.4, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-side-studs-1x1', color: 'cyan', xStud: 2, yStud: 6.4, zStud: 3, rotationQuarterTurns: 2, verticalQuarterTurns: 0 },
        { brickId: 'brick-side-studs-1x1', color: 'cyan', xStud: 3, yStud: 6.4, zStud: 3, rotationQuarterTurns: 2, verticalQuarterTurns: 0 },
        { brickId: 'tile-eye-1x1', color: 'white', xStud: 2, yStud: 6.6, zStud: 4, rotationQuarterTurns: 2, verticalQuarterTurns: 1 },
        { brickId: 'tile-eye-1x1', color: 'white', xStud: 3, yStud: 6.6, zStud: 4, rotationQuarterTurns: 2, verticalQuarterTurns: 1 },
        { brickId: 'plate-2x2', color: 'blue', xStud: 2, yStud: 7.6, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-round-1x1', color: 'gray', xStud: 2, yStud: 8.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'round-1x1-plate', color: 'cyan', xStud: 2, yStud: 9.2, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'tile-grille-1x2', color: 'gray', xStud: 2, yStud: 8.0, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
      ],
    },
    {
      id: 'creator-brickheadz-police',
      name: 'BrickHeadz Police Officer Minifigure (33-Part Uniform, SNOT Badge, Yellow Head & Visor Cap)',
      category: 'character',
      description: 'Brick-built LEGO Police Officer with black shoes, dark-blue trousers, black belt, light-blue (cyan) shirt with vertical dark-blue tie, SNOT gold police badge on the chest, light-blue sleeves with yellow hands, yellow head with SNOT forward eyes, and dark-blue peaked baseball cap.',
      sampleBricks: [
        { brickId: 'plate-1x2', color: 'black', xStud: 1, yStud: 0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'plate-1x2', color: 'black', xStud: 4, yStud: 0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'blue', xStud: 1, yStud: 0.4, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'blue', xStud: 4, yStud: 0.4, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'blue', xStud: 1, yStud: 1.6, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'blue', xStud: 4, yStud: 1.6, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'plate-2x4', color: 'black', xStud: 1, yStud: 2.8, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x4', color: 'cyan', xStud: 1, yStud: 3.2, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x1', color: 'cyan', xStud: 1, yStud: 3.2, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x1', color: 'blue', xStud: 2, yStud: 3.2, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'cyan', xStud: 3, yStud: 3.2, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'plate-2x6', color: 'cyan', xStud: 0, yStud: 4.4, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x4', color: 'cyan', xStud: 1, yStud: 4.8, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x1', color: 'cyan', xStud: 1, yStud: 4.8, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x1', color: 'blue', xStud: 2, yStud: 4.8, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-side-studs-1x1', color: 'cyan', xStud: 3, yStud: 4.8, zStud: 3, rotationQuarterTurns: 2, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x1', color: 'cyan', xStud: 4, yStud: 4.8, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'round-1x1-plate', color: 'yellow', xStud: 3, yStud: 5.0, zStud: 4, rotationQuarterTurns: 2, verticalQuarterTurns: 1 },
        { brickId: 'brick-1x2', color: 'cyan', xStud: 0, yStud: 4.8, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'cyan', xStud: 5, yStud: 4.8, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'slope-cheese-1x1', color: 'cyan', xStud: 0, yStud: 6.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-cheese-1x1', color: 'cyan', xStud: 5, yStud: 6.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'round-1x1-plate', color: 'yellow', xStud: 0, yStud: 6.0, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'round-1x1-plate', color: 'yellow', xStud: 5, yStud: 6.0, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'tile-1x2', color: 'cyan', xStud: 1, yStud: 6.0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'tile-1x2', color: 'cyan', xStud: 4, yStud: 6.0, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'plate-2x2', color: 'yellow', xStud: 2, yStud: 6.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'yellow', xStud: 2, yStud: 6.4, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-side-studs-1x1', color: 'yellow', xStud: 2, yStud: 6.4, zStud: 3, rotationQuarterTurns: 2, verticalQuarterTurns: 0 },
        { brickId: 'brick-side-studs-1x1', color: 'yellow', xStud: 3, yStud: 6.4, zStud: 3, rotationQuarterTurns: 2, verticalQuarterTurns: 0 },
        { brickId: 'tile-eye-1x1', color: 'white', xStud: 2, yStud: 6.6, zStud: 4, rotationQuarterTurns: 2, verticalQuarterTurns: 1 },
        { brickId: 'tile-eye-1x1', color: 'white', xStud: 3, yStud: 6.6, zStud: 4, rotationQuarterTurns: 2, verticalQuarterTurns: 1 },
        { brickId: 'plate-2x3', color: 'blue', xStud: 2, yStud: 7.6, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'blue', xStud: 2, yStud: 8.0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-1x2', color: 'blue', xStud: 2, yStud: 8.0, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'tile-1x2', color: 'blue', xStud: 2, yStud: 8.0, zStud: 4, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
      ],
    },
  ],
  creature: [
    {
      id: 'creator-quadruped-body',
      name: 'Creator Quadruped Stance, Curved Back & SNOT Forward-Eye Head',
      category: 'creature',
      description: 'Four distinct paws at y=0, spanning belly brick at y=1.2, sculpted curved-slope spine at y=2.4, and forward head with headlight bricks and SNOT forward-facing eye tiles.',
      sampleBricks: [
        { brickId: 'brick-1x2', color: 'orange', xStud: 1, yStud: 0, zStud: 1, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'orange', xStud: 4, yStud: 0, zStud: 1, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'orange', xStud: 1, yStud: 0, zStud: 4, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'orange', xStud: 4, yStud: 0, zStud: 4, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x4', color: 'orange', xStud: 1, yStud: 1.2, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x4', color: 'orange', xStud: 1, yStud: 1.2, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-curved-3x2', color: 'orange', xStud: 2, yStud: 2.4, zStud: 2, rotationQuarterTurns: 1, verticalQuarterTurns: 0 },
        { brickId: 'headlight-brick-1x1', color: 'orange', xStud: 2, yStud: 2.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'headlight-brick-1x1', color: 'orange', xStud: 3, yStud: 2.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'tile-eye-1x1', color: 'white', xStud: 2, yStud: 2.6, zStud: 0.8, rotationQuarterTurns: 0, verticalQuarterTurns: 1 },
        { brickId: 'tile-eye-1x1', color: 'white', xStud: 3, yStud: 2.6, zStud: 0.8, rotationQuarterTurns: 0, verticalQuarterTurns: 1 },
        { brickId: 'slope-1x2', color: 'orange', xStud: 2, yStud: 3.6, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
      ],
    },
  ],
  building: [
    {
      id: 'creator-arch-facade-roof',
      name: 'Creator Architectural Archway & Pitched Slope Roof',
      category: 'building',
      description: 'Baseplate at y=0, corner columns with central arch-1x4 doorway at y=0.4, tie-beam plate at y=1.6, and pitched slope-2x4 roof above.',
      sampleBricks: [
        { brickId: 'plate-6x8', color: 'green', xStud: 0, yStud: 0, zStud: 0, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'white', xStud: 0, yStud: 0.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'arch-1x4', color: 'tan', xStud: 1, yStud: 0.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-1x2', color: 'white', xStud: 5, yStud: 0.4, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'plate-2x6', color: 'brown', xStud: 0, yStud: 1.6, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-2x4', color: 'red', xStud: 1, yStud: 2.0, zStud: 1, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
      ],
    },
  ],
  nature: [
    {
      id: 'botanical-tree-canopy',
      name: 'Botanical Rooted Trunk & Layered Curved Canopy',
      category: 'nature',
      description: 'Meadow baseplate at y=0, central trunk column rising from y=0.4 to y=2.8, and spreading canopy platform with curved slopes and round blossoms.',
      sampleBricks: [
        { brickId: 'plate-4x4', color: 'green', xStud: 2, yStud: 0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x2', color: 'brown', xStud: 3, yStud: 0.4, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x2', color: 'brown', xStud: 3, yStud: 1.6, zStud: 3, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'plate-4x4', color: 'green', xStud: 2, yStud: 2.8, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-curved-3x2', color: 'lime', xStud: 2, yStud: 3.2, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'round-1x1-plate', color: 'pink', xStud: 4, yStud: 3.2, zStud: 4, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
      ],
    },
  ],
  general: [
    {
      id: 'creator-sculpted-pedestal',
      name: 'Creator Beveled Core with Smooth Tile Finish',
      category: 'general',
      description: 'Sturdy baseplate at y=0, interlocked brick core at y=0.4, and curved-slope + smooth-tile cap at y=1.6.',
      sampleBricks: [
        { brickId: 'plate-4x4', color: 'gray', xStud: 2, yStud: 0, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x4', color: 'blue', xStud: 2, yStud: 0.4, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'brick-2x4', color: 'blue', xStud: 2, yStud: 0.4, zStud: 4, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'slope-curved-3x2', color: 'cyan', xStud: 2, yStud: 1.6, zStud: 2, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
        { brickId: 'tile-2x4', color: 'white', xStud: 2, yStud: 1.6, zStud: 4, rotationQuarterTurns: 0, verticalQuarterTurns: 0 },
      ],
    },
  ],
}

export const formatPrefabModulesForPrompt = (category: BuildCategory): string => {
  const modules = PREFAB_MODULES[category] ?? PREFAB_MODULES.general
  return modules
    .map(
      (mod) =>
        `Blueprint "${mod.name}" (${mod.description}):\n` +
        mod.sampleBricks
          .map(
            (b) =>
              `  {"brickId":"${b.brickId}","color":"${b.color}","xStud":${b.xStud},"yStud":${b.yStud},"zStud":${b.zStud},"rotationQuarterTurns":${b.rotationQuarterTurns},"verticalQuarterTurns":${b.verticalQuarterTurns}}`,
          )
          .join('\n'),
    )
    .join('\n\n')
}
