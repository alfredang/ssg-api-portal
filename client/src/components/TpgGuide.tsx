import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Block, Guide, ScreenEl, Section } from '../tpgTypes';
import { FLOW_NODES } from '../tpgTypes';

// Renders a TPG guide as HTML. Every visual is drawn here: the end-to-end
// process flow, TPGateway buttons and field names inline in the text, and
// schematic screens. Nothing is an image.

/** Inline markup: **bold**, [[Button]], {{Field}}, [text](url). */
export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]|\{\{(.+?)\}\}|\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<span key={k++} className="g-btn">{m[2]}</span>);
    else if (m[3] !== undefined) out.push(<span key={k++} className="g-field">{m[3]}</span>);
    else out.push(<a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer">{m[4]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** End-to-end TPGateway process, with this guide's stage highlighted. */
export function ProcessFlow({ active }: { active?: string }) {
  const spine = FLOW_NODES.slice(2, 7); // the five in-line stages
  const node = (label: string, extra = '') => (
    <div className={`flow-node ${label === active ? 'on' : ''} ${extra}`} aria-current={label === active ? 'step' : undefined}>{label}</div>
  );
  return (
    <figure className="flow" aria-label="End-to-end TPGateway process for Training Providers">
      <figcaption>End-to-end TPGateway process for Training Providers</figcaption>
      <div className="flow-track">
        <div className="flow-stack">{node(FLOW_NODES[0])}{node(FLOW_NODES[1])}</div>
        <span className="flow-arrow" aria-hidden="true" />
        {spine.map((n, i) => (
          <Fragment key={n}>
            {node(n)}
            {i < spine.length - 1 && <span className="flow-arrow" aria-hidden="true" />}
          </Fragment>
        ))}
        <span className="flow-arrow" aria-hidden="true" />
        <div className="flow-stack">{node(FLOW_NODES[7])}{node(FLOW_NODES[8])}</div>
      </div>
    </figure>
  );
}

function ScreenElement({ el }: { el: ScreenEl }) {
  switch (el.kind) {
    case 'heading': return <div className="sc-heading">{el.label}</div>;
    case 'text': return <div className="sc-text"><Rich text={el.text} /></div>;
    case 'tabs': return <div className="sc-tabs">{el.items.map((t) => <span key={t} className={t === el.active ? 'on' : ''}>{t}</span>)}</div>;
    case 'search': return <div className="sc-search"><span aria-hidden="true">⌕</span>{el.placeholder}</div>;
    case 'field':
    case 'dropdown':
      return (
        <div className="sc-field">
          <span className="sc-label">{el.label}{el.required && <em> *</em>}</span>
          <span className={`sc-input ${el.kind}`}>{el.value || ' '}</span>
        </div>
      );
    case 'checkbox': return <div className="sc-check"><span className={el.checked ? 'on' : ''} aria-hidden="true">{el.checked ? '✓' : ''}</span>{el.label}</div>;
    case 'upload': return <div className="sc-upload"><span aria-hidden="true">⇪</span>{el.label}</div>;
    case 'buttons': return <div className="sc-buttons">{el.items.map((b) => <span key={b.label} className={`g-btn ${b.primary ? 'primary' : ''}`}>{b.label}</span>)}</div>;
    case 'tiles': return <div className="sc-tiles">{el.items.map((t) => <span key={t} className={t === el.active ? 'on' : ''}>{t}</span>)}</div>;
    case 'table':
      return (
        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead><tr>{el.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{el.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
  }
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p': return <p><Rich text={block.text} /></p>;
    case 'list': return <ul className="g-list">{block.items.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul>;
    case 'steps':
      return (
        <ol className="g-steps" start={block.start ?? 1} style={{ counterReset: `gs ${(block.start ?? 1) - 1}` }}>
          {block.items.map((s, i) => (
            <li key={i}>
              <div><Rich text={s.text} /></div>
              {s.sub && <ul>{s.sub.map((t, j) => <li key={j}><Rich text={t} /></li>)}</ul>}
              {s.note && <div className="g-stepnote"><Rich text={s.note} /></div>}
            </li>
          ))}
        </ol>
      );
    case 'note':
      return (
        <aside className={`g-note ${block.tone}`}>
          <b>{block.title ?? { info: 'Note', warn: 'Important', tip: 'Tip' }[block.tone]}</b>
          <span><Rich text={block.text} /></span>
        </aside>
      );
    case 'defs':
      return <dl className="g-defs">{block.items.map((d, i) => <Fragment key={i}><dt>{d.term}</dt><dd><Rich text={d.text} /></dd></Fragment>)}</dl>;
    case 'table':
      return (
        <div className="g-table-wrap">
          <table className="spec-table">
            {block.caption && <caption>{block.caption}</caption>}
            <thead><tr>{block.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'screen':
      return (
        <figure className="screen">
          <div className="screen-bar"><i /><i /><i /><span>{block.title}</span></div>
          <div className="screen-body">{block.elements.map((el, i) => <ScreenElement key={i} el={el} />)}</div>
          {block.caption && <figcaption><Rich text={block.caption} /></figcaption>}
        </figure>
      );
  }
}

function SectionView({ section, index }: { section: Section; index: number }) {
  return (
    <section id={`s-${section.id}`} className="g-section">
      <h2><span className="g-secnum">{index + 1}</span>{section.title}</h2>
      {section.summary && <p className="g-summary"><Rich text={section.summary} /></p>}
      {section.prerequisites && section.prerequisites.length > 0 && (
        <div className="g-prereq">
          <b>Before you start</b>
          <ul>{section.prerequisites.map((p, i) => <li key={i}><Rich text={p} /></li>)}</ul>
        </div>
      )}
      {section.blocks.map((b, i) => <BlockView key={i} block={b} />)}
    </section>
  );
}

/** The whole guide: flow, table of contents (sticky), sections. */
export default function TpgGuide({ guide, pdf }: { guide: Guide; pdf: string }) {
  const [current, setCurrent] = useState(guide.sections[0]?.id);

  // Highlight the section in view in the table of contents.
  useEffect(() => {
    setCurrent(guide.sections[0]?.id);
    const els = guide.sections.map((s) => document.getElementById(`s-${s.id}`)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (seen) setCurrent(seen.target.id.slice(2));
    }, { rootMargin: '-90px 0px -65% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [guide]);

  const jump = (id: string) => document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="guide">
      <nav className="guide-toc" aria-label="In this guide">
        <div className="guide-toc-title">In this guide</div>
        <ol>
          {guide.sections.map((s, i) => (
            <li key={s.id}>
              <button className={s.id === current ? 'on' : ''} onClick={() => jump(s.id)}><span>{i + 1}</span>{s.title}</button>
            </li>
          ))}
        </ol>
        <div className="guide-meta">
          <span>For {guide.audience}</span>
          {guide.updated && <span>SSG guide updated {guide.updated}</span>}
          <a href={pdf} target="_blank" rel="noopener noreferrer">Original SSG guide (PDF) ↗</a>
        </div>
      </nav>
      <article className="guide-body">
        <p className="guide-intro"><Rich text={guide.intro} /></p>
        {guide.flowNode && <ProcessFlow active={guide.flowNode} />}
        {guide.sections.map((s, i) => <SectionView key={s.id} section={s} index={i} />)}
      </article>
    </div>
  );
}
