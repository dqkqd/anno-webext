import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAnnotationFromSelection } from '../anno';
import { getRangeByText } from '../finder';
import { createStore } from '../store';
import type { DomAnnotation, UUID } from '../types';
import {
  annoOptionsTest,
  annotateText,
  resetStore,
  setupStorageMock,
  type TestMeta,
} from './utils';

beforeAll(() => setupStorageMock());
beforeEach(() => resetStore());

describe('content', () => {
  it('simple get and set', async () => {
    const a1 = annotateText('hello world1');
    const a2 = annotateText('hello world2');
    const store = createStore(annoOptionsTest);
    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.content.get();
    expect(results).toStrictEqual({
      valid: [a1, a2],
      recoverable: [],
      unrecoverable: [],
    });
  });

  it('returns empty array when nothing stored for current URL', async () => {
    const store = createStore(annoOptionsTest);
    const results = await store.content.get();
    expect(results).toStrictEqual({
      valid: [],
      recoverable: [],
      unrecoverable: [],
    });
  });

  describe('filter out', () => {
    it('annotations whose DOM nodes were removed', async () => {
      const store = createStore(annoOptionsTest);
      const annotation = annotateText('hello world');
      await store.content.set(annotation);

      document.body.innerHTML = '';
      const results = await store.content.get();
      expect(results).toStrictEqual({
        valid: [],
        recoverable: [],
        unrecoverable: [
          {
            ...annotation,
            range: {
              endContainerXPath: '/html[1]/body[1]/div[1]/text()[1]',
              endOffset: 11,
              startContainerXPath: '/html[1]/body[1]/div[1]/text()[1]',
              startOffset: 0,
            },
            scrollElement: '/html[1]/body[1]/div[1]',
          },
        ],
      });
    });

    it('annotations whose text does not match range', async () => {
      const store = createStore(annoOptionsTest);
      const annotation = annotateText('hello world');
      await store.content.set(annotation);
      expect(await store.content.get()).toStrictEqual({
        valid: [annotation],
        recoverable: [],
        unrecoverable: [],
      });
      annotation.scrollElement.firstChild!.textContent = 'changed text';
      const results = await store.content.get();
      expect(results).toStrictEqual({
        valid: [],
        recoverable: [],
        unrecoverable: [{
          ...annotation,
          range: {
            startContainerXPath: '/html[1]/body[1]/div[1]/text()[1]',
            startOffset: 0,
            endContainerXPath: '/html[1]/body[1]/div[1]/text()[1]',
            endOffset: 11,
          },
          scrollElement: '/html[1]/body[1]/div[1]',
        }],
      });
    });

    it('does not return annotations from other URLs', async () => {
      const store = createStore(annoOptionsTest);
      const a1 = annotateText('hello world');
      await store.content.set(a1);
      const a2 = annotateText('hello world');
      a2.normalizedUrl = 'https://other.com/page';
      await store.content.set(a2);
      const results = await store.content.get();
      expect(results).toStrictEqual({
        valid: [a1],
        recoverable: [],
        unrecoverable: [],
      });
    });
  });

  it('throws when annotation with same ID already exists', async () => {
    const store = createStore(annoOptionsTest);
    const annotation = annotateText('hello world');
    await store.content.set(annotation);
    await expect(store.content.set(annotation)).rejects.toThrow(annotation.id);
  });
});

describe('popup', () => {
  it('returns empty object when nothing stored', async () => {
    const store = createStore(annoOptionsTest);
    const results = await store.popup.get();
    expect(results).toEqual({});
  });

  it('returns annotations grouped by URL', async () => {
    const store = createStore(annoOptionsTest);
    const a1 = annotateText('hello world');
    a1.normalizedUrl = 'https://a.com/page';
    const a2 = annotateText('hello world');
    a2.normalizedUrl = 'https://b.com/page';
    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.popup.get();
    expect(Object.keys(results)).toHaveLength(2);
    expect(results['https://a.com/page']).toHaveLength(1);
    expect(results['https://a.com/page'][0].id).toBe(a1.id);
    expect(results['https://b.com/page']).toHaveLength(1);
    expect(results['https://b.com/page'][0].id).toBe(a2.id);
  });

  it('returns multiple annotations per URL', async () => {
    const store = createStore(annoOptionsTest);
    const a1 = annotateText('hello world');
    const a2 = annotateText('hello world');
    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.popup.get();
    expect(results[location.href]).toHaveLength(2);
  });

  it('updates metadata and returns updated annotation', async () => {
    const store = createStore(annoOptionsTest);
    const annotation = annotateText('hello world');
    await store.content.set(annotation);

    function updateFn(m: TestMeta) {
      return { note: m.note + ' updated', score: m.score + 1 };
    }

    const updated = await store.popup.updateMetadata(annotation.id, updateFn);

    const results = await store.popup.get();
    const stored = results[location.href][0];

    expect(updated).toStrictEqual(stored);
    expect(updated.metadata).toStrictEqual(updateFn(annotation.metadata));
  });

  it('updates metadata throws when annotation ID not found', async () => {
    const store = createStore(annoOptionsTest);
    const fakeId = '00000000-0000-0000-0000-000000000000' as UUID;
    await expect(
      store.popup.updateMetadata(fakeId, (m) => m),
    ).rejects.toThrow(fakeId);
  });
});

function annotate(html: string, search: string): DomAnnotation<TestMeta> {
  document.body.innerHTML = html;
  const range = getRangeByText(document.body, search)!;
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return createAnnotationFromSelection(
    selection,
    annoOptionsTest.metadata.init,
  )!;
}

it('annotates inline HTML', async () => {
  const store = createStore(annoOptionsTest);
  const annotation = annotate('<p>hello world</p>', 'hello world');
  await store.content.set(annotation);
  const results = await store.content.get();
  expect(results).toStrictEqual({
    valid: [annotation],
    recoverable: [],
    unrecoverable: [],
  });
});
