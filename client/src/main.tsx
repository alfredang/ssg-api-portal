import { StrictMode, Component, useState, useEffect } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import { fetchCurrentUser } from './auth'
import type { AuthUser } from './auth'
import './index.css'
import App from './App.tsx'
import LoginPage from './components/LoginPage'
import { Home, GroupPage, ApiPage, StartPage } from './components/Docs'
import SubscriptionForm from './components/SubscriptionForm'
import TpgProcess from './components/TpgProcess'

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

type Route =
  | { view: 'home' } | { view: 'start' } | { view: 'group'; id: string } | { view: 'api'; slug: string }
  | { view: 'form' } | { view: 'tpg'; step: number } | { view: 'console'; page: string };

function parseRoute(): Route {
  const [head, arg] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (head === 'start') return { view: 'start' };
  if (head === 'api' && arg) return { view: 'api', slug: arg };
  if (head === 'apis' && arg) return { view: 'group', id: arg };
  if (head === 'subscription-form') return { view: 'form' };
  if (head === 'tpg-process') return { view: 'tpg', step: Number(arg) || 0 };
  if (head === 'console') return { view: 'console', page: arg || 'course-lookup' };
  return { view: 'home' };
}

// Public pages: API reference, getting started, TPG process, subscription form.
// The console (which calls SSG with our App 1-4 credentials) needs a signed-in user.
function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>(parseRoute);

  useEffect(() => {
    fetchCurrentUser()
      .then((res) => setUser(res?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const onHash = () => { setRoute(parseRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (hash: string) => { window.location.hash = hash; };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#56678F' }}>Loading...</div>;
  }

  switch (route.view) {
    case 'console':
      return user
        ? <App key="console" user={user} initialPage={route.page} onHome={() => go('/')} />
        : <LoginPage onBack={() => go('/')} />;
    case 'form': return <SubscriptionForm user={user} />;
    case 'tpg': return <TpgProcess user={user} step={route.step} onStep={(n) => go(n ? `/tpg-process/${n}` : '/tpg-process')} />;
    case 'start': return <StartPage user={user} />;
    case 'group': return <GroupPage user={user} groupId={route.id} />;
    case 'api': return <ApiPage key={route.slug} user={user} slug={route.slug} />;
    default: return <Home user={user} />;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGate />
    </ErrorBoundary>
  </StrictMode>,
)
