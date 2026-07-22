import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { formHtml } from './form.js';
import { buildPdf, weekRange } from './pdf.js';
import { approverEmail, employeeApprovedEmail, employeeChangesEmail } from './emails.js';
import { sendMail, mailerMode } from './mailer.js';
import * as store from './store.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// On Render, RENDER_EXTERNAL_URL is provided automatically, so you don't have to set BASE_URL.
const BASE_URL = (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const DEFAULT_PRODUCTS = (process.env.TIPTOP_PRODUCTS || 'Reception360,Internal / Admin,Meetings')
  .split(',').map(s => s.trim()).filter(Boolean);
const pdfName = (ts) => `Timesheet_${(ts.employeeName || 'employee').replace(/[^a-z0-9]+/gi, '_')}_${ts.weekStart}.pdf`;

app.get('/', (_req, res) => res.type('html').send(formHtml(DEFAULT_PRODUCTS)));
app.get('/health', (_req, res) => res.json({ ok: true, mailer: mailerMode() }));

// Employee submits -> store + email approver (with Approve button + PDF).
app.post('/submit', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.employeeEmail || !b.approverEmails?.length || !b.weekStart || !b.rows?.length)
      return res.status(400).json({ ok: false, error: 'Missing required fields.' });
    const ts = {
      id: crypto.randomUUID(),
      token: crypto.randomBytes(18).toString('hex'),
      employeeName: b.employeeName || '',
      employeeEmail: b.employeeEmail,
      approverEmails: b.approverEmails,
      weekStart: b.weekStart,
      products: b.products || [],
      rows: b.rows,
      holidays: b.holidays || [false, false, false, false, false, false, false],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    store.put(ts);
    const pdf = await buildPdf(ts);
    const { subject, html } = approverEmail(ts, BASE_URL);
    const info = await sendMail({
      to: ts.approverEmails.join(','), subject, html,
      attachments: [{ filename: pdfName(ts), content: pdf }],
    });
    res.json({ ok: true, id: ts.id, mode: info.mode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Approver clicks Approve / Request-changes.
app.get('/action', async (req, res) => {
  const { id, token, decision } = req.query;
  const ts = store.get(id);
  if (!ts || ts.token !== token) return res.status(403).type('html').send(page('Invalid or expired link', '#b4530f'));
  if (ts.status !== 'pending')
    return res.type('html').send(page(`This timesheet was already <b>${ts.status === 'approved' ? 'approved' : 'sent back for changes'}</b>.`, '#556'));

  try {
    if (decision === 'approve') {
      ts.status = 'approved';
      ts.decidedAt = new Date().toISOString();
      ts.decidedBy = (ts.approverEmails && ts.approverEmails[0]) || '';
      store.put(ts);
      const pdf = await buildPdf(ts);
      const { subject, html } = employeeApprovedEmail(ts);
      await sendMail({ to: ts.employeeEmail, subject, html, attachments: [{ filename: pdfName(ts), content: pdf }] });
      return res.type('html').send(page(`&#10003; Approved. A confirmation with the PDF has been emailed to <b>${esc(ts.employeeName || ts.employeeEmail)}</b>.`, '#12805c'));
    } else {
      ts.status = 'changes_requested';
      ts.decidedAt = new Date().toISOString();
      store.put(ts);
      const { subject, html } = employeeChangesEmail(ts);
      await sendMail({ to: ts.employeeEmail, subject, html });
      return res.type('html').send(page(`&#9998; Change request sent to <b>${esc(ts.employeeName || ts.employeeEmail)}</b>.`, '#b4530f'));
    }
  } catch (e) {
    console.error(e);
    return res.status(500).type('html').send(page('Something went wrong: ' + esc(e.message), '#b4530f'));
  }
});

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function page(msg, color) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:14vh auto;padding:28px;
  border:1px solid #e2e8f0;border-radius:16px;text-align:center;color:#1b2430">
  <div style="font-size:34px;margin-bottom:8px;color:${color}">Tiptop Timesheets</div>
  <p style="font-size:16px;line-height:1.6">${msg}</p></div>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Timesheet app on ${BASE_URL} (mailer: ${mailerMode()})`));
