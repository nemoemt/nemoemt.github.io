# NEMO Website — Maintenance Guide

This is the NEMO website (`nemoemt.github.io`). It runs on **GitHub Pages**:
the files in this repository *are* the live website. When you change a file
here and save (commit) it, the website updates within a minute or two.

**You do not need to know how to code to keep this site running.** This guide
lists everything that needs updating and exactly how to do each one. Most
edits are done right here on GitHub by clicking a file, clicking the pencil
(✏️) icon, changing some text, and clicking the green **Commit changes**
button.

> **Golden rule:** make one change at a time and commit it. If something looks
> wrong afterward, the previous version is always saved in the file's
> **History**, so nothing is ever truly broken.

---

## Turnover checklist (new exec board, every spring)

Work through this list when a new board takes over. Each item links to the
section with the details.

1. **Get access.** The incoming web lead needs to be added as a member of the
   `nemoemt` GitHub organization with write access to this repository.
2. **Leadership board.** Update `people/board.csv` with the new board and
   upload their headshots to `assets/` (§2). Delete departing execs' photos
   once `orphaned_photos.txt` lists them.
3. **Banner dates.** Set next year's dates in `BANNER_CONFIG` (§1).
4. **Application form.** If there's a new Google Form, swap the link (§1).
5. **Assessment tool access.** Update who can sign in to the psychomotor
   assessment tool, and transfer the Cloudflare account to the new board (§6).
6. **News cards.** Swap in recent events on the homepage (§7).
7. **Info session.** After the fall info session, post the recording (§8).
8. **Accounts.** Make sure the new board can log in to every account in the
   table below, and that nothing is tied only to a graduating member's
   personal email.

### Accounts the site depends on

| Service | What it's for | How to get in |
|---|---|---|
| **GitHub** (`nemoemt` organization) | Hosts this repository and the live website (GitHub Pages) | Ask a current org owner to add you |
| **Squarespace Domains** | Owns the address `nemonu.org` (paid through 2028) | "Sign in with Google" using the NEMO Google account (§3) |
| **Cloudflare** | Hosts the psychomotor assessment tool behind a login (§6) | Account set up by Dylan Stone in Oct 2026; ask for an invite before he graduates |
| **Google Forms** | The application, mentor, interest-list, and contact forms linked from the site | The NEMO Google account |

---

## Quick reference: what to update and when

| When | What | Where |
|------|------|-------|
| **Once a year** (spring exec turnover) | The status banner dates and the mentor application deadline | `index.html` — see §1 (every other date on the site is listed in §11) |
| **Once a year** (spring exec turnover) | The leadership board | `people/board.csv` — see §2 |
| **A few times a year** | Open / close the application form | automatic via the banner dates — see §1 |
| **Every couple of years** | Renew the web domain | Squarespace (external) — see §3 (current expiration: **2028**) |
| **As needed** | Add/replace a person's photo | `assets/` folder — see §2 (no photo yet = auto placeholder) |
| **After each info session / mentor meeting** | Post the recording link | `index.html` — see §8 |
| **After events** | Add a news card with a photo | `index.html` — see §7 |
| **At turnover / as needed** | Who can use the assessment tool | Cloudflare dashboard — see §6 |

---

## 1. The status banner (the gold scrolling bar at the top)

The gold bar at the top of the homepage, the "Apply" button, and the
"next cohort" text all change **automatically** depending on the time of year.
You never rewrite the banner sentence by hand — you just keep four dates
current, and the site figures out what to say.

The banner moves through these phases on its own as the calendar passes each
date:

1. **Before applications open** → "Applications for the 2027 cohort open October 1"
2. **While applications are open** → "Applications are open — apply by October 16" (and the Apply button turns on)
3. **After they close, before class** → "Applications are closed — the cohort begins January 6"
4. **While the course is running** → "The 2027 cohort is currently in training"
5. **Right after the course ends** → "Congratulations to the 2027 cohort!"

### How to update it (once a year)

1. Open **`index.html`** and click the pencil (✏️) to edit.
2. Use your browser's Find (Ctrl-F or Cmd-F) and search for **`BANNER_CONFIG`**.
3. You'll see a short block that looks like this:

   ```
   const BANNER_CONFIG = {
     cohortYear: 2027,                // the cohort being recruited / taught now

     applicationsOpen:  "2026-10-01", // apps OPEN on this date
     applicationsClose: "2026-10-16", // deadline: last day to apply (open through 11:59 PM)
     classStarts:       "2027-01-11", // first day of the EMT course
     classEnds:         "2027-05-14", // last day of the course / graduation

     mentorApplicationsClose: "2026-11-01" // mentor deadline: last day to apply to mentor this cohort
   };
   ```

