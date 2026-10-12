import { createHash } from 'node:crypto';

const TRACKING_PARAMS = /^(utm_.+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src)$/i;

/** Canonical form of a URL used for dedup. Returns null if it is not an http(s) URL. */
export function normalizeUrl(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  u.hash = '';
  u.hostname = u.hostname.toLowerCase();
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
  }
  u.searchParams.sort();
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
  return u.toString();
}

/** Hash of a title ignoring case, accents, punctuation and spacing. */
export function titleHash(title: string): string {
  const canon = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return createHash('sha256').update(canon).digest('hex');
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
