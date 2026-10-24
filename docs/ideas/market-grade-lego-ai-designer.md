# Market-Grade LEGO AI Designer

## Problem Statement
How might we take LEGO AI Designer from stacked, voxel-like blocks to models that look like retail sets (Creator, Speed Champions, BrickHeadz), with smooth surfaces and SNOT details, that people can actually buy parts for and build?

## Recommended Direction
Don't push the whole LDraw catalogue at the LLM. Give it **fewer parts, with better reasoning attached**. Each request is sorted into a build category (vehicle, character, creature, building, nature, general). The model then gets a curated palette of about 40–50 parts for that category, plus the specific techniques LEGO designers use for it: SNOT mounting, curved slopes to remove the stair-step look, and tiling to hide studs. The existing collision, support and connector validation stays as the physical safety net.

The real-world loop closes with a BrickLink Wanted List export, so a generated model becomes a one-click shopping list.

Expanding to the full LDraw library (thousands of parts) is deferred on purpose. Context size and coordinate accuracy are the bottleneck today, not part count. The library already has the key SNOT enablers (`bracket-1x2-2x2`, `brick-side-studs-1x1/1x4`, `headlight-brick-1x1`), plus curved slopes, inverted slopes and tiles. They just weren't being surfaced with any guidance.

## Implemented in this iteration (MVP)
- `src/lib/promptPalette.ts`: prompt classifier (EN / VI / ZH keywords) → curated palette + design techniques per category. Unknown part ids are filtered against the library.
- `src/lib/llmGenerator.ts`: the prompt now uses the category palette and adds a SNOT geometry section (5 plates = 2 studs, side-stud mounting via `verticalQuarterTurns`). Slope heights now come from each part's listed height instead of a wrong blanket value of 1.2.
- `src/lib/bricklinkExport.ts` + manual dialog button: BrickLink Wanted List XML (part + color + quantity), with a color-id map and a small set of known part-id aliases.

## Key Assumptions to Validate
- [ ] A curated palette produces more recognizable models than the full list. Test: generate the same 6 prompts before and after with the same model and compare part variety, silhouette and blocking issues.
- [ ] Small models (gpt-4o-mini, llama-3.3-70b) can place SNOT parts correctly. Test: count how many side-mounted parts survive `normalizeBricks` without being nudged or dropped.
- [ ] BrickLink accepts the generated XML as-is. Test: upload one export at bricklink.com → Wanted → Upload and check for unknown part ids.
- [ ] The color mapping matches buyer expectations (e.g. `gray` → Light Bluish Gray 86, `cyan` → Medium Azure 156).

## Next Iterations
1. **Two-pass generation**: pass 1 blocks out the silhouette, pass 2 "skins" it with slopes, tiles and SNOT. Each pass gets validator feedback.
2. **Validator feedback loop**: send blocking issues (collisions, floating parts) back to the LLM for one repair round.
3. **Prefab sub-assemblies**: verified snippets (SNOT eye module, car nose, roof ridge) the model can reference by name.
4. **Rebrickable price / availability data** to prefer cheap, in-production parts.

## Not Doing (and Why)
- **Full LDraw catalogue in the prompt.** It blows up the context and worsens coordinate accuracy. Revisit once retrieval-based palettes exist.
- **LEGO Technic (liftarms, gears, tracks).** It needs a pin/axle mechanics solver the engine doesn't have, and wheels/axles are currently disabled.
- **Live BrickLink pricing in the app.** It needs API keys and OAuth; the XML upload covers the buying flow for now.
- **Image-to-model.** The reference image is passed only as a file name. A real vision pipeline is a separate project.

## Open Questions
- Should users be able to override the detected category (e.g. a dropdown next to the prompt)?
- Which part-id aliases fail on BrickLink in practice? Collect them from real uploads.
- Is around 17k characters of prompt acceptable for all providers' free tiers?
