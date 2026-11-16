import { useEffect, useState } from 'react';
import { CATALOG } from '../catalog';
import type { AuthUser } from '../auth';
import { TopBar, Footer } from './Shell';

// TPG (Training Partners Gateway) process: a visual journey map of the 13
// steps a training provider follows, grouped into 5 phases. Each step opens
// its quick-reference guide as page images (rendered from the PDFs in
// /tpg-process/, see pages/<step>/<n>.jpg) with the SSG APIs that automate it.

interface Step { id: number; title: string; file: string; desc: string; pages: number; phase: string; icon: string; groups: string[] }
interface Phase { id: string; name: string; blurb: string; color: string; tint: string }

export const TPG_PHASES: Phase[] = [
  { id: 'setup', name: 'Set up', blurb: 'Get the course approved and scheduled', color: '#2F5BE6', tint: '#E3EAFC' },
  { id: 'enrol', name: 'Enrol', blurb: 'Price the course and enrol trainees', color: '#0E8A6A', tint: '#DDF3EC' },
  { id: 'deliver', name: 'Deliver', blurb: 'Run the class and assess', color: '#B45309', tint: '#FBEBD3' },
  { id: 'fund', name: 'Fund', blurb: 'Grants, claims and money', color: '#7C3AED', tint: '#EBE3FC' },
  { id: 'close', name: 'Close', blurb: 'Report outcomes and certify', color: '#BE185D', tint: '#FBE1EC' },
];

// Icon paths: 24x24, stroke only.
const ICONS: Record<string, string> = {
  dashboard: 'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z',
  form: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5M8 14h3M13 14h3M8 17h3',
  calculator: 'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01',
  userPlus: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a7 7 0 0 1 14 0M19 8v6M16 11h6',
  check: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5M8.5 16l2.5 2.5 4.5-5',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8.5 14l2.5 2.5 4.5-5',
  bank: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  money: 'M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01',
  refund: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3',
  award: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9 13l-2 8 5-3 5 3-2-8',
};

export const TPG_STEPS: Step[] = [
  { id: 1, title: 'Course Dashboards', file: '1-course-dashboards.pdf', pages: 6, phase: 'setup', icon: 'dashboard', desc: 'See every course, run and task at a glance on TPGateway.', groups: ['courses'] },
  { id: 2, title: 'Course Applications', file: '2-course-applications.pdf', pages: 7, phase: 'setup', icon: 'form', desc: 'Submit and manage course applications for approval.', groups: ['courses'] },
  { id: 3, title: 'Course Runs', file: '3-course-runs.pdf', pages: 8, phase: 'setup', icon: 'calendar', desc: 'Add course runs with their sessions and trainers.', groups: ['training-providers'] },
  { id: 4, title: 'Grant Calculator', file: '4-grant-calculator.pdf', pages: 3, phase: 'enrol', icon: 'calculator', desc: 'Estimate the grant and the nett fee a trainee pays.', groups: ['grant-calculator'] },
  { id: 5, title: 'Trainee Enrolment', file: '5-trainee-enrolment.pdf', pages: 11, phase: 'enrol', icon: 'userPlus', desc: 'Enrol trainees into a course run, singly or in bulk.', groups: ['enrolments'] },
  { id: 6, title: 'Attendance', file: '6-attendance.pdf', pages: 9, phase: 'deliver', icon: 'check', desc: 'Take and upload attendance for every session.', groups: ['training-providers'] },
  { id: 7, title: 'Assessments', file: '7-assessments.pdf', pages: 9, phase: 'deliver', icon: 'clipboard', desc: 'Submit each trainee’s assessment result.', groups: ['assessments'] },
  { id: 8, title: 'Grants', file: '8-grants.pdf', pages: 3, phase: 'fund', icon: 'bank', desc: 'Track the grants raised for your enrolments.', groups: ['grant-calculator'] },
  { id: 9, title: 'Claims', file: '9-claims.pdf', pages: 5, phase: 'fund', icon: 'send', desc: 'Submit and follow up claims.', groups: ['sfc-pay'] },
  { id: 10, title: 'Outcome Submission', file: '10-outcome-submission.pdf', pages: 5, phase: 'close', icon: 'target', desc: 'Report training outcomes and competency results.', groups: ['assessments', 'course-feedback'] },
  { id: 11, title: 'Financial Transactions', file: '11-financial-transactions.pdf', pages: 2, phase: 'fund', icon: 'money', desc: 'View disbursements and other transactions.', groups: ['enrolments'] },
  { id: 12, title: 'Refunds', file: '12-refunds.pdf', pages: 3, phase: 'fund', icon: 'refund', desc: 'Process refunds and adjustments.', groups: ['enrolments', 'sfc-pay'] },
  { id: 13, title: 'Certificates', file: '13-certificates.pdf', pages: 3, phase: 'close', icon: 'award', desc: 'Generate and download e-certificates.', groups: ['assessments'] },
];

