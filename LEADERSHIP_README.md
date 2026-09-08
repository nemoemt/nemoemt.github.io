# Editing the NEMO leadership board

Everything about who appears on the site — the row on the homepage **and**
each person's profile page — comes from one file:

> **`people/board.csv`**

You never edit `index.html` or the individual `people/*.html` pages by hand.
You edit the CSV, push it to GitHub, and the site rebuilds itself.

---

## To change the board

1. **Open `people/board.csv` on GitHub** (or download it, edit in Excel /
   Google Sheets / Numbers, and re-upload — keep the format **CSV**).
2. Make your change:
   - **Rename / change a role:** edit that person's `name` or `role`.
   - **Add a person:** add a new row at the bottom; set `order` to where they
     should appear.
   - **Remove a person:** delete their row. Their profile page is removed
     automatically on the next build.
   - **Reorder:** change the numbers in the `order` column.
3. **Upload the person's photo** to the `assets/` folder, named
   `firstname-lastname.jpg` — all lowercase, with a hyphen between names.
   Example: **Adam DiPasquale → `assets/adam-dipasquale.jpg`**.
   (The page links to that filename automatically.)

   **No photo yet? That's fine.** The build automatically generates a
   placeholder graphic — the person's initials, in NEMO's colors, labeled
   "PLACEHOLDER" — so the page never shows a broken image. Upload the real
   photo whenever it's ready and it replaces the placeholder on the next
   build, with no other change needed.
4. **Commit / save.** Within a minute the homepage row and the person's
   profile page update on their own.

---

## The columns

| Column        | Required | What it is                                                       |
|---------------|----------|------------------------------------------------------------------|
| `order`       | no       | A number that sets display order (1 = first). Blank = goes last. |
| `name`        | **yes**  | Full name, e.g. `Dylan Stone`.                                   |
| `role`        | **yes**  | Title shown under the name, e.g. `Co-President`.                 |
| `email`       | no       | Shows an email row + mailto link on the profile.                 |
| `school_year` | no       | e.g. `WCAS · Class of 2027`.                                     |
| `major`       | no       | e.g. `Biological Sciences & Religious Studies`.                  |
| `fun_label`   | no       | Label for the fun fact (defaults to `Favorite Ice Cream`).       |
| `fun_value`   | no       | The fun fact itself, e.g. `Black Raspberry Chocolate Chip`.      |
| `bio`         | no       | Free text. Put a blank line **or** `||` between paragraphs.      |
| `slug`        | no       | Only needed for odd names — see below.                           |

Any optional field you leave blank simply doesn't appear on that person's page.

### Photo / filename rule (the `slug`)

The filename for both the profile page and the photo is built from the name:
lowercase, spaces become hyphens, punctuation removed.
`Adam DiPasquale` → `adam-dipasquale`.

If a name has an apostrophe, a suffix, or you want a custom filename, fill in
the **`slug`** column to set it exactly, and name the photo to match:

```
name,role,slug
Mary O'Brien,Treasurer,mary-obrien
```
→ page `people/mary-obrien.html`, photo `assets/mary-obrien.jpg`.

### Long bios in a CSV

A bio can be as long as you want. In a spreadsheet, just type it into the
`bio` cell (the tool wraps it in quotes for you on save). To split into
paragraphs, leave a blank line between them, or type `||` where the break
should go.

---

## Photo placeholders

If `assets/<slug>.jpg` (or `.jpeg`/`.png`/`.webp`) doesn't exist for
someone, the build writes a placeholder in their place —
`assets/<slug>-placeholder.svg` — showing their initials and name in NEMO's
colors, so nothing on the site shows a broken image. This is fully
automatic:

- It's regenerated every build, so it always reflects the current name/role
  in the CSV.
- The moment you upload a real photo with the matching filename, the
  placeholder is deleted and the real photo takes over.
- If someone is removed from the CSV entirely, their leftover placeholder
  (if any) is deleted too.

You never need to create or touch these `-placeholder.svg` files by hand.

## Old photos left behind (`orphaned_photos.txt`)

Every build also scans `assets/` for real photo files that don't match
anyone currently in the CSV — typically a graduated exec whose row was
removed. Their filenames are written to **`orphaned_photos.txt`** at the
root of the repo, purely as a list to review.

**The build never deletes these photos itself.** If you check the list and
confirm someone really has left the board, delete their file from `assets/`
yourself. The report updates itself on the next build — it clears once the
file is gone (or the person is added back to the CSV).

---

## If the build fails

If the CSV is malformed (a missing required field, two people with the same
filename), the build stops and **the site is left unchanged** — it won't push
broken pages. Open the repo's **Actions** tab, click the failed run, and the
log will say exactly what's wrong (e.g. `Row 5 (Jane Doe): 'role' is required
but empty.`). Fix the CSV and push again.

## Running it yourself (optional)

You don't need to, but if you have Python you can preview locally:

```
python3 build_leadership.py
```

This rewrites `index.html`, the `people/*.html` pages, any needed photo
placeholders in `assets/`, and `orphaned_photos.txt` — all from the CSV.
