#!/usr/bin/env python3
"""
NEMO leadership site generator
===============================
Single source of truth:  people/board.csv

What it does on every run:
  1. Reads people/board.csv
  2. Validates it (clear errors if a column or required field is missing)
  3. Writes one people/<slug>.html profile page per row
  4. Regenerates the leadership row inside index.html (between the
     <!-- BOARD:START --> and <!-- BOARD:END --> markers)
  5. Deletes profile pages for people no longer in the CSV
     (only ones this script previously generated — see GENERATED_MARK)

Run locally:   python3 build_leadership.py
On GitHub:     runs automatically via .github/workflows/build-leadership.yml

The slug (used for the page filename and the photo filename) is derived
from the name: lowercase, spaces -> hyphens, punctuation dropped.
  "Adam DiPasquale" -> adam-dipasquale  ->  people/adam-dipasquale.html
                                            assets/adam-dipasquale.jpg
A row may set an explicit "slug" column to override this.

Real photos: upload each person's photo to assets/<slug>.jpg (or .jpeg/.png)
(e.g. assets/adam-dipasquale.jpg). The generated page points at that path
automatically.

Placeholder photos: if no real photo file exists for a person, this script
auto-generates a placeholder graphic (their initials + name, in the site's
own colors) at assets/<slug>-placeholder.svg and points the page at that
instead — so nobody ever shows a broken image icon. The placeholder is
regenerated on every run (cheap, no dependencies) and is automatically
removed once a real photo is uploaded or the person leaves board.csv.
"""

import csv
import os
import re
import sys
import html

ROOT = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(ROOT, "people", "board.csv")
PEOPLE_DIR = os.path.join(ROOT, "people")
ASSETS_DIR = os.path.join(ROOT, "assets")
INDEX_PATH = os.path.join(ROOT, "index.html")

# Extensions checked, in order, when looking for a real uploaded photo.
PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]

# Filenames (without extension) in assets/ that are site graphics, not
# person photos — never flag these as "orphaned" even though they share
# an image extension with real photos.
SITE_ASSET_FILENAMES = {
    "nemo_logo", "favicon", "favicon-32", "apple-touch-icon",
    "nemomarathon", "eths", "mci",
}
ORPHANED_PHOTOS_REPORT = os.path.join(ROOT, "orphaned_photos.txt")

# Marker placed in every generated profile page so cleanup only ever deletes
# pages this script made — never a hand-authored file.
GENERATED_MARK = "<!-- generated-by: build_leadership.py -->"

# Columns the CSV must contain. Extra columns are ignored.
REQUIRED_COLUMNS = ["name", "role"]
# Optional columns (blank is fine):
#   email, school_year, major, fun_label, fun_value, bio, order, slug


def slugify(name):
    s = name.strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^a-z0-9-]", "", s)
    return s


def initials(name):
    """First letter of the first word + first letter of the last word.
    A single-word name just uses its first two letters."""
    words = [w for w in re.split(r"\s+", name.strip()) if w]
    if not words:
        return "?"
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[-1][0]).upper()


def placeholder_svg(name, role):
    """Builds a placeholder graphic in the site's own palette: big initials,
    a faint diagonal accent (matching .photo-frame::before on the live
    site), a small 'PLACEHOLDER' label, and the person's name — so a
    missing photo still looks intentional instead of a broken image icon."""
    ini = html.escape(initials(name))
    name_upper = html.escape(name.strip().upper())
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 1200">
  <rect width="960" height="1200" fill="#F5EFE3"/>
  <rect x="3" y="3" width="954" height="1194" fill="none" stroke="#4E2A84" stroke-width="2"/>
  <line x1="0" y1="1200" x2="960" y2="0" stroke="#4E2A84" stroke-width="90" stroke-opacity="0.08"/>
  <text x="480" y="640" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="340" fill="#4E2A84" fill-opacity="0.42">{ini}</text>
  <text x="480" y="1050" text-anchor="middle" font-family="'Courier New', monospace" font-size="20" letter-spacing="6" fill="#4E2A84" fill-opacity="0.6">&#183; PLACEHOLDER &#183;</text>
  <text x="480" y="1102" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="46" fill="#4E2A84">{name_upper}</text>
