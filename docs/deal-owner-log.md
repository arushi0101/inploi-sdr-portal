# Deal owner changes (discovery meetings go to the AE)

Rule (Felix, 9 Nov 2026, agreed by Arushi): when a discovery meeting is booked, the deal belongs to the AE taking the meeting
(Jason Baaphy 1709905072 or Felix Dealtry 511871441), never the SDR. The SDR keeps the credit in **SDR beneficiary** (`sdr_beneficiary_s_`),
which is what the dashboard counts.

| When (UTC) | Deal | Was | Now | How the AE was identified | SDR beneficiary |
|---|---|---|---|---|---|
| 2026-11-09 12:10 | Pets At Home (538179273970) | Matthew Meehan | Felix | HubSpot meeting "inploi x Pets at Home intro" owned by Felix | Matthew (already set) |
| 2026-11-09 12:10 | Dimensions Uk (535052293343) | Nikita Rohwer | Jason | meeting "inploi x Dimensions \| Intro" owned by Jason | Nikita (already set) |
| 2026-11-09 12:10 | Pilgrims Europe (535114281183) | James Crawford | Jason | meeting "inploi x Pilgrim's Europe \| Intro" owned by Jason | James (already set) |
| 2026-11-09 12:10 | Müller UK & Ireland Group (535097086194) | James Crawford | Jason | meeting "inploi x Muller \| Intro" owned by Jason | James (already set) |
| 2026-11-09 12:10 | Aegon Ltd. (534705293506) | Evan Williams | Jason | Evan's #grwth post 31 Oct: "with Jason" | Evan (already set) |
| 2026-11-09 12:10 | AJ Bell (532919454918) | Evan Williams | Felix | Evan's #grwth post 29 Oct: "with Felix" | Evan (already set) |
| 2026-11-09 12:10 | Fortnum and Mason (282321118435, closed) | Nikita Rohwer | Felix | meeting attendee Felix (Aug 2025, no-show) | Nikita (was empty, now set) |
| 2026-11-09 12:32 | Fortnum and Mason (282321118435, closed) | Felix | **Nikita (reverted)** | Felix: a deal closed without the meeting ever happening goes back to the SDR (this one was a no-show) | cleared again (as before) |

