import { useEffect, useState } from 'react';
import type { AuthUser } from '../auth';
import { DocsLayout } from './Shell';

// Two explainer guides:
//   /guides/how-it-works   animated walk-through of one call: certificate (mTLS) and AES encryption
//   /guides/error-codes    what each HTTP status from the SSG API means and what to do
// The diagram is drawn in HTML and CSS; there are no images.

interface FlowStep { title: string; text: string; where: 'you' | 'wire' | 'ssg'; packet: 'json' | 'cipher' | 'cert' | 'check' | 'reply' | 'done' }
const FLOW: FlowStep[] = [
  { where: 'you', packet: 'json', title: 'Build the request', text: 'Your system builds the request as ordinary JSON: the enrolment, the search filter, the course run.' },
  { where: 'you', packet: 'cipher', title: 'Encrypt the body', text: 'For protected APIs (enrolments, grants, assessments) the JSON is encrypted with your AES-256 encryption key and sent as base64 text. Nobody on the way can read it.' },
  { where: 'wire', packet: 'cert', title: 'Present your certificate', text: 'The connection is HTTPS with mutual TLS: your server shows its certificate, and proves it owns the matching private key. The private key itself never leaves your server.' },
  { where: 'ssg', packet: 'check', title: 'SSG checks who is calling', text: 'SSG compares the certificate with the one you uploaded to your app on the Developer Portal, then checks the app is subscribed to this API and version. If not, the answer is 403.' },
  { where: 'ssg', packet: 'reply', title: 'SSG decrypts, works, encrypts', text: 'SSG decrypts the body with the encryption key saved on your app, carries out the request, and encrypts the reply with the same key.' },
  { where: 'you', packet: 'done', title: 'Decrypt the reply', text: 'Your system decrypts the reply with the same encryption key and reads the JSON: status 200 and the data.' },
];

const PACKET: Record<FlowStep['packet'], { label: string; body: string }> = {
  json: { label: 'JSON', body: '{ "enrolment": { … } }' },
  cipher: { label: 'Encrypted', body: 'q8Zr0x…7Lk2pA==' },
  cert: { label: 'Certificate + encrypted body', body: 'CN=your-app  ·  q8Zr0x…' },
  check: { label: 'Checking certificate', body: 'matches uploaded cert ✓  subscribed ✓' },
  reply: { label: 'Encrypted reply', body: 'Zt41mN…c0Hw9Q==' },
  done: { label: '200 OK', body: '{ "status": 200, "data": { … } }' },
};

/** Animated walk-through of one protected SSG API call. */
export function SecureFlow() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % FLOW.length), 4200);
    return () => window.clearTimeout(t);
  }, [step, paused]);
  const s = FLOW[step];
  const p = PACKET[s.packet];
  const back = step === 5;
  return (
    <figure className="sf" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <figcaption>One protected SSG API call, step by step</figcaption>
      <div className={`sf-stage at-${s.where} ${back ? 'back' : ''}`}>
        <div className={`sf-end you ${s.where === 'you' ? 'on' : ''}`}>
          <b>Your system</b>
          <span className="sf-key priv"><i aria-hidden="true" />Private key</span>
          <span className="sf-key cert"><i aria-hidden="true" />Certificate</span>
          <span className={`sf-key aes ${step === 1 || step === 5 ? 'use' : ''}`}><i aria-hidden="true" />Encryption key</span>
        </div>
        <div className="sf-wire" aria-hidden="true">
          <span className="sf-lock">HTTPS · mutual TLS</span>
          <div className={`sf-packet k-${s.packet}`} key={step}>
            <small>{p.label}</small>
            <code>{p.body}</code>
          </div>
        </div>
        <div className={`sf-end ssg ${s.where === 'ssg' ? 'on' : ''}`}>
          <b>SSG API</b>
          <span className={`sf-key cert ${step === 3 ? 'use' : ''}`}><i aria-hidden="true" />Your uploaded certificate</span>
          <span className={`sf-key aes ${step === 4 ? 'use' : ''}`}><i aria-hidden="true" />Your encryption key</span>
          <span className="sf-key sub"><i aria-hidden="true" />Your API subscriptions</span>
        </div>
      </div>
      <ol className="sf-steps">
        {FLOW.map((f, i) => (
          <li key={f.title}>
            <button className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>
              <span>{i + 1}</span>{f.title}
            </button>
          </li>
        ))}
      </ol>
      <p className="sf-text" aria-live="polite"><b>{step + 1}. {s.title}.</b> {s.text}</p>
    </figure>
  );
}

