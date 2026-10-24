# LEGO AI Designer — Agent Guidelines (`AGENTS.md`)

## Project Overview
`lego-ai-designer` is a browser-based 3D LEGO CAD & AI design studio built with React 19, Three.js (`@react-three/fiber`), LDraw part geometry, and a multi-provider LLM engine (OpenAI, Gemini, Anthropic, DeepSeek, Groq, Ollama, OpenRouter, and local `9router`).

## Essential Commands
- **Dev Server**: `npm run dev` (serves at `http://localhost:5173/lego-ai-designer/` with `/api/llm/chat` local proxy)
- **Typecheck & Build**: `npm run build` (`tsc -b && vite build`)
- **Lint**: `npm run lint`
- **Physical & Regression Validation (Mandatory before commit)**: `npm run validate:builds`

## Core Architecture Map
- `src/data/basicBricks.ts`: Master brick catalogue, footprints, stud/tube/pin/bar connectors, and official color tables.
- `src/lib/brickUnits.ts`: Coordinate grid math (`PLATE_HEIGHT_WORLD = 0.4`, standard brick height `1.2` studs, 5 plates = 2 studs SNOT ratio).
- `src/lib/planUtils.ts`: Voxel collision detection, stud/tube/side-stud support solver, and `validateBuildPlan`.
- `src/lib/promptPalette.ts` & `src/lib/prefabModules.ts`: Category classifier (`vehicle`, `character`, `creature`, `building`, `nature`, `general`), curated 40–50 part palettes, and verified SNOT/Creator sub-assembly blueprints.
- `src/lib/llmGenerator.ts`: 2-Pass LLM generation (Core Structure -> SNOT & Curved Slope Detailing), Physical Validator Self-Repair Loop, Vision-to-LEGO (`image_url`), and Interactive AI Remix.
- `src/lib/manualSerializer.ts` & `src/lib/bricklinkExport.ts`: Step-by-step instruction manual serializer (Smart Layer grouping, LDraw `.ldr`, HTML, Markdown) and BrickLink Wanted List XML + Physical Spec/Cost Estimator.
- `src/components/BrickScene.tsx`: Three.js 3D viewport with LDraw meshes, stud/tube debug overlays, Exploded View, and Auto-Build playback.

## Non-Negotiable Regression Invariants (`scripts/validate-builds.mjs`)
1. **`buildLlmUserPrompt` Constraints**:
   - Must **NEVER** contain the word `steps` (case-insensitive `/\bsteps\b/i`) or `brickIndexes` anywhere in the returned string (use `layers`, `stages`, or `tiers` instead).
   - Must contain `'Use 1 to ' + maxLlmBricks + ' bricks.'`.
   - Must not include `'minecraft-basic-block'`.
   - Must end with `Good official-replica example, calibrated from LEGO Classic 10696 Ghost:\n{...}` matching `generateBuildPlan({ prompt: '一个 Classic 小幽灵' })`.
2. **Default Finished Assets (`src/lib/finishedAssets.ts`)**:
   - The 10 default finished assets (`finished-ghost`, `finished-bridge`, `finished-house`, `finished-castle`, `finished-bench`, `finished-rocket`, `finished-flower`, `finished-robot`, `finished-tree`, `finished-duck`) have locked IDs and exact piece counts tested by `scripts/validate-builds.mjs`. Do not alter their piece counts or re-enable retired Classic templates.
3. **LLM Provider Compatibility**:
   - Never send `enable_thinking`, `thinking`, `reasoning_effort`, or `reasoning` when `enableThinking` is `false`.
   - Strip trailing `data: [DONE]` before `JSON.parse` for SSE-compatible local routers (`9router` on `:20128`).
