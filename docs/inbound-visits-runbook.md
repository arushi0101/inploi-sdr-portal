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
- **Round-robin order:** James, Matthew, Nikita, Evan, then repeat. The next person is the one after the last "round-robin" entry in `docs/inbound-visits-log.md` (shared with form submissions).
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

## Enrich SDR Insights before posting (added 9 Nov 2026)
For every form submission (and every company the visits routing creates), fill the company's **SDR Insights** card in HubSpot
**before** the #sdr-hub post, then mention "SDR Insights filled" (or what couldn't be found) in the post.
Only fill empty fields; never overwrite. Research the company's own website, careers site, Companies House, LinkedIn and the ATS
the careers site uses (open the pages; mark each fact [OBSERVED: source] or [INFERRED]), the same way Clay's "HS Verification" fills them.

| Field (label) | Property | Format (as Clay writes it) |
|---|---|---|
| ICP Fit | sdr_icp_fit | YES / NO / REVIEW |
| ICP Tier | sdr_icp_tier | HIGH / MEDIUM / LOW |
| ICP Status | sdr_icp_status | ICP / NOT ICP / REVIEW: short reason |
| NHS Body | sdr_nhs_body | YES / NO |
| Sector Priority | sdr_sector_priority | PRIMARY / SECONDARY / TERTIARY |
| Segment Detected | sdr_segment_detected | e.g. CAREERS_SITES, CAREERS_SITES_PLUS_CHAT_TO_APPLY, CHAT_TO_APPLY |
| Secondary Product | sdr_secondary_product | e.g. CHAT_TO_APPLY |
| Job Count | sdr_job_count | number of live roles counted |
| ATS Name | sdr_ats_name | e.g. SAP SuccessFactors, Workday, CVMinder ATS |
| Gate ATS | sdr_gate_ats | PASS / FAIL / UNKNOWN - evidence |
| Careers Site Type | sdr_careers_site_type | ATS_HOSTED / OWN_DOMAIN_THIN / OWN_DOMAIN_RICH |
| Careers Site URL | sdr_careers_site_url | URL |
| Company Summary | sdr_company_summary | 3-5 sentences with sources |
| ICP Fit Reason | sdr_icp_fit_reason | the four gates (ATS, 40+ vacancies, UK HQ, frontline multi-site hiring) plus scale |
| Reasoning for ICP | sdr_reasoning_for_icp | overall reasoning and confidence |
| Segment Reasoning | sdr_segment_reasoning | why that product leads |
| ATS Evidence | sdr_ats_evidence | URLs/domains that prove the ATS |
| HQ Country Found | sdr_hq_country_found | e.g. United Kingdom |
| HQ Country Verified | sdr_hq_country_verified | YES / NO - evidence (Companies House) |
| Parent Verification | sdr_parent_verification | VERIFIED / UNVERIFIED / NONE - evidence |
| Parent Company Website | sdr_parent_company_website | URL or None |
| LinkedIn company page | linkedin_company_page | URL |

Examples of filled records: Aramark UK (455534096579), Walsingham Support (454378769624), EG On The Move (455416279278).

## Deal owner goes to the AE (added 9 Nov 2026)
Rule (Felix, agreed by Arushi): once a discovery meeting is booked, the deal belongs to the AE taking it, Jason Baaphy
(owner 1709905072) or Felix Dealtry (511871441), never the SDR. Checked in the same hourly run.

1. Find open deals whose owner is one of the 4 SDRs (29569627, 32364701, 29569628, 29569626).
2. Work out the AE, in this order:
   - the deal's associated meeting is owned by Jason or Felix, or lists one of them in attendees (`hs_attendee_owner_ids`);
   - otherwise the SDR's "Meeting Booked" post in #grwth for that company says "with Jason" / "with Felix";
   - otherwise Jason or Felix has their own meeting with the company (same company, around the same date).
3. If **SDR beneficiary** (`sdr_beneficiary_s_`) is empty, set it to the SDR who owned the deal first, so the SDR keeps the
   credit (the dashboard counts this field). Then set the deal owner to the AE. Change nothing else.
4. If the AE can't be identified, don't guess: leave the deal and DM Arushi once with the deal and why.
5. Log each move in `docs/deal-owner-log.md`. No Slack post for a move.
6. **Closed deals where the meeting never happened go back to the SDR** (Felix, 9 Nov 2026): if a deal is closed lost and its
   discovery meeting never took place (outcome No show / Cancelled, or closed lost reason "No Show"), the owner is the SDR who
   booked it, not the AE. Only ever move OPEN deals to the AE; never move a closed deal to an AE.

## End-of-day confirmations (added 9 Nov 2026, every day at 17:38 UK)
No confirmations for deal-owner moves (Arushi, 9 Nov): those are only logged.

### 1. #inbound-visits daily summary (post in C0BLTRVSEKA, top-level, not a thread)
Before posting, make sure every ICP company (6/10+) seen today is assigned in HubSpot: if any is missing an owner or isn't in
HubSpot, run it through the visits table now (create, fill SDR Insights, round-robin). Companies below 6/10 are NOT created in HubSpot.
Numbers for the UK day (from `api/data?part=visits&days=1`, cross-checked against the channel):
- **Visits**: every Dealfront alert today. **Company visits**: unique companies. **ICP**: unique companies scored 6/10+.
Format:
```
*Inbound visits · <Day date>*
• Visits: N  · Company visits: N  · Fit our ICP: N
*ICP companies and who's on them*
• <Company> (8/10): @SDR, <HubSpot link>
• ...
Not ICP (not added to HubSpot): <names, comma separated>
_SDR routing_
```
If there were no alerts, post one line saying so.

### 2. Form submissions daily summary (post in #sdr-hub C0CEEB94MB2, top-level)
Every demo request (Contact Us Form Website V2) and audit unlock (Hiring Experience Audit) converted on the UK day, excluding
@inploi.com and test addresses. For each: make sure the company has the SDR as **SDR Owner and Company owner** (fill empty only;
if a different SDR/owner is already there, keep it and report that person as point), the contact owner is the same SDR and the
contact is linked to the company; then add a **note on the company record** (structured, see below).
Slack format (one block per submission):
```
*Form submissions · <Day date>* (N demo requests · N audit unlocks)
1. *Demo request* · <Contact name> (<title>) at <Company>
   • Point: @SDR (contact owner) · Company assigned to: <SDR> (SDR Owner + Company owner)
   • ICP: <Fit> / <Tier>, <one-line reason>
   • Records: <contact link> · <company link>
2. ...
_SDR routing_
```
Company note (one per submission, owner = the SDR):
```
Form submission · <date time UK>
Type: Demo request | Audit unlock (<audit URL, score>)
Contact: <name>, <title>, <email>
Point: <SDR> (contact owner)
Company assigned to: <SDR> (SDR Owner + Company owner)
ICP: <Fit> / <Tier>: <reason>
Routing: <round-robin | existing owner> (logged in docs/inbound-visits-log.md)
```
If there were none, post one line saying so. Log both posts in `docs/inbound-visits-log.md`.
