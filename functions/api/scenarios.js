// GET /api/scenarios — the scenario data the skills tester loads.
//
// Cloudflare Pages Function (runs on nemo-tool.pages.dev, behind the same
// Cloudflare Access login as the tool). Returns the scenarios last published
// from the editor (stored in the SCENARIOS_KV namespace). If nothing has been
// published yet, or the KV binding is missing, it serves the scenarios.js file
// from this repository instead.
export async function onRequestGet({ env, request }) {
  let json = null;
  if (env.SCENARIOS_KV) {
    try { json = await env.SCENARIOS_KV.get('current'); } catch (e) { json = null; }
  }
  if (json) {
    return new Response('const SCENARIOS = ' + json + ';\n', {
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
  const fallback = await env.ASSETS.fetch(new URL('/scenarios.js', request.url));
  return new Response(fallback.body, {
    status: fallback.status,
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
