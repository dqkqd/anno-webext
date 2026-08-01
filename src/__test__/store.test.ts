import { describe, expect, it } from 'vitest';
import { createStore } from '../store';
import { annoOptionsTest, annotate, type TestMeta } from './utils';

const store = createStore(annoOptionsTest);

describe('content', () => {
  it('simple get and set', async () => {
    document.body.innerHTML = '<p>hello world1</p><p>hello world2</p>';
    const a1 = annotate('hello world1');
    const a2 = annotate('hello world2');

    await store.content.set(a1);
    await store.content.set(a2);

    const results = await store.content.get();
    expect(results).toMatchInlineSnapshot(`
      {
        "recoverable": [],
        "unrecoverable": [],
        "valid": [
          {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000001",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "http://localhost:3000/",
            "originalUrl": "http://localhost:3000/",
            "range": Range {},
            "text": "hello world1",
            "version": "1.0.0",
          },
          {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000002",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000002",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "http://localhost:3000/",
            "originalUrl": "http://localhost:3000/",
            "range": Range {},
            "text": "hello world2",
            "version": "1.0.0",
          },
        ],
      }
    `);
  });

  it('returns empty array when nothing stored for current URL', async () => {
    const results = await store.content.get();
    expect(results).toMatchInlineSnapshot(`
      {
        "recoverable": [],
        "unrecoverable": [],
        "valid": [],
      }
    `);
  });

  describe('filter out', () => {
    it('recovers annotations when DOM is restructured', async () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello world');
      await store.content.set(annotation);

      document.body.innerHTML = '<div>hello world</div>';
      const results = await store.content.get();

      expect(results).toMatchInlineSnapshot(`
        {
          "recoverable": [
            {
              "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
              "createdAt": 2026-07-26T00:00:00.000Z,
              "id": "00000000-0000-0000-0000-000000000001",
              "metadata": {
                "note": "init",
                "score": 0,
              },
              "normalizedUrl": "http://localhost:3000/",
              "originalUrl": "http://localhost:3000/",
              "range": Range {},
              "text": "hello world",
              "version": "1.0.0",
            },
          ],
          "unrecoverable": [],
          "valid": [],
        }
      `);
    });

    it('annotations whose DOM nodes were removed', async () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello world');
      await store.content.set(annotation);

      document.body.innerHTML = '';
      const results = await store.content.get();
      expect(results).toMatchInlineSnapshot(`
        {
          "recoverable": [],
          "unrecoverable": [
            {
              "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
              "createdAt": 2026-07-26T00:00:00.000Z,
              "id": "00000000-0000-0000-0000-000000000001",
              "metadata": {
                "note": "init",
                "score": 0,
              },
              "normalizedUrl": "http://localhost:3000/",
              "originalUrl": "http://localhost:3000/",
              "text": "hello world",
              "version": "1.0.0",
            },
          ],
          "valid": [],
        }
      `);
    });

    it('annotations whose text does not match range', async () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello world');
      await store.content.set(annotation);

      expect(await store.content.get()).toMatchInlineSnapshot(`
        {
          "recoverable": [],
          "unrecoverable": [],
          "valid": [
            {
              "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
              "createdAt": 2026-07-26T00:00:00.000Z,
              "id": "00000000-0000-0000-0000-000000000001",
              "metadata": {
                "note": "init",
                "score": 0,
              },
              "normalizedUrl": "http://localhost:3000/",
              "originalUrl": "http://localhost:3000/",
              "range": Range {},
              "text": "hello world",
              "version": "1.0.0",
            },
          ],
        }
      `);

      (document.querySelector('p')!.firstChild as Text).textContent =
        'changed text';
      const results = await store.content.get();
      expect(results).toMatchInlineSnapshot(`
        {
          "recoverable": [],
          "unrecoverable": [
            {
              "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
              "createdAt": 2026-07-26T00:00:00.000Z,
              "id": "00000000-0000-0000-0000-000000000001",
              "metadata": {
                "note": "init",
                "score": 0,
              },
              "normalizedUrl": "http://localhost:3000/",
              "originalUrl": "http://localhost:3000/",
              "text": "hello world",
              "version": "1.0.0",
            },
          ],
          "valid": [],
        }
      `);
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
      expect(results).toMatchInlineSnapshot(`
        {
          "recoverable": [],
          "unrecoverable": [],
          "valid": [
            {
              "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
              "createdAt": 2026-07-26T00:00:00.000Z,
              "id": "00000000-0000-0000-0000-000000000001",
              "metadata": {
                "note": "init",
                "score": 0,
              },
              "normalizedUrl": "http://localhost:3000/",
              "originalUrl": "http://localhost:3000/",
              "range": Range {},
              "text": "hello world",
              "version": "1.0.0",
            },
          ],
        }
      `);
    });
  });

  it('update annotation if it is already exist', async () => {
    document.body.innerHTML = '<p>hello world</p>';
    const annotation = annotate('hello world');
    await store.content.set(annotation);

    annotation.metadata.note = 'new';
    await store.content.set(annotation);

    const result = await store.content.get();
    expect(result).toMatchInlineSnapshot(`
      {
        "recoverable": [],
        "unrecoverable": [],
        "valid": [
          {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000001",
            "metadata": {
              "note": "new",
              "score": 0,
            },
            "normalizedUrl": "http://localhost:3000/",
            "originalUrl": "http://localhost:3000/",
            "range": Range {},
            "text": "hello world",
            "version": "1.0.0",
          },
        ],
      }
    `);
  });

  it('remove annotation', async () => {
    document.body.innerHTML = '<p>hello world1</p><p>hello world2</p>';
    const a = annotate('hello world1');
    await store.content.set(a);
    await store.content.remove(a.id);
    const results = await store.content.get();
    expect(results).toStrictEqual({
      valid: [],
      recoverable: [],
      unrecoverable: [],
    });
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
    expect(results).toMatchInlineSnapshot(`
      {
        "https://a.com/page": [
          {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000001",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "https://a.com/page",
            "originalUrl": "http://localhost:3000/",
            "text": "hello world",
            "version": "1.0.0",
          },
        ],
        "https://b.com/page": [
          {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000002",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000002",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "https://b.com/page",
            "originalUrl": "http://localhost:3000/",
            "text": "hello world",
            "version": "1.0.0",
          },
        ],
      }
    `);
  });

  it('returns multiple annotations per URL', async () => {
    document.body.innerHTML = '<p>hello world</p>';
    const a1 = annotate('hello world');
    const a2 = annotate('hello world');
    await store.content.set(a1);
    await store.content.set(a2);
    const results = await store.popup.get();
    expect(results).toMatchInlineSnapshot(`
      {
        "http://localhost:3000/": [
          {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000001",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "http://localhost:3000/",
            "originalUrl": "http://localhost:3000/",
            "text": "hello world",
            "version": "1.0.0",
          },
          {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000002",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000002",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "http://localhost:3000/",
            "originalUrl": "http://localhost:3000/",
            "text": "hello world",
            "version": "1.0.0",
          },
        ],
      }
    `);
  });

  it('updates metadata and returns updated annotation', async () => {
    document.body.innerHTML = '<p>hello world</p>';
    const annotation = annotate('hello world');
    await store.content.set(annotation);

    function updateFn(m: TestMeta) {
      return { note: m.note + ' updated', score: m.score + 1 };
    }

    const updated = await store.popup.updateMetadata(
      '00000000-0000-0000-0000-000000000001',
      updateFn,
    );

    expect(updated).toMatchInlineSnapshot(`
      {
        "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
        "createdAt": 2026-07-26T00:00:00.000Z,
        "id": "00000000-0000-0000-0000-000000000001",
        "metadata": {
          "note": "init updated",
          "score": 1,
        },
        "normalizedUrl": "http://localhost:3000/",
        "originalUrl": "http://localhost:3000/",
        "text": "hello world",
        "version": "1.0.0",
      }
    `);
  });

  it('updates metadata throws when annotation ID not found', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(
      store.popup.updateMetadata(fakeId, (m) => m),
    ).rejects.toThrow(fakeId);
  });
});
