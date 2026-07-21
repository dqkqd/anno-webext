import { UUID } from './types';

// normalizeUrl from https://github.com/obsidianmd/obsidian-clipper/
const EPHEMERAL_PARAMS = new Set([
  't', // YouTube timestamp
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content', // UTM tracking
  'ref',
  'source',
  'src', // Referral
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'twclid', // Ad click IDs
  'mc_cid',
  'mc_eid', // Mailchimp
  '_ga',
  '_gl', // Google Analytics
  'si', // YouTube share tracking
]);

const ANNOTATION_HASH_ANCHOR = 'anno-record-id';

export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  const searchParams = new URLSearchParams(parsed.search);
  const params = searchParams.wrappedJSObject ?? searchParams;
  for (const key of [...params.keys()]) {
    if (EPHEMERAL_PARAMS.has(key)) {
      params.delete(key);
    }
  }
  parsed.search = params.toString();
  return parsed.toString();
}

export function createAnnotationUrl(normalizedUrl: string, id: UUID): string {
  return `${normalizedUrl}#${ANNOTATION_HASH_ANCHOR}=${id}`;
}

export function getAnnotationIdFromUrl(): UUID | undefined {
  const anchor = `${ANNOTATION_HASH_ANCHOR}=`;
  const hash = location.hash;
  const index = hash.indexOf(anchor);
  if (index === -1) {
    return;
  }
  return hash.slice(index + anchor.length, index + anchor.length + 36) as UUID;
}
