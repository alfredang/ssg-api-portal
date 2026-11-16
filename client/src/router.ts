// Minimal client router on real paths (History API), so every page has its
// own indexable URL. Plain <a href="/…"> links are intercepted here; nothing
// else needs to know about routing.
import { useSyncExternalStore } from 'react';

const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export function navigate(path: string, { replace = false } = {}) {
  if (path === window.location.pathname + window.location.search) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  notify();
  window.scrollTo(0, 0);
}

export function usePath(): string {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    () => window.location.pathname,
  );
}

// Old "#/…" links (bookmarks, earlier builds) map onto the new paths.
export function legacyHashPath(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const p = hash.slice(1);
  if (p.startsWith('/api/')) return '/docs/' + p.slice(5);
  if (p.startsWith('/apis/')) return '/category/' + p.slice(6);
  return p;
}

let started = false;
export function startRouter() {
  if (started) return;
  started = true;
  const legacy = legacyHashPath(window.location.hash);
  if (legacy) window.history.replaceState(null, '', legacy + window.location.search);
  window.addEventListener('popstate', notify);
  // Same-origin link clicks become client navigations.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest?.('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (/\.[a-z0-9]{2,5}$/i.test(href.split('?')[0]) || href.startsWith('/auth/') || href.startsWith('/api/')) return; // real files / server routes
    e.preventDefault();
    navigate(href);
  });
}
