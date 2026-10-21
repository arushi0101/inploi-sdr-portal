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

- **Meetings booked**: companies with an SDR Owner whose Account Status moved to Meeting Booked in the period, dated by when the status was set. This matches the HubSpot "Meetings Booked" report.
- **First meetings held**: meetings on SDR-owned companies marked completed in HubSpot or in their Gong copy, excluding meetings once a deal is open and AE progression meetings (proposal, pricing, follow-up and similar).
- Periods are UK time. This week runs Monday to today; month to date runs from the 1st.

## Matt's dashboard

`matt.js` renders the reports from Matt's SDR Dashboard spec (sections A–H plus the weekly review) from `api/data?part=matt`.
Every bar, segment and number opens a sortable, filterable table of the records behind it (with CSV export), and any company opens its journey.

- **New accounts reached (B3)** = Account Status first moved off New in the period, from HubSpot's status history (no new field or backfill needed).
- **Meetings booked (E1)** = companies moved to Meeting Booked in the period, credited to the company SDR Owner.
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

`api/slack-daily.js` sends the daily report (team totals, each SDR, call outcomes, leaderboard, open data fixes) every weekday. The Vercel cron in `vercel.json` runs at `0 17 * * 1-5` (UTC). On the Hobby plan it can fire any time in that hour.

Environment variables (Vercel → Settings → Environment Variables, Production; redeploy after changing):
- `SLACK_WEBHOOK_URL`: one or more Slack incoming webhooks, comma-separated (for example your DM and the SDR Updates channel). Webhooks can't post into group DMs.
- `SLACK_USER_TOKEN` + `SLACK_CHANNEL_ID`: post as you into a conversation webhooks can't reach, such as a group DM. The token is your Slack app's User OAuth Token with the `chat:write` user scope; the channel ID is the conversation's ID (comma-separated for several).
- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`: send the same report as an HTML email through Resend. `EMAIL_FROM` must be on a domain verified in Resend (e.g. `SDR reports <hey@arushi-mittal.in>`); `EMAIL_TO` is comma-separated and everyone goes on the To line.
- `CRON_SECRET` (recommended): Vercel's cron sends it, so nobody else can trigger a send.

The same text, in markdown, is at `api/data?part=slack`.
