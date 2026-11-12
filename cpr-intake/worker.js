// Cloudflare Worker "nemo-cpr-intake" (dash.cloudflare.com -> Workers & Pages).
//
// The CPR NEMO Exam (nemonu.org/cpr/) sends each student's answers and course
// paperwork info here when they submit the test. This Worker GRADES the exam
// against the answer key stored privately in the "nemo-cpr" KV namespace
// (keys answerkey:A and answerkey:B; the key is not in the public page), and
// stores the student's record with that score: name for their card, email,
// phone, mailing address, class date, score and attempts. The CPR Testing &
// Management page (nemo-tool.pages.dev/cpr-class/, login required) reads the
// records to fill out the AHA roster, skills sheets and eCard upload sheet.
//
// It replies with the score and which questions were right or wrong, never
// the correct answers. It can't read back anyone's records; that happens only
// through the login-protected management page.
//
// To redeploy after editing: dash.cloudflare.com -> Workers & Pages ->
// nemo-cpr-intake -> Edit code, paste this file, Deploy.

const ALLOWED_ORIGINS = ['https://nemonu.org', 'https://www.nemonu.org', 'https://nemoemt.github.io'];

// The CPR class schedule: the "Sessions" tab of the NEMO CPR Training Sign-Ups
// Google Sheet, published to the web as CSV (File -> Share -> Publish to web ->
// Sessions -> CSV). Only that tab is public; the sign-up responses are not.
// GET /sessions turns it into a list the exam's class dropdown and the CPR
// Testing & Management page use. Leave empty to turn the dropdown off.
const SESSIONS_CSV_URL = '';
let sessionsCache = null;   // { at, body }

// The Google Apps Script that emails each answer sheet PDF to NEMO (the same
// one the exam page used to call directly). POST /answersheet forwards the
// exam's PDF there from the server, so it arrives even if the student's phone
// leaves the page right away, and the exam gets a real "sent" / "failed".
const ANSWER_SHEET_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwOfmf2XejSgzmh5jQXrqfbzQ2LczHFmB44Kyu0ZPhk7du-o2mQYSgus4uPZh1B_BjtBw/exec';
const KEEP_DAYS = 400;   // records expire after ~13 months; the class packet is the permanent copy
const PASS_SCORE = 21;   // 84% of 25

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function reply(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) },
  });
}

