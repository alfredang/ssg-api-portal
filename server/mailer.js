// Email for website enquiries, done the way tertiaryinfotech.com (ai-cms) does it:
//   1. a notification to the team (LEAD_EMAIL_TO), Reply-To = the enquirer;
//   2. an acknowledgement to the enquirer, Reply-To = our inbox.
// Both are formatted HTML. Neither can fail the form: the enquiry is stored first.
//
// Transport, first one configured wins:
//   1. Gmail API  GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN (as in ai-cms)
//   2. Resend     RESEND_API_KEY (as in the HRMS)
//   3. SMTP       SMTP_HOST, SMTP_USER, SMTP_PASS [, SMTP_PORT, SMTP_SECURE]
// Sender: the Gmail user, or EMAIL_FROM_LEADS for Resend / SMTP.
// With no transport configured nothing is sent; the enquiry is still stored.

const { mailConfig } = require('./settings');

// Configuration is read on every send, so a change in the console's Settings
// page takes effect at once. Saved settings win over environment variables.
const cfg = () => {
  const c = mailConfig();
  return {
    ...c,
    TO: (c.LEAD_EMAIL_TO || 'angch@tertiaryinfotech.com').split(',').map((x) => x.trim()).filter(Boolean),
    FROM: c.EMAIL_FROM_LEADS || 'SSG API Portal <enquiry@tertiaryinfotech.com>',
    REPLY_INBOX: c.LEAD_REPLY_TO || 'enquiry@tertiaryinfotech.com',
    AUTOREPLY: c.LEAD_AUTOREPLY !== 'false',
  };
};
const SITE = 'https://ssgapi.tertiaryinfotech.com';

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SOURCES = {
  contact: { label: 'Contact page', path: '/contact' },
  'ssg-api-services-checklist': { label: 'SSG API Services page (checklist download)', path: '/ssg-api-services' },
};

function transportName() {
  const e = mailConfig();
  if (e.GMAIL_USER && e.GMAIL_CLIENT_ID && e.GMAIL_CLIENT_SECRET && e.GMAIL_REFRESH_TOKEN) return 'gmail';
  if (e.RESEND_API_KEY) return 'resend';
  if (e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS) return 'smtp';
  return null;
}