4. Change the six values:
   - **`cohortYear`** — the year of the cohort you're recruiting/teaching now.
   - The **four course dates** — keep the quotes and the `YYYY-MM-DD` format.
     `2026-10-01` means **October 1, 2026** (Year-Month-Day, with leading zeros).
   - **`mentorApplicationsClose`** — the last day to apply to be a mentor for
     that cohort (same `YYYY-MM-DD` format). The mentor section, the mentor
     meeting card, and the FAQ all show "Mentor applications for the 2027
     cohort close November 1." from this date, and switch to "closed" the
     day after.
5. Commit. That's it — the banner will show the right message all year.

> **The Apply button opens and closes itself.** When today's date is between
> `applicationsOpen` and `applicationsClose`, the button says "Apply now" and
> works. Outside that window it says "Applications closed" and is greyed out.
> You don't toggle it manually.

### If the application *form link* changes

The dates control *when* the button is active; the link it points to is set
separately (once). In `index.html`, search for **`APPLICATION FORM`** — right
below that comment is the `Application` link with the Google Form URL. Replace
just the web address inside the quotes, keep everything else, and commit.

---

## 2. The leadership board (exec photos on the homepage)

Everyone on the leadership row — and each person's individual profile page —
comes from **one file**: `people/board.csv`. You never edit the homepage or
the individual profile pages by hand; you edit the CSV, and the site rebuilds
the pages for you automatically.

> There is a separate, detailed walkthrough in **`LEADERSHIP_README.md`** in
> this repo. The short version is below.

### To change the board (once a year, at turnover)

1. Open **`people/board.csv`** and click the pencil (✏️).
2. Each person is one row: `order, name, role, email, school/year, major,
   fun-fact label, fun-fact, bio, slug`. You only need `name` and `role`;
   the rest are optional and can be left blank.
   - **Rename someone / change a role:** edit their `name` or `role`.
   - **Add someone:** add a new row.
   - **Remove someone:** delete their row (their page is removed automatically).
   - **Reorder:** change the numbers in the `order` column.
3. Commit. Within a minute the homepage and that person's profile page update.

### Photos

The site finds each person's photo by their name. Upload the photo to the
**`assets/`** folder named **`firstname-lastname.jpg`**, all lowercase, with a
hyphen — for example **`adam-dipasquale.jpg`**.

