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
