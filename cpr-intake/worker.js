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

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
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
