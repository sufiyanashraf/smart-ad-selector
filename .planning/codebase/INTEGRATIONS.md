# Integrations

## Current Integrations

### Browser APIs
| API | Usage | Required |
|-----|-------|----------|
| MediaDevices.getUserMedia() | Webcam access for live face detection | Yes (for webcam) |
| MediaDevices.getDisplayMedia() | Screen capture for CCTV simulation | Optional |
| localStorage | Data persistence (ads, analytics, evaluation) | Yes |
| sessionStorage | Authentication state | Yes |
| Canvas 2D | Image preprocessing + bounding box rendering | Yes |
| WebGL | GPU-accelerated TensorFlow.js inference | Yes (CPU fallback) |
| IndexedDB | YOLO model caching | Optional |
| window.print() | PDF export via browser print | Optional |
| URL.createObjectURL() | Video file upload handling | Yes (for file upload) |

### AI Model Integration
| Model | Source | Location | Size |
|-------|--------|----------|------|
| TinyFaceDetector | face-api.js | public/models/ | ~200KB |
| SSD MobileNetV1 | face-api.js | public/models/ | ~5MB |
| AgeGenderNet | face-api.js | public/models/ | ~400KB |
| YOLOv8-face | External download | IndexedDB cache | ~25MB |

### Third-Party Services
**None** — The application is fully self-contained with no external API calls, no analytics services, no CDN dependencies (beyond initial page load).

## Planned/Missing Integrations
- **Backend API**: No server communication exists — needed for multi-screen admin dashboard
- **Database**: No real database — localStorage only (5-10MB limit)
- **Authentication**: Hardcoded passwords (`smartads1234`) — no real auth system
- **Cloud sync**: No mechanism to send screen data to central server
- **Push notifications**: None
- **Email/SMS**: None
