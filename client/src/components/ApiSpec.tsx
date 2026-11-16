import { useState } from 'react';
import type { ApiEntry } from '../catalog';
import { BASE_URLS } from '../catalog';
import { SPECS, PATH_PARAMS, NO_VERSION, authChoices, pathParams, codeSample, localToolSample } from '../apiSpecs';
import type { Lang, AuthChoice } from '../apiSpecs';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'curl', label: 'curl' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
];

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="spec-code">
      <button className="spec-copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      <pre><code>{code}</code></pre>
    </div>
  );
}

// The language tab is shared across every API on the page.
let lastLang: Lang = 'curl';

/** Spec table + curl / Python / JavaScript demo for one API. */
export default function ApiSpec({ api }: { api: ApiEntry }) {
  const spec = SPECS[api.page] ?? {};
  const choices = authChoices(api);
  const [lang, setLangState] = useState<Lang>(lastLang);
  const [auth, setAuth] = useState<AuthChoice>(choices[0] ?? 'cert');
  const setLang = (l: Lang) => { lastLang = l; setLangState(l); };
  const local = api.auth === 'local';
  const pp = pathParams(api);
  const rows: { where: string; name: string; required: boolean; example: string; desc: string }[] = [
    ...pp.map((k) => ({ where: 'path', name: k, required: true, example: PATH_PARAMS[k]?.example ?? '', desc: PATH_PARAMS[k]?.desc ?? '' })),
    ...(spec.query ?? []).map((f) => ({ where: 'query', name: f.name, required: !!f.required, example: f.example, desc: f.desc })),
    ...(local || NO_VERSION.has(api.page) ? [] : [{ where: 'header', name: 'x-api-version', required: true, example: api.version, desc: 'API version.' }]),
    ...(spec.headers ?? []).map((f) => ({ where: 'header', name: f.name, required: !!f.required, example: f.example, desc: f.desc })),
  ];

  return (
    <div className="spec">
      {!local && (
        <>
          <h4>Request</h4>
          <table className="spec-table">
            <thead><tr><th>In</th><th>Name</th><th>Required</th><th>Example</th><th>Description</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.where}-${r.name}`}>
                  <td>{r.where}</td><td><code>{r.name}</code></td><td>{r.required ? 'Yes' : 'No'}</td><td><code>{r.example}</code></td><td>{r.desc}</td>
                </tr>
              ))}
              {api.method === 'POST' && (
                <tr><td>body</td><td><code>JSON</code></td><td>Yes</td><td colSpan={2}>
                  {api.auth === 'cert+aes' ? 'JSON below, AES-256-CBC encrypted and base64 encoded before sending. The response is encrypted the same way.' : 'JSON below.'}
                </td></tr>
              )}
            </tbody>
          </table>
          {api.method === 'POST' && spec.body !== undefined && (
            <>
              <h4>Body</h4>
              <CodeBlock code={JSON.stringify(spec.body, null, 2)} />
            </>
          )}
          {spec.note && <p className="spec-note">{spec.note}</p>}
          <h4>Response</h4>
          <p className="spec-note">
            JSON envelope <code>{'{ "status": 200, "data": { … }, "meta": { … }, "error": { … } }'}</code>. On failure <code>status</code> is 4xx/5xx and <code>error</code> carries the code and message.
          </p>
        </>
      )}

      <div className="spec-tabs">
        <h4>{local ? 'How to do it yourself' : 'Demo'}</h4>
        <div className="spec-tabset" role="tablist" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l.id} role="tab" aria-selected={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>{l.label}</button>
          ))}
        </div>
        {choices.length > 1 && (
          <div className="spec-tabset" role="tablist" aria-label="Authentication">
            <button role="tab" aria-selected={auth === 'cert'} className={auth === 'cert' ? 'on' : ''} onClick={() => setAuth('cert')}>Certificate</button>
            <button role="tab" aria-selected={auth === 'oauth'} className={auth === 'oauth' ? 'on' : ''} onClick={() => setAuth('oauth')}>OAuth</button>
          </div>
        )}
      </div>
      <CodeBlock code={local ? localToolSample(api, lang) : codeSample(api, lang, auth)} />
      {!local && (
        <p className="spec-note">
          {auth === 'oauth'
            ? <>OAuth calls go to <code>{BASE_URLS.oauth}</code> with a Bearer token; no certificate.</>
            : <>Certificate calls go to <code>{BASE_URLS.cert}</code>. Use the certificate and key registered for your app on the Developer Portal{api.auth === 'cert+aes' ? ', and its encryption key in SSG_ENCRYPTION_KEY' : ''}.</>}
        </p>
      )}
    </div>
  );
}

/** "Getting started" block shown above the catalogue. */
export function GettingStarted() {
  const [lang, setLang] = useState<Lang>('curl');
  const token: Record<Lang, string> = {
    curl: `curl -s -X POST ${BASE_URLS.oauth}/dp-oauth/oauth/token \\\n  -u "$SSG_CLIENT_ID:$SSG_CLIENT_SECRET" \\\n  -d grant_type=client_credentials\n# -> { "access_token": "…", "token_type": "Bearer", "expires_in": 1799 }`,
    python: `import os, requests\n\ntoken = requests.post(\n    "${BASE_URLS.oauth}/dp-oauth/oauth/token",\n    auth=(os.environ["SSG_CLIENT_ID"], os.environ["SSG_CLIENT_SECRET"]),\n    data={"grant_type": "client_credentials"},\n).json()["access_token"]`,
    javascript: `const res = await fetch('${BASE_URLS.oauth}/dp-oauth/oauth/token', {\n  method: 'POST',\n  headers: {\n    Authorization: 'Basic ' + Buffer.from(\`\${process.env.SSG_CLIENT_ID}:\${process.env.SSG_CLIENT_SECRET}\`).toString('base64'),\n    'Content-Type': 'application/x-www-form-urlencoded',\n  },\n  body: 'grant_type=client_credentials',\n});\nconst { access_token } = await res.json();`,
  };
  const aes: Record<Lang, string> = {
    curl: `KEY_HEX=$(printf %s "$SSG_ENCRYPTION_KEY" | base64 -d | xxd -p -c 64)\nIV_HEX=$(printf %s SSGAPIInitVector | xxd -p)\n\n# encrypt body.json -> body.enc\nopenssl enc -aes-256-cbc -K "$KEY_HEX" -iv "$IV_HEX" -base64 -A -in body.json > body.enc\n# decrypt a response\nopenssl enc -d -aes-256-cbc -K "$KEY_HEX" -iv "$IV_HEX" -base64 -A -in response.txt`,
    python: `import base64, json, os\nfrom Crypto.Cipher import AES          # pip install pycryptodome\nfrom Crypto.Util.Padding import pad, unpad\n\nKEY = base64.b64decode(os.environ["SSG_ENCRYPTION_KEY"])   # 32 bytes\nIV = b"SSGAPIInitVector"\n\ndef encrypt(obj):\n    data = pad(json.dumps(obj).encode(), AES.block_size)\n    return base64.b64encode(AES.new(KEY, AES.MODE_CBC, IV).encrypt(data)).decode()\n\ndef decrypt(text):\n    raw = AES.new(KEY, AES.MODE_CBC, IV).decrypt(base64.b64decode(text))\n    return json.loads(unpad(raw, AES.block_size))`,
    javascript: `import crypto from 'node:crypto';\n\nconst KEY = Buffer.from(process.env.SSG_ENCRYPTION_KEY, 'base64'); // 32 bytes\nconst IV = Buffer.from('SSGAPIInitVector');\n\nexport const encrypt = (obj) => {\n  const c = crypto.createCipheriv('aes-256-cbc', KEY, IV);\n  return c.update(JSON.stringify(obj), 'utf8', 'base64') + c.final('base64');\n};\nexport const decrypt = (text) => {\n  const d = crypto.createDecipheriv('aes-256-cbc', KEY, IV);\n  return JSON.parse(d.update(text, 'base64', 'utf8') + d.final('utf8'));\n};`,
  };
  return (
    <section className="pub-product" id="p-start">
      <h2>Getting started</h2>
      <p className="pub-product-desc">Every SSG API is HTTPS + JSON. What changes between APIs is the path, the version header and how you authenticate. Open any API below for its spec and a ready-to-run demo.</p>
      <div className="start-grid">
        <div className="start-card"><b>1. Base URL</b><p>Certificate: <code>{BASE_URLS.cert}</code><br />OAuth: <code>{BASE_URLS.oauth}</code></p></div>
        <div className="start-card"><b>2. Version header</b><p>Send <code>x-api-version</code> with the version shown for the API, for example <code>v8.0</code>.</p></div>
        <div className="start-card"><b>3. Authenticate</b><p><b>Certificate (mTLS):</b> present your app’s certificate and private key on the TLS connection.<br /><b>OAuth:</b> exchange client ID and secret for a Bearer token.</p></div>
        <div className="start-card"><b>4. Encrypt (some APIs)</b><p>“Certificate + AES” APIs take and return an AES-256-CBC, base64 body. Key: your app’s encryption key. IV: <code>SSGAPIInitVector</code>.</p></div>
      </div>
      <div className="spec">
        <div className="spec-tabs">
          <h4>OAuth token</h4>
          <div className="spec-tabset" role="tablist" aria-label="Language">
            {LANGS.map((l) => <button key={l.id} role="tab" aria-selected={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>{l.label}</button>)}
          </div>
        </div>
        <CodeBlock code={token[lang]} />
        <h4>AES encrypt / decrypt</h4>
        <CodeBlock code={aes[lang]} />
        <h4>Status codes</h4>
        <table className="spec-table">
          <thead><tr><th>Code</th><th>Meaning</th><th>Usual cause</th></tr></thead>
          <tbody>
            <tr><td>200</td><td>OK</td><td>Check the <code>status</code> field inside the JSON too; some errors arrive inside a 200.</td></tr>
            <tr><td>400</td><td>Bad request</td><td>Malformed body, or an AES API was sent a plain (unencrypted) body.</td></tr>
            <tr><td>401</td><td>Unauthorised</td><td>Wrong or missing certificate / token.</td></tr>
            <tr><td>403</td><td>Forbidden</td><td>Your app is not subscribed to this API (“Access to this API has been disallowed”), or the version has expired.</td></tr>
            <tr><td>404</td><td>Not found</td><td>Wrong path, or the record does not exist.</td></tr>
            <tr><td>500</td><td>Server error</td><td>SSG-side fault, or an encrypted reply read as JSON.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
