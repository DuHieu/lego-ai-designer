---
name: create-lego-template
description: >-
  Guides the agent through designing, physically validating, and registering new
  3D LEGO build templates or Prefab SNOT sub-assemblies in LEGO AI Designer. Use
  this skill when the user asks to create a new sample build, prefab module, or
  starter template.
---

# Create LEGO Template & Prefab Skill

## Step 1: Coordinate Planning (`0.4` Plate / `1.2` Brick Grid)
1. Start all foundation pieces at `yStud: 0`.
2. For each subsequent layer, calculate `yStud(next) = Number((yStud(support) + heightStuds(support)).toFixed(1))`.
3. For character/creature builds, separate left and right feet at `yStud: 0` (e.g., `xStud: 1` and `xStud: 4`), then bridge them with a spanning pelvis plate (`plate-2x4`) before stacking the torso.
4. For SNOT side-stud mounting:
   - Place `headlight-brick-1x1` or `brick-side-studs-*` in the core.
   - Attach `tile-eye-1x1`, `tile-1x1`, or `slope-cheese-1x1` with `verticalQuarterTurns: 1` (or `3`) flush against the side stud.

## Step 2: Register as a Prefab Sub-Assembly (`src/lib/prefabModules.ts`)
1. Add the verified coordinate assembly to `PREFAB_MODULES[category]` in `src/lib/prefabModules.ts`.
2. **Important**: Never use the word `steps` or `brickIndexes` inside `src/lib/prefabModules.ts` descriptions or names (enforced by `scripts/validate-builds.mjs`).
3. Do **not** alter the 10 locked default assets in `src/lib/finishedAssets.ts` (`expectedDefaultAssetIds` and `expectedDefaultAssetPieceCounts` in `scripts/validate-builds.mjs`).

## Step 3: Physical Validation Test
1. Verify that the new assembly has `0` blocking issues by running a quick check with `validateBuildPlan` and `getBlockingBuildPlanIssues`.
2. Run `npm run validate:builds` to confirm all project invariants pass.
