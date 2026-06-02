import {
  AnalyticsEvent,
  AnalyticsSession,
  HourlyBucket,
  DailyAnalyticsSummary,
  AllTimeTotals,
} from '@/types/analytics';
import { queueForSync } from '@/utils/syncQueue';

const EVENTS_KEY = 'smartads-analytics-events';
const SESSIONS_KEY = 'smartads-analytics-sessions';
const MAX_EVENTS = 10000;

// ─── Low-level helpers ──────────────────────────────────────

function getEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]) {
  // Rolling window – keep only most recent MAX_EVENTS
  const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
  localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
}

function getSessions(): AnalyticsSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: AnalyticsSession[]) {
  const trimmed = sessions.length > MAX_EVENTS ? sessions.slice(-MAX_EVENTS) : sessions;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
}

// ─── Public API ─────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function recordAnalyticsSession(session: Omit<AnalyticsSession, 'id'>): string {
  const id = generateId();
  const full: AnalyticsSession = { ...session, id };
  const sessions = getSessions();
  sessions.push(full);
  saveSessions(sessions);

  // Queue for cloud sync (will be pushed to Supabase when online)
  // Only push to Supabase if there was actually an audience detected (saves cloud storage)
  if (full.totalViewers > 0) {
    queueForSync(full);
  }

  // Also record as an event for timeline granularity
  const event: AnalyticsEvent = {
    id: generateId(),
    timestamp: session.endedAt,
    sessionId: id,
    adId: session.adId,
    adTitle: session.adTitle,
    totalViewers: session.totalViewers,
    maleCount: session.maleCount,
    femaleCount: session.femaleCount,
    childCount: session.childCount,
    teenCount: session.teenCount,
    youngAdultCount: session.youngAdultCount,
    middleAgedCount: session.middleAgedCount,
    seniorCount: session.seniorCount,
  };
  const events = getEvents();
  events.push(event);
  saveEvents(events);

  return id;
}

export function getSessionsInRange(start: number, end: number): AnalyticsSession[] {
  return getSessions().filter(s => s.endedAt >= start && s.endedAt <= end);
}

export function getEventsInRange(start: number, end: number): AnalyticsEvent[] {
  return getEvents().filter(e => e.timestamp >= start && e.timestamp <= end);
}

