import { useState } from 'react';
import type { AuthUser } from '../auth';
import { DocsLayout } from './Shell';
import { CodeBlock } from './ApiSpec';

// Two how-to guides under Getting started:
//   /guides/create-keys        certificate, private key and encryption key on Mac and Windows
//   /guides/api-subscription   the SSG API subscription process, end to end

type OS = 'mac' | 'windows';
let lastOs: OS = /Win/i.test(typeof navigator !== 'undefined' ? navigator.platform : '') ? 'windows' : 'mac';

function OsTabs({ os, setOs }: { os: OS; setOs: (o: OS) => void }) {
  const pick = (o: OS) => { lastOs = o; setOs(o); };
  return (
    <div className="spec-tabset" role="group" aria-label="Operating system">
      <button aria-pressed={os === 'mac'} className={os === 'mac' ? 'on' : ''} onClick={() => pick('mac')}>macOS</button>
      <button aria-pressed={os === 'windows'} className={os === 'windows' ? 'on' : ''} onClick={() => pick('windows')}>Windows</button>
    </div>
  );
}

export function KeysGuide({ user }: { user: AuthUser | null }) {
  const [os, setOs] = useState<OS>(lastOs);
  const mac = os === 'mac';
  const cont = mac ? '\\' : '`';
  const cert = `openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes ${cont}
  -keyout ssg-app1-key.pem -out ssg-app1-cert.pem ${cont}
  -subj "/C=SG/ST=Singapore/L=Singapore/O=Your Company Pte Ltd/CN=your-app-name"`;
  const verify = mac
    ? `# the two hashes must be identical
openssl x509 -in ssg-app1-cert.pem -noout -pubkey | openssl sha256
openssl pkey -in ssg-app1-key.pem -pubout | openssl sha256

# subject and expiry date
openssl x509 -in ssg-app1-cert.pem -noout -subject -enddate`
    : `# the two hashes must be identical
openssl x509 -in ssg-app1-cert.pem -noout -pubkey | openssl sha256
openssl pkey -in ssg-app1-key.pem -pubout | openssl sha256

# subject and expiry date
openssl x509 -in ssg-app1-cert.pem -noout -subject -enddate`;
  const aes = mac
    ? `openssl rand -base64 32`
    : `# with OpenSSL
openssl rand -base64 32

# or with PowerShell alone (no OpenSSL needed)
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)`;
  const sig = `openssl genrsa -out signature-private.pem 2048
openssl rsa -in signature-private.pem -pubout -out signature-public.pem`;
  const install = mac
    ? `# OpenSSL (LibreSSL) is already on macOS. Check it:
openssl version

# optional: the newer OpenSSL from Homebrew
brew install openssl@3`
    : `# Option A: install OpenSSL with winget, then open a NEW PowerShell window
winget install ShiningLight.OpenSSL.Light
openssl version

# Option B: Git for Windows includes OpenSSL. Open "Git Bash" and run the
# commands from the macOS tab unchanged.
winget install Git.Git`;
  const protect = mac
    ? `chmod 600 ssg-app1-key.pem
mkdir -p ~/.ssg && mv ssg-app1-*.pem ~/.ssg/`
    : `# keep the key in a folder only you can read
New-Item -ItemType Directory -Force "$env:USERPROFILE\\.ssg" | Out-Null
Move-Item ssg-app1-*.pem "$env:USERPROFILE\\.ssg\\"
icacls "$env:USERPROFILE\\.ssg" /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F"`;

  return (
    <DocsLayout user={user} section="start" currentGuide="create-keys">
      <nav className="crumbs" aria-label="Breadcrumb"><a href="/start">Getting started</a><span>›</span><span>Guides</span></nav>
      <div className="api-head"><h1>Create your SSG API certificate and encryption keys</h1></div>
      <p className="api-desc">An SSG / SWDA API app needs up to three things you generate yourself: a certificate with its private key, an AES encryption key, and (for a few APIs) a signature key pair. Here is how on Mac and on Windows.</p>
      <div className="start-lang"><span>Show commands for</span><OsTabs os={os} setOs={setOs} /></div>

      <div className="keys-map" aria-label="What each file is for">
        <div><b>Certificate</b><code>ssg-app1-cert.pem</code><span>Public. Upload it to your app on the Developer Portal.</span></div>
        <div><b>Private key</b><code>ssg-app1-key.pem</code><span>Secret. Stays on your server; proves each call is yours (mTLS).</span></div>
        <div><b>Encryption key</b><code>32 bytes, base64</code><span>Secret. Encrypts request and response bodies (AES-256).</span></div>
        <div><b>Signature key pair</b><code>signature-*.pem</code><span>Only for APIs that ask for a digital signature.</span></div>
      </div>

      <ol className="start-steps">
        <li>
          <h2>{mac ? 'Open Terminal' : 'Open PowerShell and get OpenSSL'}</h2>
          <p>{mac ? 'Press ⌘ Space, type Terminal, press Return. OpenSSL is already installed.' : 'Press Start, type PowerShell, press Enter. Windows does not ship OpenSSL, so install it once.'}</p>
          <CodeBlock code={install} />
        </li>
        <li>
          <h2>Create the certificate and private key</h2>
          <p>One command makes both files. Change <code>O=</code> to your company name and <code>CN=</code> to your app name. <code>-days 3650</code> gives ten years; put the expiry date in your calendar.</p>
          <CodeBlock code={cert} />
          <p>You now have <code>ssg-app1-cert.pem</code> (starts with <code>-----BEGIN CERTIFICATE-----</code>) and <code>ssg-app1-key.pem</code> (starts with <code>-----BEGIN PRIVATE KEY-----</code>).</p>
        </li>
        <li>
          <h2>Check that the pair matches</h2>
          <p>A mismatched pair is the most common cause of a 401. The two hashes below must be the same.</p>
          <CodeBlock code={verify} />
        </li>
        <li>
          <h2>Create the encryption key</h2>
          <p>A random 32-byte key, base64 encoded (44 characters ending in <code>=</code>). APIs marked “Certificate + AES” need it.</p>
          <CodeBlock code={aes} />
        </li>
        <li>
          <h2>Create a signature key pair (only if asked)</h2>
          <p>Some APIs want an <code>X-Api-Signature</code> header. Skip this unless the API’s documentation says so.</p>
          <CodeBlock code={sig} />
        </li>
        <li>
          <h2>Add them to your app on the Developer Portal</h2>
          <p>Sign in to the <a href="https://developer.swda.gov.sg/" target="_blank" rel="noopener noreferrer">SWDA Developer Portal</a> with CorpPass, open your app, and in its settings upload <code>ssg-app1-cert.pem</code>, paste the encryption key, and (if used) upload <code>signature-public.pem</code>. Never upload a private key.</p>
        </li>
        <li>
          <h2>Store the secrets safely</h2>
          <p>Keep the private key and encryption key out of source control and out of email. Give the key file to your server through an environment variable or a mounted secret.</p>
          <CodeBlock code={protect} />
        </li>
      </ol>

      <div className="g-note warn"><b>Never share</b><span>The private key (<code>*-key.pem</code>), the encryption key and <code>signature-private.pem</code> are secrets. SSG only ever needs the certificate and public key. If a secret leaks, create a new one and replace it on the portal.</span></div>
      <div className="pub-cta" style={{ marginTop: 20 }}>
        <div><h3>Next: get your app subscribed</h3><p>Keys alone do not grant access. Each API has to be subscribed for your app.</p></div>
        <a className="pub-btn" href="/guides/api-subscription">SSG API subscription process</a>
      </div>
    </DocsLayout>
  );
}

