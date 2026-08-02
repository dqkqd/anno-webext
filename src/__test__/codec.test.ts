import { describe, expect, it } from 'vitest';
import { createCodec } from '../codec';
import type { RenderableAnnotation } from '../types';
import { annoOptionsTest, annotate, type TestMeta } from './utils';

const codec = createCodec(annoOptionsTest);

describe('createCodec', () => {
  describe('encode', () => {
    it('converts RenderableAnnotation to StoredAnnotation', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);

      expect(stored).toMatchInlineSnapshot(`
        {
          "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
          "createdAt": "2026-07-26T00:00:00.000Z",
          "id": "00000000-0000-0000-0000-000000000001",
          "metadata": {
            "note": "init",
            "score": "000",
          },
          "normalizedUrl": "http://localhost:3000/",
          "originalUrl": "http://localhost:3000/",
          "range": {
            "endContainerXPath": "/html[1]/body[1]/p[1]/text()[1]",
            "endOffset": 5,
            "startContainerXPath": "/html[1]/body[1]/p[1]/text()[1]",
            "startOffset": 0,
          },
          "text": "hello",
          "version": "1.0.0",
        }
      `);
    });
  });

  describe('decodeNonRenderable', () => {
    it('converts StoredAnnotation to Annotation', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      const decoded = codec.decodeNonRenderable(stored);

      expect(decoded).toMatchInlineSnapshot(`
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
          "text": "hello",
          "version": "1.0.0",
        }
      `);
    });
  });

  describe('decode', () => {
    it('returns valid for intact XPath with matching text', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      const decoded = codec.decode(stored);

      expect(decoded).toMatchInlineSnapshot(`
        {
          "annotation": {
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
            "text": "hello",
            "version": "1.0.0",
          },
          "kind": "valid",
        }
      `);
    });

    it('returns recoverable when XPath is stale but text exists', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      document.body.innerHTML = '<div>hello</div>';
      const decoded = codec.decode(stored);

      expect(decoded).toMatchInlineSnapshot(`
        {
          "annotation": {
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
            "text": "hello",
            "version": "1.0.0",
          },
          "kind": "recoverable",
        }
      `);
    });

    it('returns unrecoverable when text only exists in non-rendered content', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      // the text moved out of the rendered body, now only inside a script
      document.head.innerHTML = '<script>const text = "hello";</script>';
      document.body.innerHTML = '<div>gone</div>';
      const decoded = codec.decode(stored);

      expect(decoded.kind).toBe('unrecoverable');
    });

    it('recovers text from body when non-rendered content also matches', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      document.head.innerHTML = '<script>const text = "hello";</script>';
      document.body.innerHTML = '<div>goodbye <b>hello</b> again</div>';
      const decoded = codec.decode(stored);

      expect(decoded.kind).toBe('recoverable');
      expect(
        (decoded.annotation as RenderableAnnotation<TestMeta>).range
          .startContainer,
      ).toBe(document.querySelector('b')!.firstChild);
    });

    it('returns unrecoverable when XPath is stale and text is gone', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      document.body.innerHTML = '<div>goodbye</div>';
      const decoded = codec.decode(stored);

      expect(decoded).toMatchInlineSnapshot(`
        {
          "annotation": {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000001",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "http://localhost:3000/",
            "originalUrl": "http://localhost:3000/",
            "text": "hello",
            "version": "1.0.0",
          },
          "kind": "unrecoverable",
        }
      `);
    });

    it('returns unrecoverable when text does not match and cannot be found', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      document.body.querySelector('p')!.firstChild!.textContent = 'changed';
      const decoded = codec.decode(stored);

      expect(decoded).toMatchInlineSnapshot(`
        {
          "annotation": {
            "annotationUrl": "http://localhost:3000/#anno-record-id=00000000-0000-0000-0000-000000000001",
            "createdAt": 2026-07-26T00:00:00.000Z,
            "id": "00000000-0000-0000-0000-000000000001",
            "metadata": {
              "note": "init",
              "score": 0,
            },
            "normalizedUrl": "http://localhost:3000/",
            "originalUrl": "http://localhost:3000/",
            "text": "hello",
            "version": "1.0.0",
          },
          "kind": "unrecoverable",
        }
      `);
    });

    it('throws when offset exceeds node length', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      stored.range.startOffset = 9999;

      expect(() => codec.decode(stored)).toThrow(DOMException);
    });
  });
});
