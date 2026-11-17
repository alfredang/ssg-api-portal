import { useSyncExternalStore } from 'react';

// The most recent call made from each console page, so the workbench can show
// its status, timing and raw JSON whichever form made it.

export interface CallRecord { at: number; ms: number; method: string; url: string; status: number; app: string; auth?: string; data: unknown }

let page = '';
let calls: Record<string, CallRecord> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Tell the store which console page is open; calls are filed under it. */
export function setConsolePage(p: string) { page = p; }
export function recordCall(r: CallRecord) {
  if (!page) return;
  calls = { ...calls, [page]: r };
  emit();
}
export function useLastCall(p: string): CallRecord | undefined {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => calls[p]);
}
