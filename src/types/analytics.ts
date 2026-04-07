/**
 * Analytics types for audience tracking and reporting
 */

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  sessionId: string;
  adId: string;
  adTitle: string;
  totalViewers: number;
  maleCount: number;
  femaleCount: number;
  kidCount: number;
  youngCount: number;
  adultCount: number;
}

export interface AnalyticsSession {
  id: string;
  startedAt: number;
  endedAt: number;
  peakViewers: number;
  totalViewers: number;
  maleCount: number;
  femaleCount: number;
  kidCount: number;
  youngCount: number;
  adultCount: number;
  adId: string;
  adTitle: string;
}

export interface HourlyBucket {
  hour: number; // 0-23
  label: string; // "4:00 PM"
  totalViewers: number;
  maleCount: number;
  femaleCount: number;
  kidCount: number;
  youngCount: number;
  adultCount: number;
  sessionCount: number;
}

export interface DailyAnalyticsSummary {
  date: string; // YYYY-MM-DD
  totalVisitors: number;
  maleCount: number;
  femaleCount: number;
  kidCount: number;
  youngCount: number;
  adultCount: number;
  peakHour: number;
  peakViewers: number;
  sessionCount: number;
}

export interface AllTimeTotals {
  totalVisitors: number;
  totalSessions: number;
  maleCount: number;
  femaleCount: number;
  kidCount: number;
  youngCount: number;
  adultCount: number;
  avgVisitorsPerDay: number;
  peakHour: number;
  peakHourLabel: string;
  firstEventDate: number | null;
  lastEventDate: number | null;
}