</svg>
"""


def find_real_photo(slug):
    """Returns the filename (e.g. 'adam-dipasquale.jpg') of an already
    uploaded photo for this slug, or None if the person has no real photo
    yet."""
    for ext in PHOTO_EXTENSIONS:
        if os.path.exists(os.path.join(ASSETS_DIR, f"{slug}.{ext}")):
            return f"{slug}.{ext}"
    return None


def ensure_photo_asset(slug, name, role):
    """Makes sure assets/ has *something* to show for this person and
    returns the filename to use as the image src (relative to assets/).
    Prefers a real uploaded photo; otherwise (re)writes a placeholder SVG
    so it always reflects the current name/role."""
    real = find_real_photo(slug)
    placeholder_path = os.path.join(ASSETS_DIR, f"{slug}-placeholder.svg")
    if real:
        # A real photo exists now — remove any stale placeholder for this slug.
        if os.path.exists(placeholder_path):
            os.remove(placeholder_path)
            print(f"placeholder removed (real photo now on file): {slug}-placeholder.svg")
        return real

    svg = placeholder_svg(name, role)
    existing = None
    if os.path.exists(placeholder_path):
        with open(placeholder_path, encoding="utf-8") as f:
            existing = f.read()
    if existing != svg:
        with open(placeholder_path, "w", encoding="utf-8") as f:
            f.write(svg)
        print(f"placeholder generated: assets/{slug}-placeholder.svg")
    return f"{slug}-placeholder.svg"


def cleanup_orphaned_placeholders(rows):
    """Removes placeholder SVGs left over from people no longer in board.csv."""
    wanted = {f"{p['_slug']}-placeholder.svg" for p in rows}
    for fname in os.listdir(ASSETS_DIR):
        if fname.endswith("-placeholder.svg") and fname not in wanted:
            os.remove(os.path.join(ASSETS_DIR, fname))
            print(f"placeholder removed (no longer in CSV): {fname}")


def find_orphaned_photos(rows):
    """Real photo files in assets/ whose slug doesn't match anyone
    currently in board.csv. These are NEVER deleted automatically —
    just reported, so a graduated member's photo (or a typo in the CSV)
    doesn't silently vanish."""
    wanted_slugs = {p["_slug"] for p in rows}
    orphaned = []
    for fname in sorted(os.listdir(ASSETS_DIR)):
        stem, ext = os.path.splitext(fname)
        ext = ext.lstrip(".").lower()
        if ext not in PHOTO_EXTENSIONS:
            continue
        if stem in SITE_ASSET_FILENAMES or stem.endswith("-placeholder"):
            continue
        if stem in wanted_slugs:
            continue
        orphaned.append(fname)
    return orphaned


