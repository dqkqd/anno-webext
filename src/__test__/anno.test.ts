import { describe, expect, it } from 'vitest';
import { createAnnotationFromSelection } from '../anno';
import { normalizeUrl } from '../url';
import { selectText } from './utils';

describe('createAnnotationFromSelection', () => {
  it('creates a DomAnnotation from a text selection', () => {
    const selection = selectText('hello world');

    const annotation = createAnnotationFromSelection(
      selection,
      () => ({ note: 'test' }),
    );

    const expectedOriginalUrl = location.href;
    const expectedNormalizedUrl = normalizeUrl(expectedOriginalUrl);
    const scrollElement = annotation!.scrollElement;

    expect(annotation).toStrictEqual({
      id: expect.any(String) as string,
      version: '1.0.0',
      text: 'hello world',
      originalUrl: expectedOriginalUrl,
      normalizedUrl: expectedNormalizedUrl,
      annotationUrl: `${expectedNormalizedUrl}#anno-record-id=${
        annotation!.id
      }`,
      createdAt: expect.any(Date) as Date,
      range: expect.any(Range) as Range,
      scrollElement,
      metadata: { note: 'test' },
    });

    expect(annotation!.range.collapsed).toBe(false);
    expect(annotation!.range.toString()).toBe('hello world');
  });
});
