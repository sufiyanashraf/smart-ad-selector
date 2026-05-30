# Concerns & Technical Debt

## Critical Issues

### 1. No Backend / No Database
- **Impact**: HIGH — All data in localStorage (5-10MB limit per origin)
- **Risk**: Data loss on browser clear, no multi-screen sync, no central admin
- **Current state**: `analyticsStorage.ts` explicitly designed for migration ("Designed so that migrating to cloud later means swapping only this file")

### 2. Hardcoded Credentials
- **Impact**: MEDIUM — Passwords visible in source code
- **Locations**: 
  - `ManagerAnalytics.tsx`: `MANAGER_PASSWORD = 'smartads1234'`
  - `ModelEvaluation.tsx`: `smartads1234` (same)
- **Risk**: No real auth, no user management

### 3. Monolithic Components
- **Impact**: MEDIUM — Maintainability and performance
- **Files**:
  - `SmartAdsSystem.tsx` (58KB) — entire dashboard in one component
  - `ModelEvaluation.tsx` (35KB) — evaluation dashboard as single component
  - `useFaceDetection.ts` (32KB) — detection pipeline as single hook
- **Risk**: Difficult to modify, test, or debug individual features

### 4. No Ad Rotation Fairness Algorithm
- **Impact**: HIGH — User explicitly mentioned this as a core requirement
- **Current state**: Queue scoring picks top 2 ads by score, but same ad can dominate if it consistently scores highest
- **Needed**: Round-robin or weighted rotation ensuring all matching ads get play time

### 5. localStorage Data Limits
- **Impact**: HIGH — Analytics capped at 10,000 events
- **Risk**: Long-running screens will silently drop old data
- **No backup/export automation**: Manual JSON export only

## Moderate Issues

### 6. No Screen Identity
- **Impact**: MEDIUM — No concept of "which screen am I"
- **Needed for**: Multi-screen admin dashboard ("Screen 1 from North Outlet")
- **Current state**: Every instance is anonymous

### 7. No Real-time Communication
- **Impact**: MEDIUM — No WebSocket, SSE, or polling to central server
- **Needed for**: Live admin dashboard showing all screens

### 8. YOLO Integration Incomplete
- **Known limitation**: Documentation states "YOLOv8-face integration is planned but not fully implemented"
- **Code exists**: `useYoloFaceDetection.ts` and `useHybridDetection.ts` have implementation but may have edge cases

### 9. No Error Boundaries
- **Risk**: Unhandled React errors crash entire app — critical for kiosk/signage use case

### 10. Mobile UI Not Optimized
- **Documentation notes**: "UI not optimized for mobile screens"
- **Minor** for signage use case (screens are large displays)

## Low Priority

### 11. Dual Lockfiles
- Both `package-lock.json` and `bun.lock` exist — potential inconsistency

### 12. No Automated Deployment
- No CI/CD, no Docker, no deployment scripts

### 13. Sample Ads Hardcoded
- 6 sample ads defined in `src/data/sampleAds.ts` with potentially broken external URLs

### 14. No Offline Service Worker
- Despite being designed for offline use, no PWA/service worker for true offline capability

### 15. Performance on Low-End Devices
- TensorFlow.js + WebGL on kiosk hardware may have issues
- No performance profiling or benchmarks documented
