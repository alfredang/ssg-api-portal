import { useEffect, useRef, useState } from 'react';
import type { OurCourse } from '../api/courseApi';

// Type-to-search suggestions for the console's test forms, without rewriting
// each form: this watches the page and, when a matching field has focus, shows
// a list under it.
//   Course reference fields  ->  our own funded WSQ courses (search by title or code)
//   Course run ID fields     ->  that course's runs from AI-LMS-TMS (read only)
//   Enrolment reference      ->  that run's enrolment references from AI-LMS-TMS (no learner details)
// Picking an item writes its value into the field, as if it had been typed.

interface Run { runId: string; status: string; start: string; end: string; mode?: string; enrolled?: number }
type Kind = 'course' | 'run' | 'enrol';
interface Enrol { ref: string; status: string; date?: string; payment?: string }
interface Item { value: string; title: string; hint: string }

const labelOf = (el: HTMLInputElement): string => {
  const byFor = el.id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`) : null;
  return (byFor ?? el.closest('label') ?? el.closest('.form-group')?.querySelector('label') ?? el.parentElement?.querySelector('label'))?.textContent ?? '';
};
function kindOf(el: Element | null): Kind | null {
  if (!(el instanceof HTMLInputElement) || !['text', 'search', ''].includes(el.type) || el.readOnly || !el.closest('.main-content form')) return null;
  const text = `${labelOf(el)} ${el.name} ${el.id}`.toLowerCase();
  if (/enrol\w*\s*(ref|reference)|enrolref|enrolment reference/.test(text)) return 'enrol';
  if (/course\s*run\s*id|\brun\s*id\b|runid/.test(text)) return 'run';
  if (/course\s*ref|course reference|courserefno|courseref\b/.test(text) && !/run\s*ref/.test(text)) return 'course';
  return null;
}
/** Set an uncontrolled or controlled input's value so React and the form both see it. */
function setValue(el: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
const fmt = (d: string | null | undefined) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function FieldSuggest({ courses, fallbackCourse, fallbackRun }: { courses: OurCourse[]; fallbackCourse: string; fallbackRun: string }) {
  const [target, setTarget] = useState<{ el: HTMLInputElement; kind: Kind } | null>(null);
  const [query, setQuery] = useState('');
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0 });
  const [runs, setRuns] = useState<{ course: string; state: 'loading' | 'ready' | 'off' | 'error'; list: Run[] }>({ course: '', state: 'ready', list: [] });
  const pop = useRef<HTMLDivElement>(null);
  const runCache = useRef(new Map<string, Run[]>());

  // Follow focus and typing anywhere in the console forms.
  useEffect(() => {
    const place = (el: HTMLInputElement) => { const r = el.getBoundingClientRect(); setBox({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 360) }); };
    const onFocus = (e: FocusEvent) => {
      const kind = kindOf(e.target as Element);
      if (!kind) return;
      const el = e.target as HTMLInputElement;
      setTarget({ el, kind }); setQuery(el.value); setTyped(false); setActive(0); place(el);
    };
    const onInput = (e: Event) => { if (target && e.target === target.el && e.isTrusted) { setQuery(target.el.value); setTyped(true); setActive(0); } };
    const onDown = (e: MouseEvent) => { if (target && e.target !== target.el && !pop.current?.contains(e.target as Node)) setTarget(null); };
    const onMove = () => { if (target) { if (!document.contains(target.el)) setTarget(null); else place(target.el); } };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('input', onInput);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('focusin', onFocus); document.removeEventListener('input', onInput); document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onMove, true); window.removeEventListener('resize', onMove);
    };
  }, [target]);

  // Course runs come from AI-LMS-TMS for the course named in the same form (or the selected course).
  const runCourse = (() => {
    if (target?.kind !== 'run') return '';
    const inForm = [...(target.el.form?.querySelectorAll<HTMLInputElement>('input') ?? [])].find((i) => kindOf(i) === 'course');
    return (inForm?.value || fallbackCourse || '').trim();
  })();
  useEffect(() => {
    if (!runCourse) return;
    const cached = runCache.current.get(runCourse);
    if (cached) { setRuns({ course: runCourse, state: 'ready', list: cached }); return; }
    setRuns({ course: runCourse, state: 'loading', list: [] });
    let live = true;
    fetch(`/api/lms/course-runs?course=${encodeURIComponent(runCourse)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { configured?: boolean; runs?: Run[]; error?: string }) => {
        if (!live) return;
        if (d.configured === false) setRuns({ course: runCourse, state: 'off', list: [] });
        else if (d.error) setRuns({ course: runCourse, state: 'error', list: [] });
        else { runCache.current.set(runCourse, d.runs ?? []); setRuns({ course: runCourse, state: 'ready', list: d.runs ?? [] }); }
      })
      .catch(() => { if (live) setRuns({ course: runCourse, state: 'error', list: [] }); });
    return () => { live = false; };
  }, [runCourse]);

  // Enrolment references of the run named in the same form (or the default run).
  const [enrols, setEnrols] = useState<{ run: string; state: 'loading' | 'ready' | 'off' | 'error'; list: Enrol[] }>({ run: '', state: 'ready', list: [] });
  const enrolRun = (() => {
    if (target?.kind !== 'enrol') return '';
    const inForm = [...(target.el.form?.querySelectorAll<HTMLInputElement>('input') ?? [])].find((i) => kindOf(i) === 'run');
    return (inForm?.value || fallbackRun || '').trim();
  })();
  useEffect(() => {
    if (!enrolRun) return;
    setEnrols({ run: enrolRun, state: 'loading', list: [] });
    let live = true;
    fetch(`/api/lms/enrolments?run=${encodeURIComponent(enrolRun)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { configured?: boolean; enrolments?: Enrol[]; error?: string }) => {
        if (live) setEnrols({ run: enrolRun, state: d.configured === false ? 'off' : d.error ? 'error' : 'ready', list: d.enrolments ?? [] });
      })
      .catch(() => { if (live) setEnrols({ run: enrolRun, state: 'error', list: [] }); });
    return () => { live = false; };
  }, [enrolRun]);

  if (!target) return null;
  // Until the reader types, show everything: the field's current value is not a search.
  const terms = (typed ? query : '').toLowerCase().split(/\s+/).filter(Boolean);
  const match = (text: string) => terms.every((t) => text.toLowerCase().includes(t));
  const items: Item[] = target.kind === 'course'
    ? courses.filter((c) => match(`${c.ref} ${c.title}`)).slice(0, 50).map((c) => ({ value: c.ref, title: c.title, hint: `${c.ref} · funded to ${fmt(c.fundEnd)}` }))
    : target.kind === 'enrol'
      ? enrols.list.filter((e) => match(`${e.ref} ${e.status}`)).slice(0, 50).map((e) => ({ value: e.ref, title: e.ref, hint: `${e.status || 'status not set'}${e.payment ? ` · ${e.payment}` : ''}${e.date ? ` · enrolled ${fmt(String(e.date).slice(0, 10))}` : ''}` }))
      : runs.list.filter((r) => match(`${r.runId} ${r.status} ${r.start}`)).slice(0, 50).map((r) => ({ value: r.runId, title: `Run ${r.runId}`, hint: `${fmt(r.start)}${r.end && r.end !== r.start ? ` to ${fmt(r.end)}` : ''} · ${r.status || 'status not set'}${typeof r.enrolled === 'number' ? ` · ${r.enrolled} enrolled` : ''}` }));
  const empty = target.kind === 'course'
    ? (courses.length ? 'No course of ours matches. Search by title or code.' : 'Our course list is still loading from SSG.')
    : target.kind === 'enrol'
      ? (!enrolRun ? 'Enter a course run ID first.' : enrols.state === 'loading' ? 'Loading enrolments from AI-LMS-TMS…' : enrols.state === 'off' ? 'AI-LMS-TMS is not connected yet. Type the enrolment reference.' : enrols.state === 'error' ? 'Could not read enrolments from AI-LMS-TMS. Type the reference.' : `No enrolment in AI-LMS-TMS for run ${enrolRun}.`)
    : !runCourse ? 'Choose a course first.'
      : runs.state === 'loading' ? 'Loading course runs from AI-LMS-TMS…'
        : runs.state === 'off' ? 'AI-LMS-TMS is not connected yet, so course runs cannot be suggested. Type the run ID.'
          : runs.state === 'error' ? 'Could not read course runs from AI-LMS-TMS. Type the run ID.'
            : `No course run in AI-LMS-TMS for ${runCourse}.`;

  const pick = (it: Item) => { setValue(target.el, it.value); setTarget(null); target.el.blur(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && items[active] && typed) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setTarget(null);
  };
  target.el.onkeydown = onKey;

  return (
    <div ref={pop} className="fs-pop" role="listbox" aria-label={target.kind === 'course' ? 'Our courses' : target.kind === 'run' ? 'Course runs' : 'Enrolments'} style={{ left: Math.min(box.left, window.innerWidth - box.width - 12), top: box.top, width: box.width }}>
      <div className="fs-head">{target.kind === 'course' ? `Our funded WSQ courses · type a title or code` : target.kind === 'run' ? `Course runs of ${runCourse || '…'} · from AI-LMS-TMS` : `Enrolments of run ${enrolRun || '…'} · from AI-LMS-TMS`}</div>
      <ul>
        {items.map((it, i) => (
          <li key={it.value}>
            <button type="button" role="option" aria-selected={i === active} className={i === active ? 'on' : ''} onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(it); }}>
              <b>{it.title}</b><span>{it.hint}</span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="fs-empty">{empty}</li>}
      </ul>
    </div>
  );
}
