# inploi SDR Portal

Live SDR dashboard for inploi, built on HubSpot data and hosted on Vercel.

## How it works

- `index.html`: the page shell and styles.
- `app.js`: renders every section, the clickable numbers, the company list panel and the company journey.
- `reports.js`: the charts inside each section (week on week, calls and emails by day, when calls connect, meetings by week, pipeline by stage, funnel, leaderboard).
- `snapshot.js`: a saved 15 Oct snapshot, shown until live data loads or if HubSpot can't be reached.
- `api/data.js`: Vercel function that reads HubSpot and returns the dashboard data. `?part=trends` returns the 8-week history as a separate, slower request.
- `api/journey.js`: Vercel function that returns one company's timeline (calls, emails, meetings, notes, deals, contacts).

## Setup

Set `HUBSPOT_TOKEN` in Vercel (Production) to a HubSpot private app token with read-only scopes for companies, contacts, deals and sales email. Redeploy after changing it.

## Definitions

- **Meetings booked**: NEW meetings only, one per company in the period: a company whose Account Status moved to Meeting Booked, or a "Meeting Booked" post in #grwth where HubSpot wasn't updated. Demos (and other non-discovery meetings) and companies already open in the sales pipeline (an open deal created before the booking) don't count, matching the HubSpot bot's "New Discovery Meeting Booked & New Deal Created".
  - Credit: the company's SDR Owner. With no SDR Owner, it goes through the pods: the #grwth poster, then the HubSpot meeting owner. An SDR credits themselves; pod leads credit their pod's SDR (Jason Baaphy → James, Sales Pod 1; Felix Dealtry → Matthew, Sales Pod 2). Nikita and Evan have no pod lead.
- **First meetings held**: meetings on SDR-owned companies marked completed in HubSpot or in their Gong copy, excluding meetings once a deal is open and AE progression meetings (proposal, pricing, follow-up and similar).
- Periods are UK time. This week runs Monday to today; month to date runs from the 1st.

## Matt's dashboard

`matt.js` renders the reports from Matt's SDR Dashboard spec (sections A–H plus the weekly review) from `api/data?part=matt`.
Every bar, segment and number opens a sortable, filterable table of the records behind it (with CSV export), and any company opens its journey.

- **New accounts reached (B3)** = Account Status first moved off New in the period, from HubSpot's status history (no new field or backfill needed).
- **Meetings booked (E1)** = new meetings in the period (see above), credited to the company SDR Owner, else through the pods.
- **Accounts contacted (B2)** = an SDR call or email in the period, or Last Contacted in the period.

## Custom date range

The Period filter has **Custom dates**. It calls `api/data?from=YYYY-MM-DD&to=YYYY-MM-DD` (and `part=matt` with the same dates), which replaces month to date with that range across every section. Ranges are limited to a year.

## Password (optional)

The live site is public so it can be embedded in HubSpot. There is no password by default.

- To require one, set `PORTAL_PASSWORD` in Vercel (Settings → Environment Variables, Production) and redeploy. A sign-in screen then appears and the API returns no data without it.
- `snapshot.js` is an empty placeholder, so no HubSpot data sits in a static file.

## Daily, weekly and monthly reports

Three pages in the left panel (`daily.js`, data from `api/data?part=report&span=day|week|month&day=YYYY-MM-DD`). Each has its own date picker.

- **Reach:** accounts and contacts reached by SDR calls and outgoing emails, split into net new (no SDR call or email earlier this year) and follow-up, plus contacts per account.
- **Activity:** calls by outcome, emails sent, replies received, meetings booked (Account Status moved to Meeting Booked).
- **Rates:** connect rate, reply rate, meetings per account reached, account coverage (assigned accounts reached) and 30-day coverage.
- **Industry** of accounts reached, from the company's `industry_` field ("Industry.").
- **Leaderboard** for each activity.
- **Data gaps:** new meetings with no type, past meetings with no outcome, accounts with no SDR Owner or Account Status, calls with no outcome or call type, activity not linked to a contact or company.
- For weekly and monthly reports a company counts as follow-up if it had an earlier SDR call, or one of the contacts reached had an earlier SDR call or email.

