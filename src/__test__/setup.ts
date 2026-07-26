import { beforeEach, vi } from 'vitest';

let nextId = 0;

vi.stubGlobal('CSS', { highlights: new Map() });
vi.stubGlobal('chrome', {
  runtime: { getManifest: () => ({ version: '1.0.0' }) },
});

vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
  nextId++;
  return `00000000-0000-0000-0000-${String(nextId).padStart(12, '0')}`;
});
beforeEach(() => { nextId = 0; });
