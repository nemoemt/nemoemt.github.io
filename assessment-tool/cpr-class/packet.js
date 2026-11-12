/* ─────────────────────────────────────────────────────────────
   CPR class packet builder (used by cpr-class/index.html).
   Fills the AHA BLS forms with pdf-lib and returns one PDF:
     1. Course Roster (course info page + participant pages, 10 per page)
     2. For each student: written exam answer sheet (if they took the online
        exam), Adult CPR & AED sheet, then Infant CPR sheet
   plus the rows for the AHA eCard upload template (Excel).
   The blank forms come from /cpr-class/api/template/<adult|infant|roster>.
   Everything is flattened except nothing is signed: the lead instructor
   e-signs the roster's "Signature of Lead Instructor" line afterward.
   ───────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';

  // Checklist items in the order of the form's "Check Box N" fields.
  const ADULT = [
    'Checks responsiveness', 'Shouts for help / activates EMS / sends for AED', 'Checks breathing', 'Checks pulse',
    'Cycle 1: high-quality compressions', 'Cycle 1: 2 breaths with barrier device',
    'Cycle 2: compressions', 'Cycle 2: breaths', 'Cycle 2: resumes compressions < 10 s',
    'AED: powers on', 'AED: correctly attaches pads', 'AED: clears for analysis',
    'AED: clears to safely deliver shock', 'AED: safely delivers shock',
    'Resumes compressions immediately after shock',
  ];
  const INFANT = [
    'Checks responsiveness', 'Shouts for help / activates EMS', 'Checks breathing', 'Checks pulse',
    'Cycle 1: high-quality compressions (2 fingers / 2 thumbs)', 'Cycle 1: 2 breaths with barrier device',
    'Cycle 2: compressions', 'Cycle 2: breaths', 'Cycle 2: resumes compressions < 10 s',
    'Cycle 3: 15 compressions, 2 thumb–encircling hands',
    'Cycle 4: 2 breaths with bag-mask device',
  ];
  const EXAM_PASS = 21;   // 84% of 25

  function usDate(iso) {          // "2026-11-10" -> "11/10/2026"
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? (+m[2]) + '/' + (+m[3]) + '/' + m[1] : iso;
  }

  function sheetPassed(s) { return !!(s && s.result === 'pass'); }
  function examPassed(st) { return st.score != null && st.score >= EXAM_PASS; }
  function isComplete(st) { return examPassed(st) && sheetPassed(st.adult) && sheetPassed(st.infant); }

  // The AHA forms are tagged PDFs whose accessibility tags point at the form
  // fields. Flattening removes the fields, which would leave broken links that
  // some PDF readers complain about, so drop the tags first.
  function untag(PDFLib, doc) {
    const N = PDFLib.PDFName;
    doc.catalog.delete(N.of('StructTreeRoot'));
    doc.catalog.delete(N.of('MarkInfo'));
    doc.getPages().forEach((p) => p.node.delete(N.of('StructParents')));
  }

  // Flatten the form, then drop page links to the field widgets it removed.
  // (The AHA forms' widgets don't say which page they're on, so pdf-lib can't
  // unlink them itself.)
  function flatten(PDFLib, doc, form) {
    untag(PDFLib, doc);
    form.flatten();
    const N = PDFLib.PDFName;
    doc.getPages().forEach((p) => {
      const annots = p.node.lookup(N.of('Annots'));
      if (!annots || !annots.asArray) return;
      const keep = annots.asArray().filter((ref) => !(ref instanceof PDFLib.PDFRef) || doc.context.lookup(ref));
      if (keep.length) p.node.set(N.of('Annots'), doc.context.obj(keep)); else p.node.delete(N.of('Annots'));
    });
  }

  function setText(form, name, value, size) {
    let f;
    try { f = form.getTextField(name); } catch (e) { return; }   // field missing: skip
    // These forms' fields have no font size set, which makes the text tiny; give them one.
    if (size) f.acroField.setDefaultAppearance('/Helv ' + size + ' Tf 0 g');
    f.setText(value ? String(value) : '');
  }

  async function fillSkills(PDFLib, bytes, kind, st, classDate) {
    const doc = await PDFLib.PDFDocument.load(bytes);
    const form = doc.getForm();
    const s = st[kind] || {};
    const items = kind === 'adult' ? ADULT : INFANT;
    setText(form, 'Student Name 1', st.cardName || (st.firstName + ' ' + st.lastName), 10);
    setText(form, 'Date of Test 1', usDate(s.date || classDate), 10);
    items.forEach((_, i) => {
      const cb = form.getCheckBox('Check Box ' + (i + 1));
      if (s.checks && s.checks[i]) cb.check(); else cb.uncheck();
    });
    if (s.result === 'pass' || s.result === 'nr') {
      // First option is the PASS box, second is NR (their names differ between the two forms).
      const group = form.getRadioGroup('PASS/NR 1');
      group.select(group.getOptions()[s.result === 'pass' ? 0 : 1]);
    }
    setText(form, 'Instructor Initials 1', s.initials, 10);
    setText(form, 'Instructor Number 1', s.instructorNumber, 10);
    setText(form, 'Date 1', s.result ? usDate(s.date || classDate) : '', 10);
    flatten(PDFLib, doc, form);
    return doc;
  }

  async function fillRosterCourse(PDFLib, bytes, info, students) {
    const doc = await PDFLib.PDFDocument.load(bytes);
    const form = doc.getForm();
    const d = usDate(info.date);
    setText(form, 'Course Start', d + (info.startTime ? ' ' + info.startTime : ''), 9);
    setText(form, 'Course End', d + (info.endTime ? ' ' + info.endTime : ''), 9);
    setText(form, 'Total Hours', info.hours, 9);
    setText(form, 'No of Cards', String(students.filter(isComplete).length), 9);
    setText(form, 'Student-Manikin Ratio', info.ratio, 9);
    setText(form, 'Issue Date', usDate(info.issueDate), 9);
    (info.assistants || []).slice(0, 8).forEach((a, i) => {
      const n = i === 0 ? '' : ' ' + (i + 1);
      setText(form, 'Name-Instructor ID' + n, [a.name, a.id].filter(Boolean).join(', '), 9);
      setText(form, 'Card Exp Date' + n, a.exp, 9);
    });
    setText(form, 'Date 2', d);
    flatten(PDFLib, doc, form);
    return doc;
  }

  async function fillRosterRows(PDFLib, bytes, info, rows) {
    const doc = await PDFLib.PDFDocument.load(bytes);
    const form = doc.getForm();
    setText(form, 'Date 2', usDate(info.date));
    rows.forEach((st, i) => {
      const n = i === 0 ? '' : ' ' + (i + 1);
      setText(form, 'Name' + n, st.cardName || (st.firstName + ' ' + st.lastName));
      setText(form, 'Email' + n, st.email);
      setText(form, 'Mailing Address' + n, st.address);
      setText(form, 'Telephone' + n, st.phone);
      setText(form, 'Complete-Incomplete' + n, isComplete(st) ? 'Complete' : 'Incomplete');
      setText(form, 'Remediation' + n, st.remediation);
    });
    flatten(PDFLib, doc, form);
    return doc;
  }

  // templates: { adult, infant, roster } as ArrayBuffer/Uint8Array
  // answerSheet(student): optional; returns the student's exam answer sheet PDF
  // bytes (or null), drawn by the page with cpr/answer-sheet.js.
  async function buildPacket(PDFLib, templates, info, students, answerSheet) {
    const out = await PDFLib.PDFDocument.create();
    const add = async (doc, pageIdx) => {
      const pages = await out.copyPages(doc, pageIdx || doc.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    };
    // Roster: page 1 = course info, page 2 = participants (10 per page).
    await add(await fillRosterCourse(PDFLib, templates.roster, info, students), [0]);
    for (let i = 0; i < Math.max(students.length, 1); i += 10) {
      await add(await fillRosterRows(PDFLib, templates.roster, info, students.slice(i, i + 10)), [1]);
    }
    for (const st of students) {
      const sheet = answerSheet ? await answerSheet(st) : null;
      if (sheet) await add(await PDFLib.PDFDocument.load(sheet));
      await add(await fillSkills(PDFLib, templates.adult, 'adult', st, info.date));
      await add(await fillSkills(PDFLib, templates.infant, 'infant', st, info.date));
    }
    out.setTitle('BLS course packet ' + usDate(info.date));
    return out.save({ useObjectStreams: false });   // object streams made some PDF readers warn
  }

  // Rows for the AHA eCard upload template (same columns as Template.xls).
  function templateRows(info, students) {
    const rows = [['Course Date', 'First Name', 'Last Name', 'Email', 'Phone (Optional)']];
    students.filter(isComplete).forEach((st) => rows.push([usDate(info.date), st.firstName, st.lastName, st.email, st.phone || '']));
    return rows;
  }

  root.NemoPacket = { ADULT, INFANT, EXAM_PASS, usDate, isComplete, examPassed, buildPacket, templateRows };
})(typeof window !== 'undefined' ? window : globalThis);
