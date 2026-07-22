import { vi } from 'vitest';

vi.stubGlobal('CSS', { highlights: new Map() });
vi.stubGlobal('chrome', {
  runtime: { getManifest: () => ({ version: '1.0.0' }) },
});
