

# Plan: Analytics Dashboard + Auto-Pause Ads

## Overview
Two major features: (1) a manager-only Analytics page that stores and displays all-time audience statistics with timeline, PDF export, and professional dashboards; (2) an auto-pause system that stops ads when no audience is detected and periodically checks for new arrivals.

## Part 1: Analytics Storage and Data Model

**New file: `src/types/analytics.ts`**
- `AnalyticsEvent` — each detection snapshot: `{ timestamp, maleCount, femaleCount, kidCount, youngCount, adultCount, totalViewers, adId, adTitle, sessionId }`
- `AnalyticsSession` — a continuous viewing period: `{ id, startedAt, endedAt, peakViewers, events[] }`
- `DailyAnalyticsSummary` — pre-aggregated daily totals
- `HourlyBucket` — for timeline: `{ hour, avgViewers, maleCount, femaleCount, ... }`

**Storage: `src/utils/analyticsStorage.ts`**
- Write to `localStorage` key `smartads-analytics-events` and `smartads-analytics-sessions`
- Helper functions: `recordAnalyticsEvent()`, `getEventsInRange(start, end)`, `getDailySummary(date)`, `getHourlyTimeline(date)`, `getAllTimeTotals()`, `exportToJSON()`
- Data capped at ~10,000 events (rolling window) to avoid localStorage limits
- Structured so migrating to cloud later means swapping this one file

**Integration in `SmartAdsSystem.tsx`**
- After each capture session summary is built (line ~816), call `recordAnalyticsEvent()` to persist the demographics snapshot with timestamp and current ad info
- Also record when audience count drops to 0 (session end)

## Part 2: Manager Analytics Page

**New route: `/manager/analytics`** (added to `App.tsx`)

**New page: `src/pages/ManagerAnalytics.tsx`**
- Password-protected login (password: `smartads1234`, same as evaluation)
- Professional enterprise-style dashboard with these sections:

### 2a. Overview Cards (top row)
- Total visitors (all time)
- Male / Female ratio (with percentage bar)
- Kid / Young / Adult breakdown
- Average visitors per day
- Peak hour (busiest time)
- Total sessions recorded

### 2b. Timeline View
- Date picker to select a day
- Hourly bar chart showing audience count per hour (e.g., "4:00 PM - 5:00 PM: 12 viewers")
- Each bar segmented by gender (blue/pink) or age group
- Shows when audience arrived and left (session start/end markers)
- Built with Recharts (already available via shadcn charts)

### 2c. Demographic Breakdown
- Pie charts: Gender split, Age group split
- Trend line: daily visitor count over last 30 days
- Table: top hours by traffic

### 2d. Session History
- Scrollable table of all recorded sessions
- Columns: Date/Time, Duration, Viewers, Male, Female, Kid, Young, Adult, Ad Playing
- Sortable and filterable by date range

### 2e. PDF Export
- Button to export current view as PDF
- Uses browser `window.print()` with a print-optimized CSS layout
- Includes: date range, all summary stats, timeline chart (as rendered), demographic tables
- Alternative: generate PDF via a canvas-to-image approach for charts

## Part 3: Auto-Pause Ads When No Audience

**Changes in `SmartAdsSystem.tsx`**

- New state: `autoPauseEnabled` (toggle in settings), `isAutoPaused` (current pause state)
- New ref: `presenceCheckIntervalRef` for periodic CCTV polling

**Logic:**
1. When capture session ends with 0 viewers detected → pause ad playback, set `isAutoPaused = true`
2. Start a periodic check interval (configurable: 15-60 seconds, default 30)
3. Each check: briefly activate camera/CCTV, run one detection pass
4. If faces detected → resume ad playback, `isAutoPaused = false`, start normal capture flow
5. If no faces → keep paused, show "Waiting for audience..." overlay on video player
6. Random jitter on check interval (e.g., 25-35 seconds) to appear more natural

**UI additions:**
- "Waiting for audience..." overlay on VideoPlayer when auto-paused
- Pulsing indicator showing next check countdown
- Settings toggle: "Auto-pause when no audience" + interval slider
- Add `autoPauseEnabled`, `presenceCheckInterval` to `CaptureSettings`

## Part 4: Settings Panel Updates

Add to `SettingsPanel.tsx`:
- "Auto-Pause" section with toggle and interval slider (15-60s)
- These settings persist with the rest of `CaptureSettings`

## Part 5: Navigation Updates

- Add "Analytics" link in dashboard header (visible to all, but page itself requires login)
- Add navigation link on Landing Page

## File Summary

| Action | File |
|--------|------|
| Create | `src/types/analytics.ts` |
| Create | `src/utils/analyticsStorage.ts` |
| Create | `src/pages/ManagerAnalytics.tsx` |
| Edit | `src/App.tsx` — add `/manager/analytics` route |
| Edit | `src/pages/SmartAdsSystem.tsx` — record analytics events + auto-pause logic |
| Edit | `src/components/SettingsPanel.tsx` — add auto-pause settings |
| Edit | `src/components/VideoPlayer.tsx` — add "Waiting for audience" overlay |
| Edit | `src/pages/LandingPage.tsx` — add Analytics nav link |

