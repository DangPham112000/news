import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { authEnabled, clerkPublishableKey } from '@/lib/auth';
import { navigate } from '@/lib/navigation';

/**
 * Loads the shared Clerk app, so a session from any ecosystem app is picked up here.
 * Sign-in is optional: the news is readable without it.
 * Sign-in and sign-up run on this app's own /sign-in and /sign-up pages, not on the shared
 * Account Portal, so the user always comes back to News (the portal's fallback is the root
 * domain, which has no site). Renders children as-is when Clerk is not configured.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!authEnabled) return <>{children}</>;

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey!}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
