import { describe, it, expect, beforeEach } from 'vitest';
import {
  queueForSync,
  getSyncQueue,
  removeFromSyncQueue,
  markRetry,
  getSyncQueueLength,
  clearSyncQueue,
} from '../syncQueue';
import type { AnalyticsSession } from '@/types/analytics';

// ─── Helper ─────────────────────────────────────────────────────

function createMockSession(overrides: Partial<AnalyticsSession> = {}): AnalyticsSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    startedAt: Date.now() - 10000,
    endedAt: Date.now(),
    peakViewers: 3,
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

describe('syncQueue', () => {
  beforeEach(() => {
    clearSyncQueue();
  });

  describe('queueForSync', () => {
    it('adds a session to an empty queue', () => {
      const session = createMockSession({ id: 'test-1' });
      queueForSync(session);

      const queue = getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('test-1');
      expect(queue[0].retryCount).toBe(0);
      expect(queue[0].session).toEqual(session);
    });

    it('appends multiple sessions to the queue', () => {
      queueForSync(createMockSession({ id: 's1' }));
      queueForSync(createMockSession({ id: 's2' }));
      queueForSync(createMockSession({ id: 's3' }));

      expect(getSyncQueueLength()).toBe(3);
    });

    it('records the queuedAt timestamp', () => {
      const before = Date.now();
      queueForSync(createMockSession({ id: 'ts-test' }));
      const after = Date.now();

      const item = getSyncQueue()[0];
      expect(item.queuedAt).toBeGreaterThanOrEqual(before);
      expect(item.queuedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('getSyncQueue', () => {
    it('returns an empty array when no items are queued', () => {
      expect(getSyncQueue()).toEqual([]);
    });

    it('returns items in the order they were queued', () => {
      queueForSync(createMockSession({ id: 'first' }));
      queueForSync(createMockSession({ id: 'second' }));

      const queue = getSyncQueue();
      expect(queue[0].id).toBe('first');
      expect(queue[1].id).toBe('second');
    });
  });

  describe('getSyncQueueLength', () => {
    it('returns 0 for an empty queue', () => {
      expect(getSyncQueueLength()).toBe(0);
    });

    it('returns the correct count', () => {
      queueForSync(createMockSession({ id: 'a' }));
      queueForSync(createMockSession({ id: 'b' }));
      expect(getSyncQueueLength()).toBe(2);
    });
  });

  describe('removeFromSyncQueue', () => {
    it('removes specified items by ID', () => {
      queueForSync(createMockSession({ id: 'keep-1' }));
      queueForSync(createMockSession({ id: 'remove-1' }));
      queueForSync(createMockSession({ id: 'keep-2' }));

      removeFromSyncQueue(['remove-1']);

      const queue = getSyncQueue();
      expect(queue).toHaveLength(2);
      expect(queue.map(q => q.id)).toEqual(['keep-1', 'keep-2']);
    });

    it('removes multiple items at once', () => {
      queueForSync(createMockSession({ id: 'a' }));
      queueForSync(createMockSession({ id: 'b' }));
      queueForSync(createMockSession({ id: 'c' }));

      removeFromSyncQueue(['a', 'c']);

      const queue = getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('b');
    });

    it('does nothing when IDs do not match', () => {
      queueForSync(createMockSession({ id: 'x' }));
      removeFromSyncQueue(['nonexistent']);
      expect(getSyncQueueLength()).toBe(1);
    });
  });

  describe('markRetry', () => {
    it('increments the retryCount for specified items', () => {
      queueForSync(createMockSession({ id: 'retry-me' }));
      queueForSync(createMockSession({ id: 'leave-me' }));

      markRetry(['retry-me']);

      const queue = getSyncQueue();
      const retried = queue.find(q => q.id === 'retry-me');
      const untouched = queue.find(q => q.id === 'leave-me');

      expect(retried?.retryCount).toBe(1);
      expect(untouched?.retryCount).toBe(0);
    });

    it('increments multiple times on repeated calls', () => {
      queueForSync(createMockSession({ id: 'multi' }));

      markRetry(['multi']);
      markRetry(['multi']);
      markRetry(['multi']);

      const item = getSyncQueue().find(q => q.id === 'multi');
      expect(item?.retryCount).toBe(3);
    });
  });

  describe('clearSyncQueue', () => {
    it('empties the entire queue', () => {
      queueForSync(createMockSession({ id: 'a' }));
      queueForSync(createMockSession({ id: 'b' }));

      clearSyncQueue();

      expect(getSyncQueue()).toEqual([]);
      expect(getSyncQueueLength()).toBe(0);
    });
  });
});