const GROUPS = CATALOG.flatMap((p) => p.groups);
const phaseOf = (s: Step) => TPG_PHASES.find((p) => p.id === s.phase)!;
const pageUrl = (s: Step, n: number) => `/tpg-process/pages/${s.id}/${n}.jpg`;

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

interface Props { user: AuthUser | null; step: number; onStep: (n: number) => void }

export default function TpgProcess({ user, step, onStep }: Props) {
  const current = TPG_STEPS.find((s) => s.id === step);
  return (
    <div className="pub">
      <TopBar user={user} active="tpg" />
      {current ? <StepView step={current} onStep={onStep} /> : <JourneyMap onStep={onStep} />}
      <Footer />
    </div>
  );
}

function JourneyMap({ onStep }: { onStep: (n: number) => void }) {
  return (
    <>
      <section className="pub-hero tpg-hero">
        <h1>TPG Process</h1>
        <p>How a course moves through the Training Partners Gateway: 13 steps in 5 phases. Pick a step to open its guide and the SSG APIs that automate it.</p>
        <ol className="tpg-rail" aria-label="Phases">
          {TPG_PHASES.map((p, i) => (
            <li key={p.id} style={{ '--c': p.color, '--t': p.tint } as React.CSSProperties}>
              <a href={`#phase-${p.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`phase-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                <span className="tpg-rail-n">{i + 1}</span>
                <span><b>{p.name}</b><small>{TPG_STEPS.filter((s) => s.phase === p.id).length} steps</small></span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <main className="tpg-map">
        {TPG_PHASES.map((p, i) => (
          <section key={p.id} id={`phase-${p.id}`} className="tpg-phase" style={{ '--c': p.color, '--t': p.tint } as React.CSSProperties}>
            <header>
              <span className="tpg-phase-n">{i + 1}</span>
              <div><h2>{p.name}</h2><p>{p.blurb}</p></div>
            </header>
            <div className="tpg-cards">
              {TPG_STEPS.filter((s) => s.phase === p.id).map((s) => (
                <button key={s.id} className="tpg-card" onClick={() => onStep(s.id)}>
                  <span className="tpg-card-img">
                    <img src={pageUrl(s, 1)} alt="" loading="lazy" />
                    <span className="tpg-card-icon"><Icon name={s.icon} /></span>
                  </span>
                  <span className="tpg-card-body">
                    <span className="tpg-card-step">Step {s.id}</span>
                    <b>{s.title}</b>
                    <span className="tpg-card-desc">{s.desc}</span>
                    <span className="tpg-card-meta">{s.pages} pages · {s.groups.reduce((n, g) => n + (GROUPS.find((x) => x.id === g)?.apis.length ?? 0), 0)} related APIs</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}

function StepView({ step, onStep }: { step: Step; onStep: (n: number) => void }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(false);
  const phase = phaseOf(step);
  const related = step.groups.map((g) => GROUPS.find((x) => x.id === g)).filter((g): g is NonNullable<typeof g> => !!g);
  const pdf = `/tpg-process/${step.file}`;

  useEffect(() => { setPage(1); setZoom(false); window.scrollTo(0, 0); }, [step.id]);

  // ← → turn pages; at either end they move to the previous / next step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
      if (e.key === 'ArrowRight') { if (page < step.pages) setPage(page + 1); else if (step.id < TPG_STEPS.length) onStep(step.id + 1); }
      if (e.key === 'ArrowLeft') { if (page > 1) setPage(page - 1); else if (step.id > 1) onStep(step.id - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, step, onStep]);

  return (
    <div className="tpg-step" style={{ '--c': phase.color, '--t': phase.tint } as React.CSSProperties}>
      <nav className="tpg-stepper" aria-label="Process steps">
        <button className="tpg-all" onClick={() => onStep(0)}>← All steps</button>
        <ol>
          {TPG_STEPS.map((s) => {
            const p = phaseOf(s);
            return (
              <li key={s.id} style={{ '--c': p.color, '--t': p.tint } as React.CSSProperties}>
                <button className={s.id === step.id ? 'on' : ''} onClick={() => onStep(s.id)} title={`${s.id}. ${s.title}`} aria-current={s.id === step.id ? 'step' : undefined}>
                  <Icon name={s.icon} size={16} />
                  <span>{s.id}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <header className="tpg-step-head">
        <span className="tpg-step-icon"><Icon name={step.icon} size={30} /></span>
        <div className="tpg-step-title">
          <div className="tpg-kicker">{phase.name} · Step {step.id} of {TPG_STEPS.length}</div>
          <h1>{step.title}</h1>
          <p>{step.desc}</p>
        </div>
        <div className="tpg-actions">
          <button className="pub-btn ghost" disabled={step.id === 1} onClick={() => onStep(step.id - 1)}>← Step {step.id - 1}</button>
          <button className="pub-btn" disabled={step.id === TPG_STEPS.length} onClick={() => onStep(step.id + 1)}>Step {step.id + 1} →</button>
        </div>
      </header>

      {related.length > 0 && (
        <div className="tpg-related">
          <span>APIs for this step</span>
          {related.map((g) => (
            <a key={g.id} className="chip" href={`#/apis/${g.id}`}>{g.name} <small>{g.apis.length}</small></a>
          ))}
        </div>
      )}

      <div className="tpg-gallery">
        <ol className="tpg-thumbs" aria-label="Guide pages">
          {Array.from({ length: step.pages }, (_, i) => i + 1).map((n) => (
            <li key={n}>
              <button className={n === page ? 'on' : ''} onClick={() => setPage(n)} aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined}>
                <img src={pageUrl(step, n)} alt="" loading="lazy" />
                <span>{n}</span>
              </button>
            </li>
          ))}
        </ol>
        <figure className="tpg-page">
          <button className="tpg-page-img" onClick={() => setZoom(true)} aria-label="Enlarge page">
            <img src={pageUrl(step, page)} alt={`${step.title} guide, page ${page} of ${step.pages}`} />
          </button>
          <figcaption>
            <button className="pub-btn ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>←</button>
            <span>Page {page} of {step.pages}</span>
            <button className="pub-btn ghost" disabled={page === step.pages} onClick={() => setPage(page + 1)}>→</button>
            <a href={pdf} download>Download PDF</a>
            <a href={pdf} target="_blank" rel="noopener noreferrer">Open PDF ↗</a>
          </figcaption>
        </figure>
      </div>

      {zoom && (
        <div className="tpg-zoom" role="dialog" aria-label="Enlarged page" onClick={() => setZoom(false)}>
          <img src={pageUrl(step, page)} alt={`${step.title} guide, page ${page}`} />
          <button aria-label="Close">×</button>
        </div>
      )}
    </div>
  );
}