export function HowItWorksGuide({ user }: { user: AuthUser | null }) {
  return (
    <DocsLayout user={user} section="start" currentGuide="how-it-works">
      <nav className="crumbs" aria-label="Breadcrumb"><a href="/start">Getting started</a><span>›</span><span>Guides</span></nav>
      <div className="api-head"><h1>How SSG API certificates and encryption work</h1></div>
      <p className="api-desc">Every certificate-based SSG / SWDA API call is protected twice: the certificate proves who is calling, and the encryption key hides what is being sent. This is what happens on each call.</p>

      <SecureFlow />

      <h2 className="home-h">Who holds what</h2>
      <div className="keys-map">
        <div><b>Private key</b><code>ssg-app1-key.pem</code><span>Only on your server. Never uploaded, never emailed. It proves the certificate is yours.</span></div>
        <div><b>Certificate</b><code>ssg-app1-cert.pem</code><span>Public. On your server and uploaded to your app on the Developer Portal, so SSG can recognise you.</span></div>
        <div><b>Encryption key</b><code>32 bytes, base64</code><span>Shared secret. On your server and saved on your app in the Developer Portal. Encrypts both directions.</span></div>
        <div><b>Client ID and secret</b><code>OAuth apps</code><span>For APIs that accept OAuth instead of a certificate: exchanged for an access token that lasts about 30 minutes.</span></div>
      </div>

      <h2 className="home-h">Three kinds of call</h2>
      <div className="mk-grid">
        <div className="mk-tile"><h3>Certificate only</h3><p>Plain JSON over mutual TLS. Example: course registry search. Steps 1, 3, 4 and the reply; nothing is encrypted beyond HTTPS.</p></div>
        <div className="mk-tile"><h3>Certificate + AES</h3><p>The body, the reply, or both are AES-256 encrypted. Examples: enrolments, grants, assessments. All six steps.</p></div>
        <div className="mk-tile"><h3>OAuth</h3><p>No certificate. Get a token with the client ID and secret, then send it as a Bearer header. Example: course lookup.</p></div>
      </div>

      <div className="g-note info" style={{ marginTop: 18 }}><b>AES details</b><span>AES-256-CBC, key = your base64 encryption key decoded to 32 bytes, IV = the text <code>SSGAPIInitVector</code>, output base64.</span></div>

      <div className="pub-cta" style={{ marginTop: 24 }}>
        <div><h3>Ready to make the files?</h3><p>Create the certificate, private key and encryption key on Mac or Windows, then add them to your Developer Portal app.</p></div>
        <div className="mk-quick"><a className="pub-btn" href="/guides/create-keys">Create certificate and keys</a><a className="pub-btn ghost" href="/guides/error-codes">Status and error codes</a></div>
      </div>
    </DocsLayout>
  );
}

interface CodeRow { code: string; name: string; means: string; fix: string; seen?: boolean }
const CODE_GROUPS: { id: string; title: string; tone: string; intro: string; rows: CodeRow[] }[] = [
  {
    id: '2xx', title: '2xx: success', tone: 'ok', intro: 'The request was accepted and processed.',
    rows: [
      { code: '200', name: 'OK', seen: true, means: 'The call worked. The body is a JSON envelope with status, data, meta and error. For encrypted APIs the body arrives as base64 text and is JSON only after you decrypt it.', fix: 'Still read the status and error fields inside the JSON. A search with no matching record can come back as an error object rather than an empty list, and that object may itself be encrypted.' },
    ],
  },
  {
    id: '3xx', title: '3xx: redirect', tone: 'info', intro: 'The SSG API does not normally redirect. Seeing one usually means the request went to the wrong place.',
    rows: [
      { code: '301 / 302', name: 'Moved', means: 'The address is not the API endpoint: often http instead of https, a typo in the host, or a browser URL instead of the API URL.', fix: 'Use https://api.ssg-wsg.sg for certificate calls and https://public-api.ssg-wsg.sg for OAuth calls, with the exact path from the reference.' },
      { code: '304', name: 'Not Modified', means: 'A cache in front of your client answered instead of SSG.', fix: 'Turn off caching for API calls.' },
    ],
  },
  {
    id: '4xx', title: '4xx: something is wrong with the request', tone: 'warn', intro: 'SSG understood who you are or what you sent, and refused it. Fix the request before retrying.',
    rows: [
      { code: '400', name: 'Bad Request', seen: true, means: 'The body is malformed, a required field is missing or has the wrong format, or the body was not encrypted the way the API expects. Seen: “Unable to perform decryption due invalid request”.', fix: 'Compare the body with the reference field by field. For encrypted APIs check the encryption key, the IV and that the body is base64 text.' },
      { code: '401', name: 'Unauthorized', seen: true, means: 'SSG could not identify the caller: the OAuth token is missing or expired, or the certificate is not the one registered for that environment (we met this on UAT).', fix: 'Get a new token (they last about 30 minutes). For certificate calls, confirm the certificate uploaded to the app is the one your server sends.' },
      { code: '403', name: 'Forbidden', seen: true, means: 'You are identified but not allowed. Two messages cover most cases: “Access to this API has been disallowed” (the app is not subscribed to, or not yet approved for, this API) and “Api Version has expired” (wrong x-api-version, or a version header on an API that wants none).', fix: 'Check the subscription status on the Developer Portal and the version on the reference page. Try the other apps: access is per app.' },
      { code: '404', name: 'Not Found', seen: true, means: 'The path is wrong, or the record (course, run, enrolment) does not exist or is not yours.', fix: 'Check the path and the reference number, and that it belongs to your UEN.' },
      { code: '405', name: 'Method Not Allowed', means: 'GET was used where POST is required, or the reverse.', fix: 'Use the method shown on the reference page.' },
      { code: '415', name: 'Unsupported Media Type', means: 'The Content-Type header is missing or wrong.', fix: 'Send Content-Type: application/json on POST calls.' },
      { code: '429', name: 'Too Many Requests', means: 'Too many calls in a short time.', fix: 'Slow down and retry after a pause, waiting longer each time.' },
    ],
  },
  {
    id: '5xx', title: '5xx: something is wrong on the SSG side', tone: 'bad', intro: 'The request reached SSG and failed there, or did not get through the gateway. Your request may still be at fault if it is in an unexpected format.',
    rows: [
      { code: '500', name: 'Internal Server Error', seen: true, means: 'SSG failed while handling the request. An unexpected request format can cause this as well as a real fault.', fix: 'Retry once. If it repeats, check the request against the reference, then raise a ticket with the time and the request.' },
      { code: '502 / 503', name: 'Bad Gateway / Unavailable', means: 'The API is down, restarting or under maintenance.', fix: 'Check the SSG API status page and retry later.' },
      { code: '504', name: 'Gateway Timeout', means: 'SSG did not answer in time.', fix: 'Retry with a smaller page size or a narrower date range.' },
    ],
  },
];

