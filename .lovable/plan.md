
# Plan: Create Comprehensive Project Documentation (PROJECT_DOCUMENTATION.md)

## Objective
Create a single, exhaustive markdown documentation file that explains every aspect of the Smart Ads System project in complete detail. The file will be comprehensive enough that anyone reading it can fully understand the project's purpose, architecture, technologies, and functionality without needing to view the source code.

## File to Create
**Location:** `PROJECT_DOCUMENTATION.md` (root directory)

## Document Structure

### 1. Executive Summary
- Project overview and purpose
- Key features at a glance
- Target use cases (digital signage, smart advertising displays)

### 2. Project Purpose and Concept
- Problem statement (traditional ads don't adapt to audience)
- Solution (real-time demographic detection + dynamic ad targeting)
- How the system works (capture viewers, classify demographics, reorder ad queue)
- Privacy-first approach (all processing local, no data transmitted)

### 3. System Architecture Overview
- High-level architecture diagram (text-based)
- Client-side only design (no backend required)
- Browser-based AI inference
- Data flow from camera to ad selection

### 4. Technology Stack (Detailed)
#### 4.1 Frontend Framework
- React 18.3.1 - Component architecture, hooks, state management
- TypeScript 5.8.3 - Static typing, interfaces, type safety
- Vite 5.4.19 - Build tool, HMR, bundling

#### 4.2 Styling and UI
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- shadcn/ui components (Radix UI primitives)
- Custom theming (light/dark mode)
- CSS custom properties for dynamic styling

#### 4.3 AI/Machine Learning Libraries
- TensorFlow.js 4.22.0 - Neural network inference engine
- face-api.js 0.22.2 - Face detection and demographic classification
- WebGL backend for GPU acceleration

#### 4.4 Supporting Libraries
- React Router DOM 6.30.1 - Client-side routing
- React Query 5.83.0 - Data fetching/caching
- Lucide React - Icon library
- Sonner - Toast notifications

### 5. AI Detection System (Detailed)
#### 5.1 Model Architecture
- TinyFaceDetector (~200KB) - Fast, lightweight face detection
- SSD Mobilenet V1 (~5MB) - High-accuracy face detection
- AgeGenderNet (~400KB) - Demographic classification
- (Planned) YOLOv8-face (~25MB) - Crowd-optimized detection

#### 5.2 Detection Pipeline
- Multi-pass detection strategy (Pass 1, Pass 2, Pass 3)
- Multi-scale processing (320px, 416px, 512px, 608px)
- Image preprocessing (gamma, contrast, sharpening, denoising)
- Detection merging and deduplication (IoU-based)

#### 5.3 Demographic Classification
- Age groups: Kid (<13), Young (13-34), Adult (35+)
- Gender classification with confidence scores
- Female boost factor to counter model bias
- Hair heuristics for improved gender detection

#### 5.4 Temporal Tracking
- IoU-based face matching across frames
- Kalman-style velocity prediction
- Vote aggregation for stable demographics
- Missed frame holding for occlusion handling

### 6. User Interface Components (Detailed)
#### 6.1 Landing Page (`/`)
- Hero section with project branding
- Feature highlights
- Team information
- Navigation to dashboard

#### 6.2 Main Dashboard (`/dashboard`)
- Video Player component
- Webcam/Detection Preview
- Demographic Statistics panel
- Ad Queue display
- System Logs
- Settings panel access

#### 6.3 Video Player
- HTML5 video element with custom controls
- Play/pause, skip, volume controls
- Progress bar with capture window indicator
- Fullscreen mode support
- Ad metadata overlay

#### 6.4 Detection Preview (WebcamPreview)
- Live video feed display
- Bounding box rendering on canvas
- Zoom controls (auto, manual)
- Labeling mode for evaluation
- Input source indicator

#### 6.5 Settings Panel
- Detection mode selector (Fast/Accurate/Maximum)
- Video quality presets
- Sensitivity slider
- False positive guard
- Demographic confidence threshold
- Female boost factor
- Hair heuristics toggle
- Capture window configuration
- Dual model toggle
- Enhanced detection toggle

#### 6.6 Model Evaluation Dashboard (`/admin/evaluation`)
- Password-protected access (smartads1234)
- Session management
- Accuracy metrics display
- Confusion matrices
- CSV export functionality
- Performance recommendations

### 7. Ad Management System
#### 7.1 Ad Metadata Structure
- ID, filename, title
- Target gender (male/female/all)
- Target age group (kid/young/adult/all)
- Duration
- Capture window (start/end percentages)
- Video URL

#### 7.2 Ad Queue Scoring Algorithm
- Perfect match bonus (+10 for gender AND age match)
- Partial match scores
- Recently played penalty
- Queue reordering logic

#### 7.3 Capture Session Flow
- Capture window timing (e.g., 60%-100% of ad)
- Frame-by-frame detection
- Session aggregation (unique viewer counting)
- Demographics compilation
- Queue reordering trigger

### 8. Input Source Management
#### 8.1 Webcam Input
- getUserMedia API
- TinyFace detector only (prevents ghosts)
- Real-time detection loop

#### 8.2 Video File Input
- File upload and Object URL creation
- Dual model detection (TinyFace + SSD)
- Loop playback for continuous detection

#### 8.3 Screen Capture
- getDisplayMedia API
- Capture any window/screen
- Dual model detection

### 9. Image Preprocessing Pipeline
#### 9.1 Enhancement Techniques
- Gamma correction (brightness adjustment)
- Contrast adjustment
- Sharpening (convolution kernel)
- Denoising (box blur)

#### 9.2 Presets
- None (no enhancement)
- Indoor (gamma 1.2, contrast 1.3)
- Outdoor (gamma 1.0, contrast 1.1)
- Night/IR (gamma 1.5, contrast 1.5)
- Low Light (gamma 1.8, contrast 1.4)
- Low Quality CCTV (gamma 1.4, contrast 1.5)
- Crowd (gamma 1.3, contrast 1.4)

### 10. Detection Filtering and False Positive Prevention
#### 10.1 Filter Criteria
- Minimum face score threshold
- Minimum pixel size (12px default)
- Minimum percentage of frame (0.05%)
- Maximum size (35% of frame - rejects walls)
- Aspect ratio bounds (0.25-4.0)
- Bounding box within frame

#### 10.2 Texture Validation
- Edge detection for texture variation
- Skin tone detection
- Uniform surface rejection

### 11. Gender Bias Correction
#### 11.1 The Problem
- face-api.js model has inherent male bias
- Females often misclassified as male

#### 11.2 Solutions Implemented
- Female boost factor (0-0.30)
- Proportional confidence-based boost
- Hair region analysis
- Face shape analysis

### 12. Data Persistence
#### 12.1 LocalStorage Keys
- `smartads-custom-ads` - Custom ad library
- `smartads-manual-queue` - Manual playlist
- `smartads-evaluation-sessions` - Labeling data

#### 12.2 Session Storage
- Admin authentication state

### 13. File Structure and Organization
```text
src/
  components/
    ui/              # shadcn/ui components
    AdManager.tsx    # Ad library management
    AdQueue.tsx      # Queue display
    CaptureSessionSummary.tsx
    DebugOverlay.tsx
    DemographicStats.tsx
    InputSourceSelector.tsx
    ManualQueueEditor.tsx
    SettingsPanel.tsx
    SystemLogs.tsx
    ThemeProvider.tsx
    ThemeToggle.tsx
    VideoPlayer.tsx
    WebcamPreview.tsx
  data/
    sampleAds.ts     # Demo ad definitions
  hooks/
    useAdQueue.ts    # Queue management logic
    useFaceDetection.ts  # Core detection hook
    useHybridDetection.ts
    useWebcam.ts     # Camera/input management
    useYoloFaceDetection.ts
  pages/
    Index.tsx        # Dashboard wrapper
    LandingPage.tsx  # Home page
    ModelEvaluation.tsx  # Admin dashboard
    SmartAdsSystem.tsx   # Main application
  types/
    ad.ts            # Ad-related types
    detection.ts     # Detection types
    evaluation.ts    # Evaluation metrics types
  utils/
    genderHeuristics.ts   # Bias correction
    imagePreprocessing.ts # CCTV enhancement
    yoloModelDownloader.ts
public/
  models/           # AI model files
    tiny_face_detector_model-*
    ssd_mobilenetv1_model-*
    age_gender_model-*
```

### 14. Configuration Files
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### 15. Detection Modes Explained
#### 15.1 Webcam Mode
- Detector: TinyFace only
- CCTV mode: Forced OFF
- No rescue passes

#### 15.2 Video/Screen Mode
- Detector: Dual (TinyFace + SSD)
- CCTV mode: Forced ON
- Pass 2/3 enabled when Enhanced Detection ON

### 16. Evaluation System
#### 16.1 Ground Truth Labeling
- Click-to-label interface
- Gender and age correction
- False positive marking

#### 16.2 Metrics Calculated
- Gender accuracy
- Male/Female recall and precision
- Age accuracy (per group)
- False positive rate
- Average confidence (correct vs incorrect)

#### 16.3 Confusion Matrix
- Gender: 2x2 matrix
- Age: 3x3 matrix

### 17. Performance Optimization
- WebGL backend for GPU inference
- Detection timeout (10 seconds)
- In-flight detection prevention
- Frame rate calculation
- Latency monitoring
- Offscreen canvas for preprocessing

### 18. Theme System
- Light/dark mode toggle
- CSS custom properties
- Theme persistence in localStorage
- Automatic system preference detection

### 19. Routing Structure
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | LandingPage | Home/marketing page |
| `/dashboard` | SmartAdsSystem | Main application |
| `/admin/evaluation` | ModelEvaluation | Protected admin dashboard |
| `*` | NotFound | 404 page |

### 20. Building and Deployment
- Development: `npm run dev`
- Production build: `npm run build`
- Preview: `npm run preview`
- Output directory: `dist/`

### 21. Browser Compatibility
- Chrome (recommended) - WebGL + getUserMedia
- Firefox - WebGL + getUserMedia
- Edge - WebGL + getUserMedia
- Safari - Limited WebGL support

### 22. Known Limitations
- YOLO model not fully integrated
- WebGPU not supported (WebGL only)
- Screen capture requires user permission
- No mobile optimization
- Age classification less accurate than gender

### 23. Glossary of Terms
- IoU (Intersection over Union)
- FPS (Frames Per Second)
- ROI (Region of Interest)
- SSD (Single Shot Detector)
- YOLO (You Only Look Once)
- Recall (true positive rate)
- Precision (positive predictive value)

### 24. Appendix: Type Definitions
- Full interface definitions for all major types
- AdMetadata, DetectionResult, TrackedFace
- CCTVDetectionConfig, EvaluationMetrics

## Estimated Document Length
Approximately 2,500-3,500 lines of markdown covering every aspect of the system in exhaustive detail.

## Implementation Notes
- No emojis in the actual file (per settings guide style)
- Use proper markdown headers and tables
- Include ASCII diagrams for architecture
- Cross-reference sections where appropriate
- Include actual code snippets where helpful for understanding