const STAGES = [
  { t: 'Create an app on the Developer Portal', who: 'You', time: 'Same day', d: 'Sign in to the SWDA Developer Portal with CorpPass as a corporate developer and create an app for your system. Name it to the TMS provider naming convention. One app per system.', links: [['SWDA Developer Portal', 'https://developer.swda.gov.sg/']] },
  { t: 'Add the certificate and encryption key', who: 'You', time: 'Same day', d: 'Generate a certificate, private key and encryption key, then upload the certificate and set the encryption key in the app’s settings.', links: [['Create keys on Mac or Windows', '/guides/create-keys']] },
  { t: 'Fill in the API Subscription Form', who: 'You', time: '1–2 days', d: 'List every API you need and give a business use case for each: what the API is, how your system uses it, and the outcome. Add mock-up screens or a process flow. Use one form per app.', links: [['Online subscription form', '/subscription-form']] },
  { t: 'Raise a ticket', who: 'You', time: 'Same day', d: 'Submit the form through the SSG API ticket page. You receive a ticket number (DP-…). Quote it in every follow-up and reply on the same email thread so the ticket stays linked.', links: [['Raise an SSG API ticket', 'https://go.gov.sg/ssg-api-ticket']] },
  { t: 'Answer clarifications', who: 'SSG / you', time: 'Days to weeks', d: 'SSG reviews the use cases and may ask questions or for a revised form. The ticket sends an automatic reminder every day while it waits for you, so answer promptly or it stalls.', links: [] },
  { t: 'Run the conformance tests in UAT', who: 'You', time: '1–2 weeks', d: 'For each API, SSG enables the UAT environment for your app and sends a conformance workbook of test scenarios. Run every scenario, record request, response and time, and return the completed workbook. Raise a separate ticket per API if a test is blocked.', links: [] },
  { t: 'Production approval', who: 'SSG', time: 'Days', d: 'When the workbooks pass, SSG subscribes your app to the APIs in production and resolves the ticket.', links: [] },
  { t: 'Verify and go live', who: 'You', time: 'Same day', d: 'Call each API in production. A 403 “Access to this API has been disallowed” means that API is not subscribed for that app yet. Then test one real class end to end.', links: [['API reference and examples', '/']] },
];