Not changed: Hitachi Rail (479977248995, closed, Nikita). Never assigned to an AE (Nikita's #grwth post, 26 Feb: "will assign it to someone closer to the time").
| 2026-11-09 12:30 | Fortnum and Mason **company** (6485223872) | Account status Disqualified, no SDR Owner | **Continuation** (reason "Other (see notes)", follow-up 11 Nov 2026), SDR Owner Nikita | Arushi: no-show, back to SDR to rebook | Note 541152859351 + task 541139108050 for Nikita (due 11 Nov 09:00 UTC) |

- 2026-11-10 13:54 UTC: Bill's Restaurants deal 538608048346 moved from Evan (29569626) to Felix (511871441). AE taken from the calendar invite "Bill's Restaurant x inploi | Intro Chat … (Felix Dealtry)", 2 Feb 2027. SDR beneficiary stays Evan. No confirmation posted.

- 2026-11-11 17:48 UTC: SpaMedica deal 535012857072 (Emerson flagged it). The SDR Owner (sdr_beneficiary_s_) was changed from Jake Donald (1221748725) to Evan (29569626), and the deal owner from Jake to Felix (511871441). Evan booked the intro (meeting 537167349969, 12 Nov 14:30) "with Felix" (#grwth post). The hourly routing missed it because it only checked SDR-owned deals; the rule now covers Jake-owned deals too.
- 2026-11-11 18:11 UTC: Audit of open discos created since 1 Sep:
  - Hesley Group (532907939025): owner empty → Felix; SDR Owner empty → Evan (Evan's #grwth Meeting Booked post, 28 Oct).
  - Gleeds (535103251650): owner empty → Felix; SDR Owner left empty (Felix's post says "Booked by Alex from the event").
  - Not changed, for Arushi: Pets At Home (538179273970). Felix posted the booking himself on 9 Nov, but the SDR Owner is Matthew.
  - Checked and correct: Culina, Ole & Steen, Bristol Airport and Popeyes have Felix as SDR Owner because Felix booked them himself or they came in inbound to him.

- 2026-11-12 08:20 UTC: Arushi confirmed the roles: AEs (Felix, Jason) always own deals, and SDRs (Matthew, James, Nikita, Evan) get the SDR credit. Pets At Home is resolved as it stands (owner Felix, SDR Owner Matthew), so no change was needed. All 19 open sales-pipeline deals since 1 Sep already have an AE as owner. Felix is SDR Owner on Culina Group, Ole & Steen, Bristol Airport, Popeyes UK and V&C (closed); I asked Arushi before changing them.
- 2026-11-12 12:16 UTC: Arushi confirmed the pod rule (Felix → Matthew, Jason → James). SDR Owner changed from Felix to Matthew Meehan on Culina Group (534957341930), Ole & Steen (535010104509), Bristol Airport (525517547767), Popeyes UK (519536532728) and V&C (521653645507, closed). Deal owners not changed (Felix).
- 2026-11-12 17:11 UTC: CMAC Group UK (540014559466): deal owner Evan → Felix. Evan's #grwth post (12 Nov) says "Assigned to: Felix"; the discovery call is on 23 Nov. SDR Owner stays Evan. The move was attempted at 14:08, 15:08 and 16:08 but each try was interrupted by a worker restart; it went through at 17:11.
- 2026-11-13 08:11 UTC: FIFA (448944047302): SDR Owner set to Matthew Meehan (was empty), per Arushi's pod rule (Felix's meeting goes to Felix's pod). Company owner (Annie) left as is.
- 2026-11-13 11:11 UTC: FIFA deal (541282858230), created 13 Nov 09:36: owner Felix (correct). SDR Owner was Felix (an AE), changed to Matthew Meehan under the pod rule. This was attempted at 10:07, but a worker restart interrupted it.
- 2026-11-13 15:52 UTC: BBC (541154735313): deal owner Nikita → Jason (Nikita's #grwth post 13 Nov says 'Assigned: Jason'; Jason owns the 23 Nov intro meeting). SDR Owner empty → Nikita (she booked it).
- 2026-11-13 18:15 UTC: BBC (deal 541154735313): Arushi sent the credit question herself (Matt, Joseph and Emerson, plus a heads-up to Nikita). Still on hold: deal owner Jason, SDR credit Nikita. No change until a decision comes back.
- 2026-11-15 17:13 UTC: BBC (deal 541154735313): Arushi confirmed the decision. SDR credit goes to Nikita (29569628, already set, so no field change) and Jason stays deal owner. Added note 545420902621 to the deal and the company. Added a dashboard credit note (`CREDIT_NOTES` in api/data.js), shown in the booked-meetings Note column and the deals "Credit note" column. Added the rule to the runbook.
- 2026-11-16 08:20 UTC: BBC dashboard note checked. Git pushes weren't redeploying on their own (the last live build was b52197c), so I deployed main by hand, first 60ec949 and then f8ca3b7. I also added the note to the meetings list. I confirmed both the live API data and Matt's deals tables show the credit note for BBC.
- 2026-11-16 08:45 UTC: BBC wasn't counted in Nikita's meetings-booked figures. The meeting list showed it, but the summary table only counts companies HubSpot records as newly moving to Meeting Booked, and BBC had no such move. Added `MANUAL_BOOKINGS` to api/data.js so BBC (13 Nov) counts for Nikita everywhere, and deployed. New rule from Nikita in #sdr-hub (16 Nov): Nikita and Evan have no pod AE, so any meeting they book is theirs, and the pod rule only covers James and Matthew. Added the rule to the runbook and the hourly task, and updated the dashboard note.
- 2026-11-16 09:15 UTC: Arushi reconnected the Vercel project to arushi0101/inploi-sdr-portal in Settings → Git. This commit tests that pushes to main now deploy on their own.
- 2026-11-16 11:10 UTC: FIFA (448944047302) taken out of the SDR meetings-booked count (EXCLUDED_BOOKINGS in api/data.js, Nov 2026 only). The 13 Nov move to Meeting Booked came from the clean-up after Felix re-engaged an old meeting, not a new SDR booking. Week of 9 Nov: 4 meetings, not 5 (Evan; Emerson asked, Arushi agreed, 16 Nov).
- 2026-11-16 12:10 UTC: Meetings-booked check against #grwth (Arushi): Gleeds (8776084937) taken out of the SDR count (marketing booking by Alex, posted by Felix; was credited to Matthew through the pod). Care Dorset added as James's booking on 12 Nov (Jason booked it himself, pod rule; not a HubSpot company yet, placeholder id manual-care-dorset). Left as is at Arushi's call: Matthew's five 9 Oct Meeting Booked moves (Azets, Crick, KPMG, Intertek, VF Corp) and Ole & Steen (credited to Nikita via SDR Owner; deal SDR Owner is Matthew).
- 2026-11-16 12:13 UTC: Care Dorset created at Arushi's request: company 467490511056 (Company owner + SDR Owner James, Account Status Meeting Booked), contact 923908602105 (MD; Lead Source Event; owner James), deal 542185459936 (owner Jason, SDR Owner James, Discovery, New Customer, Deal Source Marketing, channel Marketing - Event, Intro Source notes the Care Strategy Forum 12-13 Nov). Matches Jason's other event bookings (Paramount, Azets, GBG). No event option exists for the Care Strategy Forum. Dashboard now uses the real company id; manual bookings now override an automatic row for the same company within 21 days.
- 2026-11-16 12:35 UTC: LinkedIn added as an outreach metric (Arushi): HeyReach logs LinkedIn messages in HubSpot as communications (channel LINKEDIN_MESSAGE); counted per SDR by activity owner on the overview, scorecard and channel mix. heyreach_* contact fields are not filled in yet.
- 2026-11-16 13:12 UTC: Hourly run: no new visits, forms or meetings. Duplicate deal found: 'Care Dorset' 542521411812 (owner James, no contact) was created at 12:11:40 by the HubSpot workflow 'Discovery Meeting Booked > Create New Deal' when the new company was set to Meeting Booked, 34 seconds before the full deal 542185459936. Left as is and flagged to Arushi to delete (deleting needs her).
- 2026-11-17 contact 898512666832: Lead Status → Not Qualified (spam, confirmed by SDR in #inbound-leads thread)
- 2026-11-17 Care Dorset duplicate deals merged at Arushi's request: 542521411812 (workflow duplicate) merged into 542185459936; HubSpot's merged deal id is now 543980842187. Done once via a temporary hard-coded endpoint (api/merge-once.js), removed straight after.
- 2026-11-17 10:10 UTC hourly run: new deal 544332425431 (NHS Oxford - Candidate Management) created by Felix, owner Felix, channel Founder. Existing customer (Oxford Health NHS, renewed Oct 2026), founder-led pilot with no #grwth booking post: treated like the other customer/expansion deals, SDR Owner left empty, nothing changed. No new visits, forms or meetings.

## 2026-11-18 Cold data → SDR (Emerson's request)

- 2026-11-18 07:05 UTC: Deal Source (`discovery_meeting_channel`) changed from `Cold data` to `SDR` on deals 535012857072 and 535010104509. Nothing else changed. Re-read: both now `SDR`.
- Only 2 deals carried `Cold data` (both created 2026), not 5. 0 pre-2026 deals use it.
- The `Cold data` option is still on the property definition; removing it needs HubSpot property settings (not possible through the tools here). Nothing deleted or archived.

## 2026-11-18 Closed-lost reasons + deal source backfill (#33)

- 2026-11-18 07:40 UTC: Sales pipeline 3833763026, Closed Lost, close date in 2026, empty `closed_lost_reason`: 8 deals found. `closed_lost_reason` and `closed_lost_detail` (both empty before) set on 7; one evidence note added to each of those 7 deals. Nothing else changed.
  - 504636594374: `Timing` (HIGH). Call 2 Sep 2026: missed the hiring window, parked until Q1 2027. Note 548092549358.
  - 496647844040: `No Decision` (MEDIUM). No reply after the 7 May demo; 30 Jul close-out email unanswered. Note 548033336519.
  - 478598825164: `Qualified Out` (MEDIUM). Email 24 Jul after the pricing call: chatbot alone won't solve the problem; needs ATS integration. Note 548033336522.
  - 471596134587: `Budget` (MEDIUM). Prospect email 21 Oct: 2027 budget approval unlikely. Note 548091120855.
  - 14472445686, 5689876694, 5689902296: `Other` (bulk-closed 11 Aug, no evidence; #33 rule for bulk-closed deals). Notes 548033336524, 548091120858, 548035494084.
  - 502453425391: left empty. Weak evidence only: the demo was rescheduled by the prospect, then calls 17-20 Jul went unanswered, and the deal was closed before the 20 Jul demo slot.
- Deal Source (`discovery_meeting_channel`): filled on all 8 deals, so nothing was changed. `sdr_beneficiary_s_` was not changed either. Flagged for review, not changed:
  - 496647844040: Deal Source `Marketing` matches the evidence (AE booked it at an event, #grwth 25 Mar), but SDR Owner is 29569628 and no SDR booked it.
  - 478598825164: current `SDR`; evidence suggests `Marketing` (the #grwth post says the prospect asked for a demo by email). SDR 29569626 handled the booking.
  - 14472445686: current `Marketing`; source unclear (2024). Nov 2026 pilot meetings are logged on this closed deal and not on the open deal 544332425431.
  - 5689876694, 5689902296: current `SDR`; there's no evidence to check it against (imported 2020/21 deals).
- Re-read all 8 deals: the values match.

- 2026-11-18 07:45 UTC (Arushi): Konecranes 502453425391 closed_lost_reason → No Decision (+ detail, note 548091843796). Ramboll 496647844040 sdr_beneficiary_s_ 29569628 → 32364701 (Felix self-booked at event → pod SDR; note 548035500251).

## 2026-11-18 #31 Marketing → SDR relabel

- 2026-11-18 14:43 UTC: `discovery_meeting_channel` `Marketing` → `SDR` on 5 deals. Nothing else changed (`deal_source` and `sdr_beneficiary_s_` untouched). Re-read: all 5 now `SDR`.
  - 530484600034 (SDR 29569628)
  - 532919454918 (SDR 29569626)
  - 533642515651 (SDR 29569626)
  - 534705293506 (SDR 29569626)
  - 540014559466 (SDR 29569626)
- Left as `Marketing` (no SDR booked the meeting): 496407283950, 496640316636, 496647844040, 496511705279, 502452474082, 541282858230, 534957341930, 510951564492, 510207889637.

- 2026-11-18 17:09 UTC (hourly run): Banham 544903320788 (company 470197261531, created 16:43, meeting 548670242015 on 3 Dec). Owner already Jason (1709905072). Jason booked it himself from an HR Forum 1-2-1 (#grwth 1795020115.654059), so `sdr_beneficiary_s_` empty → 29569627 (Jason's pod SDR). Nothing else changed. Re-read: 29569627.

## 2026-11-24 #31 closed (Arushi OK)

- 2026-11-24 08:15 UTC: Checked the `discovery_meeting_channel` (Deal Source) definition: options are AE, SDR, Marketing, Partner, Customer, Founder. `Cold data` is gone, so 0 deals carry it.
- Arushi OK'd the relabel outcome: the 5 SDR-set deals moved on 18 Nov stay `SDR`. The 9 left as `Marketing` (496407283950, 496640316636, 496647844040, 496511705279, 502452474082, 541282858230, 534957341930, 510951564492, 510207889637) were booked by an AE at an event. Their SDR Owner is pod credit, so they fall under the event-package exception in the fix's "done when". No HubSpot changes today.
- Notion fix #31 row updated: status Done, waiting-on cleared, progress note added.

## 2026-11-24 #31 booking-SDR pass (Arushi's instruction)

Arushi's instruction (24 Nov, task board): find the SDR who booked or was working each account and set them as the source; then check that all non-legacy deals have sources. This reopens the 9 "AE booked at an event" deals from 18 Nov. Rule used: an SDR booked the meeting, or SDR calls/emails on the account in the 60 days before the booking → `discovery_meeting_channel` = `SDR` and `sdr_beneficiary_s_` = that SDR. Real event booking with no SDR work before it → keep `Marketing`. If it was unclear → no change.

- 2026-11-24 08:48 UTC: 7 deals updated in one write. Every deal was re-read before and after the write, and all values match.

### Changes

| Deal | Property | Before → After | Evidence |
|---|---|---|---|
| 534957341930 Culina Group | discovery_meeting_channel | Marketing → SDR | James Crawford worked Culina from Dec 2025 onward (60+ calls). He called Robin Morle on 8 and 21 Oct. Felix's "Inploi x culina intro" invite (545536573657) was created on 22 Oct, and James emailed Robin "Re: inploi - great to speak, Robin" the same day. The #inbound-leads screen on 28 Oct says James was working the account. |
| 534957341930 Culina Group | sdr_beneficiary_s_ | 32364701 (Matthew, pod) → 29569627 (James) | Same evidence. James booked or worked the account; Matthew has no activity on it. |
| 510951564492 SLR Consulting | discovery_meeting_channel | Marketing → SDR | Matthew became company owner on 29 Jun. He sent 2 emails on 30 Jun and 1 on 10 Jul ("The trust problem from Alex's RecFest talk"). He logged the outcome (Interested) on the 17 Jul intro (504593268953). SDR stays 32364701. |
| 510207889637 Old Mill | discovery_meeting_channel | Marketing → SDR | James created the Discovery Call meeting himself (502066576595, created 3 Jul). His note: "Shared link to RecFest, with more information and booking link. Booked time in with Jason from the link." Earlier James calls and emails to Emma Coleman: Dec 2025 to Jan 2026. SDR stays 29569627. |
| 509652673751 Next Retail | sdr_beneficiary_s_ | empty → 29569626 (Evan) | Evan created the "inploi x NEXT, Intro Call" meeting on 1 Jun (494977277128, for 22 Jun), with calls and emails the same day. The channel was already SDR. |
| 515175934158 Day Lewis Pharmacy | sdr_beneficiary_s_ | empty → 29569628 (Nikita) | Nikita called Neil Hopkins from Nov 2025 to Aug 2026, and the "Nikita who just called" email thread got replies on 6-7 Aug. The intro meeting was created on 7 Aug. The channel was already SDR. |
| 525861946616 Intertek | sdr_beneficiary_s_ | empty → 29569626 (Evan) | Evan worked Intertek from Apr to Sep (calls to Tina Smith on 19, 26 and 28 Aug and 16 Sep; emails on 28 Aug and 16 Sep). Felix booked the demo on 7 Oct, within 60 days of Evan's last contact. The channel was already SDR. |
| 506575469798 Travis Perkins Plc | sdr_beneficiary_s_ | 1709905072 (Jason, AE) → 29569626 (Evan) | Evan created the intro meeting on 5 Jun (495701440756) and worked the account from Nov 2025 to Jun 2026 (calls and emails). An AE in the SDR field was wrong. |

### The 9 deals, kept as Marketing (event booking, no SDR work before it)

- 496407283950 The LEGO Group: RL Exchange (Mar 26). No SDR calls or emails on the company in 2026, and no #grwth "Meeting Booked" post. SDR Owner 29569628 is pod or earlier credit (left alone).
- 496640316636 Dominus Hospitality: Above & Beyond (Mar 26). Felix's calendar booked the 10 Apr disco (482063273193, created 31 Mar). No SDR activity. SDR Owner 29569628 left alone.
- 496647844040 Ramboll: Felix's #grwth post on 25 Mar says "booked demos with Ramboll, Red Bull..." at RL Exchange. The meeting body says "Booked via RLX". No SDR activity. SDR Owner 32364701 (pod, set 18 Nov) left alone.
- 496511705279 Red Bull: same #grwth post. The meeting body says "Booked via RLX". Evan's one call on 9 Jan falls outside the 60-day window. SDR Owner 29569628 left alone.
- 541282858230 FIFA: Felix met FIFA at a Sept event (#gtm, 17 Sep) and booked the demo himself. No SDR activity. Evan and Arushi confirmed the Nov deal is a cleanup re-registration. SDR Owner 32364701 (pod) left alone.

### Left unchanged, unclear (for Arushi)

- 502452474082 Arcadis: Jason posted "Meeting Booked with Emma Hale" on 14 May. Emma is a new contact he created at IHR Manchester. James had worked Arcadis earlier (calls and emails in Jan, including "inploi - we just spoke" on 9 Jan), but he logged only 1 dial (1 Apr) in the 60 days before. SDR Owner is 29569626 (Evan), and Evan has no logged activity on Arcadis. Recommendation: keep Marketing and consider James instead of Evan as SDR Owner. Arushi to decide.

### Part 2: non-legacy integrity check (sales pipeline, created on or after 2026-01-01: 161 deals)

- Channel counts after this pass: SDR 80, Marketing 34, Customer 19, Partner 16, AE 10, Founder 1, empty 1.
- Empty channel: 548857402609 Island Healthcare (created today, no deal owner yet; Felix demo 2 Dec). Left for the AE or the hourly run.
- SDR channel with empty SDR Owner, left unchanged:
  - 478652404925 J D Wetherspoon: booked by Cecile Bigot (#grwth, 24 Feb). She has left and isn't an option in the dropdown.
  - 494795881703 Novo Nordisk: booked by Jean Pierre de Beer (meeting 479718207716). He has left and isn't an option.
  - 466415493319 Suez: partner-led (#grwth, 5 Mar, Pete from PP). The channel probably should be Partner.
  - 512598954172 Gatwick Airport: Felix booked it himself via LinkedIn (#grwth, 14 Jul). The channel probably should be AE.
  - 524808379623 Insanity: Felix met them at an event (#pricing-requests, 2 Oct). The channel probably should be Marketing.
  - 527446504697 The Francis Crick Institute: Felix booked it at an Oct event (#gtm, 8 Oct). Evan's touches were in Dec and Feb, more than 60 days before. The channel probably should be Marketing.
  - 535103251650 Gleeds: "Booked by Alex from the event" (#grwth, 27 Oct). The channel probably should be Founder or Marketing.
  - 512599223491 Islington Council: no SDR activity or Slack post found. Unclear.
- Marketing channel with an SDR in SDR Owner: the 9 above except Culina, SLR and Old Mill (now SDR), plus 543980842187 Care Dorset (James), 544903320788 Banham (James) and 517648218359 Harding+ (Jake Donald). Care Dorset and Banham were booked by Jason himself (#grwth, 12 and 18 Nov), so the SDR Owner there is pod credit. Harding+ has no SDR evidence. Left alone.
- AE or non-SDR in SDR Owner: 506575469798 Travis Perkins fixed (Jason → Evan). 517648218359 Harding+ has Jake Donald, who isn't an SDR. Flagged.
- Also noted: 441896134857 EY and 497918142705 Lendable (AE channel, SDR Owner set), and 525517547767 Bristol Airport (Partner channel, SDR Owner Matthew). Left alone.

## 2026-11-24 #31 second pass (Arushi: assign booking/working SDR)

Arushi's instruction (24 Nov): find the SDR who booked each meeting, or who was working the account, and set them as the source. Rules, applied in order:
1. An SDR booked the meeting → SDR + that SDR.
2. Otherwise, the most recent SDR to work the account before the booking (no time limit: calls, emails, sequences, the company's SDR Owner) → SDR + that SDR.
3. No SDR ever touched the account → keep the current source and fix only an obviously wrong value. Remove Jake Donald from SDR Owner.
4. The booker was an SDR who has since left → SDR, with SDR Owner left empty.

Rule 2 judgement: a company SDR Owner that was pod or patch credit, with no logged SDR activity before the booking, does not count as "working the account". Example: FIFA's SDR Owner was set on 13 Nov, after the booking. The current SDRs logged no activity on LEGO, Dominus, Ramboll or FIFA. Their only earlier contact came from people who have since left (Cecile on LEGO, 1 call in Aug 2024). So rule 3 applied to those deals.

- 2026-11-24 09:50 UTC: one write of 9 deals. 7 updated. 2 were rejected by the portal ("dealtype is required based on the values of other properties"), so nothing changed on them. All 9 were re-read before and after the write.

### Changes applied

| Deal | Property | Before → After | Evidence |
|---|---|---|---|
| 512598954172 Gatwick Airport | sdr_beneficiary_s_ | empty → 29569628 (Nikita) | Rule 2. Nikita logged 11 calls Jul–Oct 2025 and sent the "inploi x Gatwick possible collaboration" emails on 14 Jul 2025. Felix later booked via LinkedIn (#grwth, 14 Jul 2026). |
| 527446504697 The Francis Crick Institute | sdr_beneficiary_s_ | empty → 29569626 (Evan) | Rule 2. Evan made calls Dec 2025–19 Mar 2026 and emailed up to 26 Feb 2026 ("Post-Talent Tech Rising check-in"). Felix booked the demo at the Oct event. |
| 535103251650 Gleeds | sdr_beneficiary_s_ | empty → 29569628 (Nikita) | Rule 2. Nikita logged 48 company calls (10 more via contacts) Sep 2025–Feb 2026 and sent emails in Sep 2025. Alex booked from the Oct event (#grwth, 27 Oct). |
| 548857402609 Island Healthcare | discovery_meeting_channel | empty → SDR | Rule 2. On 11 Nov Evan requested the Care Strategy Forum 1-2-1 with Ian Bennett (MD) (group DM). Follow-up was agreed at the forum (#gtm wrap-up, 13 Nov), then Ian booked Felix's 2 Dec demo. |
| 548857402609 Island Healthcare | sdr_beneficiary_s_ | empty → 29569626 (Evan) | Same evidence. |
| 524808379623 Insanity | discovery_meeting_channel | SDR → Marketing | Rule 3. No SDR activity ever (Felix only), and the company has no SDR Owner. Felix "met at the event" (#pricing-requests, 2 Oct). |
| 512599223491 Islington Council | discovery_meeting_channel | SDR → Marketing | Rule 3. No SDR calls or emails ever (Felix only). The Gong intro (17 Jul) says Robert's interest came from conversations at RecFest. The company's SDR Owner is Matthew as patch credit, with no activity. |
| 517648218359 Harding+ | sdr_beneficiary_s_ | 1221748725 (Jake Donald) → empty | Rule 3. Jake isn't an SDR, and no current SDR touched the account (only Felix since Nov 2025, plus Reece Pinnock and Dila Tumer in 2023–24, both gone). Marketing kept. |

### Blocked by the portal (Arushi to action)

| Deal | Intended change | Evidence | Blocker |
|---|---|---|---|
| 502452474082 Arcadis | Marketing → SDR; SDR Owner 29569626 (Evan) → 29569627 (James) | Rule 2. James logged 15 calls and 10 emails Jan–Apr 2026 before Jason's booking on 14 May at IHR Manchester. The last call was 1 Apr, and company Account Status is "In Progress (SDR actively working)". Evan has no logged activity. | Closed-lost deal with empty Deal Type (`dealtype`). |
| 496511705279 Red Bull | Marketing → SDR; SDR Owner 29569628 (Nikita) → 29569626 (Evan) | Rule 2. Evan logged 38 calls Jul 2025–9 Jan 2026, sent emails in Oct 2025 and ran a sequence in Jan 2025, and is the company owner and SDR Owner. Felix booked at RL Exchange on 25 Mar 2026. | Same: Deal Type is empty. |

### Left as is

- 466415493319 Suez: rule 4. Cecile Bigot (left) worked it with 54 calls Dec 2024–8 Aug 2025. Felix's call on 13 Feb refers to the "last conversation in August". SDR kept, and SDR Owner stays empty because Cecile isn't an option.
- 478652404925 J D Wetherspoon: rule 4. Cecile Bigot booked it (#grwth, 24 Feb). SDR Owner stays empty.
- 494795881703 Novo Nordisk: rule 4. Jean Pierre de Beer (left) booked it and created meeting 479718207716 on 20 Mar. SDR Owner stays empty.
- 496407283950 The LEGO Group: rule 3. Booked at RL Exchange. No current-SDR activity; Cecile made 1 call in 2024. Marketing kept, and the Nikita SDR Owner was left alone (not obviously wrong under the rules). The company SDR Owner is Matthew.
- 496640316636 Dominus Hospitality: rule 3. Booked at Above & Beyond, with no SDR activity ever. Marketing kept, and the Nikita SDR Owner was left alone.
- 496647844040 Ramboll: rule 3. "Booked via RLX" by Felix, with no SDR activity. Marketing kept, with Matthew as pod SDR Owner.
- 541282858230 FIFA: rule 3. Felix booked it at a Sept event, with no SDR activity. Marketing kept, with Matthew as pod credit (set 13 Nov).
- 543980842187 Care Dorset: rule 3. Jason requested the 1-2-1 himself (Evan's 11 Nov list says "Jason has already requested"), and Jason booked it (#grwth, 12 Nov). Marketing kept, with James as pod credit.
- 544903320788 Banham: rule 3. Jason's own HR Forum 1-2-1 (#grwth, 18 Nov), with no SDR activity. Marketing kept, with James as pod credit.

### Integrity check after this pass (sales pipeline, created on or after 2026-01-01: 161 deals)

- Deal Source counts: SDR 79, Marketing 36, Customer 19, Partner 16, AE 10, Founder 1, empty 0.
- Every deal has a Deal Source: yes.
- SDR-sourced deals with no SDR Owner: 3. All three have a documented departed-SDR reason (Suez and J D Wetherspoon: Cecile Bigot; Novo Nordisk: Jean Pierre de Beer).
- AE or other non-SDR in SDR Owner: 0.
- Still failing: Arcadis and Red Bull hold their old values until Deal Type is filled in; after that, the changes above can be applied. Island Healthcare also has no deal owner yet. The demo is Felix's, but deal owner was out of scope here.

## 2026-11-24 #31 Deal Type fill + final fixes (Arushi approved)

Arushi approved this on 24 Nov ("Yes for the above"). Writes ran 09:57–09:58 UTC in 6 batches (10/10/10/10/10/3). All 53 deals were re-read before and after: 53 updated, 0 failed.

Deal Type options in the portal: `newbusiness` (label "New Customer"), `existingbusiness` ("Upsell"), `Cross-sell`, `Re-Engaged`, `Re-Activation`, `Renewal`, `Price Increase`.

### Final fixes

| Deal | Property | Before → After | Reason |
|---|---|---|---|
| 502452474082 Arcadis | dealtype | empty → newbusiness | Needed before the SDR fix could save. Company is a prospect (lifecycle Opportunity, no close date). |
| 502452474082 Arcadis | discovery_meeting_channel | Marketing → SDR | Second-pass rule 2: James worked it Jan–Apr 2026 before Jason's booking on 14 May. |
| 502452474082 Arcadis | sdr_beneficiary_s_ | 29569626 (Evan) → 29569627 (James) | Same evidence. Evan has no logged activity. |
| 496511705279 Red Bull | dealtype | empty → newbusiness | Needed before the SDR fix could save. Company is a prospect. |
| 496511705279 Red Bull | discovery_meeting_channel | Marketing → SDR | Second-pass rule 2: Evan worked it Jul 2025–Jan 2026, and is company owner and company SDR Owner. |
| 496511705279 Red Bull | sdr_beneficiary_s_ | 29569628 (Nikita) → 29569626 (Evan) | Same evidence. |
| 548857402609 Island Healthcare | hubspot_owner_id | empty → 511871441 (Felix) | Felix owns the 2 Dec demo and the company activity. |

### Deal Type fill (empty only, nothing overwritten)

Evidence: none of the 53 is Customer-sourced, and none has "Upsell" or "Expansion" in its name. Every company is lifecycle Opportunity with no customer close date. Charter Communications - Beamery RFP is associated with Beamery, a customer and partner, but the buyer is Charter, a prospect. Portal practice for 2026 prospect deals is New Customer in every case (Re-Engaged and Re-Activation are unused). So every deal got New Customer except one:

- newbusiness (New Customer), 52 deals: 424911626442, 428751270101, 431678968009, 437881273557, 441811684598, 441896134857, 450854801622, 451846118638, 453527937244, 460979076334, 466150160605, 466415493319, 466836078780, 467141338310, 467204571343, 467332355291, 469997224179, 470290802883, 471596134587, 474530017491, 477781002450, 477788141791, 478574237944, 478598825164, 478652404925, 479123367129, 479977248995, 480084135144, 480620964037, 485947143406, 486845912297, 489613457641, 493181507771, 493677259992, 494125337815, 494359981289, 494516407509, 494627099841, 495180232901, 495366624501, 495378540744, 495462554863, 496407283950, 496511705279, 496647844040, 497781902583, 497918142705, 498984641763, 498986091726, 502452474082, 502453425391, 502455018692.
  - Maersk - New Deal 2026 (453527937244): the earlier Maersk deal (2025) was closed lost and typed New Customer, so New Customer again.
- existingbusiness, Cross-sell, other values: 0.
- Left empty, 1 deal: 488034088136 David Lloyd Leisure - Accessibility. It's a second deal (closed lost) on a prospect whose main deal (427718707444, New Customer) is still open at Proposal. Unsure whether it is a separate new deal or a cross-sell of an add-on, and DLL isn't a customer yet. Arushi to decide.

### Integrity after this pass (sales pipeline, created on or after 2026-01-01: 161 deals)

- Deal Source counts: SDR 81, Marketing 34, Customer 19, Partner 16, AE 10, Founder 1, empty 0.
- SDR-sourced deals with no SDR Owner: 3, all with a documented departed-SDR reason (Suez and J D Wetherspoon: Cecile Bigot; Novo Nordisk: Jean Pierre de Beer).
- AE or other non-SDR in SDR Owner: 0.
- Deals with no deal owner: 0.
- Deal Type counts: New Customer 140, Upsell 16, Cross-sell 4, empty 1 (David Lloyd Leisure - Accessibility).
