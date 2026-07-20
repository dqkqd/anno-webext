import { beforeEach, describe, expect, it } from 'vitest';
import { createCodec } from './codec';
import type { AnnoOptions, DomAnnotation, StoredAnnotation } from './types';

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

function makeAnnotation(): DomAnnotation<string> {
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

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('encode', () => {
    it('converts DomAnnotation to StoredAnnotation', () => {
      const annotation = makeAnnotation();
      const stored = codec.encode(annotation);

      expect(stored.createdAt).toBe(annotation.createdAt.toISOString());
      expect(stored.metadata).toBe('HELLO');
      expect(stored.range.startContainer.xpath).toBeTypeOf('string');
      expect(stored.range.endContainer.xpath).toBeTypeOf('string');
      expect(stored.range.startOffset).toBe(0);
      expect(stored.range.endOffset).toBe(5);
      expect(stored.scrollElement.xpath).toBeTypeOf('string');
      expect(stored.id).toBe(annotation.id);
      expect(stored.text).toBe(annotation.text);
      expect(stored.version).toBe(annotation.version);
      expect(stored.originalUrl).toBe(annotation.originalUrl);
      expect(stored.normalizedUrl).toBe(annotation.normalizedUrl);
      expect(stored.annotationUrl).toBe(annotation.annotationUrl);
    });
  });

  describe('decode', () => {
    it('converts StoredAnnotation to Annotation', () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const stored: StoredAnnotation<string> = {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        version: '1.0.0',
        text: 'hello',
        originalUrl: 'https://example.com/page',
        normalizedUrl: 'https://example.com/page',
        annotationUrl: 'https://example.com/page#anno=aaa',
        createdAt: createdAt.toISOString(),
        range: {
          startContainer: { xpath: '/html[1]/body[1]/p[1]/text()[1]' },
          startOffset: 0,
          endContainer: { xpath: '/html[1]/body[1]/p[1]/text()[1]' },
          endOffset: 5,
        },
        scrollElement: { xpath: '/html[1]/body[1]/p[1]' },
        metadata: 'HELLO',
      };

      const annotation = codec.decode(stored);

      expect(annotation.createdAt).toBeInstanceOf(Date);
      expect(annotation.createdAt.getTime()).toBe(createdAt.getTime());
      expect(annotation.metadata).toBe('hello');
      expect(annotation.id).toBe(stored.id);
      expect(annotation.text).toBe(stored.text);
      expect(annotation.version).toBe(stored.version);
      expect(annotation.originalUrl).toBe(stored.originalUrl);
      expect(annotation.normalizedUrl).toBe(stored.normalizedUrl);
      expect(annotation.annotationUrl).toBe(stored.annotationUrl);
    });
  });

  describe('decodeDom', () => {
    it('resolves XPaths to valid Range', () => {
      const annotation = makeAnnotation();
      const stored = codec.encode(annotation);
      const restored = codec.decodeDom(stored);

      expect(restored).toBeDefined();
      expect(restored!.range.toString()).toBe('hello');
      expect(restored!.scrollElement).toBe(annotation.scrollElement);
      expect(restored!.metadata).toBe('hello');
      expect(restored!.createdAt).toBeInstanceOf(Date);
    });

    describe('returns undefined when', () => {
      it('startContainer xpath is invalid', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.range.startContainer.xpath = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decodeDom(stored)).toBeUndefined();
      });

      it('endContainer xpath is invalid', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.range.endContainer.xpath = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decodeDom(stored)).toBeUndefined();
      });

      it('scrollElement xpath is invalid', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.scrollElement.xpath = '/html[1]/body[1]/nonexistent[1]';

        expect(codec.decodeDom(stored)).toBeUndefined();
      });

      it('range resolves to collapsed', () => {
        const annotation = makeAnnotation();
        const stored = codec.encode(annotation);
        stored.range.endOffset = stored.range.startOffset;

        expect(codec.decodeDom(stored)).toBeUndefined();
      });
    });

    it('throws when offset exceeds node length', () => {
      const annotation = makeAnnotation();
      const stored = codec.encode(annotation);
      stored.range.startOffset = 9999;

      expect(() => codec.decodeDom(stored)).toThrow(DOMException);
    });
  });
});