// Minimal CSV parser (handles quoted fields with commas and quotes).
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// "November 10th" (no year) -> "2026-11-10": the year that puts it nearest to
// today, between 4 months ago and 8 months ahead.
function toIsoDate(text, now) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (iso) return text.trim();
  const m = /([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i.exec(text);
  if (!m) return null;
  const mon = MONTHS.findIndex((n) => n.startsWith(m[1].toLowerCase().slice(0, 3)));
  if (mon < 0) return null;
  const day = +m[2];
  let year = m[3] ? +m[3] : now.getUTCFullYear();
  if (!m[3]) {
    const d = (y) => Date.UTC(y, mon, day);
    const lo = now.getTime() - 120 * 86400000, hi = now.getTime() + 240 * 86400000;
    year = [year - 1, year, year + 1].find((y) => d(y) >= lo && d(y) <= hi) || year;
  }
  return year + '-' + String(mon + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

async function forwardAnswerSheet(request, origin) {
  if (!ALLOWED_ORIGINS.includes(origin)) return reply(403, { error: 'Not allowed' }, origin);
  const text = await request.text();
  if (text.length > 6 * 1024 * 1024) return reply(413, { error: 'Answer sheet too large' }, origin);
  try {
    const b = JSON.parse(text);
    if (!b.pdfBase64 || !b.filename) return reply(400, { error: 'Missing answer sheet' }, origin);
  } catch (e) { return reply(400, { error: 'Bad request' }, origin); }
  try {
    // Apps Script answers a POST with a redirect to its result page; fetch follows it.
    const res = await fetch(ANSWER_SHEET_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: text });
    const out = (await res.text()).slice(0, 300);
    if (!res.ok) return reply(502, { error: 'Google script answered ' + res.status, detail: out }, origin);
    return reply(200, { ok: true, detail: out }, origin);
  } catch (e) {
    return reply(502, { error: 'Could not reach the Google script' }, origin);
  }
}

async function sessions() {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'Access-Control-Allow-Origin': '*' };
  if (!SESSIONS_CSV_URL) return new Response(JSON.stringify({ sessions: [] }), { headers });
  if (sessionsCache && Date.now() - sessionsCache.at < 5 * 60000) return new Response(sessionsCache.body, { headers });
  try {
    const res = await fetch(SESSIONS_CSV_URL, { cf: { cacheTtl: 300 } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = parseCsv(await res.text());
    const head = rows.shift().map((h) => h.trim().toLowerCase());
    const col = (name) => head.findIndex((h) => h.startsWith(name));
    const cDate = col('date'), cTrainers = col('trainers'), cCap = col('capacity'), cLeft = col('spots left'), cWhere = col('time');
    const now = new Date();
    const list = rows.map((r) => ({
      date: toIsoDate(r[cDate] || '', now),
      label: (r[cDate] || '').trim(),
      trainers: cTrainers >= 0 ? (r[cTrainers] || '').split(',').map((t) => t.trim()).filter(Boolean) : [],
      capacity: cCap >= 0 ? +r[cCap] || null : null,
      spotsLeft: cLeft >= 0 && r[cLeft] !== '' ? +r[cLeft] : null,
      timeLocation: cWhere >= 0 ? (r[cWhere] || '').trim() : '',
    })).filter((s) => s.date).sort((a, b) => (a.date < b.date ? -1 : 1));
    const body = JSON.stringify({ sessions: list });
    sessionsCache = { at: Date.now(), body };
    return new Response(body, { headers });
  } catch (e) {
    return new Response(JSON.stringify({ sessions: [], error: 'Could not read the class schedule.' }), { status: 502, headers });
  }
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname === '/sessions' && request.method === 'GET') return sessions();
    if (url.pathname === '/answersheet' && request.method === 'POST') return forwardAnswerSheet(request, origin);
    if (url.pathname !== '/grade' || request.method !== 'POST') return reply(404, { error: 'Not found' }, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return reply(403, { error: 'Not allowed' }, origin);

    const text = await request.text();
    if (text.length > 10000) return reply(413, { error: 'Too large' }, origin);
    let b;
    try { b = JSON.parse(text); } catch (e) { return reply(400, { error: 'Bad request' }, origin); }

    const rec = {
      classDate: clean(b.classDate, 10),
      firstName: clean(b.firstName, 60),
      lastName: clean(b.lastName, 60),
      cardName: clean(b.cardName, 120),
      email: clean(b.email, 120).toLowerCase(),
      phone: clean(b.phone, 40),
      address: clean(b.address, 200),
      street: clean(b.street, 120), city: clean(b.city, 60), state: clean(b.state, 20), zip: clean(b.zip, 10),
      examVersion: b.examVersion === 'B' ? 'B' : 'A',
      submittedAt: new Date().toISOString(),
      source: 'exam',
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.classDate)) return reply(400, { error: 'Missing class date' }, origin);
    if (!rec.firstName || !rec.lastName) return reply(400, { error: 'Missing name' }, origin);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email)) return reply(400, { error: 'Missing email' }, origin);
    if (!rec.cardName) rec.cardName = rec.firstName + ' ' + rec.lastName;

    // Grade against the private answer key.
    const answerKey = await env.CPR_KV.get('answerkey:' + rec.examVersion, 'json');
    if (!answerKey) return reply(500, { error: 'The exam answer key is missing. Tell your instructor.' }, origin);
    const answers = Array.isArray(b.answers) ? b.answers : [];
    if (answers.length !== answerKey.length || !answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3)) {
      return reply(400, { error: 'Answer every question before submitting.' }, origin);
    }
    const results = answerKey.map((k, i) => answers[i] === k.correct);
    rec.score = results.filter(Boolean).length;
    rec.total = answerKey.length;
    rec.answers = answers;

    // One record per student per class (keyed by email). A retake replaces the
    // score, but keeps any skills checkoffs and logs every attempt so
    // instructors can see retakes.
    const key = 'stu:' + rec.classDate + ':' + rec.email;
    const prev = await env.CPR_KV.get(key, 'json');
    if (prev) { rec.adult = prev.adult; rec.infant = prev.infant; rec.remediation = prev.remediation; }
    rec.attempts = ((prev && prev.attempts) || []).concat({ version: rec.examVersion, score: rec.score, at: rec.submittedAt }).slice(-10);
    await env.CPR_KV.put(key, JSON.stringify(rec), { expirationTtl: KEEP_DAYS * 86400 });
    return reply(200, { ok: true, score: rec.score, total: rec.total, passed: rec.score >= PASS_SCORE, results, attempt: rec.attempts.length }, origin);
  },
};
