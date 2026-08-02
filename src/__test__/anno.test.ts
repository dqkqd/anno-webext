import { describe, expect, it } from 'vitest';
import { createAnnotationFromSelection } from '../anno';
import { annoOptionsTest } from './utils';

describe('createAnnotationFromSelection', () => {
  it('annotates text selected backward (anchor after focus)', () => {
    document.body.innerHTML = '<p>Hello <b>world</b> there</p>';
    const p = document.querySelector('p')!;
    const b = p.querySelector('b')!;
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    // drag from end back to start: anchor in "there" (offset 6), focus in "world" (offset 0)
    selection.setBaseAndExtent(p.childNodes[2], 6, b.firstChild!, 0);

    const annotation = createAnnotationFromSelection(
      selection,
      annoOptionsTest.metadata.init,
    );

    expect(annotation).toBeDefined();
    expect(annotation!.range.collapsed).toBe(false);
    expect(annotation!.text).toBe('world there');
    // range is canonical even though the selection is backward
    expect(annotation!.range.startContainer).toBe(b.firstChild);
    expect(annotation!.range.endContainer).toBe(p.childNodes[2]);
  });

  it('returns undefined for a collapsed selection', () => {
    document.body.innerHTML = '<p>Hello</p>';
    const p = document.querySelector('p')!;
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.setBaseAndExtent(p.firstChild!, 3, p.firstChild!, 3);

    const annotation = createAnnotationFromSelection(
      selection,
      annoOptionsTest.metadata.init,
    );
    expect(annotation).toBeUndefined();
  });
});
