import { describe, expect, it } from 'vitest';
import { createCodec } from '../codec';
import type {
  AnnoOptions,
  RenderableAnnotation,
  StoredAnnotation,
} from '../types';

const options: AnnoOptions<string, string> = {
  metadata: {
    init: () => '',
    encode: (s) => s.toUpperCase(),
    decode: (s) => s.toLowerCase(),
  },
};

function setupDom() {
  document.body.innerHTML = '<div id="root"><p>hello world</p></div>';
  const p = document.querySelector('p')!;
  const textNode = p.firstChild as Text;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 5);
  return { p, textNode, range };
}

function makeAnnotation(): RenderableAnnotation<string> {
  const { p, range } = setupDom();
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    version: '1.0.0',
    text: 'hello',
    originalUrl: 'https://example.com/page?utm_source=x',
    normalizedUrl: 'https://example.com/page',
    annotationUrl: 'https://example.com/page#anno=aaa',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    range,
    scrollElement: p,
    metadata: 'hello',
  };
}

describe('createCodec', () => {
  const codec = createCodec(options);

  describe('encode', () => {
    it('converts RenderableAnnotation to StoredAnnotation', () => {
      const annotation = makeAnnotation();
      const stored = codec.encode(annotation);

      expect(stored).toStrictEqual({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        version: '1.0.0',
        text: 'hello',
        originalUrl: 'https://example.com/page?utm_source=x',
        normalizedUrl: 'https://example.com/page',
        annotationUrl: 'https://example.com/page#anno=aaa',
        createdAt: '2024-01-01T00:00:00.000Z',
        metadata: 'HELLO',
        range: {
          startContainerXPath: '/html[1]/body[1]/div[1]/p[1]/text()[1]',
          startOffset: 0,
          endContainerXPath: '/html[1]/body[1]/div[1]/p[1]/text()[1]',
          endOffset: 5,
        },
        scrollElement: '/html[1]/body[1]/div[1]/p[1]',
      });
    });
  });

  describe('decode', () => {
    it('converts StoredAnnotation to Annotation', () => {
      const stored: StoredAnnotation<string> = {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        version: '1.0.0',
        text: 'hello',
        originalUrl: 'https://example.com/page',
        normalizedUrl: 'https://example.com/page',
        annotationUrl: 'https://example.com/page#anno=aaa',
        createdAt: '2024-01-01T00:00:00.000Z',
        range: {
          startContainerXPath: '/html[1]/body[1]/p[1]/text()[1]',
          startOffset: 0,
          endContainerXPath: '/html[1]/body[1]/p[1]/text()[1]',
          endOffset: 5,
        },
        scrollElement: '/html[1]/body[1]/p[1]',
        metadata: 'HELLO',
      };

      const annotation = codec.decode(stored);

      expect(annotation).toStrictEqual({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        version: '1.0.0',
        text: 'hello',
        originalUrl: 'https://example.com/page',
        normalizedUrl: 'https://example.com/page',
        annotationUrl: 'https://example.com/page#anno=aaa',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        metadata: 'hello',
        range: stored.range,
        scrollElement: stored.scrollElement,
      });
    });
  });

  describe('decodeRenderable', () => {
    it('resolves XPaths to valid Range', () => {
      const annotation = makeAnnotation();
      const stored = codec.encode(annotation);
      const restored = codec.decodeRenderable(stored);

      expect(restored).toBeDefined();
      expect(restored!.range.toString()).toBe('hello');
      expect(restored!.scrollElement).toBe(annotation.scrollElement);
      expect(restored!.metadata).toBe('hello');
      expect(restored!.createdAt).toStrictEqual(
        new Date('2024-01-01T00:00:00.000Z'),
      );
    });

    describe('returns undefined when', () => {
      it('startContainer xpath is invalid', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.range.startContainerXPath = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decodeRenderable(stored)).toBeUndefined();
      });

      it('endContainer xpath is invalid', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.range.endContainerXPath = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decodeRenderable(stored)).toBeUndefined();
      });

      it('scrollElement xpath is invalid', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.scrollElement = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decodeRenderable(stored)).toBeUndefined();
      });

      it('range resolves to collapsed', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.range.endOffset = stored.range.startOffset;

        expect(codec.decodeRenderable(stored)).toBeUndefined();
      });
    });

    it('throws when offset exceeds node length', () => {
      const annotation = makeAnnotation();
      const stored = codec.encode(annotation);
      stored.range.startOffset = 9999;

      expect(() => codec.decodeRenderable(stored)).toThrow(DOMException);
    });
  });
});