/** Subject, HTML and plain-text bodies for one enquiry. */
function buildLeadEmail(lead) {
  const src = SOURCES[lead.source] || { label: lead.source || 'Website', path: '/' };
  const when = new Date(lead.at || Date.now()).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'full', timeStyle: 'short' });
  const subject = `New SSG API enquiry: ${lead.name}${lead.company ? ` (${lead.company})` : ''}`;
  const tel = lead.phone ? lead.phone.replace(/[^\d+]/g, '') : '';
  const row = (label, value) => value ? `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #E3E9F6;width:150px;vertical-align:top;font:600 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#56678F;">${label}</td>
          <td style="padding:10px 0;border-bottom:1px solid #E3E9F6;vertical-align:top;font:15px/1.5 Arial,Helvetica,sans-serif;color:#0F1C45;">${value}</td>
        </tr>` : '';
  const button = (href, text, primary) => `<a href="${href}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:10px;font:600 14px Arial,Helvetica,sans-serif;text-decoration:none;${primary ? 'background:#2F5BE6;color:#ffffff;border:1px solid #2F5BE6;' : 'background:#ffffff;color:#2F5BE6;border:1px solid #B3C0DD;'}">${text}</a>`;
  const replySubject = encodeURIComponent('Re: Your SSG API enquiry');

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#E8EEFA;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(lead.name)} sent an enquiry from the ${esc(src.label)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8EEFA;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #D0DAEE;">
        <tr><td style="background:#0F1C45;padding:22px 28px;">
          <div style="font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9FB4F2;">SSG API Portal</div>
          <div style="font:700 24px/1.25 Arial,Helvetica,sans-serif;color:#ffffff;margin-top:6px;">New enquiry</div>
          <div style="font:14px/1.5 Arial,Helvetica,sans-serif;color:#C9D3EE;margin-top:4px;">From the ${esc(src.label)}</div>
        </td></tr>
        <tr><td style="padding:24px 28px 6px;">
          <div style="font:700 20px/1.3 Arial,Helvetica,sans-serif;color:#0F1C45;">${esc(lead.name)}</div>
          ${lead.company ? `<div style="font:15px/1.4 Arial,Helvetica,sans-serif;color:#43547E;margin-top:2px;">${esc(lead.company)}</div>` : ''}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #E3E9F6;">
            ${row('Email', `<a href="mailto:${esc(lead.email)}" style="color:#2F5BE6;text-decoration:none;">${esc(lead.email)}</a>`)}
            ${row('Phone', lead.phone ? `<a href="tel:${esc(tel)}" style="color:#2F5BE6;text-decoration:none;">${esc(lead.phone)}</a>` : '')}
            ${row('Preferred demo', esc(lead.preferredDemo))}
            ${row('Received', esc(when) + ' (SGT)')}
          </table>
        </td></tr>
        <tr><td style="padding:10px 28px 4px;">
          <div style="font:600 12px Arial,Helvetica,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#56678F;margin-bottom:8px;">Message</div>
          <div style="background:#EEF3FC;border-left:4px solid #2F5BE6;border-radius:10px;padding:14px 16px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#0F1C45;white-space:pre-wrap;">${lead.message ? esc(lead.message) : '<span style="color:#56678F;">No message. They asked for the SSG API Integration Checklist.</span>'}</div>
        </td></tr>
        <tr><td style="padding:20px 28px 16px;">
          ${button(`mailto:${esc(lead.email)}?subject=${replySubject}`, `Reply to ${esc(lead.name.split(' ')[0])}`, true)}
          ${tel ? button(`tel:${esc(tel)}`, 'Call', false) : ''}
          ${button(`${SITE}/console/leads`, 'All enquiries', false)}
        </td></tr>
        <tr><td style="background:#F7F9FE;border-top:1px solid #E3E9F6;padding:16px 28px;font:12.5px/1.6 Arial,Helvetica,sans-serif;color:#56678F;">
          Sent by the enquiry form at <a href="${SITE}${src.path}" style="color:#2F5BE6;text-decoration:none;">ssgapi.tertiaryinfotech.com${src.path}</a>. Replying to this email goes to ${esc(lead.name)}.<br>
          Powered by <a href="https://www.tertiaryinfotech.com/" style="color:#2F5BE6;text-decoration:none;">Tertiary Infotech Academy Pte Ltd</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `New SSG API enquiry (${src.label})`, '',
    `Name: ${lead.name}`, lead.company ? `Company: ${lead.company}` : null, `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : null, lead.preferredDemo ? `Preferred demo: ${lead.preferredDemo}` : null, `Received: ${when} (SGT)`, '',
    'Message:', lead.message || '(none; asked for the SSG API Integration Checklist)', '',
    `All enquiries: ${SITE}/console/leads`,
  ].filter((l) => l !== null).join('\n');

  return { subject, html, text };
}

/** The acknowledgement sent to the enquirer. */
function buildAutoreply(lead) {
  const { REPLY_INBOX } = cfg();
  const first = lead.name.split(' ')[0];
  const checklist = lead.source === 'ssg-api-services-checklist';
  const subject = 'We received your SSG API enquiry';
  const li = (t) => `<tr><td style="padding:0 10px 8px 0;vertical-align:top;font:700 14px Arial,Helvetica,sans-serif;color:#2F5BE6;">&#10003;</td><td style="padding:0 0 8px;font:15px/1.5 Arial,Helvetica,sans-serif;color:#0F1C45;">${t}</td></tr>`;
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#E8EEFA;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Thanks, ${esc(first)}. A consultant will reply within one business day.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8EEFA;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #D0DAEE;">
        <tr><td style="background:#0F1C45;padding:22px 28px;">
          <div style="font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9FB4F2;">SSG API Portal · Tertiary Infotech Academy</div>
          <div style="font:700 24px/1.25 Arial,Helvetica,sans-serif;color:#ffffff;margin-top:6px;">Thanks, ${esc(first)}. We have your enquiry.</div>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#0F1C45;">
          <p style="margin:0 0 14px;">A consultant will reply within one business day.${checklist ? ' Your SSG API Integration Checklist is ready to download on the page where you asked for it.' : ''}</p>
          <div style="font:600 12px Arial,Helvetica,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#56678F;margin:0 0 10px;">What happens next</div>
          <table role="presentation" cellpadding="0" cellspacing="0">
            ${li('We read what you sent and match it to the SSG / SWDA APIs involved.')}
            ${li('We reply by email, and arrange a free 30-minute consultation if it helps.')}
            ${li('You get a clear view of what is realistic, the steps with SSG, and a quote if you want one.')}
          </table>
        </td></tr>
        ${lead.message ? `<tr><td style="padding:6px 28px 4px;">
          <div style="font:600 12px Arial,Helvetica,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#56678F;margin-bottom:8px;">What you sent us</div>
          <div style="background:#EEF3FC;border-left:4px solid #2F5BE6;border-radius:10px;padding:14px 16px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#0F1C45;white-space:pre-wrap;">${esc(lead.message)}</div>
        </td></tr>` : ''}
        <tr><td style="padding:20px 28px 18px;">
          <a href="${SITE}/" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:10px;font:600 14px Arial,Helvetica,sans-serif;text-decoration:none;background:#2F5BE6;color:#ffffff;border:1px solid #2F5BE6;">Open the SSG API reference</a>
          <a href="https://wa.me/6588666375" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:10px;font:600 14px Arial,Helvetica,sans-serif;text-decoration:none;background:#ffffff;color:#2F5BE6;border:1px solid #B3C0DD;">WhatsApp us</a>
        </td></tr>
        <tr><td style="background:#F7F9FE;border-top:1px solid #E3E9F6;padding:16px 28px;font:12.5px/1.6 Arial,Helvetica,sans-serif;color:#56678F;">
          Tertiary Infotech Academy Pte Ltd · 12 Woodlands Square #07-85/86/87 Woods Square Tower 1, Singapore 737715<br>
          +65 6100 0613 · <a href="mailto:${esc(REPLY_INBOX)}" style="color:#2F5BE6;text-decoration:none;">${esc(REPLY_INBOX)}</a> · <a href="https://www.tertiaryinfotech.com/" style="color:#2F5BE6;text-decoration:none;">www.tertiaryinfotech.com</a><br>
          You are receiving this because this address was entered in the enquiry form at ssgapi.tertiaryinfotech.com. If that was not you, ignore this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = [`Thanks, ${first}. We have your enquiry.`, '', 'A consultant will reply within one business day.', '',
    lead.message ? `What you sent us:\n${lead.message}\n` : null,
    `SSG API reference: ${SITE}/`, 'WhatsApp: https://wa.me/6588666375', '',
    'Tertiary Infotech Academy Pte Ltd · +65 6100 0613 · www.tertiaryinfotech.com'].filter((l) => l !== null).join('\n');
  return { subject, html, text };
}

