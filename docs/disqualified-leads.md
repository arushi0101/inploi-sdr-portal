# Disqualified inbound leads

Every inbound lead (website form or visit) that an SDR, BDR, AE or Arushi disqualified, with the reason, so we can see
patterns (vendors, spam, students, wrong country) and keep them out of the counts. IDs and company names only: no
person names or emails. Kept up to date by the hourly run (step E: inputs from #inbound-leads) and checked at the end of each day.

On disqualifying: contact Lead Status → Not Qualified (overwrite only New / No Two-Way Contact / empty); company Account
Status → Disqualified only if empty, New or Inbound and there is no open deal; add a short note on the contact.

| Date | Source | Company (HubSpot ID) | Contact ID | Disqualified by | Reason | Where |
|---|---|---|---|---|---|---|
| 2026-11-18 | Demo request | Streamlinex Tech (463739813107) | 903565178089 | Evan | Vendor: used Request a Demo to pitch their own company | #inbound-leads thread on the 16 Nov round-robin post; company Account Status → Disqualified, note 548092921044 |
| 2026-11-18 | Demo request | Melotto Group (470067755228) | 929295765740 | Arushi | Vendor: small US writing/research consultancy, no ATS or live roles | Arushi's DM to Claude; held post cancelled |
| 2026-11-17 | Demo request | digitalstackinsider.com (no company) | 928411740392 | Matthew | Vendor/media site, US number; selling data lists | HubSpot (Not Qualified at 15:37); #inbound-leads thread on the HubSpot round-robin post |
| 2026-11-17 | Form (Field Sales) | company 463730800886 | 898512666832 | Nikita, Arushi | Blacklisted spam address | #inbound-leads thread on the 16 Nov round-robin post |

Earlier form flags (vendors, spam, typo domains) set before 17 Nov live in `FORM_FLAGS` in `api/data.js`; every new disqualification is added there too so it drops out of dashboard counts.