function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:00 ${suffix}`;
}

export function getHourlyTimeline(date: Date): HourlyBucket[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sessions = getSessionsInRange(dayStart.getTime(), dayEnd.getTime());

  const buckets: HourlyBucket[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: formatHourLabel(i),
    totalViewers: 0,
    maleCount: 0,
    femaleCount: 0,
    childCount: 0,
    teenCount: 0,
    youngAdultCount: 0,
    middleAgedCount: 0,
    seniorCount: 0,
    sessionCount: 0,
  }));

  for (const s of sessions) {
    const h = new Date(s.endedAt).getHours();
    buckets[h].totalViewers += s.totalViewers;
    buckets[h].maleCount += s.maleCount;
    buckets[h].femaleCount += s.femaleCount;
    buckets[h].childCount += s.childCount;
    buckets[h].teenCount += s.teenCount;
    buckets[h].youngAdultCount += s.youngAdultCount;
    buckets[h].middleAgedCount += s.middleAgedCount;
    buckets[h].seniorCount += s.seniorCount;
    buckets[h].sessionCount += 1;
  }

  return buckets;
}

export function getDailySummary(date: Date): DailyAnalyticsSummary {
  const timeline = getHourlyTimeline(date);
  let peak = 0;
  let peakH = 0;
  const totals = { v: 0, m: 0, f: 0, c: 0, t: 0, ya: 0, ma: 0, s: 0, sc: 0 };

  for (const b of timeline) {
    totals.v += b.totalViewers;
    totals.m += b.maleCount;
    totals.f += b.femaleCount;
    totals.c += b.childCount;
    totals.t += b.teenCount;
    totals.ya += b.youngAdultCount;
    totals.ma += b.middleAgedCount;
    totals.s += b.seniorCount;
    totals.sc += b.sessionCount;
    if (b.totalViewers > peak) {
      peak = b.totalViewers;
      peakH = b.hour;
    }
  }

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    date: dateStr,
    totalVisitors: totals.v,
    maleCount: totals.m,
    femaleCount: totals.f,
    childCount: totals.c,
    teenCount: totals.t,
    youngAdultCount: totals.ya,
    middleAgedCount: totals.ma,
    seniorCount: totals.s,
    peakHour: peakH,
    peakViewers: peak,
    sessionCount: totals.sc,
  };
}

export function getAllTimeTotals(): AllTimeTotals {
  const sessions = getSessions();

  if (sessions.length === 0) {
    return {
      totalVisitors: 0,
      totalSessions: 0,
      maleCount: 0,
      femaleCount: 0,
      childCount: 0,
      teenCount: 0,
      youngAdultCount: 0,
      middleAgedCount: 0,
      seniorCount: 0,
      avgVisitorsPerDay: 0,
      peakHour: 0,
      peakHourLabel: '12:00 PM',
      firstEventDate: null,
      lastEventDate: null,
    };
  }

  const totals = { v: 0, m: 0, f: 0, c: 0, t: 0, ya: 0, ma: 0, s: 0 };
  const hourCounts: number[] = new Array(24).fill(0);
  let minTs = Infinity;
  let maxTs = 0;

  for (const s of sessions) {
    totals.v += s.totalViewers;
    totals.m += s.maleCount;
    totals.f += s.femaleCount;
    totals.c += s.childCount;
    totals.t += s.teenCount;
    totals.ya += s.youngAdultCount;
    totals.ma += s.middleAgedCount;
    totals.s += s.seniorCount;
    const h = new Date(s.endedAt).getHours();
    hourCounts[h] += s.totalViewers;
    if (s.startedAt < minTs) minTs = s.startedAt;
    if (s.endedAt > maxTs) maxTs = s.endedAt;
  }

  let peakHour = 0;
  let peakVal = 0;
  for (let i = 0; i < 24; i++) {
    if (hourCounts[i] > peakVal) {
      peakVal = hourCounts[i];
      peakHour = i;
    }
  }

  const daySpan = Math.max(1, Math.ceil((maxTs - minTs) / (1000 * 60 * 60 * 24)));

  return {
    totalVisitors: totals.v,
    totalSessions: sessions.length,
    maleCount: totals.m,
    femaleCount: totals.f,
    childCount: totals.c,
    teenCount: totals.t,
    youngAdultCount: totals.ya,
    middleAgedCount: totals.ma,
    seniorCount: totals.s,
    avgVisitorsPerDay: Math.round((totals.v / daySpan) * 10) / 10,
    peakHour,
    peakHourLabel: formatHourLabel(peakHour),
    firstEventDate: minTs === Infinity ? null : minTs,
    lastEventDate: maxTs === 0 ? null : maxTs,
  };
}

export function getLast30DaysTrend(): { date: string; visitors: number }[] {
  const result: { date: string; visitors: number }[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const summary = getDailySummary(d);
    result.push({ date: summary.date, visitors: summary.totalVisitors });
  }
  return result;
}

export function getAllSessions(): AnalyticsSession[] {
  return getSessions().sort((a, b) => b.endedAt - a.endedAt);
}

export function clearAllAnalytics() {
  localStorage.removeItem(EVENTS_KEY);
  localStorage.removeItem(SESSIONS_KEY);
}

export function exportAnalyticsJSON(): string {
  return JSON.stringify(
    { events: getEvents(), sessions: getSessions() },
    null,
    2
  );
}

export function importAnalyticsJSON(json: string): { importedSessions: number; importedEvents: number } {
  const data = JSON.parse(json);
  const existingEvents = getEvents();
  const existingSessions = getSessions();

  const existingEventIds = new Set(existingEvents.map(e => e.id));
  const existingSessionIds = new Set(existingSessions.map(s => s.id));

  let importedEvents = 0;
  let importedSessions = 0;

  if (Array.isArray(data.events)) {
    for (const e of data.events) {
      if (e.id && !existingEventIds.has(e.id)) {
        existingEvents.push(e);
        importedEvents++;
      }
    }
    saveEvents(existingEvents);
  }

  if (Array.isArray(data.sessions)) {
    for (const s of data.sessions) {
      if (s.id && !existingSessionIds.has(s.id)) {
        existingSessions.push(s);
        importedSessions++;
      }
    }
    saveSessions(existingSessions);
  }

  return { importedSessions, importedEvents };
}
