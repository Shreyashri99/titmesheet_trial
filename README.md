# Tiptop Technologies — Weekly Timesheet

A small web app for weekly timesheets with a real email-based approval loop:

1. An employee fills in the timesheet (products, descriptions, hours per day, public holidays) and clicks **Submit for approval**.
2. The **approver** receives an HTML email with the timesheet, the **PDF attached**, and two real buttons: **Approve** and **Request changes**.
3. When the approver clicks **Approve**, the employee automatically receives an email — **"Your timesheet is approved"** — with the approved **PDF attached**. "Request changes" sends it back instead.

No spreadsheet, no manual attaching. Everything runs server-side.

---

## What's in the box

```
src/server.js     Express app + routes (/, /submit, /action, /health)
src/form.js       The timesheet entry page (served at /)
src/pdf.js        Server-side PDF (pdfkit) — day-column dates, holidays, totals
src/emails.js     HTML emails (approver buttons, approved, changes-requested)
src/mailer.js     SMTP send via nodemailer; PREVIEW mode when no SMTP configured
src/store.js      JSON-file storage (swap for a real DB later)
.env.example      Configuration template
```

---

## Run it locally (2 minutes)

Requires Node 18+.

```bash
npm install
cp .env.example .env      # optional — it runs without this
npm start
```

Open http://localhost:3000

Out of the box it runs in **PREVIEW mode**: no email is actually sent. Instead every
email (with its PDF) is written to `data/outbox/` so you can open the `.html` files
and confirm exactly what the approver and employee would receive. Great for testing
the whole flow before wiring real email.

To exercise the approval click locally, submit a timesheet, open the approver
`.html` in `data/outbox/`, and click the **Approve** button — it hits the running server.

---

## Turn on real email (SMTP)

Edit `.env` and set the SMTP block. Any SMTP provider works. Using **Gmail / Google Workspace**:

1. Turn on 2-Step Verification on the Google account.
2. Create an **App Password**: Google Account → Security → App passwords.
3. Fill in `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=timesheets@yourcompany.com
SMTP_PASS=the_16_char_app_password
MAIL_FROM=Tiptop Timesheets <timesheets@yourcompany.com>
```

Restart (`npm start`). `/health` will now report `"mailer":"smtp"`. Emails are sent for real.

> Prefer not to use SMTP? The `sendMail()` function in `src/mailer.js` is the single
> integration point — swap it for the Gmail API, SendGrid, Resend, Amazon SES, etc.

---

## Deploy it (so the Approve links work from anywhere)

The Approve button links point at `BASE_URL`. Locally that's `http://localhost:3000`,
which only works on your machine. To let a real approver click Approve from their inbox,
host the app and set `BASE_URL` to its public URL.

**Render.com (free tier, simplest):**

1. Push this folder to a GitHub repo.
2. Render → New → Web Service → connect the repo.
3. Build command `npm install`, start command `npm start`.
4. Add environment variables from your `.env` — **including `BASE_URL=https://your-app.onrender.com`** and the `SMTP_*` values.
5. Deploy. Share the URL with employees.

**Railway / Fly.io / a VPS** work the same way: run `npm start`, set the env vars,
and point `BASE_URL` at the public URL.

> Note on storage: timesheets are stored in `data/timesheets.json`. On hosts with an
> ephemeral filesystem (e.g. some serverless tiers) this resets on redeploy. For anything
> beyond light use, attach a persistent disk or replace `src/store.js` with Postgres/SQLite.

---

## Configuration reference (.env)

| Variable | What it does |
|---|---|
| `BASE_URL` | Public URL used to build Approve/Request-changes links. **Set this in production.** |
| `PORT` | Port to listen on (default 3000). |
| `TIPTOP_PRODUCTS` | Comma-separated default product list shown in the form. |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | SMTP server. If unset → preview mode. |
| `MAIL_FROM` | From address/name on outgoing mail. |

---

## Nice next steps (not built yet)

- **Automatic weekly send**: a scheduled job (cron / `node-cron`) that reads Google
  Calendar for each employee and emails their timesheet every Friday. This is where a
  Google Calendar integration would slot in.
- **Login + history**: add auth and a dashboard of past timesheets and their status.
- **Multiple employees / manager views**: the JSON store already keys by id; add a DB
  and per-user filtering.
