import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../url';
import { annotateText } from './utils';

describe('createAnnotationFromSelection', () => {
  it('creates a DomAnnotation from a text selection', () => {
    const annotation = annotateText('hello world');

    const expectedOriginalUrl = location.href;
    const expectedNormalizedUrl = normalizeUrl(expectedOriginalUrl);
    const scrollElement = annotation.scrollElement;

    expect(annotation).toStrictEqual({
      id: expect.any(String) as string,
      version: '1.0.0',
      text: 'hello world',
      originalUrl: expectedOriginalUrl,
      normalizedUrl: expectedNormalizedUrl,
      annotationUrl: `${expectedNormalizedUrl}#anno-record-id=${annotation.id}`,
      createdAt: expect.any(Date) as Date,
      range: expect.any(Range) as Range,
      scrollElement,
      metadata: { note: 'init', score: 0 },
    });

    expect(annotation.range.collapsed).toBe(false);
    expect(annotation.range.toString()).toBe('hello world');
  });
});
