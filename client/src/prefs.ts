// Reader preferences shared by every docs page and kept in localStorage:
// the example language (curl / Python / JavaScript) and the fill-in values.
import { useSyncExternalStore } from 'react';
import type { Lang, Vars } from './apiSpecs';
import { DEFAULT_VARS } from './apiSpecs';

function store<T>(key: string, initial: T) {
  let value = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) value = typeof initial === 'string' ? (raw as T) : { ...initial, ...JSON.parse(raw) };
  } catch { /* private mode */ }
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      try { localStorage.setItem(key, typeof next === 'string' ? next : JSON.stringify(next)); } catch { /* ignore */ }
      subs.forEach((f) => f());
    },
    subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  };
}

const langStore = store<Lang>('ssg-docs-lang', 'curl');
const varsStore = store<Vars>('ssg-docs-vars', DEFAULT_VARS);

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(langStore.subscribe, langStore.get);
  return [(['curl', 'python', 'javascript'] as Lang[]).includes(lang) ? lang : 'curl', langStore.set];
}

export function useVars(): [Vars, (v: Vars) => void] {
  return [useSyncExternalStore(varsStore.subscribe, varsStore.get), varsStore.set];
}

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'curl', label: 'curl' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
];