export function SubscriptionGuide({ user }: { user: AuthUser | null }) {
  return (
    <DocsLayout user={user} section="start" currentGuide="api-subscription">
      <nav className="crumbs" aria-label="Breadcrumb"><a href="/start">Getting started</a><span>›</span><span>Guides</span></nav>
      <div className="api-head"><h1>SSG API subscription process</h1></div>
      <p className="api-desc">Having an app and a certificate is not enough: SSG / SWDA approves each API for each app. This is the process from first sign-in to production access, as we have been through it on our own apps.</p>

      <ol className="sub-rail" aria-label="Stages at a glance">
        {STAGES.map((s, i) => <li key={s.t} className={s.who === 'SSG' ? 'ssg' : s.who === 'You' ? 'you' : 'both'}><span>{i + 1}</span>{s.t.split(' ').slice(0, 3).join(' ')}…</li>)}
      </ol>
      <div className="sub-legend"><span className="you">You</span><span className="ssg">SSG</span><span className="both">Both</span></div>

      <ol className="start-steps sub-steps">
        {STAGES.map((s) => (
          <li key={s.t}>
            <h2>{s.t}</h2>
            <div className="sub-meta"><span className={`badge ${s.who === 'SSG' ? 'neutral' : 'blue'}`}>{s.who}</span><span className="badge neutral">{s.time}</span></div>
            <p>{s.d}</p>
            {s.links.length > 0 && <p className="sub-links">{s.links.map(([label, href]) => (
              <a key={href} className="chip" href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}{href.startsWith('http') ? ' ↗' : ''}</a>
            ))}</p>}
          </li>
        ))}
      </ol>

      <h2 className="home-h">What makes it go faster</h2>
      <div className="mk-grid">
        <div className="mk-tile"><h3>Specific use cases</h3><p>Say which screen or job calls the API and what the user gets. Vague use cases are what trigger clarification rounds.</p></div>
        <div className="mk-tile"><h3>One app, one form</h3><p>Each app is subscribed separately. Do not combine apps in one form.</p></div>
        <div className="mk-tile"><h3>Reply on the same thread</h3><p>Keep the ticket number in the subject and answer the reminder emails; a new email can open a new ticket.</p></div>
        <div className="mk-tile"><h3>Test evidence ready</h3><p>Record the exact request, response and timestamp for every scenario as you run it.</p></div>
      </div>
      <div className="g-note info" style={{ marginTop: 18 }}><b>Timings</b><span>The durations above are what we have seen on our own tickets, not SSG service levels. A straightforward add-on API can take a few weeks; a new app with several APIs and conformance tests can take a few months.</span></div>

      <div className="pub-cta" style={{ marginTop: 20 }}>
        <div><h3>Want this handled for you?</h3><p>We prepare the forms and use cases, run the conformance tests and follow the ticket to approval.</p></div>
        <a className="pub-btn" href="/ssg-api-services">SSG API integration services</a>
      </div>
    </DocsLayout>
  );
}
