// Cloudflare Worker "nemo-calendar" (dash.cloudflare.com -> Workers & Pages).
// Serves https://nemo-calendar.nemo-9bb.workers.dev/events.json: the same
// event list as calendar-data/events.json, but read live from Google Calendar,
// so new events show on the homepage within a few minutes. The homepage falls
// back to calendar-data/events.json (refreshed by the GitHub Action) if this
// Worker is ever down.
//
// Which calendars to read still comes from calendar-data/calendars.json on
// the live site, so there's nothing to change here when calendars change.
//
// To redeploy after editing this file (needs Node):
//   npm i ical.js@2 esbuild
//   npx esbuild calendar-data/worker/calendar-worker.js --bundle --format=esm --outfile=worker.js
// then paste worker.js into the Worker's code editor in Cloudflare and Deploy.

import ICAL from "ical.js";

const CONFIG_URL = "https://nemonu.org/calendar-data/calendars.json";
const CACHE_MS = 3 * 60 * 1000; // reuse a result for up to 3 minutes

let cached = null; // { at, body }

function icsUrl(id) {
  return "https://calendar.google.com/calendar/ical/" + encodeURIComponent(id) + "/public/basic.ics";
}

// Google stores descriptions as HTML; keep the words and the link URLs.
function plainText(value) {
  if (!value) return "";
  let s = String(value);
  s = s.replace(/<a [^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, " $1 ");
  s = s.replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
       .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  s = s.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
  return s.trim();
}

// "2026-10-28T16:30:00-05:00" for a moment in time, in the calendar's time zone.
function localIso(date, tz) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date)) parts[p.type] = p.value;
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const off = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = off < 0 ? "-" : "+";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${hh}:${mm}`;
}

function toLocal(time, tz) {
  if (time.isDate) return [time.toString(), true]; // all-day: "2026-11-04"
  return [localIso(time.toJSDate(), tz), false];
}

function eventsFrom(text, calName, tz, from, until) {
  const comp = new ICAL.Component(ICAL.parse(text));
  for (const vtz of comp.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(vtz);

  // Group each recurring event with its edited occurrences (same UID).
  const byUid = new Map();
  for (const ve of comp.getAllSubcomponents("vevent")) {
    const uid = ve.getFirstPropertyValue("uid") || Math.random().toString();
    if (!byUid.has(uid)) byUid.set(uid, { master: null, exceptions: [] });
    if (ve.hasProperty("recurrence-id")) byUid.get(uid).exceptions.push(ve);
    else byUid.get(uid).master = ve;
  }

  const out = [];
  function add(ev, start, end) {
    if (String(ev.component.getFirstPropertyValue("status") || "").toUpperCase() === "CANCELLED") return;
    const [s, allDay] = toLocal(start, tz);
    out.push({
      calendar: calName,
      title: (ev.summary || "").trim() || "(No title)",
      start: s,
      end: end ? toLocal(end, tz)[0] : null,
      allDay,
      location: (ev.location || "").trim(),
      description: plainText(ev.description),
    });
  }
  const inRange = (start, end) => {
    const s = start.toJSDate(), e = (end || start).toJSDate();
    return e > from && s < until || (+s === +e && s >= from && s < until);
  };

  for (const { master, exceptions } of byUid.values()) {
    if (!master) { // edited occurrences whose series isn't in the feed
      for (const ex of exceptions) { const ev = new ICAL.Event(ex); if (inRange(ev.startDate, ev.endDate)) add(ev, ev.startDate, ev.endDate); }
      continue;
    }
    const ev = new ICAL.Event(master);
    for (const ex of exceptions) ev.relateException(new ICAL.Event(ex));
    if (!ev.isRecurring()) { if (inRange(ev.startDate, ev.endDate)) add(ev, ev.startDate, ev.endDate); continue; }
    const it = ev.iterator();
    let next, guard = 0;
    while ((next = it.next()) && guard++ < 5000) {
      if (next.toJSDate() >= until) break;
      const d = ev.getOccurrenceDetails(next);
      if (inRange(d.startDate, d.endDate)) add(d.item, d.startDate, d.endDate);
    }
  }
  return out;
}

async function build() {
  const cfg = await (await fetch(CONFIG_URL, { cf: { cacheTtl: 300 } })).json();
  const tz = cfg.timezone || "America/Chicago";
  // Midnight today in the calendar's time zone, as in fetch_calendar.py.
  const today = localIso(new Date(), tz).slice(0, 10);
  const nowLocal = localIso(new Date(), tz);
  const from = new Date(today + "T00:00:00" + nowLocal.slice(19));
  const until = new Date(from.getTime() + (cfg.days_ahead || 120) * 86400000);

  const results = await Promise.all(cfg.calendars.map(async (cal) => {
    const r = await fetch(icsUrl(cal.id));
    if (!r.ok) throw new Error(cal.name + ": HTTP " + r.status);
    return eventsFrom(await r.text(), cal.name, tz, from, until);
  }));
  const events = results.flat();
  events.sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1
    : a.calendar.localeCompare(b.calendar) || a.title.localeCompare(b.title));
  return JSON.stringify({
    timezone: tz,
    calendars: cfg.calendars.map((c) => ({ name: c.name, color: c.color, id: c.id })),
    events,
    checked: localIso(new Date(), tz),
    source: "live",
  });
}

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=60",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/events.json") return new Response("Not found", { status: 404 });
    if (cached && Date.now() - cached.at < CACHE_MS) return new Response(cached.body, { headers: HEADERS });
    try {
      const body = await build();
      cached = { at: Date.now(), body };
      return new Response(body, { headers: HEADERS });
    } catch (e) {
      // The homepage falls back to calendar-data/events.json on any error.
      return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: HEADERS });
    }
  },
};
