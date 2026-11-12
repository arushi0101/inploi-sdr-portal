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

| Situation | What I do in HubSpot | Post in #inbound-leads (C05CYATGALC) |
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
**before** the #inbound-leads post, then mention "SDR Insights filled" (or what couldn't be found) in the post.
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

### 2. Form submissions daily summary (post in #inbound-leads C05CYATGALC, top-level)
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

> 9 Nov 2026: Arushi moved all form submission posts (hourly and end of day) from #sdr-hub to **#inbound-leads (C05CYATGALC)**.

## Tone for every Slack post (Arushi, 9 Nov 2026)
Polite, soft and supportive. Write like a helpful teammate, never like a ticket system:
- Open warmly ("Hi @Evan 👋", "Lovely news", "A nice one for you").
- Ask, don't instruct: "would you mind picking this up?", "when you get a chance", "no rush if you're tied up, just shout and someone can help".
- Say the SLA kindly: "ideally within the next 24 hours, so they hear from us while it's fresh 🙂" (Fri–Sun: "ideally by Monday lunchtime").
- Give context that helps, not pressure (what they asked for, what we already know).
- Close with thanks or encouragement ("Thank you!", "Good luck, sounds like a great fit 🙌"). Keep `_SDR routing_` as the last line.
- No ALL CAPS, no "must", "please action", "required".

Examples:
```
Hi @Evan 👋 lovely news: Hayley Connor at Joe & the Juice has asked for a demo!
• Contact: <link> · Company: <link> (already yours, In Progress)
• Why it looks promising: 70 live UK frontline roles across their stores, hiring on Greenhouse (ICP YES / HIGH)
Would you mind reaching out when you get a chance? Ideally within the next 24 hours so she hears from us while it's fresh 🙂
If you're tied up, just shout and someone can jump in. Thank you!
_SDR routing_
```
End of day: "Here's today's round-up 🌟 … Thanks everyone for jumping on these!" and, when there was nothing, "A quiet one today, no visit alerts came in. Have a lovely evening!"


## Account Status nudge: meeting booked but status not "Meeting Booked" (Arushi, 10 Nov)
HubSpot is **not** changed. The responsible SDR gets a polite DM asking them to update it.

- **Flag a company when both are true:**
  - It has an upcoming prospect meeting (intro, demo or discovery) owned by an SDR, Jason or Felix, and not cancelled.
  - Its `account_status` is New, In Progress, Inbound, Nurture, Exhausted, Not Interested, or empty.
- **Never flag:**
  - Meeting Booked, Open Opportunity, Continuation or Disqualified.
  - Customer check-ins, partner and internal meetings, where the owner is CS (38079469) or Arushi, or the title says catch-up, check-in, sync or placeholder.
- **Who gets the DM:**
  1. The company's SDR Owner.
  2. Otherwise, the meeting creator or owner if they're an SDR.
  3. If neither, nobody is DM'd. The company is listed in Arushi's end-of-day report.
- **The DM:** one per SDR, grouping all their companies, in the soft tone. Include the meeting, the date, the AE, the current status and the HubSpot link. Ask kindly to switch it to *Meeting Booked*.
- **Timing:** only on weekdays, 09:00 to 17:30 London time.
- **Reminders:** don't re-DM about the same company within 2 working days. After that, send one gentle reminder at most, then stop and list the company for Arushi.
- **Resolved:** when the status becomes Meeting Booked, log it as resolved.
- **Open deals (Arushi, 10 Nov, revised):** no DMs. A HubSpot workflow sets the company's Account Status to Open Opportunity when an open deal exists (see "HubSpot workflow: Open Opportunity" below). This check only covers booked meetings, which get a *Meeting Booked* nudge.
- **Logging:** all of this goes in `docs/account-status-nudges-log.md`. Nothing is posted in channels.


## HubSpot workflow: Open Opportunity (Arushi, 10 Nov)
The workflow is built in HubSpot by Arushi. It is deal-based:
- **Enrolment:** Is closed = false, and the associated company's Account Status is New, In Progress (SDR actively working), Inbound, Nurture, Exhausted, Not Interested or unknown. Re-enrolment is on.
- **Action:** edit the associated company and set Account Status = Open Opportunity.