// Header values must never carry a line break or angle bracket taken from user input.
const headerSafe = (v) => String(v ?? '').replace(/[\r\n"<>]/g, ' ').trim();
const encSubject = (v) => `=?UTF-8?B?${Buffer.from(v, 'utf8').toString('base64')}?=`;

let gmailToken = { value: '', exp: 0, for: '' };
async function gmailAccessToken(c) {
  if (gmailToken.value && gmailToken.for === c.GMAIL_REFRESH_TOKEN && Date.now() < gmailToken.exp - 60_000) return gmailToken.value;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.GMAIL_CLIENT_ID, client_secret: c.GMAIL_CLIENT_SECRET,
      refresh_token: c.GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token',
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Gmail token ${res.status}: ${body.error_description || body.error || 'error'}`);
  gmailToken = { value: body.access_token, exp: Date.now() + (body.expires_in || 3000) * 1000, for: c.GMAIL_REFRESH_TOKEN };
  return gmailToken.value;
}

/** One email through the configured transport. Resolves { sent, via, id?, reason? }; never throws. */
async function send({ to, replyTo, subject, html, text }) {
  const via = transportName();
  if (!via) return { sent: false, reason: 'no mail account configured (console > Settings, or GMAIL_* / RESEND_API_KEY / SMTP_* variables)' };
  const c = cfg();
  const FROM = c.FROM;
  try {
    if (via === 'gmail') {
      const from = `"SSG API Portal" <${c.GMAIL_USER}>`;
      const raw = [
        `From: ${from}`, `To: ${to.join(', ')}`, `Reply-To: ${replyTo}`, `Subject: ${encSubject(subject)}`,
        'MIME-Version: 1.0', 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '',
        Buffer.from(html, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
      ].join('\r\n');
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await gmailAccessToken(c)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: Buffer.from(raw, 'utf8').toString('base64url') }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { sent: false, via, reason: `Gmail ${res.status}: ${body.error?.message || 'error'}` };
      return { sent: true, via, id: body.id };
    }
    if (via === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to, reply_to: replyTo, subject, html, text }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { sent: false, via, reason: `Resend ${res.status}: ${body.message || body.name || 'error'}` };
      return { sent: true, via, id: body.id };
    }
    const nodemailer = require('nodemailer');
    const transport = nodemailer.createTransport({
      host: c.SMTP_HOST,
      port: Number(c.SMTP_PORT || 587),
      secure: c.SMTP_SECURE === 'true',
      auth: { user: c.SMTP_USER, pass: c.SMTP_PASS },
    });
    const info = await transport.sendMail({ from: FROM, to, replyTo, subject, html, text });
    return { sent: true, via, id: info.messageId };
  } catch (err) {
    return { sent: false, via, reason: err.message };
  }
}

/** One-time sign-in code. Goes to the requester only. */
function sendOtpEmail(email, code, minutes) {
  const subject = `${code} is your SSG API Portal sign-in code`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#E8EEFA;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your sign-in code is ${code}. It expires in ${minutes} minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E8EEFA;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #D0DAEE;">
      <tr><td style="background:#0F1C45;padding:20px 28px;">
        <div style="font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9FB4F2;">SSG API Portal</div>
        <div style="font:700 22px/1.25 Arial,Helvetica,sans-serif;color:#ffffff;margin-top:6px;">Your sign-in code</div>
      </td></tr>
      <tr><td style="padding:26px 28px 8px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#0F1C45;">
        Enter this code on the sign-in page:
        <div style="margin:16px 0;padding:16px;background:#EEF3FC;border-radius:12px;text-align:center;font:700 34px/1 'Courier New',Courier,monospace;letter-spacing:.3em;color:#0F1C45;">${code}</div>
        It expires in ${minutes} minutes and works once.
      </td></tr>
      <tr><td style="padding:10px 28px 22px;font:13px/1.6 Arial,Helvetica,sans-serif;color:#56678F;">
        If you did not ask for this code, ignore this email: nobody can sign in without it. Never share it; we will not ask you for it.
      </td></tr>
      <tr><td style="background:#F7F9FE;border-top:1px solid #E3E9F6;padding:14px 28px;font:12.5px/1.6 Arial,Helvetica,sans-serif;color:#56678F;">
        ssgapi.tertiaryinfotech.com · Powered by <a href="https://www.tertiaryinfotech.com/" style="color:#2F5BE6;text-decoration:none;">Tertiary Infotech Academy Pte Ltd</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = `Your SSG API Portal sign-in code is ${code}.\nIt expires in ${minutes} minutes and works once.\n\nIf you did not ask for it, ignore this email.`;
  return send({ to: [email], replyTo: cfg().REPLY_INBOX, subject, html, text });
}

/** Notify the team about an enquiry. Reply-To is the enquirer. */
function sendLeadEmail(lead) {
  return send({ to: cfg().TO, replyTo: `${headerSafe(lead.name)} <${lead.email}>`, ...buildLeadEmail(lead) });
}

/** Acknowledge the enquiry to the person who sent it. Reply-To is our inbox. */
function sendLeadAutoreply(lead) {
  const c = cfg();
  if (!c.AUTOREPLY) return Promise.resolve({ sent: false, reason: 'acknowledgement turned off in Settings' });
  return send({ to: [lead.email], replyTo: c.REPLY_INBOX, ...buildAutoreply(lead) });
}

module.exports = { buildLeadEmail, buildAutoreply, sendLeadEmail, sendLeadAutoreply, sendOtpEmail, transportName };
