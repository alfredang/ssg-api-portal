// ─────────────────────────────────────────────────────────────────
// Authentication
//
// Server-side Google social login (Passport) with cookie-based sessions
// (no database). The whole user object is stored in a signed, encrypted
// cookie, so sessions survive restarts and work across replicas with no
// server-side store.
//
//   • Localhost / development  → NO login required. A fixed "Local Dev"
//     user is injected so per-user defaults work offline.
//   • Remote / production       → Google social login is required.
//
// Toggle explicitly with AUTH_DISABLED=true|false. When unset, auth is
// disabled unless NODE_ENV === 'production'.
// ─────────────────────────────────────────────────────────────────
const cookieSession = require('cookie-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const LOCAL_USER = {
  id: 'local',
  provider: 'local',
  email: 'local@localhost',
  name: 'Local Dev',
  role: 'admin', // localhost has no sign-in, so the local user can see every page
  avatarUrl: null,
};

function authDisabled() {
  if (process.env.AUTH_DISABLED === 'true') return true;
  if (process.env.AUTH_DISABLED === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

// Who may sign in: only an email on the users list (server/users.js). The one
// admin manages that list in the console. A Google account alone is not enough.
const crypto = require('crypto');
const users = require('./users');
const { sendOtpEmail, transportName } = require('./mailer');
const emailAllowed = (email) => !!users.find(email);

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

// The authenticated user for this request, or null when login is required
// but the visitor is not signed in.
function getCurrentUser(req) {
  if (req.user && (authDisabled() || emailAllowed(req.user.email))) return { ...req.user, role: users.roleOf(req.user.email) || 'member' };
  if (authDisabled()) return LOCAL_USER;
  return null;
}

// Gate for protected API routes. Sessions issued before the allow-list
// existed are re-checked here.
function requireAuth(req, res, next) {
  if (authDisabled()) return next();
  if (req.isAuthenticated?.() && emailAllowed(req.user?.email)) return next();
  res.status(401).json({ error: 'Authentication required' });
}

function configureAuth(app) {
  app.use(
    cookieSession({
      name: 'ssg.sid',
      keys: [process.env.SESSION_SECRET || 'dev-insecure-secret-change-me'],
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  );

  // Passport 0.7 expects session.regenerate / session.save; cookie-session
  // does not provide them. Shim with no-ops (functions aren't serialized).
  app.use((req, _res, next) => {
    if (req.session && !req.session.regenerate) {
      req.session.regenerate = (cb) => cb();
    }
    if (req.session && !req.session.save) {
      req.session.save = (cb) => cb();
    }
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  if (googleConfigured) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL:
            process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        },
        (_accessToken, _refreshToken, profile, done) => {
          const email = profile.emails?.[0]?.value || null;
          if (!users.admit(email)) {
            console.warn(`[auth] sign-in refused for ${email || 'unknown'} (not a user)`);
            return done(null, false);
          }
          users.recordLogin(email);
          // No persistence — the profile lives in the session cookie.
          done(null, {
            id: `google:${profile.id}`,
            provider: 'google',
            email: profile.emails?.[0]?.value || null,
            name: profile.displayName || null,
            avatarUrl: profile.photos?.[0]?.value || null,
          });
        }
      )
    );
  } else if (!authDisabled()) {
    console.warn(
      '[auth] Login is required but GOOGLE_CLIENT_ID/SECRET are not set — Google sign-in will fail.'
    );
  }

  // ── Routes ──────────────────────────────────────────────────────
  app.get('/auth/google', (req, res, next) => {
    if (!googleConfigured)
      return res.status(503).send('Google sign-in is not configured.');
    passport.authenticate('google', { scope: ['profile', 'email'] })(
      req,
      res,
      next
    );
  });

  app.get(
    '/auth/google/callback',
    (req, res, next) => {
      if (!googleConfigured) return res.redirect('/');
      passport.authenticate('google', { failureRedirect: '/console?login=failed' })(
        req,
        res,
        next
      );
    },
    (req, res) => res.redirect('/console')
  );

  // ── One-time code sign-in (email OTP) ───────────────────────────
  // For users on the list who prefer not to use Google. The code is 6 digits,
  // lasts 10 minutes, works once, and allows 5 wrong tries. The reply is the
  // same whether or not the email is a user, so the list cannot be probed.
  const OTP_MINUTES = 10;
  const otps = new Map();      // email -> { hash, exp, tries }
  const asked = new Map();     // key -> [timestamps]
  const tooMany = (key, max, windowMs) => {
    const now = Date.now();
    const recent = (asked.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now); asked.set(key, recent);
    if (asked.size > 5000) asked.clear();
    return recent.length > max;
  };
  const hashCode = (email, code) => crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-insecure-secret-change-me').update(`${email}:${code}`).digest('hex');

  app.post('/auth/otp/request', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (tooMany(`ip:${req.ip}`, 10, 3600_000) || tooMany(`em:${email}`, 3, 600_000)) {
      return res.status(429).json({ error: 'Too many codes requested. Wait a few minutes and try again.' });
    }
    if (!transportName()) return res.status(503).json({ error: 'Email codes are not set up yet. Use Google sign-in.' });
    if (users.admit(email)) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      otps.set(email, { hash: hashCode(email, code), exp: Date.now() + OTP_MINUTES * 60_000, tries: 0 });
      const r = await sendOtpEmail(email, code, OTP_MINUTES);
      if (!r.sent) { console.error(`[auth] sign-in code not sent: ${r.reason}`); return res.status(502).json({ error: 'Could not send the code. Use Google sign-in.' }); }
    } else {
      console.warn('[auth] sign-in code requested for an address that is not a user');
    }
    res.json({ ok: true, minutes: OTP_MINUTES });
  });

  app.post('/auth/otp/verify', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').replace(/\D/g, '');
    const entry = otps.get(email);
    const fail = () => res.status(401).json({ error: 'That code is not right or has expired. Request a new one.' });
    if (!entry || Date.now() > entry.exp) { otps.delete(email); return fail(); }
    if (++entry.tries > 5) { otps.delete(email); return fail(); }
    const a = Buffer.from(entry.hash); const b = Buffer.from(hashCode(email, code));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail();
    otps.delete(email);
    if (!users.admit(email)) return fail();
    users.recordLogin(email);
    const user = { id: `otp:${email}`, provider: 'otp', email, name: email.split('@')[0], avatarUrl: null };
    req.login(user, (err) => (err ? res.status(500).json({ error: 'Could not sign in' }) : res.json({ ok: true })));
  });

  app.get('/auth/logout', (req, res) => {
    req.logout?.(() => {});
    req.session = null;
    res.redirect('/');
  });

  // Current-user probe used by the client AuthGate.
  app.get('/api/me', (req, res) => {
    const user = getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user, authDisabled: authDisabled() });
  });
}

// Gate for admin-only routes (users, settings). The role comes from the users
// list on every request, never from the session cookie.
function requireAdmin(req, res, next) {
  if (authDisabled()) return next();
  if (req.isAuthenticated?.() && users.isAdmin(req.user?.email)) return next();
  res.status(req.isAuthenticated?.() ? 403 : 401).json({ error: 'Admin only' });
}

module.exports = { configureAuth, requireAuth, requireAdmin, getCurrentUser, authDisabled };
