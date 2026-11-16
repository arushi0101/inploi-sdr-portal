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
