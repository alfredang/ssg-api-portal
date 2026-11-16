import { CATALOG } from '../catalog';
import type { AuthUser } from '../auth';
import { TopBar, Footer } from './Shell';
import TpgGuide from './TpgGuide';
import { TPG_GUIDES } from '../tpgGuides';
import { TPG_STEPS, TPG_PHASES, stepBySlug } from '../tpgSteps';
import type { Step } from '../tpgSteps';

export { TPG_STEPS, TPG_PHASES };

// TPG (Training Partners Gateway) process: a visual journey map of the 13
// steps a training provider follows, grouped into 5 phases. Each step opens
// its quick-reference guide rendered as HTML (content in tpgGuides*.ts, drawn
// by TpgGuide.tsx) with the SSG APIs that automate it. No PDF pages or
// screenshots are embedded; the original PDFs stay downloadable.

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

const GROUPS = CATALOG.flatMap((p) => p.groups);
const phaseOf = (s: Step) => TPG_PHASES.find((p) => p.id === s.phase)!;

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function TpgProcess({ user, slug }: { user: AuthUser | null; slug?: string }) {
  const current = slug ? stepBySlug(slug) : undefined;
  return (
    <div className="pub">
      <TopBar user={user} active="tpg" />
      {current ? <StepView key={current.id} step={current} /> : <JourneyMap />}
      <Footer />
    </div>
  );
}

function JourneyMap() {
  return (
    <>
      <section className="pub-hero tpg-hero">
        <h1>TPG Process: Training Partners Gateway, step by step</h1>
        <p>How a course moves through the Training Partners Gateway (TPGateway): 13 steps in 5 phases, from course runs and the SWDA enrolment process to the TPG claim process and e-certificates. Pick a step for its guide and the SSG / SWDA APIs that automate it.</p>
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
                <a key={s.id} className="tpg-card" href={`/tpg-process/${s.slug}`}>
                  <span className="tpg-card-art">
                    <span className="num" aria-hidden="true">{s.id}</span>
                    <span className="big"><Icon name={s.icon} size={54} /></span>
                  </span>
                  <span className="tpg-card-body">
                    <span className="tpg-card-step">Step {s.id}</span>
                    <b>{s.title}</b>
                    <span className="tpg-card-desc">{s.desc}</span>
                    <span className="tpg-card-topics">
                      {(TPG_GUIDES[s.id]?.sections ?? []).slice(0, 4).map((sec) => <span key={sec.id}>{sec.title}</span>)}
                    </span>
                    <span className="tpg-card-meta">{TPG_GUIDES[s.id]?.sections.length ?? 0} topics · {s.groups.reduce((n, g) => n + (GROUPS.find((x) => x.id === g)?.apis.length ?? 0), 0)} related APIs</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}

function StepView({ step }: { step: Step }) {
  const phase = phaseOf(step);
  const related = step.groups.map((g) => GROUPS.find((x) => x.id === g)).filter((g): g is NonNullable<typeof g> => !!g);
  const pdf = `/tpg-process/${step.file}`;
  const guide = TPG_GUIDES[step.id];
  const prev = TPG_STEPS[step.id - 2];
  const next = TPG_STEPS[step.id];

  return (
    <div className="tpg-step" style={{ '--c': phase.color, '--t': phase.tint } as React.CSSProperties}>
      <nav className="tpg-stepper" aria-label="Process steps">
        <a className="tpg-all" href="/tpg-process">← All steps</a>
        <ol>
          {TPG_STEPS.map((s) => {
            const p = phaseOf(s);
            return (
              <li key={s.id} style={{ '--c': p.color, '--t': p.tint } as React.CSSProperties}>
                <a className={s.id === step.id ? 'on' : ''} href={`/tpg-process/${s.slug}`} title={`${s.id}. ${s.title}`} aria-current={s.id === step.id ? 'step' : undefined}>
                  <Icon name={s.icon} size={16} />
                  <span>{s.id}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <header className="tpg-step-head">
        <span className="tpg-step-icon"><Icon name={step.icon} size={30} /></span>
        <div className="tpg-step-title">
          <div className="tpg-kicker">{phase.name} · Step {step.id} of {TPG_STEPS.length}</div>
          <h1>{step.seoTitle.split(':')[0]}</h1>
          <p>{step.desc}</p>
        </div>
        <div className="tpg-actions">
          {prev && <a className="pub-btn ghost" href={`/tpg-process/${prev.slug}`}>← Step {prev.id}</a>}
          {next && <a className="pub-btn" href={`/tpg-process/${next.slug}`}>Step {next.id} →</a>}
        </div>
      </header>

      {related.length > 0 && (
        <div className="tpg-related">
          <span>SSG / SWDA APIs for this step</span>
          {related.map((g) => (
            <a key={g.id} className="chip" href={`/category/${g.id}`}>{g.name} <small>{g.apis.length}</small></a>
          ))}
        </div>
      )}

      {guide
        ? <TpgGuide guide={guide} pdf={pdf} />
        : <p className="pub-empty">This guide is not available as a page yet. <a href={pdf} target="_blank" rel="noopener noreferrer">Open the SSG guide (PDF)</a>.</p>}

      <nav className="api-pager" aria-label="Previous and next step">
        {prev ? <a href={`/tpg-process/${prev.slug}`}><small>← Step {prev.id}</small>{prev.title}</a> : <span />}
        {next ? <a href={`/tpg-process/${next.slug}`} className="next"><small>Step {next.id} →</small>{next.title}</a> : <span />}
      </nav>
    </div>
  );
}
