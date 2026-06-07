import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateId,
  recordAnalyticsSession,
  getSessionsInRange,
  getEventsInRange,
  getHourlyTimeline,
  getDailySummary,
  getAllTimeTotals,
  getAllSessions,
  clearAllAnalytics,
  exportAnalyticsJSON,
  importAnalyticsJSON,
} from '../analyticsStorage';

// Mock the syncQueue module so queueForSync doesn't interfere
vi.mock('@/utils/syncQueue', () => ({
  queueForSync: vi.fn(),
}));

// ─── Helpers ────────────────────────────────────────────────────

function createSessionInput(overrides: Record<string, unknown> = {}) {
  return {
    startedAt: Date.now() - 10000,
    endedAt: Date.now(),
    peakViewers: 2,
    totalViewers: 5,
    maleCount: 3,
    femaleCount: 2,
    childCount: 0,
    teenCount: 1,
    youngAdultCount: 3,
    middleAgedCount: 1,
    seniorCount: 0,
    adId: 'ad-001',
    adTitle: 'Test Ad',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('analyticsStorage', () => {
  beforeEach(() => {
    clearAllAnalytics();
  });

  // ── generateId ──────────────────────────────────────────────

  describe('generateId', () => {
    it('returns a non-empty string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('generates unique IDs on successive calls', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });

  // ── recordAnalyticsSession ──────────────────────────────────

  describe('recordAnalyticsSession', () => {
    it('returns a generated ID', () => {
      const id = recordAnalyticsSession(createSessionInput());
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('persists the session so it can be retrieved', () => {
      recordAnalyticsSession(createSessionInput());
      const all = getAllSessions();
      expect(all).toHaveLength(1);
    });

    it('records multiple sessions', () => {
      recordAnalyticsSession(createSessionInput({ adTitle: 'Ad A' }));
      recordAnalyticsSession(createSessionInput({ adTitle: 'Ad B' }));
      recordAnalyticsSession(createSessionInput({ adTitle: 'Ad C' }));
      expect(getAllSessions()).toHaveLength(3);
    });
  });

  // ── getSessionsInRange ──────────────────────────────────────

  describe('getSessionsInRange', () => {
    it('returns sessions within the given time range', () => {
      const now = Date.now();
      recordAnalyticsSession(createSessionInput({ endedAt: now - 5000 }));
      recordAnalyticsSession(createSessionInput({ endedAt: now }));
      recordAnalyticsSession(createSessionInput({ endedAt: now + 100000 }));

      const results = getSessionsInRange(now - 6000, now + 1000);
      expect(results).toHaveLength(2);
    });

    it('returns empty array when no sessions match', () => {
      recordAnalyticsSession(createSessionInput({ endedAt: 1000 }));
      const results = getSessionsInRange(2000, 3000);
      expect(results).toHaveLength(0);
    });
  });

  // ── getEventsInRange ────────────────────────────────────────

  describe('getEventsInRange', () => {
    it('returns events within the given time range', () => {
      const now = Date.now();
      recordAnalyticsSession(createSessionInput({ endedAt: now }));
      recordAnalyticsSession(createSessionInput({ endedAt: now + 200000 }));

      const results = getEventsInRange(now - 1000, now + 1000);
      expect(results).toHaveLength(1);
    });
  });

  // ── getHourlyTimeline ───────────────────────────────────────

  describe('getHourlyTimeline', () => {
    it('returns 24 hourly buckets', () => {
      const timeline = getHourlyTimeline(new Date());
      expect(timeline).toHaveLength(24);
    });

    it('each bucket has the correct shape', () => {
      const timeline = getHourlyTimeline(new Date());
      for (const bucket of timeline) {
        expect(bucket).toHaveProperty('hour');
        expect(bucket).toHaveProperty('label');
        expect(bucket).toHaveProperty('totalViewers');
        expect(bucket).toHaveProperty('sessionCount');
      }
    });

    it('aggregates session data into the correct hour bucket', () => {
      const today = new Date();
      today.setHours(14, 30, 0, 0); // 2:30 PM

      recordAnalyticsSession(
        createSessionInput({
          endedAt: today.getTime(),
          totalViewers: 10,
          maleCount: 6,
          femaleCount: 4,
        })
      );

      const timeline = getHourlyTimeline(today);
      expect(timeline[14].totalViewers).toBe(10);
      expect(timeline[14].maleCount).toBe(6);
      expect(timeline[14].femaleCount).toBe(4);
      expect(timeline[14].sessionCount).toBe(1);
    });
  });

  // ── getDailySummary ─────────────────────────────────────────

  describe('getDailySummary', () => {
    it('returns correct totals for a day with data', () => {
      const today = new Date();
      today.setHours(10, 0, 0, 0);

      recordAnalyticsSession(
        createSessionInput({
          endedAt: today.getTime(),
          totalViewers: 7,
          maleCount: 4,
          femaleCount: 3,
        })
      );

      today.setHours(15, 0, 0, 0);
      recordAnalyticsSession(
        createSessionInput({
          endedAt: today.getTime(),
          totalViewers: 12,
          maleCount: 5,
          femaleCount: 7,
        })
      );

      const summary = getDailySummary(today);
      expect(summary.totalVisitors).toBe(19);
      expect(summary.maleCount).toBe(9);
      expect(summary.femaleCount).toBe(10);
      expect(summary.peakViewers).toBe(12);
      expect(summary.peakHour).toBe(15);
      expect(summary.sessionCount).toBe(2);
    });

    it('returns zeroes for a day with no data', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const summary = getDailySummary(yesterday);
      expect(summary.totalVisitors).toBe(0);
      expect(summary.sessionCount).toBe(0);
    });
  });

  // ── getAllTimeTotals ─────────────────────────────────────────

  describe('getAllTimeTotals', () => {
    it('returns zeroed totals when no data exists', () => {
      const totals = getAllTimeTotals();
      expect(totals.totalVisitors).toBe(0);
      expect(totals.totalSessions).toBe(0);
      expect(totals.firstEventDate).toBeNull();
      expect(totals.lastEventDate).toBeNull();
      expect(totals.peakHourLabel).toBe('12:00 PM');
    });

    it('aggregates across all sessions', () => {
      recordAnalyticsSession(createSessionInput({ totalViewers: 5, maleCount: 3, femaleCount: 2 }));
      recordAnalyticsSession(createSessionInput({ totalViewers: 8, maleCount: 4, femaleCount: 4 }));

      const totals = getAllTimeTotals();
      expect(totals.totalVisitors).toBe(13);
      expect(totals.totalSessions).toBe(2);
      expect(totals.maleCount).toBe(7);
      expect(totals.femaleCount).toBe(6);
    });
  });

  // ── Export / Import ─────────────────────────────────────────

  describe('exportAnalyticsJSON / importAnalyticsJSON', () => {
    it('exports valid JSON', () => {
      recordAnalyticsSession(createSessionInput());
      const json = exportAnalyticsJSON();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('events');
      expect(parsed).toHaveProperty('sessions');
    });

    it('imports sessions and events without duplicates', () => {
      recordAnalyticsSession(createSessionInput());
      const json = exportAnalyticsJSON();

      clearAllAnalytics();
      expect(getAllSessions()).toHaveLength(0);

      const result = importAnalyticsJSON(json);
      expect(result.importedSessions).toBe(1);
      expect(result.importedEvents).toBe(1);
      expect(getAllSessions()).toHaveLength(1);
    });

    it('skips duplicates on re-import', () => {
      recordAnalyticsSession(createSessionInput());
      const json = exportAnalyticsJSON();

      // Import again without clearing – should skip existing
      const result = importAnalyticsJSON(json);
      expect(result.importedSessions).toBe(0);
      expect(result.importedEvents).toBe(0);
    });
  });

  // ── clearAllAnalytics ───────────────────────────────────────

  describe('clearAllAnalytics', () => {
    it('removes all sessions and events', () => {
      recordAnalyticsSession(createSessionInput());
      recordAnalyticsSession(createSessionInput());

      clearAllAnalytics();

      expect(getAllSessions()).toHaveLength(0);
      expect(getAllTimeTotals().totalSessions).toBe(0);
    });
  });
});
