import { CATALOG, ALL_APIS, AUTH_LABEL, BASE_URLS, findApi, findGroup, conformanceOf } from '../catalog';
import type { FlatApi } from '../catalog';
import type { AuthUser } from '../auth';
import { useLang } from '../prefs';
import { DocsLayout, MethodTag, LangSwitch } from './Shell';
import { RequestSpec, CodePanel, CodeBlock, CopyButton } from './ApiSpec';
import { TPG_STEPS } from './TpgProcess';

// APIs without a console test page yet.
const CONSOLE_PAGES = { has: (page: string) => page !== 'direct-applications' };

const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });

export function StatusBadge({ api }: { api: FlatApi }) {
  if (api.auth === 'local') return <span className="badge neutral">Local tool</span>;
  const isNew = api.added && (Date.now() - new Date(api.added + '-01').getTime()) < 366 * 864e5;
  if (isNew) return (
    <>
      <span className="badge blue">New {new Date(api.added + '-01').toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}</span>
      {api.verified && <span className="badge ok">Verified {fmtDate(api.verified)}</span>}
    </>
  );
  return api.verified
    ? <span className="badge ok" title="This exact request returned HTTP 200 from live SSG on that date.">Verified {fmtDate(api.verified)}</span>
    : <span className="badge neutral" title="The example follows the same tested template, but this API has not been called live from the portal.">Not yet verified</span>;
}

/** Whether SSG asks for a UAT conformance test before production access to this API. */
export function ConformanceBadge({ api, short }: { api: { page: string }; short?: boolean }) {
  const c = conformanceOf(api);
  if (c === 'required') return <a className="badge warn" href="/guides/api-subscription" title="SSG sends a UAT test workbook for this API and asks for the completed results before production access.">{short ? 'Conformance' : 'Conformance test required'}</a>;
  if (c === 'none' && !short) return <span className="badge neutral" title="SSG confirmed there is no conformance test package for this API.">No conformance test</span>;
  return null;
}

function ApiRow({ a }: { a: FlatApi }) {
  return (
    <li>
      <a className="pub-api-row" href={`/docs/${a.slug}`}>
        <MethodTag method={a.method} />
        <span className="pub-api-name">{a.name}{conformanceOf(a) === 'required' && <span className="badge warn conf-tag" title="Conformance test required before production access">Conformance</span>}</span>
        <code className="pub-api-path">{a.path}</code>
        <span className="pub-api-ver">{a.version === 'none' || a.version === '—' ? '' : a.version}</span>
      </a>
    </li>
  );
}

