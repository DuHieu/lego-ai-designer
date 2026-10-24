---
name: add-ldraw-part
description: >-
  Guides the agent through adding a new LDraw LEGO part to LEGO AI Designer,
  including footprint definition, stud/tube/SNOT connectors, official part colors,
  category palette registration, and BrickLink XML mapping. Use this skill when
  the user asks to add a new LEGO brick, slope, tile, SNOT part, or LDraw .dat part.
---

# Add LDraw Part Skill

Follow this checklist whenever adding a new LEGO part to the library.

## Step 1: Register Official Colors (`src/data/officialPartColors.ts`)
1. Check `src/data/officialPartColors.ts` and ensure the LDraw `partNumber` has a non-empty array of valid `BrickColor` values in `officialPartColorsByPartNumber`.
2. Note: `scripts/validate-builds.mjs` fails if any LEGO part in `brickDefinitions` is missing from `officialPartColorsByPartNumber` or has an empty `colors` array.

## Step 2: Define the Part in `src/data/basicBricks.ts`
1. Add a `BrickDefinition` object with:
   - `id`: kebab-case identifier (e.g., `'slope-curved-2x2'`)
   - `pack`: `'lego'`
   - `partNumber`: official LDraw / LEGO design ID (e.g., `'15068'`)
   - `name`: human-readable name
   - `kind`: `'brick' | 'plate' | 'tile' | 'slope' | 'round' | 'cone'`
   - `footprint`: `{ widthStuds, depthStuds, heightStuds }` where `1 plate = 0.4` and `1 brick = 1.2`
   - `connectors`: top `stud` (male) and bottom `tube` (female) connectors, plus any side-stud (`axis: 'x' | 'z'`) connectors for SNOT parts.
   - `colors`: `getOfficialColors(partNumber, fallbackColors)`

## Step 3: Add to Category Palettes & BrickLink Mapping
1. Add the new part `id` to the relevant category profile(s) in `src/lib/promptPalette.ts` (`vehicle`, `character`, `creature`, `building`, `nature`, or `general`).
2. If BrickLink uses a suffixed ID (such as `b` for groove tiles), add the alias to `bricklinkPartAlias` in `src/lib/bricklinkExport.ts`.

## Step 4: Validate
1. Run `npm run validate:builds` and `npx tsc -b` to verify connector alignment, color coverage, and zero regressions.
