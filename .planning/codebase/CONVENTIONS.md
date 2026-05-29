# Coding Conventions

## Language & Typing
- **TypeScript strict mode** enabled
- All data structures defined as interfaces in `src/types/`
- Consistent use of discriminated unions for gender (`'male' | 'female'`) and age (`'kid' | 'young' | 'adult'`)
- No `any` types observed in type definitions

## Component Patterns
- **Functional components only** — no class components
- **Arrow function exports**: `const Component = () => { ... }; export default Component;`
- **React hooks**: useState, useEffect, useCallback, useMemo, useRef extensively used
- **Custom hooks**: All business logic encapsulated in `src/hooks/`
- **Inline styles**: Minimal — Tailwind classes preferred

## Styling
- **Tailwind CSS utility classes** throughout
- **shadcn/ui** component library for all UI primitives
- **CSS custom properties** for theming (HSL format: `--primary: 199 89% 42%`)
- **`cn()` utility** from `src/lib/utils.ts` for conditional classes
- **No CSS modules** or styled-components

## File Organization
- **Flat component directory**: All custom components in `src/components/` (no subdirectories except `ui/`)
- **Page-per-route**: Each route has a corresponding page in `src/pages/`
- **Colocation**: Types, hooks, and utils each have dedicated directories
- **Path alias**: `@/` → `src/` used consistently

## Naming Conventions
| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `AdManager.tsx`, `VideoPlayer.tsx` |
| Hooks | camelCase with `use` prefix | `useFaceDetection.ts`, `useAdQueue.ts` |
| Utils | camelCase | `analyticsStorage.ts`, `genderHeuristics.ts` |
| Types | PascalCase interfaces | `AdMetadata`, `TrackedFace`, `DetectionResult` |
| CSS vars | kebab-case | `--background`, `--primary`, `--muted-foreground` |
| localStorage keys | kebab-case with `smartads-` prefix | `smartads-custom-ads`, `smartads-analytics-events` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_EVENTS`, `DETECTION_TIMEOUT`, `MANAGER_PASSWORD` |

## Import Order (observed)
1. React imports
2. Third-party libraries (react-router, recharts, lucide, etc.)
3. shadcn/ui components (`@/components/ui/...`)
4. Custom components (`@/components/...`)
5. Hooks (`@/hooks/...`)
6. Utils (`@/utils/...`)
7. Types (`@/types/...`)
8. Data (`@/data/...`)

## Code Quality Notes
- **No test files** exist anywhere in the project
- **No CI/CD** configuration
- **No pre-commit hooks** or formatting configuration (Prettier not installed)
- **ESLint** configured with react-hooks and react-refresh plugins
- **Large monolithic files**: SmartAdsSystem.tsx (58KB), ModelEvaluation.tsx (35KB) could benefit from decomposition