/** Home: a launcher, not a wall of text. */
export function Home({ user }: { user: AuthUser | null }) {
  const starts = [
    { title: 'First certificate call', text: 'Search the course registry with your app certificate.', slug: 'course-search-tpg-registry', tag: 'mTLS' },
    { title: 'First OAuth call', text: 'Look up a course with a client ID and secret. No certificate.', slug: 'course-lookup-by-reference-number', tag: 'OAuth' },
    { title: 'First encrypted call', text: 'Search enrolments with an AES-encrypted body.', slug: 'search-enrolments', tag: 'mTLS + AES' },
  ];
  return (
    <DocsLayout user={user}>
      <section className="home-hero">
        <h1>SSG API reference</h1>
        <p>Spec and a working curl, Python and JavaScript example for every SSG-WSG / SWDA API we integrate with. Press <kbd>/</kbd> to search.</p>
        <div className="home-base">
          <div><span>Certificate</span><code>{BASE_URLS.cert}</code><CopyButton text={BASE_URLS.cert} /></div>
          <div><span>OAuth</span><code>{BASE_URLS.oauth}</code><CopyButton text={BASE_URLS.oauth} /></div>
        </div>
      </section>

      <h2 className="home-h">Start here</h2>
      <div className="home-starts">
        {starts.map((s) => (
          <a key={s.slug} className="home-start" href={`/docs/${s.slug}`}>
            <span className="badge blue">{s.tag}</span>
            <b>{s.title}</b>
            <span>{s.text}</span>
            <em>Open the example →</em>
          </a>
        ))}
      </div>
      <p className="home-more">New to SSG APIs? Read <a href="/start">Getting started</a> for authentication and encryption in five minutes.</p>

      <h2 className="home-h">Browse by product</h2>
      <div className="home-products">
        {CATALOG.map((p) => (
          <section key={p.id} className="home-product">
            <h3>{p.name}</h3>
            <p>{p.desc}</p>
            <ul>
              {p.groups.map((g) => (
                <li key={g.id}><a href={`/category/${g.id}`}><span>{g.name}</span><span className="docs-count">{g.apis.length}</span></a></li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="pub-cta" style={{ marginTop: 28 }}>
        <div>
          <h3>How the APIs fit the TPG process</h3>
          <p>The 13 Training Partners Gateway steps, from course runs to certificates, with the APIs for each.</p>
        </div>
        <a className="pub-btn ghost" href="/tpg-process">View TPG process</a>
      </div>
    </DocsLayout>
  );
}

/** One category: its APIs as a list. */
export function GroupPage({ user, groupId }: { user: AuthUser | null; groupId: string }) {
  const group = findGroup(groupId);
  if (!group) return <NotFound user={user} what="category" />;
  const apis = ALL_APIS.filter((a) => a.groupId === groupId);
  return (
    <DocsLayout user={user} currentGroup={groupId}>
      <nav className="crumbs" aria-label="Breadcrumb"><a href="/api-reference">API Reference</a><span>›</span><span>{apis[0]?.product}</span></nav>
      <div className="api-head">
        <h1>{group.name}</h1>
        {group.docs && <a href={group.docs} target="_blank" rel="noopener noreferrer">Official docs ↗</a>}
      </div>
      <p className="api-desc">{group.desc}</p>
      <div className="pub-group"><ul className="pub-apis">{apis.map((a) => <ApiRow key={a.slug} a={a} />)}</ul></div>
    </DocsLayout>
  );
}

/** One API: spec on the left, runnable example on the right. */
export function ApiPage({ user, slug }: { user: AuthUser | null; slug: string }) {
  const api = findApi(slug);
  if (!api) return <NotFound user={user} what="API" />;
  const group = findGroup(api.groupId);
  const siblings = ALL_APIS.filter((a) => a.groupId === api.groupId);
  const i = ALL_APIS.findIndex((a) => a.slug === slug);
  const prev = ALL_APIS[i - 1];
  const next = ALL_APIS[i + 1];
  const steps = TPG_STEPS.filter((s) => s.groups.includes(api.groupId));
  const local = api.auth === 'local';
  const endpoint = local ? api.path : `${BASE_URLS.cert}${api.path}`;

  return (
    <DocsLayout user={user} currentSlug={slug}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="/api-reference">API Reference</a><span>›</span><span>{api.product}</span><span>›</span><a href={`/category/${api.groupId}`}>{api.group}</a>
      </nav>
      <div className="api-head">
        <h1>{api.name}</h1>
        <StatusBadge api={api} />
        <ConformanceBadge api={api} />
      </div>
      <p className="api-desc">{api.desc}</p>

      <div className="api-endpoint">
        {!local && <MethodTag method={api.method} />}
        <code>{endpoint}</code>
        {!local && <CopyButton text={endpoint} />}
      </div>
      <div className="api-facts">
        {!local && <span><b>Version</b> {api.version === 'none' ? 'send no x-api-version header' : api.version}</span>}
        <span><b>Auth</b> {AUTH_LABEL[api.auth]}</span>
        {api.writes && <span className="warn"><b>Writes data</b> changes SSG production records</span>}
        {group?.docs && <a href={group.docs} target="_blank" rel="noopener noreferrer">Official docs ↗</a>}
      </div>

      <div className="api-cols">
        <div className="api-col-spec">
          {local ? (
            <div className="spec"><h2>What it does</h2><p className="spec-note">This runs on your own machine and does not call SSG. Use it once when you set up an app on the Developer Portal.</p></div>
          ) : <RequestSpec api={api} />}

          {steps.length > 0 && (
            <div className="spec">
              <h2>Where it fits</h2>
              <div className="tpg-related">
                <span>TPG process</span>
                {steps.map((s) => <a key={s.id} className="chip" href={`/tpg-process/${s.slug}`}>Step {s.id}: {s.title}</a>)}
              </div>
            </div>
          )}

          <div className="api-try">
            {CONSOLE_PAGES.has(api.page)
              ? <><a className="pub-btn" href={`/console/${api.page}`}>{user ? 'Try it live in the console →' : 'Log in to try it live →'}</a><span>Runs the call with our App 1 – App 4 credentials.</span></>
              : <span>Not in the API Console yet. Use the example on this page.</span>}
          </div>
        </div>
        <aside className="api-col-code" aria-label="Example"><CodePanel api={api} /></aside>
      </div>

      {siblings.length > 1 && (
        <div className="spec">
          <h2>More in {api.group}</h2>
          <div className="pub-group"><ul className="pub-apis">{siblings.filter((a) => a.slug !== slug).map((a) => <ApiRow key={a.slug} a={a} />)}</ul></div>
        </div>
      )}

      <nav className="api-pager" aria-label="Previous and next API">
        {prev ? <a href={`/docs/${prev.slug}`}><small>← Previous</small>{prev.name}</a> : <span />}
        {next ? <a href={`/docs/${next.slug}`} className="next"><small>Next →</small>{next.name}</a> : <span />}
      </nav>
    </DocsLayout>
  );
}

function NotFound({ user, what }: { user: AuthUser | null; what: string }) {
  return (
    <DocsLayout user={user}>
      <div className="pub-empty">That {what} does not exist. <a href="/api-reference">Back to the API reference</a></div>
    </DocsLayout>
  );
}

/** Getting started: how every call is built, with the two shared snippets. */
export function StartPage({ user }: { user: AuthUser | null }) {
  const [lang] = useLang();
  const token = {
    curl: `curl -s -X POST ${BASE_URLS.oauth}/dp-oauth/oauth/token \\\n  -u "$SSG_CLIENT_ID:$SSG_CLIENT_SECRET" \\\n  -d grant_type=client_credentials\n# -> { "access_token": "…", "token_type": "Bearer", "expires_in": 1799 }`,
    python: `import os, requests\n\ntoken = requests.post(\n    "${BASE_URLS.oauth}/dp-oauth/oauth/token",\n    auth=(os.environ["SSG_CLIENT_ID"], os.environ["SSG_CLIENT_SECRET"]),\n    data={"grant_type": "client_credentials"},\n).json()["access_token"]`,
    javascript: `const res = await fetch('${BASE_URLS.oauth}/dp-oauth/oauth/token', {\n  method: 'POST',\n  headers: {\n    Authorization: 'Basic ' + Buffer.from(\`\${process.env.SSG_CLIENT_ID}:\${process.env.SSG_CLIENT_SECRET}\`).toString('base64'),\n    'Content-Type': 'application/x-www-form-urlencoded',\n  },\n  body: 'grant_type=client_credentials',\n});\nconst { access_token } = await res.json();`,
  }[lang];
  const aes = {
    curl: `KEY_HEX=$(printf %s "$SSG_ENCRYPTION_KEY" | base64 -d | xxd -p -c 64)\nIV_HEX=$(printf %s SSGAPIInitVector | xxd -p)\n\n# encrypt body.json -> body.enc\nopenssl enc -aes-256-cbc -K "$KEY_HEX" -iv "$IV_HEX" -base64 -A -in body.json > body.enc\n# decrypt a response\nopenssl enc -d -aes-256-cbc -K "$KEY_HEX" -iv "$IV_HEX" -base64 -A -in response.txt`,
    python: `import base64, json, os\nfrom Crypto.Cipher import AES          # pip install pycryptodome\nfrom Crypto.Util.Padding import pad, unpad\n\nKEY = base64.b64decode(os.environ["SSG_ENCRYPTION_KEY"])   # 32 bytes\nIV = b"SSGAPIInitVector"\n\ndef encrypt(obj):\n    data = pad(json.dumps(obj).encode(), AES.block_size)\n    return base64.b64encode(AES.new(KEY, AES.MODE_CBC, IV).encrypt(data)).decode()\n\ndef decrypt(text):\n    raw = AES.new(KEY, AES.MODE_CBC, IV).decrypt(base64.b64decode(text))\n    return json.loads(unpad(raw, AES.block_size))`,
    javascript: `import crypto from 'node:crypto';\n\nconst KEY = Buffer.from(process.env.SSG_ENCRYPTION_KEY, 'base64'); // 32 bytes\nconst IV = Buffer.from('SSGAPIInitVector');\n\nexport const encrypt = (obj) => {\n  const c = crypto.createCipheriv('aes-256-cbc', KEY, IV);\n  return c.update(JSON.stringify(obj), 'utf8', 'base64') + c.final('base64');\n};\nexport const decrypt = (text) => {\n  const d = crypto.createDecipheriv('aes-256-cbc', KEY, IV);\n  return JSON.parse(d.update(text, 'base64', 'utf8') + d.final('utf8'));\n};`,
  }[lang];
  const mtls = {
    curl: `curl -s "${BASE_URLS.cert}/tpg/courses/registry/details/TGS-2020513213?uen=201200696W" \\\n  --cert ssg-app1-cert.pem --key ssg-app1-key.pem \\\n  -H "x-api-version: v2.0"`,
    python: `import requests\n\nresp = requests.get(\n    "${BASE_URLS.cert}/tpg/courses/registry/details/TGS-2020513213",\n    params={"uen": "201200696W"},\n    headers={"x-api-version": "v2.0"},\n    cert=("ssg-app1-cert.pem", "ssg-app1-key.pem"),\n)\nprint(resp.status_code, resp.json())`,
    javascript: `import fs from 'node:fs';\nimport https from 'node:https';\n\nhttps.get('${BASE_URLS.cert}/tpg/courses/registry/details/TGS-2020513213?uen=201200696W', {\n  cert: fs.readFileSync('ssg-app1-cert.pem'),\n  key: fs.readFileSync('ssg-app1-key.pem'),\n  headers: { 'x-api-version': 'v2.0' },\n}, (res) => {\n  let data = '';\n  res.on('data', (c) => (data += c));\n  res.on('end', () => console.log(res.statusCode, JSON.parse(data)));\n});`,
  }[lang];

  return (
    <DocsLayout user={user} section="start" currentGuide="start">
      <div className="api-head"><h1>Getting started</h1></div>
      <p className="api-desc">Every SSG API is HTTPS + JSON. Between APIs only three things change: the path, the version header, and how you authenticate.</p>
      <div className="start-lang"><span>Show examples in</span><LangSwitch /></div>

      <ol className="start-steps">
        <li>
          <h2>Get an app on the Developer Portal</h2>
          <p>Create an app at the <a href="https://developer.swda.gov.sg/" target="_blank" rel="noopener noreferrer">SWDA Developer Portal</a>, upload a certificate (or note the client ID and secret), and subscribe it to the APIs you need. Subscribing takes a ticket and the <a href="/subscription-form">subscription form</a>. Step-by-step: <a href="/guides/create-keys">create the certificate and keys on Mac or Windows</a> and the <a href="/guides/api-subscription">API subscription process</a>.</p>
        </li>
        <li>
          <h2>Pick the base URL for your auth method</h2>
          <table className="spec-table">
            <thead><tr><th>Method</th><th>Base URL</th><th>You send</th></tr></thead>
            <tbody>
              <tr><td>Certificate (mTLS)</td><td><code className="nowrap">{BASE_URLS.cert}</code></td><td>Your app certificate and private key on the TLS connection.</td></tr>
              <tr><td>OAuth</td><td><code className="nowrap">{BASE_URLS.oauth}</code></td><td>A Bearer token from your client ID and secret.</td></tr>
            </tbody>
          </table>
        </li>
        <li>
          <h2>Make a certificate call</h2>
          <p>Add the <code>x-api-version</code> header with the version shown on the API’s page.</p>
          <CodeBlock code={mtls} />
        </li>
        <li>
          <h2>Or get an OAuth token</h2>
          <p>Tokens last about 30 minutes. Send it as <code>Authorization: Bearer …</code>.</p>
          <CodeBlock code={token} />
        </li>
        <li>
          <h2>Encrypt the body where the API needs it</h2>
          <p>APIs marked “Certificate + AES” take and return an AES-256-CBC, base64 body. Key: your app’s encryption key (base64, 32 bytes). IV: the fixed text <code>SSGAPIInitVector</code>.</p>
          <CodeBlock code={aes} />
        </li>
        <li>
          <h2>Read the status</h2>
          <table className="spec-table">
            <thead><tr><th>Code</th><th>Meaning</th><th>Usual cause</th></tr></thead>
            <tbody>
              <tr><td>200</td><td>OK</td><td>Check <code>status</code> inside the JSON too; some errors arrive inside a 200.</td></tr>
              <tr><td>400</td><td>Bad request</td><td>Malformed body, or an AES API was sent a plain body.</td></tr>
              <tr><td>401</td><td>Unauthorised</td><td>Wrong or missing certificate or token.</td></tr>
              <tr><td>403</td><td>Forbidden</td><td>App not subscribed to this API (“Access to this API has been disallowed”), or the version has expired.</td></tr>
              <tr><td>404</td><td>Not found</td><td>Wrong path, or the record does not exist.</td></tr>
              <tr><td>500</td><td>Server error</td><td>SSG-side fault, or an encrypted reply read as JSON.</td></tr>
            </tbody>
          </table>
        </li>
      </ol>
      <div className="pub-cta">
        <div><h3>Ready?</h3><p>Open an API for its spec and a complete example.</p></div>
        <a className="pub-btn" href="/docs/course-search-tpg-registry">Open the first example</a>
      </div>
    </DocsLayout>
  );
}
