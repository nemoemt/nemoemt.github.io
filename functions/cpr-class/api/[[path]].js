// /cpr-class/api/* — data for the CPR instructor page (assessment-tool/cpr-class/).
//
// Cloudflare Pages Function. /cpr-class/ is behind its own Cloudflare Access
// login ("NEMO CPR Instructors", managed in the Access Manager), and these
// routes are under it. Records live in the "nemo-cpr" KV namespace (binding
// CPR_KV):
//   stu:<YYYY-MM-DD>:<email>   one student in one class (written by the exam
//                              through the nemo-cpr-intake Worker, or added here)
//   cls:<YYYY-MM-DD>           course info for the roster (times, ratio, assistants)
//   instructors                instructor list: name, initials, ID, card exp, login
//                              email (the entry with your email is your profile)
//   template:<adult|infant|roster>   the blank AHA PDF forms
//
// Routes:
//   GET    classes                 -> [{date, students}]
//   GET    class?date=             -> {info, students}
//   PUT    student                 -> add/edit a student  {date, email, firstName, ...}
//   DELETE student?key=            -> remove a student
//   PUT    skills                  -> save a checkoff     {key, kind, checks, result, ...}
//   PUT    classinfo               -> save course info    {date, info}
//   GET/PUT instructors            -> the instructor list (PUT replaces it)
//   PUT    instructors/merge       -> add/update names typed for a class
//   GET/PUT me                     -> the signed-in instructor's own entry
//   GET    template/<name>         -> blank PDF form
const KEEP_DAYS = 400;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max);
const put = (env, key, value) => env.CPR_KV.put(key, JSON.stringify(value), { expirationTtl: KEEP_DAYS * 86400 });

async function listKeys(env, prefix) {
  const names = [];
  let cursor;
  do {
    const page = await env.CPR_KV.list({ prefix, cursor });
    page.keys.forEach((k) => names.push(k.name));
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return names;
}

function cleanSkills(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    checks: Array.isArray(s.checks) ? s.checks.slice(0, 20).map(Boolean) : [],
    result: s.result === 'pass' || s.result === 'nr' ? s.result : '',
    initials: clean(s.initials, 8),
    instructorNumber: clean(s.instructorNumber, 30),
    date: DATE.test(s.date) ? s.date : '',
    by: clean(s.by, 120),
    at: new Date().toISOString(),
  };
}

