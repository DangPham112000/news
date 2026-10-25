import { verifyToken } from '@clerk/backend';

/** The signed-in person, from the shared Clerk app. News keeps no user table. */
export interface Viewer {
  clerkId: string;
}

const secretKey = () => process.env.CLERK_SECRET_KEY;

// Origins allowed to use a session token (the token's "azp" claim).
// Comma-separated, e.g. "https://news.dantepham.site".
const authorizedParties = () =>
  process.env.CLERK_AUTHORIZED_PARTIES?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Resolve the signed-in person from a Clerk session token.
 * Returns null when there is no token, it is not a Clerk token (e.g. an nwk_ API key),
 * Clerk is not configured, or the token is invalid or expired.
 */
export async function getViewer(token: string | undefined): Promise<Viewer | null> {
  const key = secretKey();
  if (!key || !token || token.startsWith('nwk_')) return null;
  try {
    const payload = await verifyToken(token, { secretKey: key, authorizedParties: authorizedParties() });
    return { clerkId: payload.sub };
  } catch {
    return null;
  }
}