def write_orphaned_photos_report(orphaned):
    """Writes (or removes) orphaned_photos.txt — a plain list for a human
    to review. This script never deletes the photos themselves."""
    if not orphaned:
        if os.path.exists(ORPHANED_PHOTOS_REPORT):
            os.remove(ORPHANED_PHOTOS_REPORT)
        return
    lines = [
        "Photos in assets/ that don't match anyone currently in people/board.csv.",
        "",
        "Nothing has been deleted. If someone here has actually graduated or",
        "left the board, delete their file from assets/ yourself once you've",
        "confirmed it — this list is regenerated every build, so it'll clear",
        "itself once the file is gone or the person is back in board.csv.",
        "",
    ]
    lines += [f"- assets/{f}" for f in orphaned]
    with open(ORPHANED_PHOTOS_REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def esc(s):
    """Escape for HTML attribute content (quotes included)."""
    return html.escape(s if s is not None else "", quote=True)


def esct(s):
    """Escape for HTML text content. Only &, <, > need escaping here;
    leaving apostrophes/quotes as-is keeps the source clean and readable."""
    return html.escape(s if s is not None else "", quote=False)


def read_board():
    if not os.path.exists(CSV_PATH):
        die(f"Cannot find {CSV_PATH}. Make sure people/board.csv exists.")
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            die("board.csv appears to be empty.")
        # normalize header names: strip + lowercase
        reader.fieldnames = [c.strip().lower() for c in reader.fieldnames]
        missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
        if missing:
            die("board.csv is missing required column(s): " + ", ".join(missing) +
                "\nFound columns: " + ", ".join(reader.fieldnames))
        rows = []
        for i, raw in enumerate(reader, start=2):  # row 2 = first data row
            row = {(k.strip().lower() if k else k): (v.strip() if isinstance(v, str) else v)
                   for k, v in raw.items()}
            if not row.get("name"):
                # skip fully blank trailing lines silently; flag partial ones
                if any((v or "").strip() for v in row.values()):
                    die(f"Row {i}: 'name' is required but empty.")
                continue
            if not row.get("role"):
                die(f"Row {i} ({row['name']}): 'role' is required but empty.")
            row["_slug"] = row.get("slug") or slugify(row["name"])
            if not row["_slug"]:
                die(f"Row {i} ({row['name']}): name produced an empty slug; add a 'slug' column value.")
            row["_order_raw"] = row.get("order", "")
            rows.append(row)

    # detect duplicate slugs (two people resolving to the same filename)
    seen = {}
    for r in rows:
        if r["_slug"] in seen:
            die(f"Two people resolve to the same filename '{r['_slug']}.html': "
                f"'{seen[r['_slug']]}' and '{r['name']}'. "
                f"Add a distinct 'slug' value to one of them.")
        seen[r["_slug"]] = r["name"]

    # sort by 'order' if provided (numeric), otherwise keep CSV order
    def order_key(idx_row):
        idx, r = idx_row
        raw = r["_order_raw"]
        try:
            return (0, float(raw), idx)
        except (ValueError, TypeError):
            return (1, 0.0, idx)  # rows without order keep their file position, after ordered ones
    rows = [r for _, r in sorted(enumerate(rows), key=order_key)]
    return rows


def paragraphs(bio):
    """Split a bio cell into paragraphs. Blank line OR a literal || separates."""
    if not bio:
        return []
    bio = bio.replace("\r\n", "\n").replace("\r", "\n")
    parts = re.split(r"\n\s*\n|\s*\|\|\s*", bio)
    return [p.strip() for p in parts if p.strip()]


def build_profile_html(p):
    name = esc(p["name"])          # used in alt="" / <title> (attribute-safe)
    name_t = esct(p["name"])       # used in visible text
    role = esct(p["role"])
    slug = p["_slug"]
    photo_file = esc(ensure_photo_asset(slug, p["name"], p["role"]))

    # Info cells — only render rows that have a value.
    cells = []
    cells.append(("Position", role, False))
    if p.get("email"):
        email = esc(p["email"])
        cells.append(("Email", f'<a href="mailto:{email}">{esct(p["email"])}</a>', True))
    if p.get("school_year"):
        cells.append(("School / Year", esct(p["school_year"]), False))
    if p.get("major"):
        cells.append(("Major", esct(p["major"]), False))
    fun_label = p.get("fun_label") or ("Favorite Ice Cream" if p.get("fun_value") else "")
    if p.get("fun_value"):
        cells.append((esct(fun_label), esct(p["fun_value"]), False, True))  # full width

    info_cells_html = []
    for c in cells:
        label, value = c[0], c[1]
        full = len(c) > 3 and c[3]
        style = ' style="grid-column: 1 / -1;"' if full else ""
        info_cells_html.append(
            f'    <div class="info-cell"{style}>\n'
            f'      <div class="label">{label}</div>\n'
            f'      <div class="value">{value}</div>\n'
            f'    </div>'
        )
    info_cells_block = "\n".join(info_cells_html)

    bio_paras = paragraphs(p.get("bio", ""))
    if bio_paras:
        bio_html = "\n".join(f'    <p class="bio-paragraph">{esct(par)}</p>' for par in bio_paras)
        bio_section = (
            '  <div class="bio-section">\n'
            '    <h2>About</h2>\n'
            f'{bio_html}\n'
            '  </div>\n\n'
        )
    else:
        bio_section = ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{name} — NEMO</title>
{GENERATED_MARK}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/people.css">
<link rel="icon" type="image/x-icon" href="../assets/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="../assets/apple-touch-icon.png" />
</head>
<body>

<div class="topbar">
  <div>NEMO · NORTHWESTERN EMERGENCY MEDICAL ORGANIZATION</div>
  <nav><a href="../index.html">← Back to NEMO</a></nav>
</div>

<div class="container">
  <div class="breadcrumb">
    <a href="../index.html">NEMO</a> / <a href="../index.html#leadership">Leadership</a> / <span>{name_t}</span>
  </div>

  <div class="header-grid">
    <div class="photo-frame">
      <img src="../assets/{photo_file}" alt="{name}" />
    </div>
    <div class="header-text">
      <div class="role">{role}</div>
      <h1>{name_t}</h1>
    </div>
  </div>

  <div class="info-grid">
{info_cells_block}
  </div>

{bio_section}  <a href="../index.html#leadership" class="back-link">← Back to Leadership</a>
</div>

</body>
</html>
"""


def build_index_cards(rows):
    cards = []
    for p in rows:
        slug = p["_slug"]
        name = esc(p["name"])      # attribute-safe (alt="")
        name_t = esct(p["name"])   # visible text
        role = esct(p["role"])
        photo_file = esc(ensure_photo_asset(slug, p["name"], p["role"]))
        cards.append(
            f'    <a href="people/{slug}.html" class="person">\n'
            f'      <div class="photo-frame"><img src="assets/{photo_file}" alt="{name}" /></div>\n'
            f'      <div class="role">{role}</div>\n'
            f'      <div class="name">{name_t}</div>\n'
            f'    </a>'
        )
    return "\n".join(cards)


def update_index(rows):
    if not os.path.exists(INDEX_PATH):
        die(f"Cannot find {INDEX_PATH}.")
    with open(INDEX_PATH, encoding="utf-8") as f:
        html_text = f.read()

    start = "<!-- BOARD:START -->"
    end = "<!-- BOARD:END -->"
    if start not in html_text or end not in html_text:
        die("index.html is missing the <!-- BOARD:START --> / <!-- BOARD:END --> "
            "markers inside the leadership-scroll container. Add them once and re-run.")

    cards = build_index_cards(rows)
    before = html_text.split(start)[0]
    after = html_text.split(end)[1]
    new_html = f"{before}{start}\n{cards}\n    {end}{after}"
    if new_html != html_text:
        with open(INDEX_PATH, "w", encoding="utf-8") as f:
            f.write(new_html)
        print(f"index.html: leadership row updated ({len(rows)} people).")
    else:
        print("index.html: already up to date.")


def write_profiles(rows):
    wanted = {}
    for p in rows:
        path = os.path.join(PEOPLE_DIR, p["_slug"] + ".html")
        wanted[path] = build_profile_html(p)

    for path, content in wanted.items():
        existing = None
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                existing = f.read()
        if existing != content:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"profile written: {os.path.relpath(path, ROOT)}")

    # cleanup: remove generated pages no longer backed by a CSV row
    for fname in os.listdir(PEOPLE_DIR):
        if not fname.endswith(".html"):
            continue
        path = os.path.join(PEOPLE_DIR, fname)
        if path in wanted:
            continue
        with open(path, encoding="utf-8") as f:
            head = f.read(600)
        if GENERATED_MARK in head:
            os.remove(path)
            print(f"profile removed (no longer in CSV): {fname}")
        else:
            print(f"left untouched (not generated by this script): {fname}")


def die(msg):
    print("\nBUILD FAILED\n-----------\n" + msg + "\n", file=sys.stderr)
    sys.exit(1)


def main():
    rows = read_board()
    if not rows:
        die("board.csv has no people in it.")
    write_profiles(rows)
    update_index(rows)
    cleanup_orphaned_placeholders(rows)
    orphaned = find_orphaned_photos(rows)
    write_orphaned_photos_report(orphaned)
    if orphaned:
        print(f"\n{len(orphaned)} photo(s) in assets/ don't match anyone in board.csv.")
        print("See orphaned_photos.txt — nothing was deleted.")
    print(f"\nDone. {len(rows)} people processed.")


if __name__ == "__main__":
    main()
