import { describe, expect, it } from 'vitest';
import { createCodec } from '../codec';
import { RenderableAnnotation } from '../types';
import { annoOptionsTest, annotate, TestMeta } from './utils';

const codec = createCodec(annoOptionsTest);

describe('createCodec', () => {
  describe('encode', () => {
    it('converts RenderableAnnotation to StoredAnnotation', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);

      expect(stored).toStrictEqual({
        id: '00000000-0000-0000-0000-000000000001',
        version: '1.0.0',
        text: 'hello',
        originalUrl: annotation.originalUrl,
        normalizedUrl: annotation.normalizedUrl,
        annotationUrl: annotation.annotationUrl,
        createdAt: annotation.createdAt.toISOString(),
        metadata: { note: 'init', score: '000' },
        range: {
          startContainerXPath: '/html[1]/body[1]/p[1]/text()[1]',
          startOffset: 0,
          endContainerXPath: '/html[1]/body[1]/p[1]/text()[1]',
          endOffset: 5,
        },
      });
    });
  });

  describe('decodeNonRenderable', () => {
    it('converts StoredAnnotation to Annotation', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      const decoded = codec.decodeNonRenderable(stored);

      expect(decoded).toStrictEqual({
        id: '00000000-0000-0000-0000-000000000001',
        version: stored.version,
        text: stored.text,
        originalUrl: stored.originalUrl,
        normalizedUrl: stored.normalizedUrl,
        annotationUrl: stored.annotationUrl,
        createdAt: new Date(stored.createdAt),
        metadata: { note: 'init', score: 0 },
      });
    });
  });

  describe('decode', () => {
    it('returns valid for intact XPath with matching text', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      const decoded = codec.decode(stored);

      expect(decoded.kind).toBe('valid');
      const decodedAnnotation = decoded.annotation as RenderableAnnotation<
        TestMeta
      >;
      expect(decodedAnnotation.range.toString()).toBe('hello');
      expect(decodedAnnotation.metadata).toStrictEqual({
        note: 'init',
        score: 0,
      });
      expect(decoded.annotation.createdAt).toStrictEqual(
        new Date(stored.createdAt),
      );
    });

    it('returns recoverable when XPath is stale but text exists', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      document.body.innerHTML = '<div>hello</div>';
      const decoded = codec.decode(stored);

      expect(decoded.kind).toBe('recoverable');
    });

    it('returns unrecoverable when XPath is stale and text is gone', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      document.body.innerHTML = '<div>goodbye</div>';
      const decoded = codec.decode(stored);

      expect(decoded.kind).toBe('unrecoverable');
    });

    it('returns unrecoverable when text does not match and cannot be found', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      document.body.querySelector('p')!.firstChild!.textContent = 'changed';
      const decoded = codec.decode(stored);

      expect(decoded.kind).toBe('unrecoverable');
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
