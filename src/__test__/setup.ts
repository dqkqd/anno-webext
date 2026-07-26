import { beforeEach, vi } from 'vitest';

let nextId = 0;
let stubStorage: Record<string, unknown[]> = {};

vi.stubGlobal('CSS', { highlights: new Map() });
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({ annotations: stubStorage })),
      set: vi.fn(
        ({ annotations }: { annotations: Record<string, unknown[]> }) => {
          stubStorage = annotations;
          return Promise.resolve();
        },
      ),
    },
  },
  runtime: { getManifest: () => ({ version: '1.0.0' }) },
});

vi.setSystemTime(new Date('2026-07-26T00:00:00.000Z'));

vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
  nextId++;
  return `00000000-0000-0000-0000-${String(nextId).padStart(12, '0')}`;
});
beforeEach(() => {
  nextId = 0;
  stubStorage = {};
});
