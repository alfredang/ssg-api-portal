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
import { ContactPage, ServicesPage } from './components/Marketing'
import { KeysGuide, SubscriptionGuide } from './components/Guides'
import { startRouter, usePath, navigate } from './router'
import { applySeo } from './seo'

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
  | { view: 'form' } | { view: 'tpg'; slug?: string } | { view: 'services' } | { view: 'contact' }
  | { view: 'guide'; id: string } | { view: 'console'; page: string };

function parseRoute(pathname: string): Route {
  const [head, arg] = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (head === 'start') return { view: 'start' };
  if (head === 'docs' && arg) return { view: 'api', slug: arg };
  if (head === 'category' && arg) return { view: 'group', id: arg };
  if (head === 'subscription-form') return { view: 'form' };
  if (head === 'tpg-process') return { view: 'tpg', slug: arg };
  if (head === 'ssg-api-services') return { view: 'services' };
  if (head === 'contact') return { view: 'contact' };
  if (head === 'guides' && arg) return { view: 'guide', id: arg };
  if (head === 'console') return { view: 'console', page: arg || 'course-lookup' };
  return { view: 'home' };
}

startRouter();

// Public pages: API reference, getting started, TPG process, subscription form,
// services, contact. The console (which calls SSG with our App 1-4 credentials)
// needs a signed-in user.
function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const path = usePath();
  const route = parseRoute(path);

  useEffect(() => {
    fetchCurrentUser()
      .then((res) => setUser(res?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { applySeo(path); }, [path]);

  // The console waits for the sign-in check; public pages render at once.
  if (route.view === 'console') {
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#56678F' }}>Loading...</div>;
    return user
      ? <App key="console" user={user} initialPage={route.page} onHome={() => navigate('/')} />
      : <LoginPage onBack={() => navigate('/')} />;
  }

  switch (route.view) {
    case 'form': return <SubscriptionForm user={user} />;
    case 'tpg': return <TpgProcess user={user} slug={route.slug} />;
    case 'start': return <StartPage user={user} />;
    case 'group': return <GroupPage user={user} groupId={route.id} />;
    case 'api': return <ApiPage key={route.slug} user={user} slug={route.slug} />;
    case 'services': return <ServicesPage user={user} />;
    case 'contact': return <ContactPage user={user} />;
    case 'guide': return route.id === 'api-subscription' ? <SubscriptionGuide user={user} /> : <KeysGuide user={user} />;
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
