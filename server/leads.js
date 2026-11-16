// Enquiries from the public Contact and SSG API Services pages.
//   POST /lead        public: validate, rate-limit, append to DATA_DIR/leads.jsonl,
//                     and forward to LEAD_WEBHOOK_URL when set (e.g. a chat or CRM webhook)
//   GET  /api/leads   signed-in staff only: latest enquiries, newest first
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('./auth');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'leads.jsonl');

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Small in-memory limiter: 5 enquiries per IP per hour.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

const publicRouter = express.Router();
publicRouter.post('/lead', async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot filled: a bot; pretend success
  const lead = {
    at: new Date().toISOString(),
    source: clean(b.source, 60) || 'contact',
    name: clean(b.name, 120),
    email: clean(b.email, 160),
    company: clean(b.company, 160),
    phone: clean(b.phone, 40),
    preferredDemo: clean(b.preferredDemo, 120),
    message: clean(b.message, 4000),
  };
  if (!lead.name || !EMAIL.test(lead.email)) return res.status(400).json({ error: 'Please give your name and a valid email' });
  if (limited(req.ip)) return res.status(429).json({ error: 'Too many enquiries from this address; please email us instead' });
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(FILE, JSON.stringify(lead) + '\n', { mode: 0o600 });
  } catch (err) {
    console.error('[lead] could not store enquiry:', err.message);
    return res.status(500).json({ error: 'Could not save your enquiry' });
  }
  console.log(`[lead] ${lead.source}: new enquiry stored`);
  if (process.env.LEAD_WEBHOOK_URL) {
    fetch(process.env.LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `New SSG API Portal enquiry (${lead.source}) from ${lead.name}, ${lead.company || 'no company'} <${lead.email}> ${lead.phone}\n${lead.message}`, lead }),
    }).catch((err) => console.error('[lead] webhook failed:', err.message));
  }
  res.json({ ok: true });
});

const adminRouter = express.Router();
adminRouter.get('/', requireAuth, (_req, res) => {
  let rows = [];
  try {
    rows = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { /* no enquiries yet */ }
  res.json({ leads: rows.reverse().slice(0, 500) });
});

module.exports = { publicRouter, adminRouter };
