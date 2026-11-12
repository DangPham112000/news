import { useSyncExternalStore } from 'react';

// News has no router: the only pages besides the feed are Clerk's sign-in and sign-up.
// These helpers give Clerk in-app navigation (no full reload) and let App follow the path.
const NAVIGATE_EVENT = 'news:navigate';

export function navigate(to: string, { replace = false }: { replace?: boolean } = {}) {
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin) {
    window.location.assign(url.href);
    return;
  }
  if (replace) window.history.replaceState(null, '', url.href);
  else window.history.pushState(null, '', url.href);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}
