# File Structure

```
smart-ad-selector/
├── public/
│   ├── models/                    # AI model weight files (TinyFace, SSD, AgeGender)
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── ads/                       # Ad video assets
│   │   ├── Female Ads/            # Female-targeted ad videos
│   │   └── Male Ads/              # Male-targeted ad videos
│   │
│   ├── assets/                    # Static assets
│   │   ├── Final_Logo.png         # App logo
│   │   ├── action.png             # Demo screenshot
│   │   └── team/                  # Team member photos
│   │       ├── Sufiyan.jpg
│   │       ├── Aliyan.jpg
│   │       └── mahnoor.jpg
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui component library (40+ components)
│   │   ├── AdManager.tsx          # Ad library CRUD interface
│   │   ├── AdQueue.tsx            # Queue display (next 2 ads)
│   │   ├── CaptureSessionSummary.tsx  # Post-capture viewer summary
│   │   ├── DebugOverlay.tsx       # Detection debug metrics
│   │   ├── DemographicStats.tsx   # Gender/age distribution bars
│   │   ├── InputSourceSelector.tsx    # Input source picker
│   │   ├── ManualQueueEditor.tsx  # Manual playlist editor
│   │   ├── NavLink.tsx            # Navigation link
│   │   ├── SettingsPanel.tsx      # Detection settings dialog
│   │   ├── SystemLogs.tsx         # Log viewer
│   │   ├── ThemeProvider.tsx      # Theme context
│   │   ├── ThemeToggle.tsx        # Dark/light toggle
│   │   ├── VideoPlayer.tsx        # Ad video player
│   │   └── WebcamPreview.tsx      # Camera + detection canvas
│   │
│   ├── data/
│   │   └── sampleAds.ts           # 6 sample ad definitions
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx         # Mobile detection
│   │   ├── use-toast.ts           # Toast hook
│   │   ├── useAdQueue.ts          # Queue scoring/management
│   │   ├── useFaceDetection.ts    # Core detection engine
│   │   ├── useHybridDetection.ts  # YOLO hybrid detection
│   │   ├── useWebcam.ts           # Input source management
│   │   └── useYoloFaceDetection.ts    # YOLO model inference
│   │
│   ├── lib/
│   │   └── utils.ts               # Utility (cn class merger)
│   │
│   ├── pages/
│   │   ├── Index.tsx              # Dashboard wrapper
│   │   ├── LandingPage.tsx        # Marketing home (21KB)
│   │   ├── ManagerAnalytics.tsx   # Analytics dashboard (22KB)
│   │   ├── ModelEvaluation.tsx    # Accuracy evaluation (35KB)
│   │   ├── NotFound.tsx           # 404 page
│   │   └── SmartAdsSystem.tsx     # Main application (58KB — largest file)
│   │
│   ├── types/
│   │   ├── ad.ts                  # Ad interfaces (AdMetadata, AdScore, etc.)
│   │   ├── analytics.ts           # Analytics interfaces
│   │   ├── detection.ts           # Detection interfaces (TrackedFace, Config, etc.)
│   │   └── evaluation.ts          # Evaluation metrics interfaces
│   │
│   ├── utils/
│   │   ├── analyticsStorage.ts    # localStorage analytics CRUD
│   │   ├── genderHeuristics.ts    # Female boost + hair analysis
│   │   ├── imagePreprocessing.ts  # Image enhancement pipeline
│   │   └── yoloModelDownloader.ts # YOLO model download/cache
│   │
│   ├── App.css                    # Additional styles
│   ├── App.tsx                    # Root component (Router + Providers)
│   ├── index.css                  # Global CSS + theme variables
│   ├── main.tsx                   # Entry point
│   └── vite-env.d.ts              # Vite type declarations
│
├── components.json                # shadcn/ui config
├── eslint.config.js               # ESLint config
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── postcss.config.js              # PostCSS config
├── tailwind.config.ts             # Tailwind config + custom theme
├── tsconfig.json                  # TS config (base)
├── tsconfig.app.json              # TS config (app)
├── tsconfig.node.json             # TS config (node)
├── vite.config.ts                 # Vite config
├── PROJECT_DOCUMENTATION.md       # Comprehensive 78KB docs
├── SETTINGS.md                    # User-facing settings guide
└── README.md                      # Basic readme
```

## Key Observations
- **Largest file**: `SmartAdsSystem.tsx` (58KB) — the entire main dashboard is a single monolithic component
- **No test files**: Zero test coverage
- **No database**: All persistence via localStorage/sessionStorage
- **No API layer**: No HTTP clients, no backend communication
- **Dual lockfiles**: Both `package-lock.json` and `bun.lock` exist
- **Model files**: Served as static assets from `public/models/`
