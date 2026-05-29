# Architecture

## System Design
Pure client-side SPA with zero backend dependencies. All AI inference, data storage, and business logic runs in the browser. The system is designed for offline-capable digital signage screens.

## Component Architecture

### Pages (src/pages/)
| Page | Route | Purpose |
|------|-------|---------|
| LandingPage | `/` | Marketing/hero page with team info, features, tech badges |
| Index → SmartAdsSystem | `/dashboard` | Core application — detection + ad playback |
| ModelEvaluation | `/admin/evaluation` | Password-protected accuracy analysis dashboard |
| ManagerAnalytics | `/manager/analytics` | Password-protected audience analytics dashboard |
| NotFound | `*` | 404 fallback |

### Core Components (src/components/)
| Component | Size | Role |
|-----------|------|------|
| WebcamPreview | 26KB | Live video feed + canvas bounding box overlay + labeling UI |
| SettingsPanel | 22KB | Comprehensive detection config dialog |
| AdManager | 15KB | Ad library CRUD (add/edit/delete ads) |
| DemographicStats | 10KB | Gender/age distribution bars + capture summary |
| VideoPlayer | 9KB | HTML5 video player with custom controls + capture indicators |
| ManualQueueEditor | 8KB | Custom playlist management |
| DebugOverlay | 7KB | Detection metrics overlay (FPS, latency, backend) |
| InputSourceSelector | 5KB | Webcam/video/screen source picker |
| CaptureSessionSummary | 5KB | Post-capture audience summary |
| AdQueue | 4KB | Next-2-ads queue display |
| SystemLogs | 3KB | Scrollable log viewer |
| ThemeToggle | 1KB | Dark/light mode switch |
| ThemeProvider | 1KB | Theme context provider |
| NavLink | 1KB | Navigation link component |

### Custom Hooks (src/hooks/)
| Hook | Size | Role |
|------|------|------|
| useFaceDetection | 32KB | **Core engine** — multi-pass face detection pipeline, temporal tracking, vote aggregation, bias correction |
| useHybridDetection | 16KB | YOLO + face-api.js hybrid detection orchestration |
| useYoloFaceDetection | 9KB | YOLOv8-face model loading and inference |
| useAdQueue | 8KB | Ad queue scoring, reordering, and selection logic |
| useWebcam | 6KB | Input source management (webcam/video/screen) |
| use-toast | 4KB | Toast notification hook |
| use-mobile | 1KB | Mobile device detection |

### Utilities (src/utils/)
| File | Size | Role |
|------|------|------|
| genderHeuristics | 11KB | Female boost, hair analysis, face shape analysis |
| yoloModelDownloader | 9KB | YOLO model download/cache via IndexedDB |
| analyticsStorage | 8KB | localStorage-based analytics CRUD + aggregation |
| imagePreprocessing | 7KB | Gamma, contrast, sharpen, denoise pipeline |

## Data Flow

```
Camera/Video Input
    ↓
[useWebcam] — manages MediaStream
    ↓
[WebcamPreview] — renders video + canvas
    ↓
[useFaceDetection] — multi-pass detection pipeline
    ├── Image Preprocessing (gamma, contrast, sharpen, denoise)
    ├── Face Detection (TinyFace + SSD MobileNet + optional YOLO)
    ├── Detection Filtering (size, aspect, score thresholds)
    ├── Demographic Classification (AgeGenderNet)
    ├── Bias Correction (female boost, hair heuristics)
    └── Temporal Tracking (IoU matching, vote aggregation)
    ↓
[DemographicStats] — shows detected audience
    ↓
[useAdQueue] — scores and reorders ad queue
    ↓
[VideoPlayer] — plays most relevant ad
    ↓
[analyticsStorage] — records session to localStorage
    ↓
[ManagerAnalytics] — visualizes historical data
```

## Data Persistence
| Storage | Key | Data |
|---------|-----|------|
| localStorage | `smartads-custom-ads` | Custom ad library |
| localStorage | `smartads-manual-queue` | Manual playlist |
| localStorage | `smartads-evaluation-sessions` | Ground truth labels |
| localStorage | `smartads-analytics-events` | Analytics events (max 10K) |
| localStorage | `smartads-analytics-sessions` | Analytics sessions |
| sessionStorage | `smartads-admin-authenticated` | Admin auth state |
| sessionStorage | `smartads-manager-auth` | Manager auth state |
| IndexedDB | YOLO model cache | Downloaded YOLO weights |

## Key Design Patterns
- **Hooks as services**: All business logic encapsulated in custom hooks
- **Component composition**: shadcn/ui primitives composed into domain components
- **CSS custom properties**: Theme colors via HSL variables in `:root` / `.dark`
- **Path aliases**: `@/` maps to `src/` via Vite + TypeScript config
- **No state management library**: React useState/useCallback/useMemo throughout
- **No backend API**: Designed to be fully self-contained per screen