export async function onRequest({ env, request, params }) {
  const who = (request.headers.get('Cf-Access-Authenticated-User-Email') || '').toLowerCase();
  if (!who) return json(403, { error: 'Not signed in.' });
  if (!env.CPR_KV) return json(500, { error: 'CPR storage is not set up (CPR_KV binding missing).' });

  const path = (params.path || []).join('/');
  const url = new URL(request.url);
  const m = request.method;
  const body = m === 'PUT' ? await request.json().catch(() => null) : null;
  if (m === 'PUT' && !body) return json(400, { error: 'Could not read the request.' });

  try {
    if (m === 'GET' && path === 'classes') {
      const counts = {};
      (await listKeys(env, 'stu:')).forEach((k) => { const d = k.split(':')[1]; counts[d] = (counts[d] || 0) + 1; });
      (await listKeys(env, 'cls:')).forEach((k) => { const d = k.split(':')[1]; counts[d] = counts[d] || 0; });
      return json(200, Object.keys(counts).sort().reverse().map((date) => ({ date, students: counts[date] })));
    }

    if (m === 'GET' && path === 'class') {
      const date = url.searchParams.get('date') || '';
      if (!DATE.test(date)) return json(400, { error: 'Pick a class date.' });
      const keys = await listKeys(env, 'stu:' + date + ':');
      const students = (await Promise.all(keys.map(async (key) => ({ key, ...(await env.CPR_KV.get(key, 'json')) }))))
        .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
      const info = (await env.CPR_KV.get('cls:' + date, 'json')) || null;
      return json(200, { date, info, students });
    }

    if (m === 'PUT' && path === 'student') {
      const date = body.date, email = clean(body.email, 120).toLowerCase();
      if (!DATE.test(date)) return json(400, { error: 'Missing class date.' });
      if (!EMAIL.test(email)) return json(400, { error: 'A valid email is needed (it goes on the roster and the eCard).' });
      const firstName = clean(body.firstName, 60), lastName = clean(body.lastName, 60);
      if (!firstName || !lastName) return json(400, { error: 'First and last name are needed.' });
      const key = 'stu:' + date + ':' + email;
      const old = body.key ? await env.CPR_KV.get(body.key, 'json') : await env.CPR_KV.get(key, 'json');
      const rec = {
        ...(old || { source: 'instructor', submittedAt: new Date().toISOString() }),
        classDate: date, firstName, lastName, email,
        cardName: clean(body.cardName, 120) || firstName + ' ' + lastName,
        phone: clean(body.phone, 40), address: clean(body.address, 200),
        remediation: clean(body.remediation, 200),
      };
      if (body.score !== undefined) rec.score = body.score === '' || body.score === null ? null : Math.max(0, Math.min(25, +body.score));
      await put(env, key, rec);
      if (body.key && body.key !== key) await env.CPR_KV.delete(body.key);
      return json(200, { key, ...rec });
    }

    if (m === 'DELETE' && path === 'student') {
      const key = url.searchParams.get('key') || '';
      if (!key.startsWith('stu:')) return json(400, { error: 'Unknown student.' });
      await env.CPR_KV.delete(key);
      return json(200, { ok: true });
    }

    if (m === 'PUT' && path === 'skills') {
      const key = body.key || '';
      if (!key.startsWith('stu:') || (body.kind !== 'adult' && body.kind !== 'infant')) return json(400, { error: 'Unknown checkoff.' });
      const rec = await env.CPR_KV.get(key, 'json');
      if (!rec) return json(404, { error: 'That student is no longer in this class.' });
      const s = cleanSkills(body.skills);
      if (s) s.by = who;
      rec[body.kind] = s;
      await put(env, key, rec);
      return json(200, { key, ...rec });
    }

    if (m === 'PUT' && path === 'classinfo') {
      if (!DATE.test(body.date)) return json(400, { error: 'Missing class date.' });
      const i = body.info || {};
      const info = {
        startTime: clean(i.startTime, 20), endTime: clean(i.endTime, 20), hours: clean(i.hours, 10),
        ratio: clean(i.ratio, 20), issueDate: DATE.test(i.issueDate) ? i.issueDate : '',
        assistants: (Array.isArray(i.assistants) ? i.assistants : []).slice(0, 8)
          .map((a) => ({ name: clean(a.name, 80), id: clean(a.id, 40), exp: clean(a.exp, 20) }))
          .filter((a, i, all) => a.name && all.findIndex((b) => b.name.toLowerCase() === a.name.toLowerCase()) === i),
      };
      await put(env, 'cls:' + body.date, info);
      return json(200, { info });
    }

    // One shared instructor list: [{ name, initials, id, exp, email }]. An entry
    // with a login email is that person's profile ("My profile").
    const loadList = async () => (await env.CPR_KV.get('instructors', 'json')) || [];
    const cleanEntry = (a) => ({
      name: clean(a.name, 80), initials: clean(a.initials, 8).toUpperCase(), id: clean(a.id, 40),
      exp: clean(a.exp, 20), email: EMAIL.test(clean(a.email, 120)) ? clean(a.email, 120).toLowerCase() : '',
    });
    const uniqueNames = (list) => list.filter((a, i, all) => a.name && all.findIndex((b) => b.name.toLowerCase() === a.name.toLowerCase()) === i);

    if (path === 'me') {
      const list = await loadList();
      if (m === 'GET') {
        const mine = list.find((a) => a.email === who);
        const old = mine ? null : await env.CPR_KV.get('profile:' + who, 'json');   // profiles saved before the shared list
        const profile = mine ? { name: mine.name, initials: mine.initials, number: mine.id, exp: mine.exp } : old;
        return json(200, { email: who, profile });
      }
      if (m === 'PUT') {
        const e = cleanEntry({ ...body, id: body.number, email: who });
        if (!e.name || !e.initials || !e.id) return json(400, { error: 'Name, initials and instructor number are all needed.' });
        let i = list.findIndex((a) => a.email === who);
        if (i < 0) i = list.findIndex((a) => !a.email && a.name.toLowerCase() === e.name.toLowerCase());   // claim a pre-made entry
        if (i >= 0) list[i] = e; else list.push(e);
        await env.CPR_KV.put('instructors', JSON.stringify(uniqueNames(list)));
        await env.CPR_KV.delete('profile:' + who);
        return json(200, { email: who, profile: { name: e.name, initials: e.initials, number: e.id, exp: e.exp } });
      }
    }

    if (path === 'instructors') {
      if (m === 'GET') return json(200, await loadList());
      if (m === 'PUT') {   // replace the whole list (Instructors panel)
        const list = uniqueNames((Array.isArray(body) ? body : []).slice(0, 100).map(cleanEntry));
        const emails = list.map((a) => a.email).filter(Boolean);
        if (new Set(emails).size !== emails.length) return json(400, { error: 'Two instructors have the same login email.' });
        await env.CPR_KV.put('instructors', JSON.stringify(list));
        return json(200, list);
      }
    }

    if (m === 'PUT' && path === 'instructors/merge') {   // add/update people typed in a class's assistant list
      const list = await loadList();
      (Array.isArray(body) ? body : []).slice(0, 20).map(cleanEntry).filter((a) => a.name).forEach((a) => {
        const i = list.findIndex((b) => b.name.toLowerCase() === a.name.toLowerCase());
        if (i < 0) list.push(a);
        else list[i] = { ...list[i], id: a.id || list[i].id, exp: a.exp || list[i].exp };
      });
      await env.CPR_KV.put('instructors', JSON.stringify(list));
      return json(200, list);
    }

    if (m === 'GET' && path.startsWith('template/')) {
      const name = path.slice('template/'.length);
      if (!['adult', 'infant', 'roster'].includes(name)) return json(404, { error: 'Unknown form.' });
      const pdf = await env.CPR_KV.get('template:' + name, 'arrayBuffer');
      if (!pdf) return json(404, { error: 'The blank ' + name + ' form is missing from storage (README §12).' });
      return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, max-age=3600' } });
    }

    return json(404, { error: 'Not found.' });
  } catch (e) {
    return json(500, { error: String(e && e.message || e) });
  }
}
