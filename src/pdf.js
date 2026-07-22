// Server-side PDF generation with pdfkit. Returns a Buffer.
import PDFDocument from 'pdfkit';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayDate(weekStart, d) {
  if (!weekStart) return '';
  const dt = new Date(weekStart + 'T00:00');
  dt.setDate(dt.getDate() + d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function weekRange(weekStart) {
  if (!weekStart) return '(week not set)';
  const s = new Date(weekStart + 'T00:00');
  const e = new Date(s); e.setDate(s.getDate() + 6);
  const o = { weekday: 'short', month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', o)} – ${e.toLocaleDateString('en-US', { ...o, year: 'numeric' })}`;
}
const num = (n) => Math.round((+n || 0) * 100) / 100;

export function buildPdf(ts) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 44 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const active = (ts.rows || []).filter(r => r.product && r.product.trim() && r.hrs.some(h => +h > 0));
    const holidays = ts.holidays || [false, false, false, false, false, false, false];

    // Header
    doc.fontSize(17).fillColor('#111').font('Helvetica-Bold')
      .text('Tiptop Technologies — Weekly Timesheet');
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('#444')
      .text(`Employee: ${ts.employeeName || '—'}     Week: ${weekRange(ts.weekStart)}`);
    if (ts.status && ts.status !== 'pending') {
      doc.moveDown(0.15);
      doc.fillColor(ts.status === 'approved' ? '#12805c' : '#b4530f').font('Helvetica-Bold')
        .text(`Status: ${ts.status === 'approved' ? 'APPROVED' : 'CHANGES REQUESTED'}` +
              (ts.decidedBy ? `  ·  by ${ts.decidedBy}` : ''));
    }
    doc.moveDown(0.6);

    // Table geometry
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const totalW = right - left;
    const taskW = 168;
    const totW = 46;
    const dayW = (totalW - taskW - totW) / 7;
    let y = doc.y;

    const drawRow = (cells, opts = {}) => {
      const { bold, fill, size = 9 } = opts;
      const h = opts.h || 20;
      if (fill) doc.rect(left, y, totalW, h).fill(fill);
      doc.fillColor('#111').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      // task col
      let x = left;
      doc.text(cells[0], x + 4, y + 5, { width: taskW - 8, ellipsis: true });
      x += taskW;
      for (let d = 0; d < 7; d++) {
        if (holidays[d]) doc.rect(x, y, dayW, h).fillOpacity(1).fill('#f1ecfb');
        doc.fillColor('#111').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
          .text(cells[1 + d], x, y + 5, { width: dayW, align: 'center' });
        x += dayW;
      }
      doc.text(cells[8], x, y + 5, { width: totW, align: 'center' });
      // borders
      doc.strokeColor('#ccc').lineWidth(0.5).rect(left, y, totalW, h).stroke();
      let bx = left + taskW;
      for (let d = 0; d < 8; d++) { doc.moveTo(bx, y).lineTo(bx, y + h).stroke(); bx += (d < 7 ? dayW : 0); }
      y += h;
    };

    // Header row
    const headCells = ['Product / Description',
      ...DAYS.map((n, d) => `${n}\n${dayDate(ts.weekStart, d)}${holidays[d] ? ' *' : ''}`), 'Total'];
    // custom header (two-line day labels)
    doc.rect(left, y, totalW, 26).fill('#eee');
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(9);
    doc.text('Product / Description', left + 4, y + 5, { width: taskW - 8 });
    let hx = left + taskW;
    for (let d = 0; d < 7; d++) {
      doc.text(`${DAYS[d]}\n${dayDate(ts.weekStart, d)}${holidays[d] ? ' *' : ''}`, hx, y + 3, { width: dayW, align: 'center' });
      hx += dayW;
    }
    doc.text('Total', hx, y + 8, { width: totW, align: 'center' });
    doc.strokeColor('#ccc').lineWidth(0.5).rect(left, y, totalW, 26).stroke();
    y += 26;

    // Data rows
    active.forEach(r => {
      const label = r.desc && r.desc.trim() ? `${r.product} — ${r.desc}` : r.product;
      const rt = num(r.hrs.reduce((a, b) => a + (+b || 0), 0));
      drawRow([label, ...r.hrs.map(h => (+h ? String(num(h)) : '')), String(rt)]);
    });

    // Daily total row
    const dayTotals = [];
    for (let d = 0; d < 7; d++) dayTotals.push(num(active.reduce((s, r) => s + (+r.hrs[d] || 0), 0)));
    const grand = num(dayTotals.reduce((a, b) => a + b, 0));
    drawRow(['Daily total', ...dayTotals.map(String), String(grand)], { bold: true, fill: '#f6f6f6' });

    // Holidays note
    doc.y = y + 10;
    doc.x = left;
    const hol = [];
    for (let d = 0; d < 7; d++) if (holidays[d]) hol.push(`${DAYS[d]} ${dayDate(ts.weekStart, d)}`);
    if (hol.length) doc.fontSize(9).fillColor('#555').font('Helvetica').text(`* Public holiday: ${hol.join(', ')}`);

    doc.moveDown(1.4);
    doc.fontSize(9).fillColor('#333').text(`Submitted by: ${ts.employeeName || '—'}`);
    doc.moveDown(0.4);
    doc.text(`Approved by: ${ts.status === 'approved' ? (ts.decidedBy || ts.approverEmails?.join(', ') || '') : '________________________'}`);

    doc.end();
  });
}

export { weekRange };
