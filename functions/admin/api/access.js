// GET/POST /admin/api/access — the access manager page (assessment-tool/admin/).
//
// Cloudflare Pages Function. /admin/ is behind its own Cloudflare Access login
// ("NEMO Access Manager", admins only), and this route is under it. It reads
// and edits the email lists of the three Cloudflare Access logins below, using
// the CF_API_TOKEN secret set on the nemo-tool Pages project (a Cloudflare API
// token with Account → Access: Apps and Policies → Edit).
const ACCOUNT = '9bba0bcc793440dba234e40589d2d93b';
const LISTS = {
  evaluators: { label: 'Skills tester', app: '480b4761-a553-4cba-b506-fd30d078bc21', policy: '20b45085-3c69-43fc-b097-e35b1a2148e2' },
  editors:    { label: 'Scenario editor', app: '7e31bd3e-0040-4345-a068-89b5312aad2c', policy: 'ca46981b-2dd4-4b48-a678-a49b5dd9b2f7' },
  admins:     { label: 'Access manager', app: '3011022e-128e-4890-921c-fc6d08b5a961', policy: 'a871f3ad-86b8-48b8-965c-4c8a6bb6fd7a' },
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function cf(env, path, init = {}) {
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT + '/access' + path, {
    ...init,
    headers: { 'Authorization': 'Bearer ' + env.CF_API_TOKEN, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!body.success) {
    const msg = (body.errors || []).map((e) => e.message).join('; ') || ('HTTP ' + res.status);
    throw new Error('Cloudflare said: ' + msg);
  }
  return body.result;
}

const policyPath = (l) => '/apps/' + LISTS[l].app + '/policies/' + LISTS[l].policy;
const emailsOf = (policy) => (policy.include || []).filter((r) => r.email).map((r) => r.email.email.toLowerCase());

async function readAll(env) {
  const out = {};
  for (const l of Object.keys(LISTS)) out[l] = emailsOf(await cf(env, policyPath(l))).sort();
  return out;
}

async function setEmails(env, list, emails) {
  const p = await cf(env, policyPath(list));
  const other = (p.include || []).filter((r) => !r.email);   // keep any non-email rules as they are
  const include = [...new Set(emails)].sort().map((email) => ({ email: { email } })).concat(other);
  await cf(env, policyPath(list), {
    method: 'PUT',
    body: JSON.stringify({ name: p.name, decision: p.decision, include, exclude: p.exclude || [], require: p.require || [], precedence: p.precedence }),
  });
}

export async function onRequest({ env, request }) {
  const you = (request.headers.get('Cf-Access-Authenticated-User-Email') || '').toLowerCase();
  if (!you) return reply(403, { error: 'Not signed in.' });
  if (!env.CF_API_TOKEN) return reply(500, { error: 'setup', message: 'The CF_API_TOKEN secret is not set on the nemo-tool project yet (README §6).' });

  try {
    if (request.method === 'GET') return reply(200, { you, lists: await readAll(env) });
    if (request.method !== 'POST') return reply(405, { error: 'Use GET or POST.' });

    let body;
    try { body = await request.json(); } catch (e) { return reply(400, { error: 'Could not read the request.' }); }
    const list = body.list, action = body.action;
    const email = String(body.email || '').trim().toLowerCase();
    if (!LISTS[list]) return reply(400, { error: 'Unknown list.' });
    if (action !== 'add' && action !== 'remove') return reply(400, { error: 'Unknown action.' });
    if (!EMAIL.test(email)) return reply(400, { error: 'That does not look like an email address.' });

    const lists = await readAll(env);
    const notes = [];
    if (action === 'add') {
      if (lists[list].includes(email)) return reply(200, { you, lists, notes: [email + ' already has access.'] });
      await setEmails(env, list, lists[list].concat(email));
      // Editors also need the skills tester login: the editor loads its checklists from there.
      if (list === 'editors' && !lists.evaluators.includes(email)) {
        await setEmails(env, 'evaluators', lists.evaluators.concat(email));
        notes.push('Also added to the skills tester, which the editor needs.');
      }
    } else {
      if (!lists[list].includes(email)) return reply(200, { you, lists, notes: [email + ' was not on this list.'] });
      if (list === 'admins' && email === you) return reply(400, { error: "You can't remove yourself from the access manager." });
      if (list !== 'evaluators' && lists[list].length === 1) return reply(400, { error: 'This list needs at least one person.' });
      if (list === 'evaluators' && lists.editors.includes(email)) {
        return reply(400, { error: email + ' is a scenario editor, and the editor needs skills tester access. Remove them from Scenario editor first.' });
      }
      await setEmails(env, list, lists[list].filter((e) => e !== email));
      // Sign-ins last a month, so end everyone's current sign-in to this tool;
      // the removed person is locked out now, everyone else enters one new code.
      await cf(env, '/apps/' + LISTS[list].app + '/revoke_tokens', { method: 'POST' });
      notes.push('Everyone signed in to the ' + LISTS[list].label.toLowerCase() + ' will be asked for a new code once.');
    }
    return reply(200, { you, lists: await readAll(env), notes });
  } catch (e) {
    return reply(502, { error: e.message });
  }
}
