// Live SDR data from HubSpot. Needs the HUBSPOT_TOKEN env var (a HubSpot private app token, read-only scopes).

const API = 'https://api.hubapi.com';
const SDRS = [
  { k: 'james', id: '29569627', name: 'James Crawford', short: 'James', pod: 'Sales Pod 1', lead: 'Jason Baaphy' },
  { k: 'matthew', id: '32364701', name: 'Matthew Meehan', short: 'Matthew', pod: 'Sales Pod 2', lead: 'Felix Dealtry' },
  { k: 'nikita', id: '29569628', name: 'Nikita Rohwer', short: 'Nikita', pod: 'SA / Partnerships', lead: '' },
  { k: 'evan', id: '29569626', name: 'Evan Williams', short: 'Evan', pod: 'Marketing', lead: '' }
];
const SDR_IDS = SDRS.map(s => s.id);
const OWNER_NAMES = { '1709905072': 'Jason Baaphy', '511871441': 'Felix Dealtry', '32978778': 'Annie Claassens', '511871465': 'Matt de la Hey', '36304602': 'Joseph Williams' };
SDRS.forEach(s => { OWNER_NAMES[s.id] = s.name; });

// Call outcome ids
const DISP = {
  'f240bbac-87c9-4f6e-bf70-924b57d47db7': 'connected',
  'cac480f0-a8c0-4042-a92a-7a00144842f2': 'valuable',
  '522f6325-eb24-4b15-a96d-378c8dab9af8': 'booked',
  '73a0d17f-1163-4015-bdd5-ec830791da20': 'noans',
  '1595831b-ac6b-4d8d-bac9-2f711edd96a7': 'bot',
  'e769fdeb-c488-428d-9a5a-f9a6391f8aaa': 'gatekeeper',
  '17b47fee-58de-441e-a44c-c6300d46f273': 'wrong',
  'e4c946f0-5174-48ed-b1d9-9ea275fa754a': 'badtiming',
  '40854b06-5e3f-4748-8eb5-03008d8303d0': 'notint',
  'b2cf5968-551e-4856-9783-52b3da59a7d0': 'voicemail'
};
const CONV = new Set(['connected', 'valuable', 'booked']);
const PROGRESSION = /proposal|pricing|feedback|business case|commercial|placeholder|update|renewal|qbr|contract|negotiat|follow[- ]?up|check[- ]?in|poc\b|workshop|onboarding/i;
const LEAD_START = '2026-09-15';

/* ---------- HubSpot helpers ---------- */
let TOKEN = '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function hs(path, body, method) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(API + path, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 429 || r.status >= 500) { await sleep(600 * (attempt + 1) + Math.random() * 300); continue; }
    const text = await r.text();
    if (!r.ok) { const e = new Error('HubSpot ' + r.status + ' on ' + path + ': ' + text.slice(0, 300)); e.status = r.status; throw e; }
    return text ? JSON.parse(text) : {};
  }
  throw new Error('HubSpot kept rate-limiting ' + path);
}
async function searchAll(type, filterGroups, properties, sortProp) {
  const out = []; let after;
  do {
    const body = { filterGroups, properties, limit: 200 };
    if (sortProp) body.sorts = [{ propertyName: sortProp, direction: 'ASCENDING' }];
    if (after) body.after = after;
    const r = await hs('/crm/v3/objects/' + type + '/search', body);
    out.push(...(r.results || []));
    after = r.paging && r.paging.next && r.paging.next.after;
    if (after) await sleep(220); // search API: ~5 requests a second
  } while (after && out.length < 9800);
  return out;
}
async function assoc(from, to, ids) {
  const map = {};
  const list = [...new Set(ids)];
  for (let i = 0; i < list.length; i += 1000) {
    const r = await hs('/crm/v4/associations/' + from + '/' + to + '/batch/read', { inputs: list.slice(i, i + 1000).map(id => ({ id: String(id) })) });
    (r.results || []).forEach(x => { map[String(x.from.id)] = (x.to || []).map(t => String(t.toObjectId)); });
  }
  return map;
}
async function batchRead(type, ids, properties) {
  const out = {};
  const list = [...new Set(ids)];
  for (let i = 0; i < list.length; i += 100) {
    const r = await hs('/crm/v3/objects/' + type + '/batch/read', { inputs: list.slice(i, i + 100).map(id => ({ id: String(id) })), properties });
    (r.results || []).forEach(x => { out[String(x.id)] = x.properties || {}; });
  }
  return out;
}
// Every time each company's Account Status changed to Meeting Booked (re-saves of the same value ignored).
// A company counts as booked in a period if it moved to Meeting Booked then, even if it has since moved on
// (e.g. to Open Opportunity) - HubSpot's Meetings Booked report drops those.
async function mbTransitions(ids) {
  const out = {}; const list = [...new Set(ids)]; const chunks = [];
  for (let i = 0; i < list.length; i += 50) chunks.push(list.slice(i, i + 50));
  const one = async ch => {
    const r = await hs('/crm/v3/objects/companies/batch/read', { inputs: ch.map(id => ({ id: String(id) })), properties: ['account_status'], propertiesWithHistory: ['account_status'] });
    (r.results || []).forEach(x => {
      const h = ((x.propertiesWithHistory && x.propertiesWithHistory.account_status) || []).map(e => ({ v: String(e.value || ''), t: toMs(e.timestamp) })).filter(e => e.t != null).sort((a, b) => a.t - b.t);
      const ts = []; let prev = null;
      h.forEach(e => { if (/^meeting booked$/i.test(e.v) && !/^meeting booked$/i.test(prev || '')) ts.push(e.t); prev = e.v; });
      if (ts.length) out[String(x.id)] = ts;
    });
  };
  for (let i = 0; i < chunks.length; i += 4) await Promise.all(chunks.slice(i, i + 4).map(one));
  return out;
}
async function statusSetAt(ids) {
  const out = {}; const list = [...new Set(ids)];
  for (let i = 0; i < list.length; i += 50) {
    const r = await hs('/crm/v3/objects/companies/batch/read', { inputs: list.slice(i, i + 50).map(id => ({ id: String(id) })), properties: ['account_status'], propertiesWithHistory: ['account_status'] });
    (r.results || []).forEach(x => { const h = (x.propertiesWithHistory && x.propertiesWithHistory.account_status) || []; const ts = h.map(e => toMs(e.timestamp)).filter(t => t != null); out[String(x.id)] = ts.length ? Math.max(...ts) : null; });
  }
  return out;
}
async function options(type, prop) {
  try { const r = await hs('/crm/v3/properties/' + type + '/' + prop); const m = {}; (r.options || []).forEach(o => { m[o.value] = o.label; }); return m; }
  catch (e) { return {}; }
}

/* ---------- dates (Europe/London) ---------- */
function londonParts(d) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  const p = {}; f.formatToParts(d).forEach(x => { p[x.type] = x.value; });
  return { y: +p.year, m: +p.month, d: +p.day, wd: p.weekday };
}
function londonMidnight(y, m, d) {
  // UTC instant of 00:00 London on y-m-d
  const guess = Date.UTC(y, m - 1, d);
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' });
  const h = +f.format(new Date(guess));
  return guess - h * 3600000;
}
const iso = ms => { const p = londonParts(new Date(ms)); return p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nice = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return (+d) + ' ' + MON[+m - 1]; };
const toMs = v => { if (v == null || v === '') return null; const n = Number(v); return isNaN(n) ? Date.parse(v) : n; };

function periods(now) {
  const t = londonParts(now);
  const wdIdx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(t.wd);
  const today = londonMidnight(t.y, t.m, t.d);
  const wkStart = londonMidnight(t.y, t.m, t.d - wdIdx);
  const mtdStart = londonMidnight(t.y, t.m, 1);
  const weeks = []; for (let i = 7; i >= 0; i--) weeks.push(londonMidnight(t.y, t.m, t.d - wdIdx - 7 * i));
  return { today, todayIso: iso(today), wk: { start: wkStart, startIso: iso(wkStart) }, mtd: { start: mtdStart, startIso: iso(mtdStart) }, dayOfMonth: t.d, daysInMonth: new Date(Date.UTC(t.y, t.m, 0)).getUTCDate(), weeks };
}

/* custom date range: ?from=YYYY-MM-DD&to=YYYY-MM-DD replaces the month-to-date period */
function customRange(q) {
  const ok = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
  if (!q || !ok(q.from) || !ok(q.to) || q.from > q.to) return null;
  const [y1, m1, d1] = q.from.split('-').map(Number), [y2, m2, d2] = q.to.split('-').map(Number);
  const start = londonMidnight(y1, m1, d1), end = londonMidnight(y2, m2, d2 + 1);
  if (end - start > 370 * 86400000) return null;
  return { start, end, startIso: q.from, endIso: q.to };
}

