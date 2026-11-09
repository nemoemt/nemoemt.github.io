// POST /editor/api/publish — the scenario editor's Publish button.
//
// Cloudflare Pages Function. /editor/ is behind its own Cloudflare Access
// login (captain only), and this route is under it, so only people allowed
// into the editor can reach it. Saves the scenarios to the SCENARIOS_KV
// namespace; the skills tester reads them from /api/scenarios right away.
// The previous version is kept as a backup (the last 30 are kept).
const MAX_BYTES = 2 * 1024 * 1024;
const KEEP_BACKUPS = 30;

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ env, request }) {
  // Set by Cloudflare Access once someone has logged in to the editor.
  const who = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (!who) return reply(403, { error: 'Not signed in to the editor.' });
  if (!env.SCENARIOS_KV) return reply(500, { error: 'Publishing is not set up yet (SCENARIOS_KV binding missing).' });

  const text = await request.text();
  if (text.length > MAX_BYTES) return reply(413, { error: 'Scenarios are too large to publish.' });

  let scenarios;
  try { scenarios = JSON.parse(text); } catch (e) { return reply(400, { error: 'Could not read the scenarios.' }); }
  if (!scenarios || typeof scenarios !== 'object' || Array.isArray(scenarios) || !Object.keys(scenarios).length) {
    return reply(400, { error: 'No scenarios to publish.' });
  }
  const untitled = Object.entries(scenarios)
    .filter(([, s]) => !s || typeof s !== 'object' || !String(s.title || '').trim())
    .map(([k]) => k);
  if (untitled.length) return reply(400, { error: 'Every scenario needs a title. Missing: ' + untitled.join(', ') });

  const now = new Date().toISOString();
  const previous = await env.SCENARIOS_KV.get('current');
  if (previous) await env.SCENARIOS_KV.put('backup:' + now, previous, { metadata: { by: who } });

  await env.SCENARIOS_KV.put('current', JSON.stringify(scenarios));
  await env.SCENARIOS_KV.put('meta', JSON.stringify({ publishedAt: now, by: who }));

  // Trim old backups (keys sort by date, oldest first).
  const list = await env.SCENARIOS_KV.list({ prefix: 'backup:' });
  const extra = list.keys.length - KEEP_BACKUPS;
  for (let i = 0; i < extra; i++) await env.SCENARIOS_KV.delete(list.keys[i].name);

  return reply(200, { ok: true, publishedAt: now, by: who });
}
