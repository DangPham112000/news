import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { authEnabled, clerkPublishableKey } from '@/lib/auth';

/**
 * Loads the shared Clerk app, so a session from any ecosystem app is picked up here.
 * Sign-in is optional: the news is readable without it.
 * Renders children as-is when Clerk is not configured.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!authEnabled) return <>{children}</>;

  return (
    <ClerkProvider publishableKey={clerkPublishableKey!} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