## In-meeting submissions: AE stays on point (Evan, 10 Nov 2026)
AEs often run the Hiring Experience Audit live during a call, and the report is emailed in the meeting. That unlock is part of the
conversation, not a fresh inbound, and an SDR follow-up would cross the AE's. Before routing any form submission, check:
- **In-meeting:** the contact or their company had a meeting (any owner) starting within 3 hours before or 1 hour after the
  conversion time; or
- **Live AE deal:** the company has an open deal owned by Jason (1709905072) or Felix (511871441).

If either is true:
- Don't ask the SDR to follow up and don't use the SLA line.
- The AE who held the meeting, or owns the deal, is on point.
- Post one short FYI in #inbound-leads: "<Contact> unlocked the audit during/after the call with <AE>, nothing needed from SDRs, just for visibility", with no tags.
- Fill SDR Insights and the company note as usual, with Point = the AE and Routing = "in-meeting (AE on point)".
- In the end-of-day form round-up, show Point: the AE and the same "no SDR follow-up needed" line.

Example: AJ Bell, 10 Nov. Clare Mortimer's audit unlock at 11:40 came from Felix running it live in the 11:00 intro.

## Contact check before every form post (Arushi, 11 Nov 2026)
SDRs shouldn't have to verify a lead themselves before they can judge it. Before posting a form submission, check the person:
1. **Email domain:** a work domain matching the company, a personal address (gmail etc.), or a vendor, agency or software directory
   (e.g. softwarefinder.com, Capterra, G2, recruiters, agencies) that is likely selling to us.
2. **Person (Clay first, Arushi 11 Nov):** run Clay `search-contacts-by-name` with the name and the email domain. If found, use the
   current title and LinkedIn URL in the post. If Clay finds the company but not the person, say "not found at <company>".
   Use Clay's company description to spot vendors and directories. If needed, web-search "<name>" "<company>" plus LinkedIn as well.
   Flag it if the name only matches someone at a different company or in a different country.
3. **Phone:** the country and area from the dialling code compared with the company's location (e.g. +1 213 is Los Angeles).
   Flag a mismatch.
4. **Company:** is it a real employer that hires frontline staff, or a vendor, agency or directory?
5. **HubSpot history:** existing contact, owner, past meetings or deals.

Put the result in the post as one short **Contact check** line, e.g.
"Contact check: verified, Head of Talent on LinkedIn, work email ✅" or "Contact check: couldn't verify. No LinkedIn match,
+1 (LA) number on a listing-site email, likely a vendor pitch 🙏".
Keep the verdict kind and factual. If it looks like a vendor or spam, say so gently and suggest it's fine to skip.
Use Clay for the person lookup, not Apollo (Arushi, 11 Nov).

### HubSpot comms context (Arushi, 11 Nov)
Before every routing post (forms and 6/10+ visits), read the last 90 days of activity on the contact and the company: emails,
calls, meetings, notes and open deals (newest first). Add one short **Context** line so nobody has to dig:
- the last touch: who, when and what (e.g. "Felix emailed intro follow-up + next steps, 10 Nov");
- what's in play: an open deal and its stage, the next meeting and its date, any agreed next step;
- warning signs: an active conversation with someone else (in-meeting rule), recently disqualified, or "not interested".

If there's no history, say "No previous contact in HubSpot". Summarise only; never paste personal phone numbers, personal emails
or private note text into Slack.

## Replies to routing posts (Arushi, 11 Nov 2026)
Every hourly run, read the replies under the last 7 days of "_SDR routing_" posts in #inbound-leads and #inbound-visits.
- Log each SDR or AE reply in `docs/inbound-visits-log.md` with the outcome: worked, not worth it, covered by an AE, wrong person, and so on.
- If an SDR says a lead isn't worth pursuing, set the contact's Lead Status to Unqualified (only if empty) and add a short note.
- If a reply changes how we should route, update this runbook, and say so in a short, warm thank-you reply in the thread.
- List the day's feedback in the end-of-day round-up to Arushi's DM.