export function ErrorCodesGuide({ user }: { user: AuthUser | null }) {
  return (
    <DocsLayout user={user} section="start" currentGuide="error-codes">
      <nav className="crumbs" aria-label="Breadcrumb"><a href="/start">Getting started</a><span>›</span><span>Guides</span></nav>
      <div className="api-head"><h1>SSG API status and error codes</h1></div>
      <p className="api-desc">What each HTTP status from the SSG / SWDA API means and what to do about it. Codes marked <span className="badge ok">Seen from SSG</span> are ones we have received in production or UAT; the rest carry their standard HTTP meaning.</p>

      <nav className="ec-jump" aria-label="Jump to">
        {CODE_GROUPS.map((g) => <a key={g.id} className={`ec-chip ${g.tone}`} href={`#${g.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth' }); }}>{g.id}</a>)}
      </nav>

      {CODE_GROUPS.map((g) => (
        <section key={g.id} id={g.id} className={`ec-group ${g.tone}`}>
          <h2>{g.title}</h2>
          <p>{g.intro}</p>
          <div className="ec-rows">
            {g.rows.map((r) => (
              <article key={r.code} className="ec-row">
                <div className="ec-code"><b>{r.code}</b><span>{r.name}</span>{r.seen && <i className="badge ok">Seen from SSG</i>}</div>
                <div><h3>What it means</h3><p>{r.means}</p></div>
                <div><h3>What to do</h3><p>{r.fix}</p></div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="ec-group info">
        <h2>No status code at all</h2>
        <p>If the call fails before any HTTP status comes back, the TLS connection itself was refused.</p>
        <div className="ec-rows">
          <article className="ec-row">
            <div className="ec-code"><b>TLS error</b><span>Handshake failed</span></div>
            <div><h3>What it means</h3><p>The certificate and private key do not match, the certificate is not the one uploaded to your app, or the files could not be read.</p></div>
            <div><h3>What to do</h3><p>Check the pair matches (see the keys guide) and that the certificate on the Developer Portal is the one your server sends.</p></div>
          </article>
        </div>
      </section>

      <div className="g-note info" style={{ marginTop: 18 }}><b>Read the body too</b><span>SSG puts the reason in the JSON: <code>{'{ "status": 403, "error": { "code": …, "message": "…" } }'}</code>. Log the body along with the status.</span></div>
      <div className="pub-cta" style={{ marginTop: 24 }}>
        <div><h3>Stuck on a 403 or a decryption error?</h3><p>We fix these for training providers and TMS vendors.</p></div>
        <div className="mk-quick"><a className="pub-btn" href="/contact">Talk to us</a><a className="pub-btn ghost" href="https://status.api.ssg-wsg.sg/" target="_blank" rel="noopener noreferrer">SSG API status ↗</a></div>
      </div>
    </DocsLayout>
  );
}