/* ---------- main ---------- */
async function build(q) {
  const now = new Date();
  const P = periods(now);
  const CUS = customRange(q);
  P.wk.end = P.today + 86400000; P.mtd.end = P.today + 86400000;
  if (CUS) { P.mtd.start = CUS.start; P.mtd.startIso = CUS.startIso; P.mtd.end = Math.min(CUS.end, P.today + 86400000); }
  const minStart = Math.min(P.wk.start, P.mtd.start);
  const trendStart = minStart; // the 8-week history is served separately by ?part=trends
  const callsFrom = minStart;
  const wkIdx = ms => { if (ms == null || ms < trendStart) return -1; let i = P.weeks.length - 1; while (i > 0 && ms < P.weeks[i]) i--; return i; };
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', hourCycle: 'h23' });
  const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
  const yearStart = londonMidnight(londonParts(now).y, 1, 1);
  const inP = (ms, k) => ms != null && ms >= P[k].start && ms < P[k].end;
  const sdrBy = {}; SDRS.forEach(s => { sdrBy[s.id] = s; sdrBy[s.name.toLowerCase()] = s; });
  const sdrOf = v => { if (!v) return null; v = String(v); return sdrBy[v] || sdrBy[v.toLowerCase()] || SDRS.find(s => v.toLowerCase().startsWith(s.short.toLowerCase())) || null; };

  const [statusOpts, engOpts, leadOpts, sdrOpts, pipes] = await Promise.all([
    options('companies', 'account_status'), options('companies', 'call_outcome__account_engagement'),
    options('contacts', 'hs_lead_status'), options('companies', 'sdr_owner'),
    hs('/crm/v3/pipelines/deals').catch(() => ({ results: [] }))
  ]);
  const stageLabel = {}; (pipes.results || []).forEach(p => (p.stages || []).forEach(s => { stageLabel[s.id] = s.label; }));
  const sdrFromCompany = v => sdrOf(v) || sdrOf(sdrOpts[v]);

  // Companies with an SDR Owner
  const companies = await searchAll('companies', [{ filters: [{ propertyName: 'sdr_owner', operator: 'HAS_PROPERTY' }] }],
    ['name', 'sdr_owner', 'account_status', 'call_outcome__account_engagement', 'notes_last_contacted', 'pod_catagory', 'hs_lastmodifieddate']);
  const coById = {};
  companies.forEach(c => { const p = c.properties; coById[c.id] = { name: (p.name || '').trim(), sdr: sdrFromCompany(p.sdr_owner), status: statusOpts[p.account_status] || p.account_status || '', eng: engOpts[p.call_outcome__account_engagement] || p.call_outcome__account_engagement || '', last: toMs(p.notes_last_contacted), pod: !!p.pod_catagory, lm: toMs(p.hs_lastmodifieddate) }; });

  // Contacts touched in the period (for contacts reached and two-way contacts)
  const contacts = await searchAll('contacts', [{ filters: [{ propertyName: 'notes_last_contacted', operator: 'GTE', value: String(minStart) }] }],
    ['notes_last_contacted', 'associatedcompanyid', 'hs_lead_status']);
  const twoWay = v => /two.?way/i.test(leadOpts[v] || v || '');

  // Emails by the SDRs
  const emails = [];
  for (let f = callsFrom; f < now.getTime();) {
    const d = new Date(f); const to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    emails.push(...await searchAll('emails', [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(f) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(to) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
      ['hs_email_direction', 'hs_sequence_id', 'hs_timestamp', 'hubspot_owner_id'], 'hs_timestamp'));
    f = to;
  }

  // Sequence enrolments (contact owner, latest enrolment date)
  const enrolled = await searchAll('contacts', [{ filters: [{ propertyName: 'hs_latest_sequence_enrolled_date', operator: 'GTE', value: String(minStart) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
    ['hs_latest_sequence_enrolled_date', 'hubspot_owner_id']);

  // Calls by the SDRs in the period, split by month to stay under the search cap
  const calls = [];
  let from = callsFrom;
  while (from < now.getTime()) {
    const d = new Date(from); const to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    calls.push(...await searchAll('calls', [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(from) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(to) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
      ['hs_timestamp', 'hs_call_disposition', 'hubspot_owner_id'], 'hs_timestamp'));
    from = to;
  }
  const callIds = calls.filter(c => toMs(c.properties.hs_timestamp) >= minStart).map(c => c.id);
  const [callCon, callCo] = await Promise.all([assoc('calls', 'contacts', callIds), assoc('calls', 'companies', callIds)]);

  // Meetings starting this month or later (and any booked this week)
  const meetings = await searchAll('meetings', [
    { filters: [{ propertyName: 'hs_meeting_start_time', operator: 'GTE', value: String(callsFrom) }] },
    { filters: [{ propertyName: 'hs_createdate', operator: 'GTE', value: String(callsFrom) }] }
  ], ['hs_meeting_title', 'hs_createdate', 'hs_meeting_start_time', 'hs_meeting_outcome', 'hubspot_owner_id']);
  const meetCo = await assoc('meetings', 'companies', meetings.map(m => m.id));
  const meetCompanyIds = [...new Set(Object.values(meetCo).flat())];
  const coDeals = meetCompanyIds.length ? await assoc('companies', 'deals', meetCompanyIds) : {};
  const dealIdsForMeet = [...new Set(Object.values(coDeals).flat())];
  const dealCreated = dealIdsForMeet.length ? await batchRead('deals', dealIdsForMeet, ['createdate', 'closedate', 'hs_is_closed']) : {};

  // Deals credited to the SDRs
  const deals = await searchAll('deals', [{ filters: [{ propertyName: 'sdr_beneficiary_s_', operator: 'IN', values: SDR_IDS }] }],
    ['dealname', 'sdr_beneficiary_s_', 'dealstage', 'amount', 'hs_arr', 'createdate', 'hs_next_step', 'hs_is_closed', 'hs_is_closed_won', 'closedate']);

  // Partner, event and inbound leads
  const leads = await searchAll('contacts', [{ filters: [{ propertyName: 'createdate', operator: 'GTE', value: String(Date.parse(LEAD_START + 'T00:00:00Z')) }, { propertyName: 'lead_source', operator: 'HAS_PROPERTY' }, { propertyName: 'lead_source', operator: 'NEQ', value: 'Sales Outbound' }] }],
    ['firstname', 'lastname', 'company', 'lead_source', 'hubspot_owner_id', 'createdate', 'hs_time_to_first_engagement'], 'createdate');

  /* ----- per-SDR aggregates ----- */
  const K = ['wk', 'mtd'];
  const S = {};
  SDRS.forEach(s => {
    S[s.k] = Object.assign({}, s, {
      assigned: 0, contacted: { wk: 0, mtd: 0 }, contacts: { wk: 0, mtd: 0 }, emails: { wk: 0, mtd: 0 }, first: { wk: 0, mtd: 0 }, booked30: 0, held: 0,
      calls: { wk: { conv: 0, noans: 0, bot: 0, other: 0, none: 0 }, mtd: { conv: 0, noans: 0, bot: 0, other: 0, none: 0 } },
      status: { pos: 0, notint: 0, disq: 0, exh: 0, work: 0 }, patch: 0, eng: 0, bot: 0, tw: { wk: 0, mtd: 0 },
      review: { stuck: 0, newAcc: 0, noOutcome: 0, noNext: 0 }
    });
  });
  const tp = londonParts(now), d30 = londonMidnight(tp.y, tp.m, tp.d - 30);
  const mbFrom = Math.min(minStart, d30);
  const mbT = await mbTransitions(Object.keys(coById).filter(id => coById[id].sdr && (coById[id].lm == null || coById[id].lm >= mbFrom)));
  const mbIds = Object.keys(mbT);
  const mbIn = (id, k) => { let r = null; (mbT[id] || []).forEach(t => { if (inP(t, k)) r = t; }); return r; };
  const OUT = {}; SDRS.forEach(s => { OUT[s.k] = { seq: { wk: { enr: 0, em: 0 }, mtd: { enr: 0, em: 0 } }, rep: { wk: 0, mtd: 0 } }; });
  // Trends: 8 weeks by SDR, each day of this month, and calls by weekday x hour (7:00-19:00 UK)
  const z = n => new Array(n).fill(0);
  const TR = {};
  SDRS.forEach(s => { TR[s.k] = { calls: z(8), conv: z(8), emails: z(8), replies: z(8), booked: z(8), held: z(8), dCalls: z(P.daysInMonth), dConv: z(P.daysInMonth), dEmails: z(P.daysInMonth), heat: Array.from({ length: 5 }, () => Array.from({ length: 12 }, () => [0, 0])) }; });
  const dayIdx = ms => ms >= P.mtd.start ? londonParts(new Date(ms)).d - 1 : -1;

  // Company ids behind each number: LISTS[metric][sdr][period]
  const LISTS = {};
  const add = (m, sk, k, id) => { if (id == null || !sk) return; const a = (LISTS[m] = LISTS[m] || {}); const b = (a[sk] = a[sk] || {}); (b[k] = b[k] || new Set()).add(String(id)); };
  const stuckBefore = P.today - 14 * 86400000;
  Object.keys(coById).forEach(id => {
    const c = coById[id];
    if (!c.sdr) return; const x = S[c.sdr.k], sk = c.sdr.k;
    x.assigned++; add('assigned', sk, 'all', id);
    K.forEach(k => { if (inP(c.last, k)) { x.contacted[k]++; add('contacted', sk, k, id); } });
    const st = c.status.toLowerCase();
    if (/meeting booked|open opportunity/.test(st)) { x.status.pos++; add('pos', sk, 'all', id); }
    else if (/not interested/.test(st)) { x.status.notint++; add('notint', sk, 'all', id); }
    else if (/disqualified/.test(st)) { x.status.disq++; add('disq', sk, 'all', id); }
    else if (/exhausted/.test(st)) { x.status.exh++; add('exh', sk, 'all', id); }
    else { x.status.work++; add('work', sk, 'all', id); }
    if (/^new/.test(st)) { x.review.newAcc++; add('newAcc', sk, 'all', id); }
    if (/in progress/.test(st) && (c.last == null || c.last < stuckBefore)) { x.review.stuck++; add('stuck', sk, 'all', id); }
    if (c.pod) x.patch++;
    const e = c.eng.toLowerCase();
    if (/connected|valuable|meeting booked/.test(e) && !/attempting/.test(e)) { x.eng++; add('eng', sk, 'all', id); }
    else if (/screening bot|attempting/.test(e)) x.bot++;
  });
  mbIds.forEach(id => {
    const c = coById[id], x = S[c.sdr.k];
    K.forEach(k => { if (mbIn(id, k) != null) { x.first[k]++; add('booked', c.sdr.k, k, id); } });
    if (mbT[id].some(t => t >= d30)) { x.booked30++; add('booked30', c.sdr.k, 'all', id); }
  });
  contacts.forEach(c => {
    const co = coById[c.properties.associatedcompanyid]; if (!co || !co.sdr) return;
    const last = toMs(c.properties.notes_last_contacted);
    K.forEach(k => { if (inP(last, k)) { S[co.sdr.k].contacts[k]++; if (twoWay(c.properties.hs_lead_status)) S[co.sdr.k].tw[k]++; } });
  });
  const periodEmails = emails.filter(e => toMs(e.properties.hs_timestamp) >= minStart);
  const emailCo = periodEmails.length ? await assoc('emails', 'companies', periodEmails.map(e => e.id)) : {};
  emails.forEach(e => {
    const s = sdrOf(e.properties.hubspot_owner_id); if (!s) return;
    const ts = toMs(e.properties.hs_timestamp); const dir = e.properties.hs_email_direction;
    const wi = wkIdx(ts), di = dayIdx(ts);
    if (dir === 'EMAIL') { if (wi >= 0) TR[s.k].emails[wi]++; if (di >= 0) TR[s.k].dEmails[di]++; }
    else if (dir === 'INCOMING_EMAIL' && wi >= 0) TR[s.k].replies[wi]++;
    const co = (emailCo[e.id] || [])[0];
    K.forEach(k => {
      if (!inP(ts, k)) return;
      if (dir === 'EMAIL') { S[s.k].emails[k]++; add('emails', s.k, k, co); if (e.properties.hs_sequence_id) { OUT[s.k].seq[k].em++; add('seq', s.k, k, co); } }
      else if (dir === 'INCOMING_EMAIL') { OUT[s.k].rep[k]++; add('replies', s.k, k, co); }
    });
  });
  enrolled.forEach(c => { const s = sdrOf(c.properties.hubspot_owner_id); if (!s) return; const ts = toMs(c.properties.hs_latest_sequence_enrolled_date); K.forEach(k => { if (inP(ts, k)) OUT[s.k].seq[k].enr++; }); });

  /* ----- calls, new vs follow-up ----- */
  const callRows = calls.map(c => {
    const ts = toMs(c.properties.hs_timestamp);
    return { id: c.id, ts, day: iso(ts), s: sdrOf(c.properties.hubspot_owner_id), d: DISP[c.properties.hs_call_disposition] || (c.properties.hs_call_disposition ? 'other' : 'none'), con: (callCon[c.id] || [])[0] || null, co: (callCo[c.id] || [])[0] || null };
  });
  callRows.forEach(r => {
    if (!r.s || r.ts == null) return; const T = TR[r.s.k]; const cv = CONV.has(r.d);
    const wi = wkIdx(r.ts), di = dayIdx(r.ts);
    if (wi >= 0) { T.calls[wi]++; if (cv) T.conv[wi]++; }
    if (di >= 0) { T.dCalls[di]++; if (cv) T.dConv[di]++; }
    if (wi >= 0) { const p = {}; hourFmt.formatToParts(new Date(r.ts)).forEach(x => { p[x.type] = x.value; }); const wd = WD[p.weekday], h = +p.hour - 7; if (wd != null && h >= 0 && h < 12) { T.heat[wd][h][0]++; if (cv) T.heat[wd][h][1]++; } }
  });
  // First SDR call this year for every contact and company called in the period, from all of their calls
  const firstCon = {}, firstCo = {};
  const periodRows = callRows.filter(r => r.ts >= minStart);
  const conCalled = [...new Set(periodRows.map(r => r.con).filter(Boolean))], coCalled = [...new Set(periodRows.map(r => r.co).filter(Boolean))];
  const [conCalls, coCalls] = await Promise.all([conCalled.length ? assoc('contacts', 'calls', conCalled) : {}, coCalled.length ? assoc('companies', 'calls', coCalled) : {}]);
  const known = {}; calls.forEach(c => { known[c.id] = { ts: toMs(c.properties.hs_timestamp), o: c.properties.hubspot_owner_id }; });
  const need = [...new Set(Object.values(conCalls).flat().concat(Object.values(coCalls).flat()))].filter(id => !known[id]);
  const older = need.length ? await batchRead('calls', need, ['hs_timestamp', 'hubspot_owner_id']) : {};
  Object.keys(older).forEach(id => { known[id] = { ts: toMs(older[id].hs_timestamp), o: older[id].hubspot_owner_id }; });
  const earliest = list => { let m = null; (list || []).forEach(id => { const k = known[id]; if (!k || k.ts == null || k.ts < yearStart || SDR_IDS.indexOf(String(k.o)) < 0) return; if (m == null || k.ts < m) m = k.ts; }); return m == null ? null : iso(m); };
  conCalled.forEach(id => { firstCon[id] = earliest(conCalls[id]); });
  coCalled.forEach(id => { firstCo[id] = earliest(coCalls[id]); });
  const NF = { team: {} }; const TEAM_CQ = {};
  SDRS.forEach(s => { NF[s.k] = {}; });
  K.forEach(k => {
    const startIso = P[k].startIso;
    const teamAcc = {}, teamCon = {};
    SDRS.forEach(s => {
      const rows = callRows.filter(r => r.s && r.s.k === s.k && inP(r.ts, k));
      const x = S[s.k];
      rows.forEach(r => {
        const b = r.d === 'none' ? 'none' : CONV.has(r.d) ? 'conv' : r.d === 'noans' || r.d === 'voicemail' ? 'noans' : r.d === 'bot' ? 'bot' : 'other';
        x.calls[k][b]++;
        add('calls', s.k, k, r.co); add('call_' + b, s.k, k, r.co); if (b === 'conv') add('conv', s.k, k, r.co);
      });
      const per = {}, perDay = {}, acc = {}; let noc = 0;
      rows.forEach(r => {
        if (!r.con) { noc++; } else {
          per[r.con] = per[r.con] || { n: 0, conv: false }; per[r.con].n++; if (CONV.has(r.d)) per[r.con].conv = true;
          const key = r.con + '|' + r.day; perDay[key] = (perDay[key] || 0) + 1;
          teamCon[r.con] = true;
        }
        if (r.co) { acc[r.co] = true; teamAcc[r.co] = true; }
      });
      const conIds = Object.keys(per);
      const isNew = id => (firstCon[id] || '') >= startIso;
      const cq = { unique: conIds.length, once: 0, two: 0, three: 0, neu: 0, neuCalls: 0, fu: 0, fuCalls: 0, same: 0, noc, convC: 0 };
      conIds.forEach(id => {
        const n = per[id].n; if (n === 1) cq.once++; else if (n === 2) cq.two++; else cq.three++;
        if (isNew(id)) { cq.neu++; cq.neuCalls += n; } else { cq.fu++; cq.fuCalls += n; }
        if (per[id].conv) cq.convC++;
      });
      Object.values(perDay).forEach(n => { if (n > 1) cq.same += n - 1; });
      x.cq = x.cq || {}; x.cq[k] = cq;
      const accIds = Object.keys(acc); const accNew = accIds.filter(id => (firstCo[id] || '') >= startIso).length;
      accIds.forEach(id => add((firstCo[id] || '') >= startIso ? 'newAcc' + k : 'fuAcc' + k, s.k, k, id));
      NF[s.k][k] = { a: [accNew, accIds.length - accNew], c: [cq.neu, cq.fu] };
    });
    const ta = Object.keys(teamAcc), tc = Object.keys(teamCon);
    const taNew = ta.filter(id => (firstCo[id] || '') >= startIso).length, tcNew = tc.filter(id => (firstCon[id] || '') >= startIso).length;
    NF.team[k] = { a: [taNew, ta.length - taNew], c: [tcNew, tc.length - tcNew] };
    TEAM_CQ[k] = { unique: tc.length, neu: tcNew, fu: tc.length - tcNew };
  });

  /* ----- meetings: new first meetings booked by the SDR side only ----- */
  // Gong copies carry the real outcome; match them by company and day, or by title and day (they are often not linked to the company)
  const normTitle = t => String(t || '').replace(/^\[gong\]\s*/i, '').replace(/^(google meet|zoom|microsoft teams|teams):\s*/i, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const gongDone = {};
  meetings.forEach(m => {
    const t = m.properties.hs_meeting_title || '';
    if (/^\[gong\]/i.test(t) && /COMPLETED/i.test(m.properties.hs_meeting_outcome || '')) {
      const day = iso(toMs(m.properties.hs_meeting_start_time));
      (meetCo[m.id] || []).forEach(co => { gongDone[co + '|' + day] = true; });
      gongDone['t|' + normTitle(t) + '|' + day] = true;
    }
  });
  const seen = {};
  const MEETINGS = [];
  meetings.forEach(m => {
    const p = m.properties; const title = (p.hs_meeting_title || '').trim();
    if (!title || /^\[gong\]/i.test(title)) return;
    const coId = (meetCo[m.id] || []).find(id => coById[id] && coById[id].sdr); if (!coId) return;
    const co = coById[coId];
    const created = toMs(p.hs_createdate), start = toMs(p.hs_meeting_start_time);
    const dupKey = coId + '|' + iso(start); if (seen[dupKey]) return; seen[dupKey] = true;
    // Follow-up once the account is in the sales pipeline: a deal created more than a day before this meeting was booked
    // and still open at that point. Old closed deals (e.g. lost in 2024) don't make a new first meeting a follow-up.
    const priorDeal = (coDeals[coId] || []).some(d => {
      const dp = dealCreated[d] || {}; const dc = toMs(dp.createdate); const cl = toMs(dp.closedate);
      if (dc == null || created == null || dc >= created - 86400000) return false;
      return dp.hs_is_closed !== 'true' || cl == null || cl > created;
    });
    if (priorDeal || PROGRESSION.test(title)) return;
    const startIso = iso(start), gongHeld = gongDone[dupKey] || gongDone['t|' + normTitle(title) + '|' + startIso];
    const done = /COMPLETED/i.test(p.hs_meeting_outcome || '') || gongHeld;
    const noShow = /NO_SHOW/i.test(p.hs_meeting_outcome || '') && !done, cancelled = /CANCEL/i.test(p.hs_meeting_outcome || ''), resched = /RESCHED/i.test(p.hs_meeting_outcome || '');
    const bookedIn = k => inP(created, k), heldIn = k => done && inP(start, k);
    let o;
    if (done) o = ['ok', 'Held']; else if (noShow) o = ['bad', 'No show']; else if (cancelled) o = ['bad', 'Cancelled']; else if (resched) o = ['warn', 'Rescheduled'];
    else if (startIso === P.todayIso) o = ['info', 'Today']; else if (start > P.today) o = ['info', 'Upcoming']; else o = ['bad', 'No outcome'];
    const x = S[co.sdr.k];
    const hwi = wkIdx(start); if (done && hwi >= 0 && start < P.today + 86400000) TR[co.sdr.k].held[hwi]++;
    if (heldIn('mtd')) { x.held++; add('held', co.sdr.k, 'all', coId); }
    if (o[1] === 'No outcome' && inP(start, 'mtd')) { x.review.noOutcome++; add('noOutcome', co.sdr.k, 'all', coId); }
    const relevant = bookedIn('mtd') || inP(start, 'mtd');
    if (!relevant) return;
    MEETINGS.push({ c: co.name, id: Number(coId), mid: m.id, m: title, s: co.sdr.k, by: OWNER_NAMES[p.hubspot_owner_id] || 'Someone else', d: nice(startIso), ds: startIso, booked: nice(iso(created)), bs: iso(created), kind: 'First meeting held', o, x: gongHeld && !/COMPLETED/i.test(p.hs_meeting_outcome || '') ? ['warn', 'Held per Gong; outcome not updated'] : null, wk: bookedIn('wk') || (start >= P.wk.start && start < P.wk.start + 7 * 86400000), bookedWk: false, heldWk: heldIn('wk') });
  });
  // Booked meetings: every company moved to Meeting Booked in the period, with its meeting if one is logged
  const meetByCo = {};
  meetings.forEach(m => { const p = m.properties, t = (p.hs_meeting_title || '').trim(); if (!t || /^\[gong\]/i.test(t)) return;
    (meetCo[m.id] || []).forEach(co => { (meetByCo[co] = meetByCo[co] || []).push({ t, start: toMs(p.hs_meeting_start_time), owner: p.hubspot_owner_id, out: p.hs_meeting_outcome || '' }); }); });
  const inTable = {}; MEETINGS.forEach(m => { inTable[m.id] = m; });
  mbIds.forEach(id => {
    const at = mbIn(id, 'mtd') != null ? mbIn(id, 'mtd') : mbIn(id, 'wk'); if (at == null) return;
    const c = coById[id];
    const ms = (meetByCo[id] || []).filter(x => x.start != null).sort((a, b) => a.start - b.start);
    const mt = ms.find(x => x.start >= at - 86400000) || ms[ms.length - 1] || null;
    let o = ['warn', 'No meeting logged'], d = '\u2013', ds = iso(at), title = 'No meeting logged in HubSpot', by = '\u2013', heldWk = false, xx = null;
    if (mt) {
      const sIso = iso(mt.start), gh = gongDone[id + '|' + sIso] || gongDone['t|' + normTitle(mt.t) + '|' + sIso], done = /COMPLETED/i.test(mt.out) || gh;
      o = done ? ['ok', 'Held'] : /NO_SHOW/i.test(mt.out) ? ['bad', 'No show'] : /CANCEL/i.test(mt.out) ? ['bad', 'Cancelled'] : /RESCHED/i.test(mt.out) ? ['warn', 'Rescheduled'] : sIso === P.todayIso ? ['info', 'Today'] : mt.start > P.today ? ['info', 'Upcoming'] : ['bad', 'No outcome'];
      title = mt.t; by = OWNER_NAMES[mt.owner] || 'Someone else'; d = nice(sIso); ds = sIso; heldWk = done && mt.start >= P.wk.start && mt.start < P.today + 86400000;
      if (gh && !/COMPLETED/i.test(mt.out)) xx = ['warn', 'Held per Gong; outcome not updated'];
    }
    const row = { c: c.name, id: Number(id), now: c.status, m: title, s: c.sdr.k, by, d, ds, booked: nice(iso(at)), bs: iso(at), kind: 'Meeting booked ' + nice(iso(at)), o, x: xx, wk: at >= P.wk.start || (mt && mt.start >= P.wk.start && mt.start < P.wk.start + 7 * 86400000), bookedWk: at >= P.wk.start, heldWk: false };
    if (inTable[id]) { inTable[id].now = row.now; inTable[id].kind = row.kind; inTable[id].bs = row.bs; inTable[id].booked = row.booked; inTable[id].bookedWk = row.bookedWk; inTable[id].wk = inTable[id].wk || row.wk; } else MEETINGS.push(row);
  });
  MEETINGS.sort((a, b) => a.ds < b.ds ? -1 : 1);

  /* ----- deals ----- */
  const dealCo = deals.length ? await assoc('deals', 'companies', deals.map(d => d.id)) : {};
  const DEALS = []; let closedWon = 0, createdMtd = 0;
  deals.forEach(d => {
    const p = d.properties; const s = sdrOf(p.sdr_beneficiary_s_); if (!s) return;
    if (inP(toMs(p.createdate), 'mtd')) createdMtd++;
    if (p.hs_is_closed_won === 'true') { closedWon += Number(p.hs_arr || p.amount || 0); return; }
    if (p.hs_is_closed === 'true') return;
    const a = Number(p.amount || 0) / 1000;
    const dco = (dealCo[d.id] || [])[0] || null;
    add('deals', s.k, 'all', dco); if (!p.hs_next_step) add('noNext', s.k, 'all', dco);
    DEALS.push({ n: (p.dealname || '').replace(/&amp;/g, '&'), id: Number(d.id), co: dco ? Number(dco) : null, s: s.k, st: stageLabel[p.dealstage] || p.dealstage || '', a, arr: p.hs_arr ? '\u00a3' + Math.round(Number(p.hs_arr) / 100) / 10 + 'k' : '', cr: nice(iso(toMs(p.createdate))), next: p.hs_next_step || '' });
    if (!p.hs_next_step) S[s.k].review.noNext++;
  });
  DEALS.sort((a, b) => b.a - a.a);

  /* ----- leads ----- */
  const LEADS = leads.map(l => {
    const p = l.properties; const r = p.hs_time_to_first_engagement ? Number(p.hs_time_to_first_engagement) / 3600000 : null;
    return { n: [p.firstname, p.lastname].filter(Boolean).join(' ') || 'Unnamed contact', id: Number(l.id), c: p.company || '', src: p.lead_source, o: p.hubspot_owner_id ? (OWNER_NAMES[p.hubspot_owner_id] || 'Another owner') : 'No owner', cr: nice(iso(toMs(p.createdate))), r: r == null ? null : Math.round(r * 100) / 100 };
  }).reverse();

  /* ----- quick wins this week ----- */
  const WINS = [];
  MEETINGS.forEach(m => {
    if (m.bookedWk) WINS.push({ s: m.s, t: 'book', l: 'Meeting booked', c: m.c, id: m.id, x: 'Moved to Meeting Booked on ' + m.booked + (m.d !== '\u2013' ? '. ' + m.m + ' on ' + m.d + (m.by !== '\u2013' ? ' with ' + m.by.split(' ')[0] : '') : '. No meeting logged in HubSpot yet') + '.', at: m.booked });
    if (m.heldWk) WINS.push({ s: m.s, t: 'held', l: 'First meeting held', c: m.c, id: m.id, x: m.m + ' on ' + m.d + '.', at: m.d });
    else if (m.o[1] === 'Today') WINS.push({ s: m.s, t: 'today', l: 'First meeting today', c: m.c, id: m.id, x: m.m + ', with ' + m.by.split(' ')[0] + '.', at: m.d });
  });
  const wkCalls = callRows.filter(r => r.s && r.ts >= P.wk.start && (CONV.has(r.d) || r.d === 'badtiming'));
  const names = wkCalls.length ? await batchRead('contacts', wkCalls.map(r => r.con).filter(Boolean), ['firstname', 'lastname']) : {};
  const conName = id => { const p = names[id] || {}; return [p.firstname, p.lastname].filter(Boolean).join(' '); };
  const later = {};
  wkCalls.forEach(r => {
    const co = r.co && coById[r.co]; const cname = co ? co.name : '';
    const who = conName(r.con);
    if (r.d === 'badtiming') { (later[r.s.k] = later[r.s.k] || []).push(cname || who || 'an account'); return; }
    const verb = r.d === 'valuable' ? 'Valuable conversation' : r.d === 'booked' ? 'Meeting booked on a call' : 'Connected';
    WINS.push({ s: r.s.k, t: 'conv', l: 'Real conversation', c: cname || who || 'Unlinked call', id: co ? Number(r.co) : null, x: verb + (who ? ' with ' + who : '') + ' on ' + nice(r.day) + '.', at: nice(r.day) });
  });
  Object.keys(later).forEach(k => {
    const list = [...new Set(later[k])];
    const ids = [...new Set(wkCalls.filter(r => r.d === 'badtiming' && r.s.k === k && r.co).map(r => r.co))];
    WINS.push({ s: k, t: 'later', l: 'Call back later', c: list.length + (list.length === 1 ? ' account' : ' accounts'), id: null, ids, x: 'Reached people at ' + list.join(', ') + ' who asked to be called back later.', at: '' });
  });

  /* ----- accounts contacted: Last Contacted in the period, or an SDR call or email in it ----- */
  K.forEach(k => {
    const touch = id => { const c = coById[id]; if (c && c.sdr) add('contacted', c.sdr.k, k, id); };
    callRows.forEach(r => { if (r.co && inP(r.ts, k)) touch(r.co); });
    periodEmails.forEach(e => { if (e.properties.hs_email_direction === 'EMAIL' && inP(toMs(e.properties.hs_timestamp), k)) (emailCo[e.id] || []).forEach(touch); });
    SDRS.forEach(s => { S[s.k].contacted[k] = ((LISTS.contacted || {})[s.k] || {})[k] ? LISTS.contacted[s.k][k].size : 0; });
  });

  /* ----- company names for every list ----- */
  const L = {}; const allIds = new Set();
  Object.keys(LISTS).forEach(m => { L[m] = {}; Object.keys(LISTS[m]).forEach(sk => { L[m][sk] = {}; Object.keys(LISTS[m][sk]).forEach(k => { const a = [...LISTS[m][sk][k]]; L[m][sk][k] = a; a.forEach(id => allIds.add(id)); }); }); });
  WINS.forEach(w => (w.ids || []).forEach(id => allIds.add(String(id))));
  const missing = [...allIds].filter(id => !coById[id]);
  const extra = missing.length ? await batchRead('companies', missing, ['name', 'account_status']) : {};
  const CO = {};
  allIds.forEach(id => { const c = coById[id]; if (c) CO[id] = [c.name, c.status, c.sdr ? c.sdr.k : '', c.last ? iso(c.last) : '']; else { const p = extra[id] || {}; CO[id] = [(p.name || 'Unnamed company').trim(), statusOpts[p.account_status] || p.account_status || '', '', '']; } });
  const order = { book: 0, held: 1, today: 2, conv: 3, later: 4 };
  WINS.sort((a, b) => order[a.t] - order[b.t]);

  return {
    generatedAt: now.toISOString(),
    periods: { wk: { start: P.wk.startIso, end: P.todayIso }, mtd: { start: P.mtd.startIso, end: CUS ? iso(P.mtd.end - 3600000) : P.todayIso, custom: !!CUS }, dayOfMonth: P.dayOfMonth, daysInMonth: P.daysInMonth },
    SDRS: SDRS.map(s => S[s.k]), NF, TEAM_CQ, OUT, MEETINGS, DEALS, LEADS, WINS, LISTS: L, CO,
    pipeline: { closedWon, createdMtd }
  };
}

/* ---------- 8-week trends (separate request so the main data stays fast) ---------- */
async function buildTrends() {
  const now = new Date();
  const P = periods(now);
  const trendStart = P.weeks[0];
  const wkIdx = ms => { if (ms == null || ms < trendStart) return -1; let i = P.weeks.length - 1; while (i > 0 && ms < P.weeks[i]) i--; return i; };
  const dayIdx = ms => ms != null && ms >= P.mtd.start ? londonParts(new Date(ms)).d - 1 : -1;
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', hourCycle: 'h23' });
  const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
  const sdrBy = {}; SDRS.forEach(s => { sdrBy[s.id] = s; sdrBy[s.name.toLowerCase()] = s; });
  const sdrOf = v => { if (!v) return null; v = String(v); return sdrBy[v] || sdrBy[v.toLowerCase()] || SDRS.find(s => v.toLowerCase().startsWith(s.short.toLowerCase())) || null; };
  const z = n => new Array(n).fill(0);
  const TR = {};
  SDRS.forEach(s => { TR[s.k] = { calls: z(8), conv: z(8), emails: z(8), replies: z(8), booked: z(8), held: z(8), dCalls: z(P.daysInMonth), dConv: z(P.daysInMonth), dEmails: z(P.daysInMonth), heat: Array.from({ length: 5 }, () => Array.from({ length: 12 }, () => [0, 0])) }; });

  const sdrOpts = await options('companies', 'sdr_owner');
  const companies = await searchAll('companies', [{ filters: [{ propertyName: 'sdr_owner', operator: 'HAS_PROPERTY' }] }], ['sdr_owner', 'hs_lastmodifieddate']);
  const coSdr = {}, coLm = {}; companies.forEach(c => { const s = sdrOf(c.properties.sdr_owner) || sdrOf(sdrOpts[c.properties.sdr_owner]); if (s) { coSdr[c.id] = s; coLm[c.id] = toMs(c.properties.hs_lastmodifieddate); } });

  const emails = await searchAll('emails', [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(trendStart) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
    ['hs_email_direction', 'hs_timestamp', 'hubspot_owner_id']);
  emails.forEach(e => {
    const s = sdrOf(e.properties.hubspot_owner_id); if (!s) return;
    const ts = toMs(e.properties.hs_timestamp), wi = wkIdx(ts), di = dayIdx(ts), dir = e.properties.hs_email_direction;
    if (dir === 'EMAIL') { if (wi >= 0) TR[s.k].emails[wi]++; if (di >= 0) TR[s.k].dEmails[di]++; }
    else if (dir === 'INCOMING_EMAIL' && wi >= 0) TR[s.k].replies[wi]++;
  });

  let from = trendStart;
  while (from < now.getTime()) {
    const d = new Date(from); const to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    const calls = await searchAll('calls', [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(from) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(to) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
      ['hs_timestamp', 'hs_call_disposition', 'hubspot_owner_id'], 'hs_timestamp');
    calls.forEach(c => {
      const s = sdrOf(c.properties.hubspot_owner_id); const ts = toMs(c.properties.hs_timestamp); if (!s || ts == null) return;
      const T = TR[s.k], cv = CONV.has(DISP[c.properties.hs_call_disposition]), wi = wkIdx(ts), di = dayIdx(ts);
      if (wi >= 0) { T.calls[wi]++; if (cv) T.conv[wi]++; const p = {}; hourFmt.formatToParts(new Date(ts)).forEach(x => { p[x.type] = x.value; }); const wd = WD[p.weekday], h = +p.hour - 7; if (wd != null && h >= 0 && h < 12) { T.heat[wd][h][0]++; if (cv) T.heat[wd][h][1]++; } }
      if (di >= 0) { T.dCalls[di]++; if (cv) T.dConv[di]++; }
    });
    from = to;
  }

  // First meetings booked and held per week, same rules as the main data
  const meetings = await searchAll('meetings', [
    { filters: [{ propertyName: 'hs_meeting_start_time', operator: 'GTE', value: String(trendStart) }] },
    { filters: [{ propertyName: 'hs_createdate', operator: 'GTE', value: String(trendStart) }] }
  ], ['hs_meeting_title', 'hs_createdate', 'hs_meeting_start_time', 'hs_meeting_outcome']);
  const meetCo = meetings.length ? await assoc('meetings', 'companies', meetings.map(m => m.id)) : {};
  const meetCompanyIds = [...new Set(Object.values(meetCo).flat())].filter(id => coSdr[id]);
  const coDeals = meetCompanyIds.length ? await assoc('companies', 'deals', meetCompanyIds) : {};
  const dealIds = [...new Set(Object.values(coDeals).flat())];
  const dealInfo = dealIds.length ? await batchRead('deals', dealIds, ['createdate', 'closedate', 'hs_is_closed']) : {};
  const normTitle = t => String(t || '').replace(/^\[gong\]\s*/i, '').replace(/^(google meet|zoom|microsoft teams|teams):\s*/i, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const gongDone = {};
  meetings.forEach(m => {
    const t = m.properties.hs_meeting_title || '';
    if (/^\[gong\]/i.test(t) && /COMPLETED/i.test(m.properties.hs_meeting_outcome || '')) {
      const day = iso(toMs(m.properties.hs_meeting_start_time));
      (meetCo[m.id] || []).forEach(co => { gongDone[co + '|' + day] = true; });
      gongDone['t|' + normTitle(t) + '|' + day] = true;
    }
  });
  const seen = {};
  meetings.forEach(m => {
    const p = m.properties; const title = (p.hs_meeting_title || '').trim();
    if (!title || /^\[gong\]/i.test(title)) return;
    const coId = (meetCo[m.id] || []).find(id => coSdr[id]); if (!coId) return;
    const created = toMs(p.hs_createdate), start = toMs(p.hs_meeting_start_time);
    const key = coId + '|' + iso(start); if (seen[key]) return; seen[key] = true;
    const priorDeal = (coDeals[coId] || []).some(d => {
      const dp = dealInfo[d] || {}; const dc = toMs(dp.createdate); const cl = toMs(dp.closedate);
      if (dc == null || created == null || dc >= created - 86400000) return false;
      return dp.hs_is_closed !== 'true' || cl == null || cl > created;
    });
    if (priorDeal || PROGRESSION.test(title)) return;
    const done = /COMPLETED/i.test(p.hs_meeting_outcome || '') || gongDone[key] || gongDone['t|' + normTitle(title) + '|' + iso(start)];
    const sk = coSdr[coId].k;
    const hwi = wkIdx(start); if (done && hwi >= 0 && start < P.today + 86400000) TR[sk].held[hwi]++;
  });
  const mbT = await mbTransitions(Object.keys(coSdr).filter(id => coLm[id] == null || coLm[id] >= trendStart));
  Object.keys(mbT).forEach(id => { const seen = {}; mbT[id].forEach(t => { const wi = wkIdx(t); if (wi >= 0 && !seen[wi]) { seen[wi] = 1; TR[coSdr[id].k].booked[wi]++; } }); });
  return { generatedAt: now.toISOString(), TRENDS: { weeks: P.weeks.map(iso), bySdr: TR } };
}

/* ---------- Matt's dashboard (?part=matt): raw records for this week, last week, this month and last month ---------- */
async function statusHistory(ids) {
  const out = {}; const list = [...new Set(ids)]; const chunks = [];
  for (let i = 0; i < list.length; i += 50) chunks.push(list.slice(i, i + 50));
  const one = async ch => {
    const r = await hs('/crm/v3/objects/companies/batch/read', { inputs: ch.map(id => ({ id: String(id) })), properties: ['account_status'], propertiesWithHistory: ['account_status'] });
    (r.results || []).forEach(x => {
      const h = ((x.propertiesWithHistory && x.propertiesWithHistory.account_status) || []).map(e => ({ v: String(e.value || ''), t: toMs(e.timestamp) })).filter(e => e.t != null).sort((a, b) => a.t - b.t);
      // Only real changes count: re-saving the same value (imports, workflows) is ignored, and an account
      // that was created already past New has no first-outreach date (it never moved off New in HubSpot).
      let prev = null, firstOff = null, last = null, mb = null;
      h.forEach((e, i) => {
        if (i > 0 && e.v === prev) return;
        if (i > 0) { last = e.t; if (firstOff == null && (!prev || /^new$/i.test(prev)) && e.v && !/^new$/i.test(e.v)) firstOff = e.t; if (/^meeting booked$/i.test(e.v)) mb = e.t; }
        else if (/^meeting booked$/i.test(e.v)) mb = e.t;
        prev = e.v;
      });
      out[String(x.id)] = [firstOff, last, mb, h.length ? h[h.length - 1].t : null];
    });
  };
  for (let i = 0; i < chunks.length; i += 4) await Promise.all(chunks.slice(i, i + 4).map(one));
  return out;
}
async function buildMatt(q) {
  const now = new Date();
  const P = periods(now);
  const CUS = customRange(q);
  const t = londonParts(now);
  const lwk = P.wk.start - 7 * 86400000;
  const lm = londonMidnight(t.m === 1 ? t.y - 1 : t.y, t.m === 1 ? 12 : t.m - 1, 1);
  const from = Math.min(lwk, lm, londonMidnight(t.y, t.m, t.d - 30), CUS ? CUS.start : Infinity);
  const R = { wk: [P.wk.start, P.today + 86400000], lwk: [lwk, P.wk.start], mtd: [P.mtd.start, P.today + 86400000], lm: [lm, P.mtd.start] };
  if (CUS) R.cus = [CUS.start, Math.min(CUS.end, P.today + 86400000)];
  R.l30 = [londonMidnight(t.y, t.m, t.d - 30), P.today + 86400000];
  const sdrBy = {}; SDRS.forEach((s, i) => { sdrBy[s.id] = i; sdrBy[s.name.toLowerCase()] = i; });
  const sdrIx = v => { if (!v) return -1; v = String(v); if (sdrBy[v] != null) return sdrBy[v]; if (sdrBy[v.toLowerCase()] != null) return sdrBy[v.toLowerCase()]; const i = SDRS.findIndex(s => v.toLowerCase().startsWith(s.short.toLowerCase())); return i; };

  const [statusOpts, engOpts, leadOpts, sdrOpts, ownerOpts, pipes] = await Promise.all([
    options('companies', 'account_status'), options('companies', 'call_outcome__account_engagement'),
    options('contacts', 'hs_lead_status'), options('companies', 'sdr_owner'), options('deals', 'hubspot_owner_id'),
    hs('/crm/v3/pipelines/deals').catch(() => ({ results: [] }))
  ]);
  const ownerName = id => id ? (ownerOpts[id] || OWNER_NAMES[id] || 'Another owner').replace('Anushca', 'Annie') : '';
  const stageLabel = {}, stageOrder = {};
  (pipes.results || []).forEach(p => (p.stages || []).forEach(s => { stageLabel[s.id] = s.label; stageOrder[s.id] = s.displayOrder; }));

  // Companies with an SDR Owner (the credited SDR)
  const companies = await searchAll('companies', [{ filters: [{ propertyName: 'sdr_owner', operator: 'HAS_PROPERTY' }] }],
    ['name', 'sdr_owner', 'account_status', 'call_outcome__account_engagement', 'notes_last_contacted', 'pod_catagory', 'num_associated_contacts']);
  const CO = {};
  companies.forEach(c => {
    const p = c.properties; let s = sdrIx(p.sdr_owner); if (s < 0) s = sdrIx(sdrOpts[p.sdr_owner]);
    CO[c.id] = [(p.name || 'Unnamed company').trim(), statusOpts[p.account_status] || p.account_status || '', s, toMs(p.notes_last_contacted), p.pod_catagory || '', Number(p.num_associated_contacts || 0), engOpts[p.call_outcome__account_engagement] || p.call_outcome__account_engagement || '', null, null, null];
  });
  const sdrCoIds = Object.keys(CO).filter(id => CO[id][2] >= 0);
  const hist = await statusHistory(sdrCoIds);
  sdrCoIds.forEach(id => { const h = hist[id] || []; CO[id][7] = h[0] || null; CO[id][8] = h[1] || null; CO[id][9] = h[2] || null; CO[id][10] = h[3] || null; });

  // Calls by the SDRs, month by month to stay under the search cap
  const calls = [];
  for (let f = from; f < now.getTime();) {
    const d = new Date(f); const to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    calls.push(...await searchAll('calls', [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(f) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(to) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
      ['hs_timestamp', 'hs_call_disposition', 'hubspot_owner_id'], 'hs_timestamp'));
    f = to;
  }
  const emails = [];
  for (let f = from; f < now.getTime();) {
    const d = new Date(f); const to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    emails.push(...await searchAll('emails', [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(f) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(to) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
      ['hs_timestamp', 'hs_email_direction', 'hs_sequence_id', 'hs_email_subject', 'hubspot_owner_id'], 'hs_timestamp'));
    f = to;
  }
  const [callCo, callCon, emCo, emCon] = await Promise.all([
    calls.length ? assoc('calls', 'companies', calls.map(c => c.id)) : {}, calls.length ? assoc('calls', 'contacts', calls.map(c => c.id)) : {},
    emails.length ? assoc('emails', 'companies', emails.map(e => e.id)) : {}, emails.length ? assoc('emails', 'contacts', emails.map(e => e.id)) : {}
  ]);
  const pickCo = list => (list || []).find(id => CO[id] && CO[id][2] >= 0) || (list || [])[0] || null;
  const CALLS = calls.map(c => { const p = c.properties; return [toMs(p.hs_timestamp), sdrIx(p.hubspot_owner_id), DISP[p.hs_call_disposition] || (p.hs_call_disposition ? 'other' : 'none'), pickCo(callCo[c.id]), (callCon[c.id] || [])[0] || null]; }).filter(r => r[0] != null && r[1] >= 0);
  const EMAILS = emails.map(e => { const p = e.properties; const dir = p.hs_email_direction === 'EMAIL' ? 0 : p.hs_email_direction === 'INCOMING_EMAIL' ? 1 : -1;
    return [toMs(p.hs_timestamp), sdrIx(p.hubspot_owner_id), dir, p.hs_sequence_id ? 1 : 0, pickCo(emCo[e.id]), (emCon[e.id] || [])[0] || null, /^\s*(updated )?invitation:/i.test(p.hs_email_subject || '') ? 1 : 0, (p.hs_email_subject || '').slice(0, 120)]; })
    .filter(r => r[0] != null && r[1] >= 0 && r[2] >= 0);

  // Sequence enrolments by SDR-owned contacts
  const enrolled = await searchAll('contacts', [{ filters: [{ propertyName: 'hs_latest_sequence_enrolled_date', operator: 'GTE', value: String(from) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
    ['hs_latest_sequence_enrolled_date', 'hubspot_owner_id', 'associatedcompanyid']);
  const ENROL = enrolled.map(c => [toMs(c.properties.hs_latest_sequence_enrolled_date), sdrIx(c.properties.hubspot_owner_id), c.id, c.properties.associatedcompanyid || null]).filter(r => r[0] != null && r[1] >= 0);

  // Contacts touched: name, job title and Lead Status
  const conIds = [...new Set(CALLS.map(r => r[4]).concat(EMAILS.map(r => r[5])).concat(ENROL.map(r => r[2])).filter(Boolean))];
  const conProps = conIds.length ? await batchRead('contacts', conIds, ['firstname', 'lastname', 'jobtitle', 'hs_lead_status', 'associatedcompanyid']) : {};
  const CON = {};
  Object.keys(conProps).forEach(id => { const p = conProps[id]; CON[id] = [[p.firstname, p.lastname].filter(Boolean).join(' ') || 'Unnamed contact', leadOpts[p.hs_lead_status] || p.hs_lead_status || '', p.associatedcompanyid || null, p.jobtitle || '']; });

  // Meetings since the start of the range, by start or create date
  const meetings = await searchAll('meetings', [
    { filters: [{ propertyName: 'hs_meeting_start_time', operator: 'GTE', value: String(from) }] },
    { filters: [{ propertyName: 'hs_createdate', operator: 'GTE', value: String(from) }] }
  ], ['hs_meeting_title', 'hs_createdate', 'hs_meeting_start_time', 'hs_meeting_outcome', 'hubspot_owner_id', 'hs_activity_type']);
  const meetCo = meetings.length ? await assoc('meetings', 'companies', meetings.map(m => m.id)) : {};
  const mCoIds = [...new Set(Object.values(meetCo).flat())].filter(id => CO[id] && CO[id][2] >= 0);
  const coDeals = mCoIds.length ? await assoc('companies', 'deals', mCoIds) : {};
  const mDealIds = [...new Set(Object.values(coDeals).flat())];
  const mDeal = mDealIds.length ? await batchRead('deals', mDealIds, ['createdate', 'closedate', 'hs_is_closed']) : {};
  const normTitle = s => String(s || '').replace(/^\[gong\]\s*/i, '').replace(/^(google meet|zoom|microsoft teams|teams):\s*/i, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const gongDone = {};
  meetings.forEach(m => { const ti = m.properties.hs_meeting_title || '';
    if (/^\[gong\]/i.test(ti) && /COMPLETED/i.test(m.properties.hs_meeting_outcome || '')) { const day = iso(toMs(m.properties.hs_meeting_start_time)); (meetCo[m.id] || []).forEach(co => { gongDone[co + '|' + day] = true; }); gongDone['t|' + normTitle(ti) + '|' + day] = true; } });
  const seen = {}; const MEET = [];
  meetings.forEach(m => {
    const p = m.properties; const title = (p.hs_meeting_title || '').trim();
    if (!title || /^\[gong\]/i.test(title)) return;
    const coId = (meetCo[m.id] || []).find(id => CO[id] && CO[id][2] >= 0); if (!coId) return;
    const created = toMs(p.hs_createdate), start = toMs(p.hs_meeting_start_time); if (start == null) return;
    const key = coId + '|' + iso(start); const dup = !!seen[key]; seen[key] = true;
    const priorDeal = (coDeals[coId] || []).some(d => { const dp = mDeal[d] || {}; const dc = toMs(dp.createdate), cl = toMs(dp.closedate);
      if (dc == null || created == null || dc >= created - 86400000) return false; return dp.hs_is_closed !== 'true' || cl == null || cl > created; });
    const gong = !!(gongDone[key] || gongDone['t|' + normTitle(title) + '|' + iso(start)]);
    const out = p.hs_meeting_outcome || '';
    MEET.push({ id: m.id, co: coId, t: title, ty: p.hs_activity_type || '', cr: created, st: start, out, g: gong, by: ownerName(p.hubspot_owner_id), first: !dup && !priorDeal && !PROGRESSION.test(title) });
  });

  // Deals credited to an SDR (open and closed)
  const dealsRaw = await searchAll('deals', [{ filters: [{ propertyName: 'sdr_beneficiary_s_', operator: 'IN', values: SDR_IDS }] }],
    ['dealname', 'sdr_beneficiary_s_', 'dealstage', 'amount', 'hs_arr', 'createdate', 'closedate', 'hs_next_step', 'hs_is_closed', 'hs_is_closed_won', 'meeting_accepted', 'hubspot_owner_id']);
  const dCo = dealsRaw.length ? await assoc('deals', 'companies', dealsRaw.map(d => d.id)) : {};
  const DEALS = dealsRaw.map(d => { const p = d.properties;
    return { id: d.id, n: (p.dealname || '').replace(/&amp;/g, '&'), s: sdrIx(p.sdr_beneficiary_s_), st: stageLabel[p.dealstage] || p.dealstage || '', so: stageOrder[p.dealstage] != null ? stageOrder[p.dealstage] : 99,
      amt: Number(p.amount || 0), arr: p.hs_arr ? Number(p.hs_arr) : null, cr: toMs(p.createdate), cl: toMs(p.closedate), closed: p.hs_is_closed === 'true', won: p.hs_is_closed_won === 'true',
      next: p.hs_next_step || '', acc: p.meeting_accepted === 'true', ae: ownerName(p.hubspot_owner_id), co: (dCo[d.id] || [])[0] || null }; }).filter(d => d.s >= 0);
  DEALS.forEach(d => { if (d.co && !CO[d.co]) CO[d.co] = null; });

  // Partner, event and inbound leads (the other three streams)
  const leadsRaw = await searchAll('contacts', [{ filters: [{ propertyName: 'createdate', operator: 'GTE', value: String(from) }, { propertyName: 'lead_source', operator: 'IN', values: ['Inbound', 'Event', 'Content', 'Marketing Email', 'Partner', 'Referral'] }] }],
    ['firstname', 'lastname', 'company', 'associatedcompanyid', 'lead_source', 'hubspot_owner_id', 'sdr_owner', 'createdate', 'notes_last_contacted', 'hs_time_to_first_engagement'], 'createdate');
  const STREAM = { Partner: 'Partner', Referral: 'Partner', Content: 'Partner', Event: 'Marketing / event', 'Marketing Email': 'Marketing / event', Inbound: 'Direct inbound' };
  const LEADS = leadsRaw.map(l => { const p = l.properties; let s = sdrIx(p.sdr_owner); if (s < 0) s = sdrIx(p.hubspot_owner_id);
    return { id: l.id, n: [p.firstname, p.lastname].filter(Boolean).join(' ') || 'Unnamed contact', c: p.company || '', co: p.associatedcompanyid || null, src: p.lead_source, str: STREAM[p.lead_source] || 'Other',
      s, o: ownerName(p.hubspot_owner_id) || 'No owner', cr: toMs(p.createdate), last: toMs(p.notes_last_contacted), r: p.hs_time_to_first_engagement ? Number(p.hs_time_to_first_engagement) / 3600000 : null }; });

  // Names for any company referenced that isn't SDR-owned
  const extraIds = [...new Set([].concat(CALLS.map(r => r[3]), EMAILS.map(r => r[4]), ENROL.map(r => r[3]), Object.values(CON).map(c => c[2]), Object.keys(CO).filter(id => CO[id] === null)).filter(id => id && !CO[id]))];
  const extra = extraIds.length ? await batchRead('companies', extraIds, ['name', 'account_status', 'notes_last_contacted', 'num_associated_contacts']) : {};
  Object.keys(extra).forEach(id => { const p = extra[id]; CO[id] = [(p.name || 'Unnamed company').trim(), statusOpts[p.account_status] || p.account_status || '', -1, toMs(p.notes_last_contacted), '', Number(p.num_associated_contacts || 0), '', null, null, null]; });
  Object.keys(CO).forEach(id => { if (CO[id] === null) CO[id] = ['Company ' + id, '', -1, null, '', 0, '', null, null, null]; });

  return {
    generatedAt: now.toISOString(), R, today: P.today, dayOfMonth: P.dayOfMonth, daysInMonth: P.daysInMonth,
    SDRS: SDRS.map(s => ({ k: s.k, name: s.name, short: s.short, pod: s.pod, lead: s.lead })),
    CO, CON, CALLS, EMAILS, ENROL, MEET, DEALS, LEADS
  };
}

/* ---------- Call reports (?part=calls): replicas of the HubSpot call reports ---------- */
const CALL_LABELS = {
  'f240bbac-87c9-4f6e-bf70-924b57d47db7': 'Connected', 'cac480f0-a8c0-4042-a92a-7a00144842f2': 'Valuable Conversation',
  '522f6325-eb24-4b15-a96d-378c8dab9af8': 'Meeting Booked', '73a0d17f-1163-4015-bdd5-ec830791da20': 'No answer',
  '1595831b-ac6b-4d8d-bac9-2f711edd96a7': 'AI Screening Bot', 'e769fdeb-c488-428d-9a5a-f9a6391f8aaa': 'Gatekeeper',
  '17b47fee-58de-441e-a44c-c6300d46f273': 'Wrong number', 'e4c946f0-5174-48ed-b1d9-9ea275fa754a': 'Bad Timing',
  '40854b06-5e3f-4748-8eb5-03008d8303d0': 'Not Interested', 'b2cf5968-551e-4856-9783-52b3da59a7d0': 'Left voicemail',
  '9d9162e7-6cf3-4944-bf63-4dff82258764': 'Busy', 'e6b1bf5c-9d60-490f-a55d-edee8a22564c': 'Left Company/Retired',
  'a4c4c377-d246-4b32-a13b-75a56a4cd0ff': 'Left live message'
};
const NO_ANSWER = '73a0d17f-1163-4015-bdd5-ec830791da20';
async function countCalls(filters) {
  const r = await hs('/crm/v3/objects/calls/search', { filterGroups: [{ filters }], properties: ['hs_timestamp'], limit: 1 });
  return r.total || 0;
}
async function buildCalls(q) {
  const now = new Date();
  const P = periods(now);
  const CUS = customRange(q);
  const t = londonParts(now);
  const from = Math.min(P.wk.start, P.mtd.start, CUS ? CUS.start : Infinity);
  const yearStart = londonMidnight(t.y, 1, 1);
  const sdrBy = {}; SDRS.forEach((s, i) => { sdrBy[s.id] = i; });
  const owner = { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS };
  const labels = Object.assign({}, CALL_LABELS);
  try { const d = await hs('/calling/v1/dispositions'); (Array.isArray(d) ? d : []).forEach(x => { if (x && x.id && x.label) labels[x.id] = x.label; }); } catch (e) { /* fall back to the known labels */ }

  // Every SDR call in the selected period
  const calls = [];
  for (let f = from; f < now.getTime();) {
    const d = new Date(f); const to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    calls.push(...await searchAll('calls', [{ filters: [owner, { propertyName: 'hs_timestamp', operator: 'GTE', value: String(f) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(to) }] }],
      ['hs_timestamp', 'hs_call_disposition', 'hubspot_owner_id', 'hs_call_duration'], 'hs_timestamp'));
    f = to;
  }
  const [cCo, cCon] = await Promise.all([calls.length ? assoc('calls', 'companies', calls.map(c => c.id)) : {}, calls.length ? assoc('calls', 'contacts', calls.map(c => c.id)) : {}]);
  const CALLS = calls.map(c => { const p = c.properties; return [toMs(p.hs_timestamp), sdrBy[p.hubspot_owner_id] != null ? sdrBy[p.hubspot_owner_id] : -1, p.hs_call_disposition || '', (cCo[c.id] || [])[0] || null, (cCon[c.id] || [])[0] || null, p.hs_call_duration ? Math.round(Number(p.hs_call_duration) / 1000) : 0, c.id]; })
    .filter(r => r[0] != null && r[1] >= 0);
  const coIds = [...new Set(CALLS.map(r => r[3]).filter(Boolean))], conIds = [...new Set(CALLS.map(r => r[4]).filter(Boolean))];
  const [coP, conP] = await Promise.all([coIds.length ? batchRead('companies', coIds, ['name']) : {}, conIds.length ? batchRead('contacts', conIds, ['firstname', 'lastname']) : {}]);
  const CO = {}, CON = {};
  Object.keys(coP).forEach(id => { CO[id] = (coP[id].name || 'Unnamed company').trim(); });
  Object.keys(conP).forEach(id => { CON[id] = [conP[id].firstname, conP[id].lastname].filter(Boolean).join(' ') || 'Unnamed contact'; });

  // This year by month: every outcome for the team, and connected calls by SDR (same filters as the HubSpot trend reports)
  const months = [];
  for (let m = 1; m <= t.m; m++) months.push([londonMidnight(t.y, m, 1), m === t.m ? now.getTime() + 1 : londonMidnight(t.y, m + 1, 1), t.y + '-' + String(m).padStart(2, '0')]);
  const MONTHS = [];
  for (let i = 0; i < months.length; i += 2) {
    const part = await Promise.all(months.slice(i, i + 2).map(async ([a, b, key]) => {
      const range = [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(a) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(b) }];
      const [total, none] = [await countCalls([owner].concat(range)), await countCalls([owner, { propertyName: 'hs_call_disposition', operator: 'NOT_HAS_PROPERTY' }].concat(range))];
      const rest = await searchAll('calls', [{ filters: [owner, { propertyName: 'hs_call_disposition', operator: 'HAS_PROPERTY' }, { propertyName: 'hs_call_disposition', operator: 'NEQ', value: NO_ANSWER }].concat(range) }], ['hs_call_disposition', 'hubspot_owner_id']);
      const o = {}, c = {};
      rest.forEach(x => { const d = x.properties.hs_call_disposition; o[d] = (o[d] || 0) + 1; const si = sdrBy[x.properties.hubspot_owner_id]; if (si != null) { const k = SDRS[si].k; (c[k] = c[k] || {})[d] = (c[k][d] || 0) + 1; } });
      o[NO_ANSWER] = Math.max(0, total - none - rest.length); o[''] = none;
      return { m: key, total, o, c };
    }));
    MONTHS.push(...part);
  }
  const R = { wk: [P.wk.start, P.today + 86400000], mtd: [P.mtd.start, P.today + 86400000] };
  if (CUS) R.cus = [CUS.start, Math.min(CUS.end, P.today + 86400000)];
  return { generatedAt: now.toISOString(), R, today: P.today, labels, SDRS: SDRS.map(s => ({ k: s.k, name: s.name, short: s.short, pod: s.pod })), CALLS, CO, CON, MONTHS, yearStart };
}

module.exports = async (req, res) => {
  TOKEN = process.env.HUBSPOT_TOKEN || '';
  if (!TOKEN) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ error: 'missing_token' })); return; }
  try {
    const part = String((req.query && req.query.part) || new URL(req.url, 'http://x').searchParams.get('part') || '');
    const sp = new URL(req.url, 'http://x').searchParams; const q = { from: (req.query && req.query.from) || sp.get('from'), to: (req.query && req.query.to) || sp.get('to') };
    const data = part === 'trends' ? await buildTrends() : part === 'matt' ? await buildMatt(q) : part === 'calls' ? await buildCalls(q) : await build(q);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.end(JSON.stringify(data));
  } catch (e) {
    res.statusCode = e.status === 401 || e.status === 403 ? 502 : 500;
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: e.status === 401 ? 'bad_token' : e.status === 403 ? 'missing_scope' : 'hubspot_error', message: String(e.message || e).slice(0, 400) }));
  }
};
