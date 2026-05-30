# Testing

## Current State
**No tests exist.** The project has zero test files, no test framework configured, and no test scripts in package.json.

## What Should Be Tested

### Unit Tests (High Priority)
- `analyticsStorage.ts` — CRUD operations, data aggregation, import/export
- `genderHeuristics.ts` — Female boost calculation, hair analysis, face shape
- `imagePreprocessing.ts` — Gamma, contrast, sharpen, denoise functions
- `useAdQueue.ts` — Queue scoring algorithm, reordering logic
- Ad scoring algorithm — correct prioritization based on demographics

### Integration Tests
- Detection pipeline end-to-end (mock video → detection results)
- Analytics recording flow (capture session → storage → dashboard display)
- Ad selection cycle (detection → demographics → queue reorder → ad play)

### Component Tests
- SettingsPanel — slider values, toggle states
- AdManager — add/edit/delete ads
- VideoPlayer — capture window timing
- WebcamPreview — bounding box rendering

### E2E Tests
- Full user flow: Landing → Dashboard → Start Detection → Capture → Queue Reorder
- Manager Analytics: Login → View Data → Export → Clear
- Model Evaluation: Login → Label Faces → View Metrics

## Recommended Test Stack
- **Vitest** — Compatible with Vite, fast, TypeScript-native
- **React Testing Library** — Component testing
- **Playwright** or **Cypress** — E2E browser testing
