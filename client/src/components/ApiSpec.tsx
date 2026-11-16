import { useState } from 'react';
import type { ApiEntry } from '../catalog';
import { BASE_URLS } from '../catalog';
import { SPECS, PATH_PARAMS, NO_VERSION, FILE_EXT, DEFAULT_VARS, applyVars, authChoices, pathParams, codeSample, localToolSample } from '../apiSpecs';
import type { AuthChoice } from '../apiSpecs';
import { useLang, useVars } from '../prefs';
import { LangSwitch } from './Shell';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return <button className="spec-copy" onClick={copy}>{copied ? 'Copied' : label}</button>;
}

export function CodeBlock({ code, download }: { code: string; download?: string }) {
  const save = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code + '\n'], { type: 'text/plain' }));
    a.download = download!;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="spec-code">
      <div className="spec-code-actions">
        {download && <button className="spec-copy" onClick={save}>Download</button>}
        <CopyButton text={code} />
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

/** Left column: what to send and what comes back. */
export function RequestSpec({ api }: { api: ApiEntry }) {
  const [vars] = useVars();
  const spec = SPECS[api.page] ?? {};
  const v = (s: string) => applyVars(s, vars);
  const rows = [
    ...pathParams(api).map((k) => ({ where: 'path', name: k, required: true, example: v(PATH_PARAMS[k]?.example ?? ''), desc: PATH_PARAMS[k]?.desc ?? '' })),
    ...(spec.query ?? []).map((f) => ({ where: 'query', name: f.name, required: !!f.required, example: v(f.example), desc: f.desc })),
    ...(NO_VERSION.has(api.page) ? [] : [{ where: 'header', name: 'x-api-version', required: true, example: api.version, desc: 'API version.' }]),
    ...(spec.headers ?? []).map((f) => ({ where: 'header', name: f.name, required: !!f.required, example: v(f.example), desc: f.desc })),
  ];
  return (
    <div className="spec">
      <h2>Request</h2>
      {rows.length > 0 ? (
        <table className="spec-table">
          <thead><tr><th>In</th><th>Name</th><th>Required</th><th>Example</th><th>Description</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.where}-${r.name}`}>
                <td><span className={`spec-in ${r.where}`}>{r.where}</span></td><td><code>{r.name}</code></td><td>{r.required ? 'Yes' : 'No'}</td><td><code>{r.example}</code></td><td>{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="spec-note">No parameters.</p>}

      {api.method === 'POST' && (
        <>
          <h2>Body</h2>
          <p className="spec-note">
            {api.auth === 'cert+aes'
              ? 'Build this JSON, then AES-256-CBC encrypt it and send the base64 text as the body. The response comes back encrypted the same way.'
              : 'JSON, sent as is.'}
          </p>
          {spec.body !== undefined && <CodeBlock code={v(JSON.stringify(spec.body, null, 2))} />}
        </>
      )}
      {spec.note && <p className="spec-note spec-callout">{spec.note}</p>}

      <h2>Response</h2>
      <p className="spec-note">
        A JSON envelope: <code>{'{ "status": 200, "data": { … }, "meta": { … }, "error": { … } }'}</code>. Check <code>status</code> inside the JSON as well as the HTTP status; on failure <code>error</code> carries the code and message.
      </p>
    </div>
  );
}

/** Right column: the runnable example in the reader's language. */
export function CodePanel({ api }: { api: ApiEntry & { slug?: string } }) {
  const [lang] = useLang();
  const [vars] = useVars();
  const choices = authChoices(api);
  const [auth, setAuth] = useState<AuthChoice>(choices[0] ?? 'cert');
  const local = api.auth === 'local';
  const useAuth = choices.includes(auth) ? auth : choices[0] ?? 'cert';
  const code = applyVars(local ? localToolSample(api, lang) : codeSample(api, lang, useAuth), vars);
  return (
    <div className="code-panel">
      <div className="code-panel-head">
        <LangSwitch />
        {choices.length > 1 && (
          <div className="spec-tabset" role="group" aria-label="Authentication">
            <button aria-pressed={useAuth === 'cert'} className={useAuth === 'cert' ? 'on' : ''} onClick={() => setAuth('cert')}>Certificate</button>
            <button aria-pressed={useAuth === 'oauth'} className={useAuth === 'oauth' ? 'on' : ''} onClick={() => setAuth('oauth')}>OAuth</button>
          </div>
        )}
      </div>
      <CodeBlock code={code} download={`${api.slug ?? 'ssg-api'}.${FILE_EXT[lang]}`} />
      {!local && (
        <p className="spec-note">
          {useAuth === 'oauth'
            ? <>OAuth: <code>{BASE_URLS.oauth}</code>, Bearer token, no certificate. Set <code>SSG_CLIENT_ID</code> and <code>SSG_CLIENT_SECRET</code>.</>
            : <>Certificate: <code>{BASE_URLS.cert}</code>, using the certificate and key registered for your app{api.auth === 'cert+aes' ? <>. Set <code>SSG_ENCRYPTION_KEY</code> to its encryption key</> : ''}.</>}
        </p>
      )}
      <FillIn />
    </div>
  );
}

/** Small form: the reader's own UEN, course, run and file names, applied to every example. */
export function FillIn() {
  const [vars, setVars] = useVars();
  const [open, setOpen] = useState(false);
  const changed = (Object.keys(DEFAULT_VARS) as (keyof typeof DEFAULT_VARS)[]).some((k) => vars[k] !== DEFAULT_VARS[k]);
  const field = (k: keyof typeof DEFAULT_VARS, label: string) => (
    <label>{label}
      <input value={vars[k]} onChange={(e) => setVars({ ...vars, [k]: e.target.value })} placeholder={DEFAULT_VARS[k]} spellCheck={false} />
    </label>
  );
  return (
    <div className="fillin">
      <button className="pub-link" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? '▾' : '▸'} Use my own values{changed ? ' (in use)' : ''}
      </button>
      {open && (
        <div className="fillin-form">
          {field('uen', 'UEN')}
          {field('refNo', 'Course reference')}
          {field('runId', 'Course run ID')}
          {field('cert', 'Certificate file')}
          {field('key', 'Private key file')}
          <p className="spec-note">Kept in this browser only and applied to every example. Never type a key or secret here.</p>
          {changed && <button className="pub-link" onClick={() => setVars(DEFAULT_VARS)}>Reset to sample values</button>}
        </div>
      )}
    </div>
  );
}
