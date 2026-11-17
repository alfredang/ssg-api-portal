// ─────────────────────────────────────────────────────────────────
// Read-only link to AI-LMS-TMS (lms-tms.tertiaryinfotech.com).
//
// The console uses it to offer our real course runs and enrolment reference
// numbers as test values. Rules:
//   - GET only, and only the paths in ALLOWED below. Nothing here can change
//     anything in AI-LMS-TMS.
//   - Personal data is dropped before it leaves this server: no learner names,
//     emails, NRICs, trainer or admin emails. Testers need the IDs, not the people.
//   - The key comes from LMS_TMS_API_KEY and is never sent to the browser.
// Note: AI-LMS-TMS has one service key for reads and writes. Because that key
// could also write, keep it in the server environment only.
// ─────────────────────────────────────────────────────────────────
const express = require('express');

const router = express.Router();
const BASE = (process.env.LMS_TMS_BASE_URL || 'https://lms-tms.tertiaryinfotech.com').replace(/\/+$/, '');
const ALLOWED = new Set(['/api/external/course-runs', '/api/external/enrollments']);
const configured = () => !!process.env.LMS_TMS_API_KEY;
const REF = /^[A-Za-z0-9-]{4,40}$/;
const RUN = /^[A-Za-z0-9-]{1,40}$/;

async function lmsGet(path, query) {
  if (!ALLOWED.has(path)) throw new Error('Path not allowed');
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  const res = await fetch(url, { method: 'GET', headers: { 'x-api-key': process.env.LMS_TMS_API_KEY, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = null; }
  if (!res.ok || !data) throw Object.assign(new Error(`AI-LMS-TMS answered ${res.status}`), { status: res.status });
  return data;
}
const rows = (d) => (Array.isArray(d.data) ? d.data : Array.isArray(d.course_runs) ? d.course_runs : Array.isArray(d.enrollments) ? d.enrollments : Array.isArray(d.rows) ? d.rows : []);

router.get('/status', (_req, res) => res.json({ configured: configured(), base: BASE }));

// Course runs of one of our courses, newest first.
router.get('/course-runs', async (req, res) => {
  if (!configured()) return res.json({ configured: false, runs: [] });
  const course = String(req.query.course || '');
  if (!REF.test(course)) return res.status(400).json({ error: 'Give a course reference number' });
  try {
    const d = await lmsGet('/api/external/course-runs', { course_code: course, limit: 100 });
    res.json({
      configured: true, total: d.total ?? rows(d).length,
      runs: rows(d).map((r) => ({ runId: r.course_run_id, status: r.class_status, start: r.start_date, end: r.end_date, mode: r.mode_of_learning, enrolled: r.enrolled_count, title: r.course_title })).filter((r) => r.runId),
    });
  } catch (err) { res.status(502).json({ configured: true, error: err.message, runs: [] }); }
});

// Enrolment reference numbers of one course run. No learner details.
router.get('/enrolments', async (req, res) => {
  if (!configured()) return res.json({ configured: false, enrolments: [] });
  const run = String(req.query.run || '');
  if (!RUN.test(run)) return res.status(400).json({ error: 'Give a course run ID' });
  try {
    const d = await lmsGet('/api/external/enrollments', { course_run_id: run, limit: 200 });
    res.json({
      configured: true, total: d.total ?? rows(d).length,
      enrolments: rows(d).map((e) => ({ ref: e.ssg_enrolment_id, status: e.enrolment_status, date: e.enrolment_date, payment: e.payment_status, assessment: e.assessment_status, hasGrant: !!e.grant_id })).filter((e) => e.ref),
    });
  } catch (err) { res.status(502).json({ configured: true, error: err.message, enrolments: [] }); }
});

module.exports = router;
