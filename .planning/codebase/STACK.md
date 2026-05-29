# Technology Stack

## Core Framework
- **React 18.3.1** — Component-based UI framework (functional components + hooks)
- **TypeScript 5.8.3** — Static typing, strict mode enabled
- **Vite 5.4.19** — Build tool with SWC-based React plugin, dev server on port 8080

## Styling & UI
- **Tailwind CSS 3.4.17** — Utility-first CSS framework with class-based dark mode
- **tailwindcss-animate 1.0.7** — Animation utilities
- **shadcn/ui** — Component library built on Radix UI primitives (40+ components in `src/components/ui/`)
- **class-variance-authority 0.7.1** — Component variant management
- **clsx 2.1.1** + **tailwind-merge 2.6.0** — Conditional class utilities
- **Custom fonts**: JetBrains Mono (display), Inter (body) via Google Fonts

## AI / Machine Learning
- **TensorFlow.js 4.22.0** — In-browser ML inference (WebGL backend, CPU fallback)
- **face-api.js 0.22.2** — Face detection + age/gender classification
  - Models: TinyFaceDetector (~200KB), SSD MobileNetV1 (~5MB), AgeGenderNet (~400KB)
  - Models served from `public/models/`

## Routing & Data
- **React Router DOM 6.30.1** — Client-side SPA routing (BrowserRouter)
- **TanStack React Query 5.83.0** — Data fetching/caching (available for future API use)
- **date-fns 3.6.0** — Date formatting and manipulation

## Charts & Visualization
- **Recharts 2.15.4** — Bar, Pie, and Line charts for analytics dashboard

## UI Extras
- **Lucide React 0.462.0** — Icon library
- **Sonner 1.7.4** — Toast notifications
- **react-helmet-async 2.0.5** — SEO/meta tag management
- **vaul 0.9.9** — Drawer component
- **cmdk 1.1.1** — Command palette
- **embla-carousel-react 8.6.0** — Carousel component
- **react-resizable-panels 2.1.9** — Resizable layout panels
- **react-day-picker 8.10.1** — Calendar/date picker
- **input-otp 1.4.2** — OTP input component

## Forms
- **react-hook-form 7.61.1** + **@hookform/resolvers 3.10.0** — Form management
- **zod 3.25.76** — Schema validation

## Dev Tools
- **ESLint 9.32.0** — Linting (with react-hooks + react-refresh plugins)
- **PostCSS 8.5.6** + **Autoprefixer 10.4.21** — CSS processing
- **@tailwindcss/typography 0.5.16** — Prose styling plugin

## Package Manager
- **npm** (package-lock.json present, bun.lock also present — dual lockfiles)

## Hosting Model
- **Static SPA** — No backend; all processing client-side
- Can be deployed to any static host (Netlify, Vercel, S3, etc.)
- HTTPS required for camera API access
