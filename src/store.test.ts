import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeUrl } from './normalize-url';
import { createStore, type StoredAnnotations } from './store';
import { annotateText } from './test-utils';
import type { AnnoOptions, UUID } from './types';

type TestMeta = { note: string; score: number };
type MetaStorable = { note: string; score: string };

const options: AnnoOptions<TestMeta, MetaStorable> = {
  metadata: {
    init: () => ({ note: 'init', score: 0 }),
    encode: (m) => ({ note: m.note, score: String(m.score).padStart(3, '0') }),
    decode: (s) => ({ note: s.note, score: parseInt(s.score, 10) }),
  },
};

let idCounter = 0;

beforeEach(() => {
  let storage: StoredAnnotations<MetaStorable> = {};
  idCounter = 0;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(() => Promise.resolve({ annotations: storage })),
        set: vi.fn(
          (
            { annotations }: {
              annotations: StoredAnnotations<MetaStorable>;
            },
          ) => {
            storage = annotations;
            return Promise.resolve();
          },
        ),
      },
    },
  });
  document.body.innerHTML = '';
});

function uuid(): UUID {
  return `00000000-0000-0000-0000-${
    String(idCounter++).padStart(12, '0')
  }` as UUID;
}

describe('content', () => {
  it('simple get and set', async () => {
    const a1 = annotateText('hello world1', options.metadata.init);
    const a2 = annotateText('hello world2', options.metadata.init);
    const store = createStore(options);
    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.content.get();
    expect(results).toStrictEqual([a1, a2]);
  });

  it('returns empty array when nothing stored for current URL', async () => {
    const store = createStore(options);
    const results = await store.content.get();
    expect(results).toEqual([]);
  });

  describe('filter out', () => {
    it('annotations whose DOM nodes were removed', async () => {
      const store = createStore(options);
      const annotation = annotateText('hello world', options.metadata.init);
      await store.content.set(annotation);
      expect(await store.content.get()).toHaveLength(1);
      // remove the DOM!
      document.body.innerHTML = '';
      expect(await store.content.get()).toHaveLength(0);
    });

    it('annotations whose text does not match range', async () => {
      const store = createStore(options);
      const annotation = annotateText('hello world', options.metadata.init);
      await store.content.set(annotation);
      expect(await store.content.get()).toHaveLength(1);
      annotation.scrollElement.firstChild!.textContent = 'changed text';
      const results = await store.content.get();
      expect(results).toEqual([]);
    });

    it('does not return annotations from other URLs', async () => {
      const store = createStore(options);

      const a1 = annotateText('hello world', options.metadata.init);
      await store.content.set(a1);

      const a2 = annotateText('hello world', options.metadata.init);
      a2.normalizedUrl = 'https://other.com/page';
      await store.content.set(a2);

      const results = await store.content.get();
      expect(results).toStrictEqual([a1]);
    });
  });

  it('throws when annotation with same ID already exists', async () => {
    const store = createStore(options);
    const annotation = annotateText('hello world', options.metadata.init);
    await store.content.set(annotation);
    await expect(store.content.set(annotation)).rejects.toThrow(annotation.id);
  });
});

describe('popup', () => {
  it('returns empty object when nothing stored', async () => {
    const store = createStore(options);
    const results = await store.popup.get();
    expect(results).toEqual({});
  });

  it('returns annotations grouped by URL', async () => {
    const store = createStore(options);
    const a1 = annotateText('hello world', options.metadata.init);
    a1.normalizedUrl = 'https://a.com/page';
    const a2 = annotateText('hello world', options.metadata.init);
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
    const store = createStore(options);
    const a1 = annotateText('hello world', options.metadata.init);
    const a2 = annotateText('hello world', options.metadata.init);
    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.popup.get();
    const url = normalizeUrl(location.href);
    expect(results[url]).toHaveLength(2);
  });

  it('updates metadata and returns updated annotation', async () => {
    const store = createStore(options);
    const annotation = annotateText('hello world', options.metadata.init);

    await store.content.set(annotation);

    function updateFn(m: TestMeta) {
      return {
        note: m.note + ' updated',
        score: m.score + 1,
      };
    }

    const updated = await store.popup.updateMetadata(annotation.id, updateFn);

    const results = await store.popup.get();
    const stored = results[location.href][0];

    expect(updated).toStrictEqual(stored);
    expect(updated.metadata).toStrictEqual(updateFn(annotation.metadata));
  });

  it('updates metadata throws when annotation ID not found', async () => {
    const store = createStore(options);
    const fakeId = uuid();
    await expect(
      store.popup.updateMetadata(fakeId, (m) => m),
    ).rejects.toThrow(fakeId);
  });
});
