import { vi } from 'vitest';
import { createAnnotationFromSelection } from './anno';
import type { StoredAnnotations } from './store';
import type { AnnoOptions, DomAnnotation } from './types';

export type StoreTestMeta = { note: string; score: number };
export type StoreTestStorable = { note: string; score: string };
export const annoOptionsTest: AnnoOptions<StoreTestMeta, StoreTestStorable> = {
  metadata: {
    init: () => ({ note: 'init', score: 0 }),
    encode: (m) => ({ note: m.note, score: String(m.score).padStart(3, '0') }),
    decode: (s) => ({ note: s.note, score: parseInt(s.score, 10) }),
  },
};

let selectCounter = 0;

export function selectText(text: string): Selection {
  const id = `st${selectCounter++}`;
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="${id}">${text}</div>`,
  );
  const textNode = document.querySelector(`#${id}`)!.firstChild! as Text;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, text.length);

  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

export function annotateText(text: string): DomAnnotation<StoreTestMeta> {
  return createAnnotationFromSelection(
    selectText(text),
    annoOptionsTest.metadata.init,
  )!;
}

let stubStorage: StoredAnnotations<StoreTestStorable> = {};

export function setupStorageMock() {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({ annotations: stubStorage })),
        set: vi.fn(
          (
            { annotations }: {
              annotations: StoredAnnotations<StoreTestStorable>;
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
  document.body.innerHTML = '';
}
