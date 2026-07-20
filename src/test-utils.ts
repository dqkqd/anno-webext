import { createAnnotationFromSelection } from './anno';
import type { DomAnnotation } from './types';

let counter = 0;

export function selectText(text: string): Selection {
  const id = `st${counter++}`;
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

export function annotateText<M>(
  text: string,
  createMetadata: () => M,
  overrides?: Partial<DomAnnotation<M>>,
): DomAnnotation<M> {
  const annotation = createAnnotationFromSelection(
    selectText(text),
    createMetadata,
  )!;
  return { ...annotation, ...overrides };
}
