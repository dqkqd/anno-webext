import { vi } from 'vitest';
import { createAnnotationFromSelection } from '../anno';
import { getRangeByText } from '../finder';
import type { StoredAnnotations } from '../store';
import type { RenderableAnnotation, ResolveAnnoOptions } from '../types';

export type TestMeta = { note: string; score: number };
export type TestMetaStorable = { note: string; score: string };
export const annoOptionsTest: ResolveAnnoOptions<TestMeta, TestMetaStorable> = {
  metadata: {
    init: () => ({ note: 'init', score: 0 }),
    encode: (m) => ({ note: m.note, score: String(m.score).padStart(3, '0') }),
    decode: (s) => ({ note: s.note, score: parseInt(s.score, 10) }),
  },
  cssRegistry: 'test-highlight',
};

export function annotate(text: string): RenderableAnnotation<TestMeta> {
  const range = getRangeByText(document.body, text)!;
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return createAnnotationFromSelection(
    selection,
    annoOptionsTest.metadata.init,
  )!;
}

let stubStorage: StoredAnnotations<TestMetaStorable> = {};

export function setupStorageMock() {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({ annotations: stubStorage })),
        set: vi.fn(
          (
            { annotations }: {
              annotations: StoredAnnotations<TestMetaStorable>;
            },
          ) => {
            stubStorage = annotations;
            return Promise.resolve();
          },
        ),
      },
    },
    runtime: { getManifest: () => ({ version: '1.0.0' }) },
  });
}

export function resetStore() {
  stubStorage = {};
}
