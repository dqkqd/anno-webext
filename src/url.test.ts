import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './normalize-url';

describe('normalizeUrl', () => {
  it('strips the utm_source parameter', () => {
    expect(normalizeUrl('https://example.com/page?utm_source=google')).toBe(
      'https://example.com/page',
    );
  });

  it('strips hash fragment', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe(
      'https://example.com/page',
    );
  });

  it('strips hash but preserves query parameters', () => {
    expect(normalizeUrl('https://example.com/page?q=test#anchor')).toBe(
      'https://example.com/page?q=test',
    );
  });

  it('preserves non-ephemeral query parameters', () => {
    expect(normalizeUrl('https://example.com/search?q=hello&page=2')).toBe(
      'https://example.com/search?q=hello&page=2',
    );
  });

  it('strips utm_source while preserving other parameters', () => {
    expect(
      normalizeUrl('https://example.com/search?q=search&utm_source=google'),
    ).toBe('https://example.com/search?q=search');
  });

  it('returns the url unchanged when there are no params or hash', () => {
    expect(normalizeUrl('https://example.com/plain')).toBe(
      'https://example.com/plain',
    );
  });

  it('throws on empty string', () => {
    expect(() => normalizeUrl('')).toThrow();
  });

  it('throws on invalid URL', () => {
    expect(() => normalizeUrl('not a url')).toThrow();
  });
});
