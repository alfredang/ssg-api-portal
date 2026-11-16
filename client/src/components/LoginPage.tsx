import { useState } from 'react';
import { loginWithGoogle, requestOtp, verifyOtp } from '../auth';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94L3.98 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
  </svg>
);

/** Sign-in for the API Console: what you get on the left; Google or an emailed code on the right. */
export default function LoginPage({ onBack }: { onBack?: () => void }) {
  const failed = new URLSearchParams(window.location.search).get('login') === 'failed';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setNote('');
    try {
      const r = await requestOtp(email.trim());
      setStage('code'); setCode('');
      setNote(`If ${email.trim()} is a user, a 6-digit code is on its way. It lasts ${r.minutes} minutes.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send the code'); }
    setBusy(false);
  };
  const checkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await verifyOtp(email.trim(), code); window.location.reload(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign in'); setBusy(false); }
  };

  return (
    <div className="signin">
      <section className="signin-pitch">
        <a className="signin-brand" href="/"><img src="/tertiary-logo.png" alt="" /><span>SSG API Portal</span></a>
        <h1>Test the SSG APIs live.</h1>
        <p>The API Console runs real calls against SSG / SWDA with our own apps, so you can see the exact request and response before you write any code.</p>
        <ul>
          <li><b>54 APIs</b> across courses, enrolment, grants, assessments and skills</li>
          <li><b>App 1 – App 4</b>: certificate and OAuth credentials, switchable per call</li>
          <li><b>Saved defaults</b> for UEN, course and run, so forms fill themselves</li>
          <li><b>Known issues</b> and working API versions, kept current</li>
        </ul>
        <p className="signin-note">For Tertiary Infotech staff. Everyone else: the <a href="/api-reference">API reference</a> and its examples are open to all, or <a href="/contact">talk to us</a> about an integration.</p>
      </section>

      <section className="signin-panel">
        <div className="login-card">
          <div className="login-header">
            <h2>Sign in</h2>
            <p>For Tertiary Infotech staff on the user list</p>
          </div>
          {failed && <div className="login-error">Sign-in failed. That account is not a user of this portal; ask the admin to add you.</div>}

          <button type="button" className="login-btn login-google-btn" onClick={loginWithGoogle}>
            <GoogleIcon />
            Sign in with Google
          </button>

          <div className="login-or"><span>or</span></div>

          {stage === 'email' ? (
            <form className="login-otp" onSubmit={sendCode}>
              <label htmlFor="otp-email">Email me a sign-in code</label>
              <input id="otp-email" type="email" required autoComplete="email" placeholder="you@tertiaryinfotech.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="login-btn" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
            </form>
          ) : (
            <form className="login-otp" onSubmit={checkCode}>
              <label htmlFor="otp-code">Enter the 6-digit code</label>
              <input id="otp-code" className="otp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} />
              <button type="submit" className="login-btn" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
              <button type="button" className="login-back" onClick={() => { setStage('email'); setError(''); setNote(''); }}>Use a different email or resend</button>
            </form>
          )}
          {note && !error && <p className="login-note" role="status">{note}</p>}
          {error && <div className="login-error" role="alert">{error}</div>}

          {onBack && <button type="button" className="login-back" onClick={onBack}>← Back to the API reference</button>}
          <p className="login-powered powered-by">Powered by <a href="https://www.tertiaryinfotech.com/" target="_blank" rel="noopener">Tertiary Infotech Academy Pte Ltd</a></p>
        </div>
      </section>
    </div>
  );
}
