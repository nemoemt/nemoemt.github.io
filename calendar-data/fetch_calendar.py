#!/usr/bin/env python3
"""
Build calendar-data/events.json from the public Google Calendars listed in
calendar-data/calendars.json.

Run automatically by .github/workflows/update-calendar.yml (every 10
minutes). The homepage reads events.json to draw its own calendar list,
because browsers can't read Google's calendar feeds directly from another site.

Run locally:  pip install icalendar recurring-ical-events
              python3 calendar-data/fetch_calendar.py
"""

import datetime as dt
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "calendars.json")
OUT = os.path.join(HERE, "events.json")


def ics_url(cal_id):
    return ("https://calendar.google.com/calendar/ical/"
            + urllib.parse.quote(cal_id) + "/public/basic.ics")


def plain_text(value):
    """Google stores descriptions as HTML; keep the words and the link URLs."""
    if not value:
        return ""
    s = str(value)
    s = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>.*?</a>', r" \1 ", s, flags=re.S | re.I)
    s = re.sub(r"<br\s*/?>|</p>|</div>|</li>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip()


def to_local(value, tz):
    """Return (iso_string, all_day) for an icalendar date/datetime."""
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=tz)
        return value.astimezone(tz).isoformat(), False
    return value.isoformat(), True  # plain date = all-day


def main():
    cfg = json.load(open(CONFIG, encoding="utf-8"))
    tz = ZoneInfo(cfg.get("timezone", "America/Chicago"))
    today = dt.datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    until = today + dt.timedelta(days=int(cfg.get("days_ahead", 120)))

    events, failures = [], []
    for cal in cfg["calendars"]:
        try:
            with urllib.request.urlopen(ics_url(cal["id"]), timeout=30) as r:
                data = r.read()
            ical = icalendar.Calendar.from_ical(data)
        except Exception as e:  # keep going; report at the end
            failures.append(f'{cal["name"]}: {e}')
            continue
        for ev in recurring_ical_events.of(ical).between(today, until):
            if str(ev.get("STATUS", "")).upper() == "CANCELLED":
                continue
            start, all_day = to_local(ev.decoded("DTSTART"), tz)
            end_raw = ev.decoded("DTEND") if ev.get("DTEND") else None
            end = to_local(end_raw, tz)[0] if end_raw is not None else None
            events.append({
                "calendar": cal["name"],
                "title": str(ev.get("SUMMARY", "")).strip() or "(No title)",
                "start": start,
                "end": end,
                "allDay": all_day,
                "location": str(ev.get("LOCATION", "")).strip(),
                "description": plain_text(ev.get("DESCRIPTION")),
            })

    if failures and not events:
        # Every feed failed: keep the last good file rather than blanking the site.
        print("All calendar feeds failed; leaving events.json unchanged:\n  " + "\n  ".join(failures))
        return 1

    events.sort(key=lambda e: (e["start"], e["calendar"], e["title"]))
    out = {
        "timezone": str(tz),
        "calendars": [{"name": c["name"], "color": c["color"], "id": c["id"]} for c in cfg["calendars"]],
        "events": events,
    }

    # Only rewrite the file when the events actually changed, so the workflow
    # doesn't make a commit every half hour.
    if os.path.exists(OUT):
        try:
            old = json.load(open(OUT, encoding="utf-8"))
            old.pop("updated", None)
            if old == out:
                print(f"No changes ({len(events)} events).")
                return 0
        except Exception:
            pass
    out["updated"] = dt.datetime.now(tz).isoformat(timespec="minutes")
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"Wrote {len(events)} events." + (f" Problems: {failures}" if failures else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
