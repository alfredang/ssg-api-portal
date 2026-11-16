import { StrictMode, Component, useState, useEffect } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import { fetchCurrentUser } from './auth'
import type { AuthUser } from './auth'
import './index.css'
import App from './App.tsx'
import LoginPage from './components/LoginPage'
import ApiDiscovery from './components/ApiDiscovery'
import SubscriptionForm from './components/SubscriptionForm'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('React error:', error, info); }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 40, color: 'red', fontFamily: 'monospace' }}>
        <h2>React Error</h2>
        <pre>{this.state.error.message}</pre>
        <pre>{this.state.error.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

type Route = { view: 'discover' } | { view: 'form' } | { view: 'console'; page: string };

function parseRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'subscription-form') return { view: 'form' };
  if (h.startsWith('console')) return { view: 'console', page: h.split('/')[1] || 'course-lookup' };
  return { view: 'discover' };
}

// Public pages: API catalogue + subscription form. The console (which calls
// SSG with our App 1-4 credentials) needs a signed-in user.
function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    fetchCurrentUser()
      .then((res) => setUser(res?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (hash: string) => { window.location.hash = hash; window.scrollTo(0, 0); };
  const goHome = () => go('/');
  const goForm = () => go('/subscription-form');
  const goConsole = (page: string) => go(`/console/${page}`);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#9ca3af' }}>Loading...</div>;
  }

  if (route.view === 'console') {
    return user
      ? <App key="console" user={user} initialPage={route.page} onHome={goHome} />
      : <LoginPage onBack={goHome} />;
  }
  if (route.view === 'form') {
    return <SubscriptionForm user={user} onHome={goHome} onLogin={() => goConsole('course-lookup')} onConsole={() => goConsole('course-lookup')} />;
  }
  return <ApiDiscovery user={user} onTry={goConsole} onLogin={() => goConsole('course-lookup')} onOpenForm={goForm} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGate />
    </ErrorBoundary>
  </StrictMode>,
)
