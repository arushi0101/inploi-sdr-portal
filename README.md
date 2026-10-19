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

## Password

The live site is public so it can be embedded in HubSpot, so the portal has its own password.

- Set it in Vercel: Settings → Environment Variables → `PORTAL_PASSWORD` (Production), then redeploy.
- Until it is set, the portal shows the sign-in screen and returns no data.
- People sign in once per browser. Changing the password signs everyone out.
- `snapshot.js` is an empty placeholder, so no HubSpot data sits in a public file.
