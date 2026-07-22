// Email sending via SMTP (nodemailer). If SMTP env vars are absent, runs in
// PREVIEW mode: writes the email HTML + attachments to data/outbox/ so you can
// test the whole flow without a live mail server.
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.join(__dirname, '..', 'data', 'outbox');

const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport = null;
if (hasSMTP) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export function mailerMode() { return hasSMTP ? 'smtp' : 'preview'; }

export async function sendMail({ to, cc, subject, html, attachments = [] }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'timesheets@tiptop.local';
  if (hasSMTP) {
    const info = await transport.sendMail({ from, to, cc, subject, html, attachments });
    return { mode: 'smtp', messageId: info.messageId };
  }
  // Preview mode
  fs.mkdirSync(OUTBOX, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safe = String(to).replace(/[^a-z0-9]+/gi, '_').slice(0, 30);
  const base = path.join(OUTBOX, `${stamp}_${safe}`);
  const meta = `To: ${to}\nCc: ${cc || ''}\nFrom: ${from}\nSubject: ${subject}\n\n`;
  fs.writeFileSync(`${base}.html`, meta.replace(/\n/g, '<br>') + '\n<hr>\n' + html);
  attachments.forEach((a, i) => {
    if (a.content) fs.writeFileSync(`${base}_att${i}_${a.filename || 'file'}`, a.content);
  });
  return { mode: 'preview', path: `${base}.html` };
}
