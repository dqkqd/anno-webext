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
