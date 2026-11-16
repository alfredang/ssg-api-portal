import { loginWithGoogle } from '../auth';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94L3.98 7.28C4.68 5.16 6.66 3.58 9 3.58z"/>
  </svg>
);

/** Sign-in for the API Console: what you get on the left, Google sign-in on the right. */
export default function LoginPage({ onBack }: { onBack?: () => void }) {
  const failed = new URLSearchParams(window.location.search).get('login') === 'failed';
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
        <p className="signin-note">For Tertiary Infotech staff. Everyone else: the <a href="/">API reference</a> and its examples are open to all, or <a href="/contact">talk to us</a> about an integration.</p>
      </section>

      <section className="signin-panel">
        <div className="login-card">
          <div className="login-header">
            <h2>Sign in</h2>
            <p>Use your Tertiary Infotech Google account</p>
          </div>
          {failed && <div className="login-error">Sign-in failed. Use a Tertiary Infotech account, or ask an admin to add your email.</div>}
          <button type="button" className="login-btn login-google-btn" onClick={loginWithGoogle}>
            <GoogleIcon />
            Sign in with Google
          </button>
          {onBack && <button type="button" className="login-back" onClick={onBack}>← Back to the API reference</button>}
          <p className="login-powered powered-by">Powered by <a href="https://www.tertiaryinfotech.com/" target="_blank" rel="noopener">Tertiary Infotech Academy Pte Ltd</a></p>
        </div>
      </section>
    </div>
  );
}
