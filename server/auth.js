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
  avatarUrl: null,
};

function authDisabled() {
  if (process.env.AUTH_DISABLED === 'true') return true;
  if (process.env.AUTH_DISABLED === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

// The authenticated user for this request, or null when login is required
// but the visitor is not signed in.
function getCurrentUser(req) {
  if (req.user) return req.user;
  if (authDisabled()) return LOCAL_USER;
  return null;
}

// Gate for protected API routes.
function requireAuth(req, res, next) {
  if (authDisabled() || req.isAuthenticated?.()) return next();
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
      passport.authenticate('google', { failureRedirect: '/?login=failed' })(
        req,
        res,
        next
      );
    },
    (req, res) => res.redirect('/')
  );

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

module.exports = { configureAuth, requireAuth, getCurrentUser, authDisabled };
