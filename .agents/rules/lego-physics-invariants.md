# LEGO Physics & Coordinate Invariants

## 1. World Stud & Plate Coordinate Math
- Horizontal grid (`xStud`, `zStud`): `1.0` stud = `8.0 mm` in real LEGO dimensions.
- Vertical grid (`yStud`):
  - `1 plate` (and `1 tile`) height = `0.4` world studs (`3.2 mm`).
  - `1 standard brick` height = `1.2` world studs (`3 plates` = `9.6 mm`).
  - Tall slopes (`slope-2x1x2`, `arch-1x3x2-curved`) = `2.4` world studs (`6 plates`).
  - `curved-slope-1x2` (`6091`) = `1.6` world studs (`4 plates`).
- **SNOT 5:2 Ratio**: `5 plates` stacked (`5 * 0.4 = 2.0` world studs) equal exactly `2.0` horizontal studs.
- Stacking formula: When placing brick B directly on top of brick A, `yStud(B) = Number((yStud(A) + heightStuds(A)).toFixed(1))`.

## 2. Physical Validation Rules (`validateBuildPlan`)
- Every brick at `yStud > 0` must be supported by an underlying stud/tube connection, SNOT side-stud connection (`headlight-brick-1x1`, `brick-side-studs-*`, `bracket-1x2-2x2`), clip/bar connection, or pin connection.
- Voxel cells (`solid`, `socket`, `studsocket`, `enterable`) must not overlap between two placed bricks (`hasBrickCollision`).
- Visual-only effects (such as 3D Exploded View or animations in `BrickScene.tsx`) must **never** mutate `brick.pose` inside `BuildPlan`; apply visual offsets strictly at the Three.js mesh group level.

## 3. Prompt & Regression Safety
- Before finishing any change to `src/data/`, `src/lib/`, or `src/components/`, always run `npm run validate:builds` and ensure exit code `0`.
