// HTML email templates. The approver email carries real, styled buttons.
import { weekRange } from './pdf.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (n) => Math.round((+n || 0) * 100) / 100;

function dayDate(weekStart, d) {
  if (!weekStart) return '';
  const dt = new Date(weekStart + 'T00:00'); dt.setDate(dt.getDate() + d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function tableHtml(ts) {
  const active = (ts.rows || []).filter(r => r.product && r.product.trim() && r.hrs.some(h => +h > 0));
  const holidays = ts.holidays || [];
  const cell = 'border:1px solid #d5dbe2;padding:6px;font-size:13px';
  let h = `<table style="border-collapse:collapse;width:100%;max-width:640px"><thead><tr style="background:#eef1f5">`;
  h += `<th style="${cell};text-align:left">Product / Description</th>`;
  for (let d = 0; d < 7; d++) h += `<th style="${cell};text-align:center">${DAYS[d]}<br><span style="font-weight:400;color:#667">${dayDate(ts.weekStart, d)}${holidays[d] ? ' *' : ''}</span></th>`;
  h += `<th style="${cell};text-align:center">Total</th></tr></thead><tbody>`;
  active.forEach(r => {
    const rt = num(r.hrs.reduce((a, b) => a + (+b || 0), 0));
    const label = r.desc && r.desc.trim() ? `${esc(r.product)} — <span style="color:#556">${esc(r.desc)}</span>` : esc(r.product);
    h += `<tr><td style="${cell}">${label}</td>`;
    for (let d = 0; d < 7; d++) h += `<td style="${cell};text-align:center;${holidays[d] ? 'background:#f4effc' : ''}">${r.hrs[d] ? num(r.hrs[d]) : ''}</td>`;
    h += `<td style="${cell};text-align:center;font-weight:700">${rt}</td></tr>`;
  });
  const dts = [];
  for (let d = 0; d < 7; d++) dts.push(num(active.reduce((s, r) => s + (+r.hrs[d] || 0), 0)));
  const grand = num(dts.reduce((a, b) => a + b, 0));
  h += `<tr style="background:#f6f8fa;font-weight:700"><td style="${cell}">Daily total</td>`;
  dts.forEach(v => h += `<td style="${cell};text-align:center">${v}</td>`);
  h += `<td style="${cell};text-align:center">${grand}</td></tr></tbody></table>`;
  return { html: h, grand };
}

function shell(inner) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1b2430;line-height:1.5">${inner}</div>`;
}

export function approverEmail(ts, baseUrl) {
  const { html: table, grand } = tableHtml(ts);
  const approveUrl = `${baseUrl}/action?id=${ts.id}&token=${ts.token}&decision=approve`;
  const changesUrl = `${baseUrl}/action?id=${ts.id}&token=${ts.token}&decision=changes`;
  const btn = (bg) => `display:inline-block;padding:12px 22px;border-radius:8px;color:#fff;background:${bg};text-decoration:none;font-weight:700;font-size:14px`;
  const inner = `
    <h2 style="margin:0 0 4px">Timesheet awaiting your approval</h2>
    <p style="margin:0 0 16px;color:#556"><b>${esc(ts.employeeName)}</b> · Tiptop Technologies · Week: ${weekRange(ts.weekStart)} · <b>${grand} hours</b></p>
    ${table}
    <p style="margin:22px 0 10px;font-weight:600">Please review and choose:</p>
    <p style="margin:0 0 6px">
      <a href="${approveUrl}" style="${btn('#12805c')}">&#10003;&nbsp; Approve timesheet</a>
      &nbsp;&nbsp;
      <a href="${changesUrl}" style="${btn('#6b7480')}">&#9998;&nbsp; Request changes</a>
    </p>
    <p style="margin:14px 0 0;font-size:12px;color:#8a94a0">Clicking <b>Approve</b> emails ${esc(ts.employeeName)} a confirmation with the timesheet PDF attached. The PDF is attached to this email too.</p>`;
  return { subject: `Timesheet for approval — ${ts.employeeName} — ${weekRange(ts.weekStart)}`, html: shell(inner) };
}

export function employeeApprovedEmail(ts) {
  const { html: table, grand } = tableHtml(ts);
  const inner = `
    <h2 style="margin:0 0 6px;color:#12805c">&#10003; Your timesheet is approved</h2>
    <p style="margin:0 0 16px;color:#556">Week: ${weekRange(ts.weekStart)} · <b>${grand} hours</b>${ts.decidedBy ? ` · Approved by ${esc(ts.decidedBy)}` : ''}</p>
    ${table}
    <p style="margin:18px 0 0;font-size:13px;color:#556">The approved timesheet is attached as a PDF for your records.</p>`;
  return { subject: `APPROVED — Weekly Timesheet — ${ts.employeeName} — ${weekRange(ts.weekStart)}`, html: shell(inner) };
}

export function employeeChangesEmail(ts) {
  const { html: table } = tableHtml(ts);
  const inner = `
    <h2 style="margin:0 0 6px;color:#b4530f">&#9998; Changes requested on your timesheet</h2>
    <p style="margin:0 0 16px;color:#556">Week: ${weekRange(ts.weekStart)}. Please revise and resubmit.</p>
    ${ts.note ? `<p style="background:#fdf3e7;border:1px solid #f0cfa0;padding:10px 12px;border-radius:8px"><b>Note from approver:</b> ${esc(ts.note)}</p>` : ''}
    ${table}`;
  return { subject: `CHANGES REQUESTED — Weekly Timesheet — ${ts.employeeName} — ${weekRange(ts.weekStart)}`, html: shell(inner) };
}
