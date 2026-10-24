# Interactive 3D Exploded View, Auto-Build & Antigravity Studio Customizations

## Problem Statement
How might we let builders inspect internal SNOT connections and watch their 3D LEGO creations assemble dynamically on screen, while equipping the repository with Antigravity rules and skills so any coding agent can safely extend LDraw parts and templates without breaking physical validation invariants?

## Phase 2 Evaluation & Stress-Test

### Direction A: 3D Exploded View & Auto-Build Turntable (`BrickScene.tsx` + `App.tsx`)
- **User Value (Painkiller)**: Complex SNOT and multi-layer Creator builds hide interior support bricks inside the core. An interactive **Explode Factor slider (`0%` to `100%`)** radially and vertically separates layers in real time so users can inspect every hidden stud connection without opening the modal manual. An **Auto-Build Play/Pause toggle** animates the build step-by-step directly in the main 3D viewport.
- **Feasibility**: High. `BrickScene.tsx` already computes each brick's world position from `pose`. Applying a reversible visual offset $\Delta \vec{p}$ proportional to `explodeFactor` (vertical expansion along $Y$ + radial expansion from the model centroid in $X/Z$) requires zero changes to the underlying `BuildPlan` coordinates.
- **Differentiation**: Brings BrickLink Studio / Apple-style interactive 3D exploded inspection directly into the browser editor.

### Direction B: Antigravity Workspace Customizations (`AGENTS.md`, `.agents/rules/`, `.agents/skills/`)
- **User Value (Multiplier)**: `scripts/validate-builds.mjs` enforces strict, non-obvious invariants (e.g., `buildLlmUserPrompt` must never contain the word `steps`, 10 default assets must retain exact piece counts, `0.4` plate / `1.2` brick world stud math). Encoding these into `AGENTS.md` and `.agents/rules/lego-physics-invariants.md` prevents future agent sessions from accidentally breaking tests.
- **Feasibility**: High. Uses Antigravity's native hierarchical discovery (`AGENTS.md`, `.agents/rules/`, `.agents/skills/`).
- **Differentiation**: Turns the repository into a self-documenting, agent-ready LEGO studio with repeatable runbooks (`add-ldraw-part` and `create-lego-template`).

## Key Assumptions to Validate
- [ ] **Visual-only Exploded Offset**: Offsetting meshes in `BrickScene.tsx` during Exploded View will not corrupt brick selection or drag-nudge coordinates. *Validation*: Keep `plan.bricks` immutable during exploded view and apply the offset purely in the Three.js mesh group transform.
- [ ] **Auto-Build Step Playback**: Playing through `plan.steps` on the main 3D canvas at ~700ms per step feels smooth and highlights newly placed bricks clearly. *Validation*: Reuse the `highlightedIds` outline shader in `BrickScene.tsx` for the active step's bricks.
- [ ] **Progressive Disclosure Efficiency**: Splitting `AGENTS.md` (always-on summary) from `.agents/skills/add-ldraw-part/SKILL.md` and `.agents/skills/create-lego-template/SKILL.md` (loaded on-demand) keeps the default context lean.

## MVP Scope
1. **3D Exploded View Slider & Auto-Build Player**:
   - Floating/toolbar controls in the 3D scene header:
     - **Tách lớp 3D (Explode View)**: Toggle button + range slider (`0` to `100%`) that smoothly separates layers vertically ($Y$) and radially ($X, Z$) from the model center.
     - **Trình diễn Lắp tự động (Auto-Build)**: Play/Pause button that animates the model building from Step 1 to the final step directly on the main 3D canvas, highlighting each newly added sub-assembly.
2. **Antigravity Customization Suite**:
   - [`AGENTS.md`](file:///d:/MyProject/lego-ai-designer/AGENTS.md): Concise project architecture, commands, and non-negotiable invariants.
   - [`.agents/rules/lego-physics-invariants.md`](file:///d:/MyProject/lego-ai-designer/.agents/rules/lego-physics-invariants.md): Always-on guardrails for coordinate math, LLM prompt regex constraints, and LDraw geometry rules.
   - [`.agents/skills/add-ldraw-part/SKILL.md`](file:///d:/MyProject/lego-ai-designer/.agents/skills/add-ldraw-part/SKILL.md): Step-by-step skill for adding new LDraw parts, connectors, official colors, and BrickLink aliases.
   - [`.agents/skills/create-lego-template/SKILL.md`](file:///d:/MyProject/lego-ai-designer/.agents/skills/create-lego-template/SKILL.md): Step-by-step skill for authoring and validating new LEGO build templates and Prefab sub-assemblies.

## Not Doing (and Why)
- **Physics-engine rigid-body explosion (Cannon.js / Rapier)**: Uncontrolled falling bricks don't help users understand how to assemble the model; deterministic radial + vertical layer separation is much clearer.
- **Modifying default asset piece counts in `finishedAssets.ts`**: `scripts/validate-builds.mjs` locks the exact piece counts of the 10 default assets; new templates should be added as Prefab modules or optional gallery presets without mutating the 10 locked regression assets.
