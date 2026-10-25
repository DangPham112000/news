import { Show, SignInButton, UserButton } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { authEnabled } from '@/lib/auth';

/**
 * Clerk's avatar menu when signed in, otherwise a sign-in button that goes to the
 * ecosystem's Account Portal and back. Hidden when sign-in is off.
 */
export function AccountButton() {
  if (!authEnabled) return null;
  return (
    <>
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton>
          <Button variant="outline" size="sm">
            Đăng nhập
          </Button>
        </SignInButton>
      </Show>
    </>
  );
}
