/* ─────────────────────────────────────────────────────────────
   CPR NEMO Exam answer sheet (AHA "Student Answer Sheet" layout).
   Shared by the exam (cpr/index.html: the copy students get and the one
   emailed to NEMO) and the CPR Testing & Management class packet
   (nemo-tool.pages.dev/cpr-class/, which loads this file from nemonu.org).
   NemoAnswerSheet.draw(jsPDF, { name, dateIso, version, answers, results, score })
   returns a jsPDF document. answers: chosen option per question (0-3);
   results: true/false per question from the grading server.
   ───────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';
  function draw(jsPDF, o) {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });

      const pageW = doc.internal.pageSize.getWidth();   // 612
      const pageH = doc.internal.pageSize.getHeight();  // 792
      const margin = 54;

      const studentName = (o.name || '').trim();
      const dateInput = (o.dateIso || '');
      const versionInput = String(o.version || 'A').toUpperCase() || 'A';

      let examDateStr = '';
    if (dateInput) {
      const [yy, mm, dd] = dateInput.split('-').map(Number);
      const d = new Date(yy, mm - 1, dd);
      examDateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    const correctCount = o.score;
    const total = o.answers.length;
    const pct = Math.round((correctCount / total) * 100);
    const passed = correctCount >= 21;
    const letters = ['A', 'B', 'C', 'D'];

    // ============================================================
    // HEADER — mirrors AHA original layout
    // ============================================================

    // AHA red heart mark, top-left
    doc.setFillColor(200, 32, 46);
    doc.circle(margin + 5, margin + 4, 5, 'F');
    doc.circle(margin + 13, margin + 4, 5, 'F');
    doc.triangle(margin, margin + 6, margin + 18, margin + 6, margin + 9, margin + 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20);
    doc.text('American Heart', margin + 24, margin + 3);
    doc.text('Association.', margin + 24, margin + 12);

    // Centered title block (matches AHA original)
    let y = margin + 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text('Student Answer Sheet', pageW / 2, y, { align: 'center' });
    y += 14;
    doc.text('Basic Life Support Exam', pageW / 2, y, { align: 'center' });

    // Name / Date / Version line — underline style
    y += 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0);

    const nameLabelX = margin;
    const nameValueX = nameLabelX + 38;
    const nameValueW = 220;
    const dateLabelX = nameValueX + nameValueW + 14;
    const dateValueX = dateLabelX + 32;
    const dateValueW = 110;
    const verLabelX = dateValueX + dateValueW + 14;
    const verValueX = verLabelX + 50;
    const verValueW = 30;

    doc.text('Name:', nameLabelX, y);
    doc.text('Date:', dateLabelX, y);
    doc.text('Version:', verLabelX, y);

    doc.setLineWidth(0.5);
    doc.setDrawColor(0);
    doc.line(nameValueX, y + 2, nameValueX + nameValueW, y + 2);
    doc.line(dateValueX, y + 2, dateValueX + dateValueW, y + 2);
    doc.line(verValueX, y + 2, verValueX + verValueW, y + 2);

    if (studentName) doc.text(studentName, nameValueX + 4, y);
    if (examDateStr) doc.text(examDateStr, dateValueX + 4, y);
    doc.text(versionInput, verValueX + 4, y);

    // ============================================================
    // SUBMIT-TO line (small, right under the name row)
    // ============================================================
    y += 14;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('Submit to: nemo@u.northwestern.edu', pageW / 2, y, { align: 'center' });

    y += 14;

    // ============================================================
    // ANSWER GRID — mirrors AHA Question / Answer table
    // ============================================================

    const gridW = 360;
    const gridX = (pageW - gridW) / 2;
    const qColW = 100;
    const aColW = gridW - qColW;

    // Column headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Question', gridX + qColW / 2, y, { align: 'center' });
    doc.text('Answer', gridX + qColW + aColW / 2, y, { align: 'center' });

    y += 6;
    doc.setLineWidth(0.6);
    doc.setDrawColor(0);
    doc.line(gridX, y, gridX + gridW, y);
    y += 16;

    // Rows
    const rowH = 20;
    const bubbleSpacing = aColW / 4;
    const bubbleR = 7;

    o.answers.forEach((item, qIdx) => {
      const userPick = o.answers[qIdx];
      const isCorrect = !!(o.results && o.results[qIdx]);

      // Alternating gray row background (like the AHA original)
      if (qIdx % 2 === 1) {
        doc.setFillColor(220, 220, 220);
        doc.rect(gridX, y - rowH / 2 - 2, gridW, rowH, 'F');
      }

      // Question number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`${qIdx + 1}.`, gridX + qColW - 30, y);

      // Four answer letters with mark over user's pick
      doc.setFontSize(12);
      for (let i = 0; i < 4; i++) {
        const cx = gridX + qColW + bubbleSpacing * i + bubbleSpacing / 2;
        const cy = y;

        if (userPick === i) {
          // Filled colored bubble behind user's chosen letter
          if (isCorrect) {
            doc.setFillColor(31, 111, 67);   // green
          } else {
            doc.setFillColor(179, 38, 30);   // red
          }
          doc.circle(cx, cy - 3, bubbleR, 'F');
          doc.setTextColor(255, 255, 255);   // white letter on colored fill
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(0);
          doc.setFont('helvetica', 'bold');
        }

        doc.text(letters[i], cx, cy, { align: 'center' });
      }

      y += rowH;
    });

    // ============================================================
    // SCORE STAMP — upper right corner
    // ============================================================
    doc.setPage(1);

    const stampW = 130;
    const stampH = 70;
    const stampX = pageW - margin - stampW;
    const stampY = margin - 10;

    // Stamp background
    if (passed) {
      doc.setFillColor(31, 111, 67);   // green
      doc.setDrawColor(20, 80, 48);
    } else {
      doc.setFillColor(179, 38, 30);   // red
      doc.setDrawColor(130, 25, 20);
    }
    doc.setLineWidth(1.5);
    doc.roundedRect(stampX, stampY, stampW, stampH, 6, 6, 'FD');

    // Inner border for "stamped" feel
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.roundedRect(stampX + 4, stampY + 4, stampW - 8, stampH - 8, 4, 4, 'S');

    // Score text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(`${correctCount} / ${total}`, stampX + stampW / 2, stampY + 32, { align: 'center' });

    doc.setFontSize(13);
    doc.text(passed ? 'PASS' : 'FAIL', stampX + stampW / 2, stampY + 50, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${pct}%`, stampX + stampW / 2, stampY + 62, { align: 'center' });

    return doc;
  }
  root.NemoAnswerSheet = { draw: draw };
})(typeof window !== 'undefined' ? window : globalThis);
