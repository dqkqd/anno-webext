import { createAnnotationFromSelection } from '../anno';
import { getRangeByText } from '../finder';
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
