# Smart Advertising System - Architecture Tree

This document outlines the file and component structure of both the **Selector Application** (the main client-facing display node) and the **Admin Application** (the management and evaluation dashboard). This tree structure provides a high-level overview of how data flows and which components handle specific responsibilities within the React ecosystem.

## 🌳 Overall Architecture Tree

```text
smart-ad-selector/
│
├── 🎯 Selector Application (The Display Node)
│   │   Purpose: Runs the continuous ad loop, activates the camera, processes AI inferences 
│   │   locally via WebGL, and dynamically scores the ad queue.
│   │
│   ├── Pages
│   │   ├── LandingPage.tsx        # Marketing & Entry point
│   │   └── SmartAdsSystem.tsx     # The Core Orchestrator. Glues VideoPlayer, AI hooks, and UI together.
│   │
│   ├── Core Components
│   │   ├── VideoPlayer.tsx        # HTML5 video wrapper. Tracks playback time to trigger the Capture Window.
│   │   ├── WebcamPreview.tsx      # Renders offscreen canvas, draws bounding boxes, handles detection overlay.
│   │   ├── AdQueue.tsx            # Visualizes the 'Up Next' array based on live demographic scores.
│   │   ├── DemographicStats.tsx   # Real-time bar charts of current audience (Male/Female, Age Groups).
│   │   ├── CaptureSessionSummary.tsx # Pops up when an ad ends, showing final aggregated counts.
│   │   └── DebugOverlay.tsx       # Developer tool showing FPS, inference latency, and tensor states.
│   │
│   ├── Settings & Overrides
│   │   ├── SettingsPanel.tsx      # Modifies sensitivity, FPS limits, Female Boost Factor, and thresholds.
│   │   └── InputSourceSelector.tsx# Switches between Webcam, Video Upload, or Screen Capture.
│   │
│   ├── Custom React Hooks (State & Logic)
│   │   ├── useFaceDetection.ts    # The AI Brain. Manages tfjs models, temporal tracking, and multi-pass rescue.
│   │   ├── useHybridDetection.ts  # Fallback logic integrating YOLO with face-api.js.
│   │   ├── useAdQueue.ts          # Evaluates demographic votes -> Scores Ads -> Reorders Queue.
│   │   └── useWebcam.ts           # Interacts with navigator.mediaDevices to manage hardware streams.
│   │
│   └── Utilities (Algorithms)
│       ├── imagePreprocessing.ts  # Applies Gamma, Contrast, and Sharpen matrices to the raw canvas.
│       ├── genderHeuristics.ts    # Corrects model bias (e.g., hair region density calculations).
│       └── headPoseEstimation.ts  # Evaluates facial angle to drop low-confidence profile detections.
│
│
├── 🛠️ Admin & Evaluation Application
│   │   Purpose: Secured area for managing ad inventory, reviewing system-wide analytics, 
│   │   and testing AI model accuracy via ground-truth labeling.
│   │
│   ├── Pages
│   │   ├── ModelEvaluation.tsx    # Testing dashboard. Used to manually label faces to generate Precision/Recall metrics.
│   │   ├── ManagerAnalytics.tsx   # Aggregates past session demographics into long-term reporting graphs.
│   │   └── ScreenConfig.tsx       # Defines physical screen parameters (location, default playlist).
│   │
│   ├── Core Components
│   │   ├── AdManager.tsx          # CRUD interface for adding new video ads and assigning metadata (target age/gender).
│   │   └── ManualQueueEditor.tsx  # Allows admins to override the AI and force a static ad loop.
│   │
│   ├── Custom React Hooks (Data Fetching)
│   │   └── useSupabaseSync.ts     # Pushes local anonymous demographic aggregates to a central cloud database.
│   │
│   └── Utilities (Data Management)
│       ├── analyticsStorage.ts    # Serializes session histories into LocalStorage.
│       └── syncQueue.ts           # Handles offline queueing for cloud synchronization when internet is restored.
│
│
└── ⚙️ Global Infrastructure (Shared)
    ├── App.tsx                    # React Router definitions bridging Selector and Admin routes.
    ├── components/ui/             # shadcn/ui headless components (Buttons, Dialogs, Sliders).
    ├── hooks/use-toast.ts         # Global notification system (Sonner).
    ├── components/ThemeProvider.tsx # Dark/Light mode context provider.
    ├── types/                     # TypeScript definitions (AdMetadata, TrackedFace, SessionData).
    └── public/models/             # Pre-trained quantized neural network shard files (.bin / .json).
```

### 🔄 Summary of Data Flow
1. **Hardware -> Browser:** `useWebcam.ts` pipes the camera to an offscreen canvas.
2. **Raw Frame -> Optimized Tensor:** `imagePreprocessing.ts` cleans the frame before `useFaceDetection.ts` pushes it to the GPU via WebGL.
3. **Tensor -> AI Metadata:** The model returns bounding boxes. `genderHeuristics.ts` corrects any biases.
4. **AI Metadata -> Memory:** The bounding boxes are rendered visually on `WebcamPreview.tsx` while demographics are tallied in `SmartAdsSystem.tsx`.
5. **Memory -> Action:** Once the video capture window ends, `useAdQueue.ts` scores the database and pushes the most relevant ad to the `VideoPlayer.tsx`.
6. **Action -> Analytics:** The final outcome is stored via `analyticsStorage.ts` and optionally synced to the cloud via `useSupabaseSync.ts` for the `ManagerAnalytics.tsx` dashboard.
