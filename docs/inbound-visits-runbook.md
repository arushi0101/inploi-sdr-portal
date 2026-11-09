# #inbound-visits routing (runs hourly in Arushi's Claude session)

Agreed with Arushi on 9 Nov 2026. Every new Dealfront alert in #inbound-visits (C0BLTRVSEKA) is checked once:

## 1. Is it ICP?
- Use the score Claude in Slack posts in the alert's thread ("X scores N/10").
- **ICP = 6/10 or higher.** Below 6: do nothing, post nothing.
- If Claude hasn't scored it within 30 minutes of the alert (or says it is out of credits), score it myself with the same ICP gates
  (ATS in use, 40+ live vacancies, UK HQ/hiring, frontline multi-site hiring model, scale ~1,000+ staff).

## 2. Find it in HubSpot
Search by name (with and without Ltd/Group/UK), the Dealfront "View in HubSpot" link, and the website domain. Pick the right record, not a lookalike.

## 3. Act and reply in the alert's thread (posted from Arushi's Slack)
SDRs: James Crawford (Slack U091M9F594K, HubSpot owner 29569627), Matthew Meehan (U0AEZD9MU76, 32364701),
Nikita Rohwer (U091M9CPELB, 29569628), Evan Williams (U091M9BGVH9, 29569626).

| Situation | What I do | Reply |
|---|---|---|
| Owned by one of the 4 SDRs (SDR Owner or Company owner) | nothing in HubSpot | "This company is owned by @SDR (company owner). Please take a look." + record link |
| ...and no activity in the last 30 days (Last Contacted empty or older) | as above | adds the SLA line |
| Owned by someone else (e.g. Jason, Felix) | nothing in HubSpot | says who owns it and tags them; no reassignment |
| In HubSpot, no owner at all | set **SDR Owner and Company owner** to the next SDR in the round-robin | "New ICP company: assigned to @SDR (round-robin). Please reach out." + SLA line |
| Not in HubSpot | create the company (name, domain, city, country, industry, employees) and fill the **SDR Insights** fields (ICP Status, ICP Fit, ICP Tier, Reasoning for ICP, ICP Fit Reason, Company Summary, Segment Detected, Segment Reasoning, Sector Priority, Job Count, Careers Site URL, HQ Country Found, Parent Verification, Parent Company Website), then assign round-robin | "New ICP company, now in HubSpot: assigned to @SDR (round-robin). Please reach out." + record link + SLA line |

- **SLA line:** alert Monday to Thursday: reach out within 24 hours (by that time the next day, UK). Alert Friday, Saturday or Sunday: by Monday 12:00 UK.
- **Round-robin order:** James, Matthew, Nikita, Evan, then repeat. The next person is the one after the last name in my most recent "round-robin" reply in the channel.
- **Never** overwrite an existing owner or a filled field. Only create missing companies, fill empty fields and assign unowned companies.
- Every reply ends with `_SDR routing_` so a thread is never handled twice.
- Every action is listed in `docs/inbound-visits-log.md` (when, company, ICP score, HubSpot record, what was done, who was tagged).

## Form submissions (added 9 Nov 2026): demo requests and audit unlocks
Checked in the same hourly run. Forms:
- **Contact Us Form Website V2** (book a demo, form 333cdbe8-14af-4312-9272-fce963d20097): conversion name starts "Book a demo · inploi"
- **Hiring Experience Audit** (audit unlock, form d21219f6-269c-487a-a342-b2a87be5651a): conversion name starts "Hiring experience grader"

Which contacts: `recent_conversion_event_name` from one of these forms and `recent_conversion_date` after 2026-11-09 10:30 UK,
not already in `docs/inbound-visits-log.md`. Skip internal or test addresses (ending @inploi.com). Every one counts as ICP (no score cut-off).

| Situation | What I do in HubSpot | Post in #sdr-hub (C0CEEB94MB2) |
|---|---|---|
| Contact already has an owner | nothing | tag the owner: new demo request / audit unlock, please pick up |
| Company found (email domain, then company name) and owned by one of the 4 SDRs (SDR Owner or Company owner) | set the **contact owner** to that SDR; link contact to company | tag that SDR |
| Company owned by someone else | set the contact owner to the company owner; link | tag that owner |
| Company in HubSpot with no owner | round-robin SDR: set **contact owner, Company owner and SDR Owner**; link | tag the SDR |
| No company in HubSpot | create it (from the email domain, with research), fill SDR Insights, round-robin assign contact + company; link | tag the SDR |
| Personal email (gmail etc.) with no company | round-robin assign the contact only | tag the SDR |

Reply text: "New demo request" or "New audit unlock" from Name (job title) at Company, with links to the contact and company records,
for an audit the audit URL and score, then "@SDR please pick this up", then the SLA line (Mon to Thu: within 24 hours; Fri to Sun: by Monday 12:00 UK). End with `_SDR routing_`.
The round-robin is shared with the visits routing: the next SDR follows the last "round-robin" entry in `docs/inbound-visits-log.md`.
Never overwrite an existing owner. Log every action (with the contact id) in `docs/inbound-visits-log.md`.
