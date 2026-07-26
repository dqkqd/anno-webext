import { describe, expect, it } from 'vitest';
import { createCodec } from '../codec';
import { annoOptionsTest, annotate } from './utils';

const codec = createCodec(annoOptionsTest);

describe('createCodec', () => {
  describe('encode', () => {
    it('converts RenderableAnnotation to StoredAnnotation', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);

      expect(stored).toStrictEqual({
        id: annotation.id,
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

  describe('decode', () => {
    it('converts StoredAnnotation to Annotation', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      const decoded = codec.decodeNonRenderable(stored);

      expect(decoded).toStrictEqual({
        ...stored,
        createdAt: new Date(stored.createdAt),
        metadata: { note: 'init', score: 0 },
      });
    });
  });

  describe('decodeRenderable', () => {
    it('resolves XPaths to valid Range', () => {
      document.body.innerHTML = '<p>hello world</p>';
      const annotation = annotate('hello');
      const stored = codec.encode(annotation);
      const restored = codec.decode(stored);

      expect(restored).toBeDefined();
      expect(restored.range.toString()).toBe('hello');
      expect(restored.metadata).toStrictEqual({ note: 'init', score: 0 });
      expect(restored.createdAt).toStrictEqual(
        new Date(stored.createdAt),
      );
    });

    describe('returns undefined when', () => {
      it('startContainer xpath is invalid', () => {
        document.body.innerHTML = '<p>hello world</p>';
        const annotation = annotate('hello');
        const stored = codec.encode(annotation);
        stored.range.startContainerXPath = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decode(stored)).toBeUndefined();
      });

      it('endContainer xpath is invalid', () => {
        document.body.innerHTML = '<p>hello world</p>';
        const annotation = annotate('hello');
        const stored = codec.encode(annotation);
        stored.range.endContainerXPath = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decode(stored)).toBeUndefined();
      });

      it('range resolves to collapsed', () => {
        document.body.innerHTML = '<p>hello world</p>';
        const annotation = annotate('hello');
        const stored = codec.encode(annotation);
        stored.range.endOffset = stored.range.startOffset;

        expect(codec.decode(stored)).toBeUndefined();
      });
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
