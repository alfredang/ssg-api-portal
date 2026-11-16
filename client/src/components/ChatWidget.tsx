import { useEffect, useState } from 'react';

// Floating WhatsApp chat widget (bottom right) on every public page: a small
// robot mascot, a greeting bubble, and a pop-up with ready-made questions that
// open WhatsApp with the message filled in. Same pattern as tertiarycourses.com.sg.

const WA = 'https://wa.me/6588666375';
const QUESTIONS = [
  'Hi! I need help integrating the SSG API with our TMS.',
  'How do I subscribe to an SSG / SWDA API?',
  'My SSG API call returns 403. Can you help?',
  'I would like a quote for SSG API integration.',
];
const wa = (text: string) => `${WA}?text=${encodeURIComponent(text)}`;
const GREETED = 'ssg-chat-greeted';

/** The mascot: a friendly robot that blinks. Drawn here, no image file. */
function Bot({ size }: { size: number }) {
  return (
    <svg className="cw-bot" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="cw-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E3EAFC" /><stop offset="1" stopColor="#9FB4F2" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#cw-bg)" />
      <line x1="32" y1="9" x2="32" y2="17" stroke="#2F5BE6" strokeWidth="3" strokeLinecap="round" />
      <circle className="cw-antenna" cx="32" cy="8" r="4" fill="#FFB020" />
      <rect x="9" y="27" width="6" height="12" rx="3" fill="#2449C4" />
      <rect x="49" y="27" width="6" height="12" rx="3" fill="#2449C4" />
      <rect x="13" y="17" width="38" height="32" rx="12" fill="#fff" stroke="#2F5BE6" strokeWidth="3" />
      <g className="cw-eyes">
        <circle cx="24.5" cy="31" r="4.2" fill="#0F1C45" /><circle cx="39.5" cy="31" r="4.2" fill="#0F1C45" />
        <circle cx="26" cy="29.5" r="1.3" fill="#fff" /><circle cx="41" cy="29.5" r="1.3" fill="#fff" />
      </g>
      <circle cx="19" cy="38" r="2.6" fill="#FFC9D6" /><circle cx="45" cy="38" r="2.6" fill="#FFC9D6" />
      <path d="M26 39.5c3.2 3.6 8.8 3.6 12 0" fill="none" stroke="#0F1C45" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 0 1 6.9 12.4 8.1 8.1 0 0 1-11 2.6l-.4-.2-3 .8.8-3-.2-.4A8.1 8.1 0 0 1 12.04 3.800zm-3.200 4.300c-.2 0-.5 0-.7.300-.300.300-1 1-1 2.400s1 2.800 1.200 3c.1.200 2 3.200 5 4.400 2.500 1 3 .800 3.500.700.600-.100 1.800-.700 2-1.400.300-.700.300-1.300.200-1.400l-.500-.300-1.800-.900c-.300-.100-.500-.100-.700.200l-.800 1c-.200.200-.300.200-.600.100-1.600-.800-2.700-1.500-3.800-3.300-.300-.500.300-.500.800-1.500.100-.200 0-.400 0-.500l-.900-2.100c-.200-.500-.400-.500-.600-.500z" />
  </svg>
);

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [greet, setGreet] = useState(false);

  // Show the greeting bubble once per browser session, a few seconds after arrival.
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(GREETED) === '1'; } catch { /* private mode */ }
    if (seen) return;
    const t = setTimeout(() => setGreet(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const dismissGreeting = () => {
    setGreet(false);
    try { sessionStorage.setItem(GREETED, '1'); } catch { /* ignore */ }
  };
  const toggle = () => { setOpen((o) => !o); dismissGreeting(); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`cw ${open ? 'open' : ''}`}>
      {open && (
        <section className="cw-popup" role="dialog" aria-label="Chat with us on WhatsApp">
          <header className="cw-head">
            <Bot size={44} />
            <div>
              <b>SSG API Helper</b>
              <span><i className="cw-online" />Tertiary Infotech · replies on WhatsApp in office hours</span>
            </div>
            <button className="cw-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </header>
          <div className="cw-body">
            <p className="cw-msg">Hi there 👋 I’m the SSG API helper. Pick a question and we’ll continue on WhatsApp with a real person:</p>
            {QUESTIONS.map((q) => (
              <a key={q} className="cw-option" href={wa(q)} target="_blank" rel="noopener noreferrer">{q}</a>
            ))}
          </div>
          <footer className="cw-foot">
            <a className="cw-start" href={wa('Hi! I have a question about the SSG API.')} target="_blank" rel="noopener noreferrer"><WaIcon />Start a chat</a>
            <span>WhatsApp +65 8866 6375 · Mon – Fri, 9 am – 6 pm</span>
          </footer>
        </section>
      )}

      {greet && !open && (
        <div className="cw-greet" role="status">
          <button className="cw-greet-text" onClick={toggle}><b>Hi there! 👋</b>Stuck on the SSG API? Chat with us on WhatsApp.</button>
          <button className="cw-greet-close" onClick={dismissGreeting} aria-label="Dismiss">×</button>
        </div>
      )}

      <button className="cw-launcher" onClick={toggle} aria-expanded={open} aria-label={open ? 'Close chat' : 'Chat with us on WhatsApp'}>
        {open ? <span className="cw-x" aria-hidden="true">×</span> : <Bot size={60} />}
        {!open && <span className="cw-badge" aria-hidden="true"><WaIcon /></span>}
      </button>
    </div>
  );
}
