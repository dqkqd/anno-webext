import { beforeEach, vi } from 'vitest';
import { createAnnoTest } from '../testing';

export const { annotate, reset, options } = await createAnnoTest({
  metadata: {
    init: () => ({ note: 'init', score: 0 }),
    encode: (m) => ({
      note: m.note,
      score: String(m.score).padStart(3, '0'),
    }),
    decode: (s) => ({ note: s.note, score: parseInt(s.score, 10) }),
  },
  cssRegistry: 'test-highlight',
});

// deterministic `createdAt` for snapshots
vi.setSystemTime(new Date('2026-07-26T00:00:00.000Z'));

beforeEach(reset);
