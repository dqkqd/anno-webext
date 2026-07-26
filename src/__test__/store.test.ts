import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createStore } from '../store';
import {
  annoOptionsTest,
  annotate,
  resetStore,
  setupStorageMock,
  type TestMeta,
} from './utils';

const store = createStore(annoOptionsTest);

beforeAll(() => setupStorageMock());
beforeEach(() => resetStore());

describe('content', () => {
  it('simple get and set', async () => {
    document.body.innerHTML = '<p>hello world1</p><p>hello world2</p>';
    const a1 = annotate('hello world1');
    const a2 = annotate('hello world2');

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
    const results = await store.content.get();
    expect(results).toStrictEqual({
      valid: [],
      recoverable: [],
      unrecoverable: [],
    });
  });

  describe('filter out', () => {
    it('recovers annotations when DOM is restructured', async () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello world');
      await store.content.set(annotation);

      document.body.innerHTML = '<div>hello world</div>';
      const results = await store.content.get();

      expect(results).toStrictEqual({
        valid: [],
        recoverable: [{
          id: '00000000-0000-0000-0000-000000000001',
          version: annotation.version,
          text: 'hello world',
          originalUrl: annotation.originalUrl,
          normalizedUrl: annotation.normalizedUrl,
          annotationUrl: annotation.annotationUrl,
          createdAt: annotation.createdAt,
          range: expect.any(Range) as Range,
          metadata: { note: 'init', score: 0 },
        }],
        unrecoverable: [],
      });
    });

    it('annotations whose DOM nodes were removed', async () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello world');
      await store.content.set(annotation);

      document.body.innerHTML = '';
      const results = await store.content.get();
      expect(results).toStrictEqual({
        valid: [],
        recoverable: [],
        unrecoverable: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            version: annotation.version,
            text: annotation.text,
            originalUrl: annotation.originalUrl,
            normalizedUrl: annotation.normalizedUrl,
            annotationUrl: annotation.annotationUrl,
            createdAt: annotation.createdAt,
            metadata: annotation.metadata,
          },
        ],
      });
    });

    it('annotations whose text does not match range', async () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello world');
      await store.content.set(annotation);

      expect(await store.content.get()).toStrictEqual({
        valid: [annotation],
        recoverable: [],
        unrecoverable: [],
      });

      (document.querySelector('p')!.firstChild as Text).textContent =
        'changed text';
      const results = await store.content.get();
      expect(results).toStrictEqual({
        valid: [],
        recoverable: [],
        unrecoverable: [{
          id: '00000000-0000-0000-0000-000000000001',
          version: annotation.version,
          text: annotation.text,
          originalUrl: annotation.originalUrl,
          normalizedUrl: annotation.normalizedUrl,
          annotationUrl: annotation.annotationUrl,
          createdAt: annotation.createdAt,
          metadata: annotation.metadata,
        }],
      });
    });

    it('does not return annotations from other URLs', async () => {
      document.body.innerHTML = '<p>hello world</p>';
      const a1 = annotate('hello world');
      await store.content.set(a1);

      document.body.innerHTML = '<p>hello world</p>';
      const a2 = annotate('hello world');
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

  it('update annotation if it is already exist', async () => {
    document.body.innerHTML = '<p>hello world</p>';
    const annotation = annotate('hello world');
    await store.content.set(annotation);

    annotation.metadata.note = 'new';
    await store.content.set(annotation);

    const result = await store.content.get();
    expect(result.valid[0].metadata).toStrictEqual({ note: 'new', score: 0 });
  });
});

describe('popup', () => {
  it('returns empty object when nothing stored', async () => {
    const results = await store.popup.get();
    expect(results).toEqual({});
  });

  it('returns annotations grouped by URL', async () => {
    document.body.innerHTML = '<p>hello world</p>';
    const a1 = annotate('hello world');
    a1.normalizedUrl = 'https://a.com/page';

    document.body.innerHTML = '<p>hello world</p>';
    const a2 = annotate('hello world');
    a2.normalizedUrl = 'https://b.com/page';

    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.popup.get();
    expect(Object.keys(results)).toHaveLength(2);
    expect(results['https://a.com/page']).toHaveLength(1);
    expect(results['https://a.com/page'][0].id).toBe('00000000-0000-0000-0000-000000000001');
    expect(results['https://b.com/page']).toHaveLength(1);
    expect(results['https://b.com/page'][0].id).toBe('00000000-0000-0000-0000-000000000002');
  });

  it('returns multiple annotations per URL', async () => {
    document.body.innerHTML = '<p>hello world</p>';
    const a1 = annotate('hello world');
    const a2 = annotate('hello world');
    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.popup.get();
    expect(results[location.href]).toHaveLength(2);
  });

  it('updates metadata and returns updated annotation', async () => {
    document.body.innerHTML = '<p>hello world</p>';
    const annotation = annotate('hello world');
    await store.content.set(annotation);

    function updateFn(m: TestMeta) {
      return { note: m.note + ' updated', score: m.score + 1 };
    }

    const updated = await store.popup.updateMetadata('00000000-0000-0000-0000-000000000001', updateFn);

    const results = await store.popup.get();
    const stored = results[location.href][0];

    expect(updated).toStrictEqual(stored);
    expect(updated.metadata).toStrictEqual(updateFn(annotation.metadata));
  });

  it('updates metadata throws when annotation ID not found', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(
      store.popup.updateMetadata(fakeId, (m) => m),
    ).rejects.toThrow(fakeId);
  });
});