## AE conversations: visits and forms (Arushi, 11 Nov 2026)
The in-meeting rule now covers **website visits as well as forms**. If the company has an open deal owned by Jason or Felix, or
had a meeting with them in the last 14 days or has one booked:
- Post to the AE as a **positive-intent signal**, e.g. "Lovely signal for <AE>: <Contact> was back on the site ahead of
  <next step> 🎉". Point out that the interest is good news.
- **Don't mention ICP fit or scores** in these posts, and don't ask SDRs to follow up ("nothing needed from <SDR>").
- Add the Context line (last touch and next step) so the AE has what they need.

## Deals created under Jake Donald (Emerson, 11 Nov 2026)
HubSpot's "New Discovery Meeting Booked" flow sometimes creates the deal with **Jake Donald (1221748725)** as both the deal owner and
the SDR Owner (`sdr_beneficiary_s_`). The hourly deal-owner check now includes these deals as well as SDR-owned ones:
- **Open deals** where the owner or the SDR Owner is Jake, created in the last 30 days, with a discovery meeting.
- **Credited SDR:** the person who booked the meeting (meeting creator or owner, if they're an SDR), else whoever posted "Meeting Booked" in #grwth.
  Set `sdr_beneficiary_s_` to that SDR, overwriting Jake (Emerson approved this).
- **Deal owner:** the AE taking the meeting, using the usual AE rules. Change nothing else.
- Leave older or customer deals where Jake is the real owner (e.g. Wagamama) alone.

Example: SpaMedica (535012857072), fixed 11 Nov. Evan booked it with Felix, so the SDR Owner was changed from Jake to Evan and the deal owner from Jake to Felix.

## Deal hygiene audit (Arushi, 11 Nov 2026)
Every hourly run checks open discovery deals created in the last 30 days for these errors, and fixes them where the evidence is clear:
1. **Deal owner is an SDR, Jake Donald, or empty** → move it to the AE taking the meeting (meeting owner/attendee, else "with Jason/Felix"
   in the #grwth "Meeting Booked" post, else the AE who posted the booking themselves).
2. **SDR Owner (`sdr_beneficiary_s_`) is empty or Jake** → set it to the SDR who booked: the author of the #grwth "Meeting Booked" post
   if they're an SDR, else the SDR who created the meeting. If an AE booked it themselves,
   credit the AE's pod SDR (Felix → Matthew Meehan, Jason → James Crawford; Arushi, 12 Nov). Marketing/event bookings with no SDR or AE booker (e.g. "Booked by Alex from the event") stay empty. Never put an AE in SDR Owner.
3. **Unclear** (e.g. the #grwth post author and the SDR Owner disagree) → change nothing and list it for Arushi once.

Fixed in the first audit (11 Nov):
- SpaMedica: Jake → Felix (owner) and Evan (SDR Owner).
- Hesley Group: empty → Felix (owner) and Evan (SDR Owner), from Evan's #grwth post on 28 Oct.
- Gleeds: empty → Felix (owner). Alex booked it from the event, so there's no SDR credit.

Resolved by Arushi (12 Nov):
- Pets At Home: Felix stays deal owner (AE) and Matthew keeps the SDR credit. When an AE posts the booking but an SDR is already set, keep the SDR.

### Roles (Arushi, 12 Nov 2026)
- **AEs (always the deal owner):** Felix Dealtry (511871441), Jason Baaphy (1709905072).
- **SDRs (the only people who go in SDR Owner / `sdr_beneficiary_s_`):** James Crawford (29569627), Matthew Meehan (32364701), Nikita (29569628), Evan Williams (29569626).
- Every open sales-pipeline deal's owner is an AE, and SDR Owner holds an SDR or stays empty, never an AE.
- **Pods:** an AE's own booking credits their pod SDR: Felix → Matthew Meehan (Sales Pod 2), Jason → James Crawford (Sales Pod 1). The dashboard uses the same pairing.
- 12 Nov: SDR Owner changed from Felix to Matthew on Culina Group, Ole & Steen, Bristol Airport, Popeyes UK and V&C (Arushi).
