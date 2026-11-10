// Cloudflare Worker "nemo-cpr-intake" (dash.cloudflare.com -> Workers & Pages).
//
// The CPR NEMO Exam (nemonu.org/cpr/) sends each student's course paperwork
// info here when they submit the test: name for their card, email, phone,
// mailing address, class date and score. It is stored in the "nemo-cpr" KV
// namespace (binding CPR_KV), where the CPR instructor page
// (nemo-tool.pages.dev/cpr-class/, login required) reads it to fill out the
// AHA roster, skills sheets and eCard upload template.
//
// This Worker can only ADD records. Nothing here can read them back; that
// happens only through the login-protected instructor page.
//
// To redeploy after editing: dash.cloudflare.com -> Workers & Pages ->
// nemo-cpr-intake -> Edit code, paste this file, Deploy.

const ALLOWED_ORIGINS = ['https://nemonu.org', 'https://www.nemonu.org', 'https://nemoemt.github.io'];
const KEEP_DAYS = 400;   // records expire after ~13 months; the class packet is the permanent copy

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
    if (url.pathname !== '/submit' || request.method !== 'POST') return reply(404, { error: 'Not found' }, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return reply(403, { error: 'Not allowed' }, origin);

    const text = await request.text();
    if (text.length > 8000) return reply(413, { error: 'Too large' }, origin);
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
      examVersion: clean(b.examVersion, 2),
      score: Number.isFinite(+b.score) ? +b.score : null,
      total: Number.isFinite(+b.total) ? +b.total : null,
      submittedAt: new Date().toISOString(),
      source: 'exam',
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.classDate)) return reply(400, { error: 'Missing class date' }, origin);
    if (!rec.firstName || !rec.lastName) return reply(400, { error: 'Missing name' }, origin);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email)) return reply(400, { error: 'Missing email' }, origin);
    if (!rec.cardName) rec.cardName = rec.firstName + ' ' + rec.lastName;

    // One record per student per class: re-submitting replaces it (keyed by email).
    const key = 'stu:' + rec.classDate + ':' + rec.email;
    const prev = await env.CPR_KV.get(key, 'json');
    if (prev) { rec.adult = prev.adult; rec.infant = prev.infant; rec.remediation = prev.remediation; }   // keep checkoffs already done
    await env.CPR_KV.put(key, JSON.stringify(rec), { expirationTtl: KEEP_DAYS * 86400 });
    return reply(200, { ok: true }, origin);
  },
};