## Daily report on Slack and email

`api/slack-daily.js` sends the daily report (team totals, each SDR, call outcomes, leaderboard, open data fixes) every weekday, and a weekly report (Monday to Friday) every Friday with `?kind=week`. The Vercel crons in `vercel.json` run at `0 17 * * 1-5` and `30 17 * * 5` (UTC). On the Hobby plan they can fire any time in that hour. Both go to every destination below (currently your DM, the SDR Updates group DM and #sdr-hub).

Environment variables (Vercel → Settings → Environment Variables, Production; redeploy after changing):
- `SLACK_WEBHOOK_URL`: one or more Slack incoming webhooks, comma-separated (for example your DM and the SDR Updates channel). Webhooks can't post into group DMs.
- `SLACK_USER_TOKEN` + `SLACK_CHANNEL_ID`: post as you into a conversation webhooks can't reach, such as a group DM. The token is your Slack app's User OAuth Token with the `chat:write` user scope; the channel ID is the conversation's ID (comma-separated for several).
- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`: send the same report as an HTML email through Resend. `EMAIL_FROM` must be on a domain verified in Resend (e.g. `SDR reports <hey@arushi-mittal.in>`); `EMAIL_TO` is comma-separated and everyone goes on the To line.
- `CRON_SECRET` (recommended): Vercel's cron sends it, so nobody else can trigger a send.

The same text, in markdown, is at `api/data?part=slack`.

## Data fixes Google Sheet

`api/data?part=fixes` returns every open data fix from the last 30 days as JSON, with one row per person per record: who, fix, record and link, company, worked-on date, where, how and why. It uses the same rules as the Data fixes page.

`sheets/data-fixes.gs` is an Apps Script for the "SDR data fixes" Google Sheet. Paste it in once and run `setup`. From then on it updates the sheet every Friday at 4–5pm UK time:
- New fixes are added as Open.
- Fixes that are no longer flagged become Resolved.
- Nothing is deleted.
- The Summary tab is rebuilt.

The sheet also gets a **Data fixes > Update now** menu.

### Approving fixes (writes to HubSpot)

Each fix has a **Suggested update** column and an **Approve / Reject** column.
- **Approve:** the change is made in HubSpot on the next run. The script runs every Saturday and Monday at 7–8am UK time and calls `api/apply` for each approved row. The sheet's **Data fixes > Apply approvals now** menu runs it straight away.
- **Reject:** nothing changes in HubSpot.

Every decision is added to the **Change log** tab, which is never cleared. `api/apply` also logs each attempt to the Vercel runtime logs.

Safety rules in `api/apply`:
- It only accepts calls carrying `Authorization: Bearer APPLY_SECRET`. Set `APPLY_SECRET` on Vercel and as a Script property in the sheet's Apps Script.
- It can only write these fields:
  - company SDR Owner and Account Status
  - call outcome and call type
  - meeting type
- Each value must be one of HubSpot's own options for that field.
- It only fills an empty field. If HubSpot already has a different value, it doesn't overwrite it and reports that instead.
- The HubSpot key needs write access for companies, calls and meetings. It uses `HUBSPOT_WRITE_TOKEN` if set, otherwise `HUBSPOT_TOKEN`.

Some fixes can't be applied automatically and still need doing in HubSpot by hand:
- past meeting outcomes
- linking a call or email to a contact or company

### Slack messages from the sheet

Both messages are posted to #sdr-hub by `api/slack-thanks`, using `SLACK_USER_TOKEN` and the same `APPLY_SECRET`:
- **Thursday 10–11am:** a gentle reminder with the sheet link, each person's open fixes and step-by-step instructions.
- **Monday 9–10am:** a thank-you for the records fixed in the last 7 days, with a count per person.
- **Monday:** the sheet owner also gets a private summary by Slack DM (`SLACK_WEBHOOK_URL`) and email. It covers what was fixed, what was approved but not applied (and why), what was rejected and what's still waiting for a decision.

Set `SLACK_THANKS_CHANNEL` to send them to a different channel.