**You don't have to have a photo ready.** If a person's photo isn't uploaded
yet, the site automatically generates a placeholder graphic for them
(their initials, in NEMO's colors, labeled "PLACEHOLDER") so the page never
shows a broken image. The moment you upload their real photo with the
matching filename, it replaces the placeholder automatically on the next
build — no other change needed.

### Old photos left behind (`orphaned_photos.txt`)

Every build also checks `assets/` for photos that don't match anyone
currently in `board.csv` — usually graduated execs whose row was removed.
It writes their filenames to **`orphaned_photos.txt`** in the main repo
folder. **Nothing is ever deleted automatically.** If you open that file and
confirm someone really is gone for good, delete their photo from `assets/`
yourself; the report clears itself the next time the site builds. If the
file is empty or missing, there's nothing to clean up.

### A note on bios with long text

A bio can be long. If you write a bio with commas in it, the spreadsheet/CSV
needs that whole bio wrapped in "quotes" (a spreadsheet program does this for
you automatically). If you ever see a yellow warning on the CSV page in GitHub
about "columns," it usually means a bio has a stray line break — put the whole
paragraph on one line, or use `||` where you want a paragraph break, and the
warning goes away. (This is cosmetic and usually doesn't break the site, but
it's tidier to fix.)

---

## 3. Renewing the web domain

The site is reached at its web address (domain), **nemonu.org**. **The
current registration is paid through 2028.** Before it expires, someone
needs to renew it.

- **Registrar:** Squarespace Domains
- **Manage / renew here:** https://account.squarespace.com/domains/managed/nemonu.org
- **Login:** through Google (use the NEMO Google account — "Sign in with
  Google" on the Squarespace login page, not a separate Squarespace
  password)
- **Expiration date:** **2028** (confirm exact date at renewal time by
  checking the link above)

> Set a calendar reminder a month before expiration so a future exec doesn't
> get caught off guard.

If the domain ever does lapse, the site itself isn't lost — all the files are
still safe here in GitHub. Only the custom web address stops pointing at it
until the domain is renewed. Squarespace here is **only** the domain
registrar — the actual website is not built on Squarespace and does not live
there; it's this GitHub repo, served by GitHub Pages.

---

## 4. How to make any edit (the basics)

For anyone who hasn't used GitHub before:

1. Click the file you want to change (e.g. `index.html` or `people/board.csv`).
2. Click the **pencil (✏️) icon** near the top right of the file.
3. Make your change in the editor.
4. Scroll down, optionally type a short note about what you changed, and click
   the green **Commit changes** button.
5. Wait about a minute, then refresh the live site to see it. (If it looks
   unchanged, do a "hard refresh": **Ctrl-Shift-R** or **Cmd-Shift-R** — your
   browser may be showing a saved copy.)

**To undo a mistake:** open the file, click **History** (top right), open an
earlier version, and you can restore it. Nothing is ever permanently lost.

---

## 5. If something looks broken

- **The banner shows the wrong thing:** check the dates in `BANNER_CONFIG`
  (§1). The message is decided entirely by today's date vs. those dates.
- **A new exec's photo is blank:** it shouldn't be — a missing photo now
  shows an auto-generated placeholder with their initials, not a blank
  frame. If you're seeing a broken-image icon instead, double check the
  `name` column in `board.csv` actually has the person's real name in it
  (not a leftover role title like "Treasurer") — that's what the
  placeholder is built from.
- **A graduated exec's old photo is cluttering `assets/`:** check
  `orphaned_photos.txt` at the next build — it lists any photo that no
  longer matches anyone in `board.csv`. Delete it yourself once confirmed;
  nothing is removed automatically.
- **The board didn't update after editing the CSV:** go to the **Actions** tab
  at the top of the repo. There should be a recent "Build leadership pages" run
  with a green check. If it has a red ✗, click it — the log says what's wrong
  (usually a formatting problem in the CSV). Fix the CSV and commit again.
- **Anything else:** the file's **History** has every previous version. Restore
  the last good one and the site reverts.

---

## 6. The psychomotor assessment tool (Cloudflare, login required)

The evaluator tool used during skills exams lives in the folder
**`assessment-tool/`**. Don't rename this folder without also changing the
Cloudflare "build output directory" setting below to match, or the tool goes
offline.

- **Address:** https://nemo-tool.pages.dev (short link: **nemonu.org/assessment**,
  which forwards there; it's the `assessment/` folder in this repo)
- **It is not on nemonu.org.** `_config.yml` keeps GitHub Pages from
  publishing that folder, so the tool is only reachable through Cloudflare.
- **Login:** Cloudflare Access. Each approved person types their own email
  and receives a one-time code. There is no shared password.
- **Editing the tool:** edit `assessment-tool/index.html` here like any other
  file. Every commit to `main` redeploys it to Cloudflare automatically
  within a minute or two.

**What's in the folder:**

| File | What it is |
|---|---|
| `index.html` | The tool itself (layout, scoring, PDF export) |
| `scenarios.js` | All medical and trauma scenarios. **Edit these with the scenario editor, not by hand.** |
| `checklists.js` | The medical and trauma skill-sheet checklists the tool grades on |
| `editor/index.html` | The scenario editor |

### Editing scenarios (no code needed)

1. Go to **https://nemo-tool.pages.dev/editor/** and sign in with
   **captain.nemo@u.northwestern.edu**. That's the only address allowed into
   the editor.
2. Pick a scenario on the left (or **+ Medical** / **+ Trauma** to add one) and
   edit the title, brief cards, vitals, hidden findings, and the proctor
   response next to each checklist item. Your work is kept in that browser
   until you publish, so a refresh won't lose it.
3. Click **Save & download scenarios.js**, then follow the on-screen steps:
   drag the downloaded file onto the
   [assessment-tool upload page](https://github.com/nemoemt/nemoemt.github.io/upload/main/assessment-tool)
   and click **Commit changes**. The tool updates for everyone within a
   minute or two.

The editor's **"Not on this checklist"** section lists proctor responses whose
item no longer exists on that scenario's checklist (usually because an item
was renamed). The tool never shows those; move the text to the right item or
remove it. If you ever rename a checklist item in `checklists.js`, its
responses end up there too.

**To change who can sign in:** log in at dash.cloudflare.com → **Zero
Trust** → **Access** → **Applications** → **NEMO Assessment Tool** →
**Policies** → edit **Approved evaluators**, then add or remove email
addresses and save. The editor has its own, stricter login: the application
**NEMO Scenario Editor** (path `/editor`), policy **Captain only**.

**Cloudflare settings to know about** (dash.cloudflare.com → **Workers &
Pages** → **nemo-tool** → **Settings**): the project is connected to this
GitHub repository, branch `main`, with **no build command** and **build
output directory** `assessment-tool`.

---

## 7. News cards (the "NEMO around Evanston" slider)

In `index.html`, search for **`Card: duplicate this block`**. Each
`<article class="news-card">…</article>` block is one slide. To add one,
copy a block, paste it at the top of the list (newest first), and change the
image, tag, date, title, and one-sentence description. Upload the photo to
`assets/` first. A landscape photo works best, since cards are shown in a
4:3 frame; keep it around 1200 × 900 so the page loads quickly. Delete old
blocks to retire them.

---

## 8. Info session and mentor meeting videos

In `index.html`, search for **`SESSION_VIDEOS`**. There's one entry for the
mentor meeting and one for the info session. Paste each recording's link (an
Unlisted YouTube link works best) into its `videoUrl` and update `date`. Set
`show` to `false` to hide a card.
`poster` is the still image shown before someone presses play; replace
`assets/info-session-poster.jpg` or `assets/mentor-meeting-poster.jpg` with
a screenshot of the new deck's first slide (16:9, about 1280 × 720), or
set `poster` to `""` for a plain purple tile.

---

## 9. Headshot tips

- Name the file `firstname-lastname.jpg`, all lowercase (§2).
- Crop to a vertical 4:5 shape (for example 800 × 1000) with the face in
  the upper third, so it matches everyone else's.
- The current board's photos were all put on the same grey studio
  background for a consistent look. New photos don't get this
  automatically; any background-removal tool works, or leave the original
  background.

---

## 10. The homepage calendar

The "What's coming up" list on the homepage is built from NEMO's public
Google Calendars. **To add or change an event, just edit it in Google
Calendar.** The website picks it up automatically, usually within about 20–30 minutes.

How it works: a GitHub Action (**Update calendar**, in the **Actions** tab)
runs every 20 minutes, reads the calendars, and saves the next 120
days of events to `calendar-data/events.json`; the homepage draws the list
from that file. It only commits when something actually changed.

- **Add/remove a calendar or change its color:** edit
  `calendar-data/calendars.json` (name, color, and the Calendar ID from
  Google Calendar → Settings → Integrate calendar). The calendar must be
  set to **Make available to public** or its events won't show.
- **Need it to update right now:** Actions tab → **Update calendar** →
  **Run workflow**.
- **List looks stale:** check the Actions tab for a failed **Update
  calendar** run. GitHub also pauses scheduled Actions on repositories with
  no activity for 60 days; if that happens, open the workflow and click
  **Enable workflow**.

---

## 11. Every date on the site

This is every date or time-of-year written anywhere on the site, and
whether you need to touch it. Search `index.html` for the text in the
"Search for" column to find it.

**Updates itself once you change `BANNER_CONFIG` (§1):**

| What visitors see | Where it comes from |
|---|---|
| Scrolling banner (applications open / close, class starts / ends) | `BANNER_CONFIG` dates |
| "Next cohort: Winter 2027" and the Apply blurb | `BANNER_CONFIG` (`cohortYear`, dates). The text written in the HTML is only a fallback. |
| Apply button opening and closing | `applicationsOpen` / `applicationsClose` |
| "Mentor applications for the 2027 cohort close November 1" (mentor meeting card, Mentors section, "At a glance" row, FAQ) | `mentorApplicationsClose` |
| Calendar events | Google Calendar (§10), next 120 days (`days_ahead` in `calendar-data/calendars.json`) |

**Change by hand when it's out of date:**

| Date | File | Search for | When to change |
|---|---|---|---|
| Course length "Jan – Mid-May" (hero "Duration") | `index.html` | `Jan – Mid-May` | Only if the course calendar shifts |
| Course outline month labels (JANUARY, JAN – FEB, FEBRUARY, FEB – MAR, MARCH, APRIL ×4, LATE APRIL, MAY) | `index.html` | `JAN – FEB` | Only if the syllabus order or timing changes |
| News card dates ("— October 2026", "— Winter 2026", "— Spring 2025") | `index.html` | `news-card-date` | Set on each new card (§7) |
| Mentor meeting and info session dates (currently: mentor blank, info "Thursday, October 1") | `index.html` | `SESSION_VIDEOS` | After each new recording (§8) |
| Fallback text "Next cohort: Winter 2027" / "Applications open in fall quarter. Capacity is 120 seats." | `index.html` | `applyEyebrow` | Once a year, to match `cohortYear`, so it's right even if the script fails. If the seat count changes, also change `120 seats` in the `BANNER_CONFIG` script further down. |
| CPR practice exam version "Oct 22, 2025" and "© 2025 American Heart Association" | `cpr/index.html` | `Oct 22, 2025` | Only if the exam questions are replaced with a newer AHA version |
| Domain expiration (2028) | Squarespace, and the Quick reference table above | n/a | When renewed (§3) |
| "Est. 2006" | every page | `EST. 2006` | Never; it's the founding year |

---

*This site is plain HTML hosted on GitHub Pages. The leadership pages, photo
placeholders, and orphaned-photo report are generated by
`build_leadership.py` (run automatically by GitHub Actions when
`people/board.csv` changes). The status banner is driven by `BANNER_CONFIG`
in `index.html`. The domain (nemonu.org) is registered through Squarespace
but the site itself is not hosted there. The only other service is
Cloudflare, which hosts the login-protected assessment tool on its free
plan. There are no databases or paid hosting; everything else is just these
files.*
