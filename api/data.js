// Live SDR data from HubSpot. Needs the HUBSPOT_TOKEN env var (a HubSpot private app token, read-only scopes).

const { allowed } = require('./_auth');
const API = 'https://api.hubapi.com';
const SDRS = [
  { k: 'james', id: '29569627', name: 'James Crawford', short: 'James', pod: 'Sales Pod 1', lead: 'Jason Baaphy', leadId: '1709905072' },
  { k: 'matthew', id: '32364701', name: 'Matthew Meehan', short: 'Matthew', pod: 'Sales Pod 2', lead: 'Felix Dealtry', leadId: '511871441' },
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
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch(API + path, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 429 || r.status >= 500) { // back off (HubSpot's search limit is per second, its general limit per 10 seconds)
      const ra = Number(r.headers.get('retry-after')); await sleep((ra > 0 ? ra * 1000 : 700 * (attempt + 1)) + Math.random() * 500); continue; }
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
  // NEW meetings only, and companies with no SDR Owner credited through the pods (see newBookings / podBookings)
  const mbEnd = now.getTime() + 86400000;
  const pbM = await podBookings(mbFrom, mbEnd, id => !!(coById[id] && coById[id].sdr));
  const mbT0 = await mbTransitions(Object.keys(coById).filter(id => coById[id].sdr && (coById[id].lm == null || coById[id].lm >= mbFrom)).concat(Object.keys(pbM.att), pbM.slack.map(x => x.coId)));
  const nbM = await newBookings(mbT0, pbM, mbFrom, mbEnd, id => coById[id] && coById[id].sdr ? SDRS.findIndex(s => s.k === coById[id].sdr.k) : -1);
  const mbT = {}, mbSdr = {}; nbM.forEach(r => { (mbT[r[0]] = mbT[r[0]] || []).push(r[1]); mbSdr[r[0]] = SDRS[r[2]]; });
  const podCo = {}, podIds = Object.keys(mbT).filter(id => !coById[id]);
  if (podIds.length) { const mp = await batchReadPar('companies', podIds, ['name', 'account_status']); podIds.forEach(id => { const q = mp[id] || {}; podCo[id] = { name: (q.name || 'Company ' + id).trim(), sdr: mbSdr[id], status: statusOpts[q.account_status] || q.account_status || '' }; }); }
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
    const sk = mbSdr[id].k, x = S[sk];
    K.forEach(k => { if (mbIn(id, k) != null) { x.first[k]++; add('booked', sk, k, id); } });
    if (mbT[id].some(t => t >= d30)) { x.booked30++; add('booked30', sk, 'all', id); }
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
    const c = Object.assign({}, coById[id] || podCo[id], { sdr: mbSdr[id] });
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

/* ---------- meetings booked per month, by SDR (last 12 months) ----------
   Same rule as the reports: a company moving to Account Status "Meeting Booked", once per company per month,
   credited to the company's SDR Owner. */
async function buildBookedMonths() {
  const now = new Date();
  const sdrBy = {}; SDRS.forEach(s => { sdrBy[s.id] = s; sdrBy[s.name.toLowerCase()] = s; });
  const sdrOf = v => { if (!v) return null; v = String(v); return sdrBy[v] || sdrBy[v.toLowerCase()] || SDRS.find(s => v.toLowerCase().startsWith(s.short.toLowerCase())) || null; };
  const lp = londonParts(now);
  const months = []; for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(lp.y, lp.m - 1 - i, 1)); months.push(d.toISOString().slice(0, 7)); }
  const startMs = Date.parse(months[0] + '-01T00:00:00Z') - 3600000;
  const sdrOpts = await options('companies', 'sdr_owner');
  const companies = await searchAll('companies', [{ filters: [{ propertyName: 'sdr_owner', operator: 'HAS_PROPERTY' }, { propertyName: 'hs_lastmodifieddate', operator: 'GTE', value: String(startMs) }] }], ['sdr_owner']);
  const coSdr = {}; companies.forEach(c => { const sd = sdrOf(c.properties.sdr_owner) || sdrOf(sdrOpts[c.properties.sdr_owner]); if (sd) coSdr[c.id] = sd; });
  const endMs = now.getTime() + 86400000;
  const pb = await podBookings(startMs, endMs, id => !!coSdr[id]);
  const mbT = await mbTransitions(Object.keys(coSdr).concat(Object.keys(pb.att), pb.slack.map(x => x.coId)));
  const nb = await newBookings(mbT, pb, startMs, endMs, id => coSdr[id] ? SDRS.indexOf(coSdr[id]) : -1);
  const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' });
  const by = {}; SDRS.forEach(sd => { by[sd.k] = months.map(() => 0); });
  const list = [], seen = {};
  nb.forEach(r => { const mi = months.indexOf(ym.format(new Date(r[1])).slice(0, 7)); if (mi < 0 || seen[r[0] + '|' + mi]) return; seen[r[0] + '|' + mi] = 1; const k = SDRS[r[2]].k; by[k][mi]++; list.push([r[0], r[1], k, r[3], coSdr[r[0]] ? 'sdr owner' : 'pod']); });
  const nameIds = [...new Set(list.map(r => r[0]))]; const nm = nameIds.length ? await batchReadPar('companies', nameIds, ['name']) : {};
  list.forEach(r => { r.push(((nm[r[0]] || {}).name || '').trim()); });
  return { generatedAt: now.toISOString(), months, SDRS: SDRS.map(sd => ({ k: sd.k, short: sd.short })), by, total: months.map((m, i) => SDRS.reduce((a, sd) => a + by[sd.k][i], 0)), list, slackError: pb.error };
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
  const tEnd = now.getTime() + 86400000;
  const pbT = await podBookings(trendStart, tEnd, id => !!coSdr[id]);
  const mbT = await mbTransitions(Object.keys(coSdr).filter(id => coLm[id] == null || coLm[id] >= trendStart).concat(Object.keys(pbT.att), pbT.slack.map(x => x.coId)));
  const nbT = await newBookings(mbT, pbT, trendStart, tEnd, id => coSdr[id] ? SDRS.indexOf(coSdr[id]) : -1);
  const tSeen = {}; nbT.forEach(r => { const wi = wkIdx(r[1]); if (wi >= 0 && !tSeen[r[0] + '|' + wi]) { tSeen[r[0] + '|' + wi] = 1; TR[SDRS[r[2]].k].booked[wi]++; } });
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

/* ---------- daily / weekly / monthly report: ?span=day|week|month&day=YYYY-MM-DD (any date in the period; default today) ---------- */
async function batchReadPar(type, ids, properties) {
  const out = {}; const list = [...new Set(ids)]; const chunks = [];
  for (let i = 0; i < list.length; i += 100) chunks.push(list.slice(i, i + 100));
  const one = async ch => { const r = await hs('/crm/v3/objects/' + type + '/batch/read', { inputs: ch.map(id => ({ id: String(id) })), properties }); (r.results || []).forEach(x => { out[String(x.id)] = x.properties || {}; }); };
  for (let i = 0; i < chunks.length; i += 6) await Promise.all(chunks.slice(i, i + 6).map(one));
  return out;
}
// Which of these contacts/companies had an SDR call (or, with emails, an outgoing email) earlier this year, before `start`
async function touchedBefore(type, ids, start, yearStart, withEmails) {
  const prior = {}; if (!ids.length) return prior;
  const [ac, ae] = await Promise.all([assoc(type, 'calls', ids), withEmails ? assoc(type, 'emails', ids) : {}]);
  const callIds = [...new Set(Object.values(ac).flat())], emIds = [...new Set(Object.values(ae).flat())];
  const [cp, ep] = await Promise.all([callIds.length ? batchReadPar('calls', callIds, ['hs_timestamp', 'hubspot_owner_id']) : {}, emIds.length ? batchReadPar('emails', emIds, ['hs_timestamp', 'hubspot_owner_id', 'hs_email_direction']) : {}]);
  const early = (p, isEmail) => { if (!p) return false; const t = toMs(p.hs_timestamp); return t != null && t >= yearStart && t < start && SDR_IDS.indexOf(String(p.hubspot_owner_id)) >= 0 && (!isEmail || p.hs_email_direction === 'EMAIL'); };
  ids.forEach(id => { prior[id] = (ac[id] || []).some(x => early(cp[x], false)) || (ae[id] || []).some(x => early(ep[x], true)); });
  return prior;
}
async function buildReport(q) {
  const now = new Date();
  const P = periods(now);
  const span = q && (q.span === 'week' || q.span === 'month' || q.span === 'd30') ? q.span : 'day';
  let anchor = P.today;
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q.day || '')) { const [y, m, d] = q.day.split('-').map(Number); const s0 = londonMidnight(y, m, d); if (s0 <= P.today && s0 > P.today - 400 * 86400000) anchor = s0; }
  const ap = londonParts(new Date(anchor + 3600000));
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(ap.wd);
  // d30 = the 30 days up to and including today: the rolling window for open data fixes
  const tp = londonParts(new Date(P.today + 3600000));
  const start = span === 'd30' ? londonMidnight(tp.y, tp.m, tp.d - 29) : span === 'month' ? londonMidnight(ap.y, ap.m, 1) : span === 'week' ? londonMidnight(ap.y, ap.m, ap.d - wd) : anchor;
  const sp = londonParts(new Date(start + 3600000));
  const end = span === 'd30' ? P.today + 86400000 : span === 'month' ? londonMidnight(sp.y, sp.m + 1, 1) : londonMidnight(sp.y, sp.m, sp.d + (span === 'week' ? 7 : 1));
  const cut = Math.min(end, P.today + 86400000), ep = londonParts(new Date(cut - 3600000));
  const yearStart = londonMidnight(sp.y, 1, 1), d30 = londonMidnight(ep.y, ep.m, ep.d - 29);
  const sdrBy = {}; SDRS.forEach((s, i) => { sdrBy[s.id] = i; sdrBy[s.name.toLowerCase()] = i; });
  const sdrIx = v => { if (!v) return -1; v = String(v); if (sdrBy[v] != null) return sdrBy[v]; if (sdrBy[v.toLowerCase()] != null) return sdrBy[v.toLowerCase()]; return SDRS.findIndex(s => v.toLowerCase().startsWith(s.short.toLowerCase())); };
  const range = [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(start) }, { propertyName: 'hs_timestamp', operator: 'LT', value: String(end) }];
  const owner = { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS };
  const labels = Object.assign({}, CALL_LABELS);

  const [sdrOpts, indOpts, statusOpts, disp, calls, emails, meetings, sdrCos] = await Promise.all([
    options('companies', 'sdr_owner'), options('companies', 'industry_'), options('companies', 'account_status'),
    hs('/calling/v1/dispositions').catch(() => []),
    searchAll('calls', [{ filters: [owner].concat(range) }], ['hs_timestamp', 'hs_call_disposition', 'hubspot_owner_id', 'hs_activity_type', 'hs_call_duration'], 'hs_timestamp'),
    searchAll('emails', [{ filters: [owner].concat(range) }], ['hs_timestamp', 'hs_email_direction', 'hubspot_owner_id', 'hs_email_subject', 'hs_sequence_id'], 'hs_timestamp'),
    searchAll('meetings', [{ filters: [{ propertyName: 'hs_createdate', operator: 'GTE', value: String(start) }, { propertyName: 'hs_createdate', operator: 'LT', value: String(end) }] }], ['hs_meeting_title', 'hs_createdate', 'hs_meeting_start_time', 'hs_meeting_outcome', 'hubspot_owner_id', 'hs_activity_type']),
    searchAll('companies', [{ filters: [{ propertyName: 'sdr_owner', operator: 'HAS_PROPERTY' }] }], ['name', 'sdr_owner', 'account_status', 'industry_', 'industry', 'notes_last_contacted', 'hs_lastmodifieddate'])
  ]);
  (Array.isArray(disp) ? disp : []).forEach(x => { if (x && x.id && x.label) labels[x.id] = x.label; });

  // every SDR-owned company: assignment and 30-day coverage
  const CO = {}; const COV = SDRS.map(() => ({ assigned: 0, l30: 0 }));
  const coRow = p => { let si = sdrIx(p.sdr_owner); if (si < 0) si = sdrIx(sdrOpts[p.sdr_owner]); return [(p.name || 'Unnamed company').trim(), indOpts[p.industry_] || p.industry_ || p.industry || '', si, statusOpts[p.account_status] || p.account_status || '', p.sdr_owner ? 1 : 0]; };
  sdrCos.forEach(c => { const r = coRow(c.properties); CO[c.id] = r; if (r[2] >= 0) { COV[r[2]].assigned++; const lc = toMs(c.properties.notes_last_contacted); if (lc != null && lc >= d30 && lc < cut) COV[r[2]].l30++; } });

  // the day's activity, with its contacts and companies
  const ids = calls.map(c => c.id), eids = emails.map(e => e.id);
  const [cCo, cCon, eCo, eCon, mCo] = await Promise.all([
    ids.length ? assoc('calls', 'companies', ids) : {}, ids.length ? assoc('calls', 'contacts', ids) : {},
    eids.length ? assoc('emails', 'companies', eids) : {}, eids.length ? assoc('emails', 'contacts', eids) : {},
    meetings.length ? assoc('meetings', 'companies', meetings.map(m => m.id)) : {}
  ]);
  const ACT = [];
  calls.forEach(c => { const p = c.properties; ACT.push([toMs(p.hs_timestamp), sdrIx(p.hubspot_owner_id), 'c', p.hs_call_disposition || '', cCo[c.id] || [], cCon[c.id] || [], p.hs_activity_type || '', c.id, p.hs_call_duration ? Math.round(Number(p.hs_call_duration) / 1000) : 0]); });
  emails.forEach(e => { const p = e.properties; const k = p.hs_email_direction === 'EMAIL' ? 'e' : p.hs_email_direction === 'INCOMING_EMAIL' ? 'r' : ''; if (k) ACT.push([toMs(p.hs_timestamp), sdrIx(p.hubspot_owner_id), k, p.hs_sequence_id ? 'seq' : '', eCo[e.id] || [], eCon[e.id] || [], (p.hs_email_subject || '').slice(0, 120), e.id, 0]); });
  const acts = ACT.filter(a => a[0] != null && a[1] >= 0);

  const conIds = [...new Set(acts.flatMap(a => a[5]))];
  const conP = conIds.length ? await batchReadPar('contacts', conIds, ['firstname', 'lastname', 'jobtitle', 'associatedcompanyid']) : {};
  const CON = {}; Object.keys(conP).forEach(id => { const p = conP[id]; CON[id] = [[p.firstname, p.lastname].filter(Boolean).join(' ') || 'Unnamed contact', p.jobtitle || '', p.associatedcompanyid || null]; });
  // an activity with no company linked falls back to its contact's company
  acts.forEach(a => { if (!a[4].length) a[4] = [...new Set(a[5].map(id => CON[id] && CON[id][2]).filter(Boolean))]; });
  const meetCoIds = Object.values(mCo).flat();
  const missing = [...new Set(acts.flatMap(a => a[4]).concat(meetCoIds))].filter(id => !CO[id]);
  if (missing.length) { const mp = await batchReadPar('companies', missing, ['name', 'sdr_owner', 'account_status', 'industry_', 'industry']); Object.keys(mp).forEach(id => { CO[id] = coRow(mp[id]); }); }

  // net new = no SDR call or outgoing email earlier this year
  const outActs = acts.filter(a => a[2] !== 'r');
  const reachCo = [...new Set(outActs.flatMap(a => a[4]))], reachCon = [...new Set(outActs.flatMap(a => a[5]))];
  // contacts: earlier SDR calls and emails; companies: earlier SDR calls on the company, or an earlier touch on any of its contacts reached
  const [priorCo, priorCon] = await Promise.all([touchedBefore('companies', reachCo, start, yearStart, false), touchedBefore('contacts', reachCon, start, yearStart, true)]);
  outActs.forEach(a => { if (a[5].some(id => priorCon[id])) a[4].forEach(id => { priorCo[id] = true; }); });

  // meetings booked: companies moved to Meeting Booked on the day, and meetings logged that day
  const MEET = meetings.map(m => { const p = m.properties; const cos = mCo[m.id] || []; const coId = cos.find(id => CO[id] && CO[id][2] >= 0) || cos[0] || null; let si = coId && CO[coId] ? CO[coId][2] : -1; if (si < 0) si = podIx(p.hubspot_owner_id);
    return [m.id, (p.hs_meeting_title || 'Meeting').slice(0, 120), coId, si, toMs(p.hs_createdate), toMs(p.hs_meeting_start_time), p.hs_activity_type || '', p.hs_meeting_outcome || '', OWNER_NAMES[p.hubspot_owner_id] || (SDRS[sdrIx(p.hubspot_owner_id)] || {}).name || ''];
  }).filter(r => r[3] >= 0 && !/^\[gong\]/i.test(r[1]));
  // meetings booked: NEW meetings only (see newBookings), first per company in the period. Companies with no SDR Owner
  // are credited through the pods (#grwth poster, then the meeting owner; Jason -> James, Felix -> Matthew).
  const pb = await podBookings(start, end, id => !!(CO[id] && CO[id][2] >= 0));
  const cand = [...new Set(sdrCos.filter(c => { const lm = toMs(c.properties.hs_lastmodifieddate); return lm != null && lm >= start; }).map(c => c.id).concat(Object.keys(pb.att), pb.slack.map(x => x.coId)))];
  const mb = cand.length ? await mbTransitions(cand) : {};
  const nb = await newBookings(mb, pb, start, end, id => CO[id] ? CO[id][2] : -1);
  const MB = [], mbSeen = {}; nb.forEach(r => { if (mbSeen[r[0]]) return; mbSeen[r[0]] = 1; MB.push([r[0], r[1], r[2], r[3]]); });
  const miss2 = MB.map(r => r[0]).filter(id => !CO[id]);
  if (miss2.length) { const mp = await batchReadPar('companies', miss2, ['name', 'sdr_owner', 'account_status', 'industry_', 'industry']); Object.keys(mp).forEach(id => { CO[id] = coRow(mp[id]); }); }

  const COx = {}; [...new Set(acts.flatMap(a => a[4]).concat(MB.map(r => r[0])).concat(MEET.map(r => r[2]).filter(Boolean)))].forEach(id => { if (CO[id]) COx[id] = CO[id]; });
  let SLK = [], SLKERR = null, SLKN = 0;
  try { const sc = await slackMeetingChecks(start, end); SLK = sc.rows; SLKERR = sc.error; SLKN = sc.posts; } catch (e) { SLKERR = String(e.message || e).slice(0, 120); }
  return { generatedAt: now.toISOString(), span, day: iso(start), last: iso(cut - 3600000), start, end, today: P.todayIso, labels, SLK, SLKERR, SLKN, SDRS: SDRS.map(s => ({ k: s.k, name: s.name, short: s.short, pod: s.pod })),
    ACT: acts, CO: COx, CON, NEWCO: reachCo.filter(id => !priorCo[id]), NEWCON: reachCon.filter(id => !priorCon[id]), MB, MEET, COV };
}

/* ---------- the daily report for Slack, from the same numbers as the Daily report page ----------
   slackModel() works out the numbers; slackBlocks() lays them out as Slack Block Kit (header, fields, monospace tables)
   for the incoming webhook; slackMarkdown() gives the same content as markdown with tables. */
const PORTAL = 'https://inploi-sdr-portal.vercel.app';
const HS_DASH = 'https://app-eu1.hubspot.com/reports-dashboard/25735731/view/115946730'; // the link sent in Slack
function slackModel(R, R30, kind) {
  const weekly = kind === 'weekly';
  const CONNECTED = ['connected', 'valuable conversation', 'meeting booked', 'bad timing', 'not interested'];
  const lab = d => d ? (R.labels[d] || 'Other outcome') : 'No outcome logged';
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const newCo = new Set(R.NEWCO), newCon = new Set(R.NEWCON);
  const crunch = sis => {
    const A = R.ACT.filter(a => sis.includes(a[1])), out = A.filter(a => a[2] !== 'r');
    const calls = A.filter(a => a[2] === 'c'), ems = A.filter(a => a[2] === 'e'), reps = A.filter(a => a[2] === 'r');
    const cos = [...new Set(out.flatMap(a => a[4]))], cons = [...new Set(out.flatMap(a => a[5]))];
    const conn = calls.filter(a => CONNECTED.includes(lab(a[3]).toLowerCase()));
    return { calls: calls.length, ems: ems.length, reps: reps.length, conn: conn.length, cos: cos.length, cons: cons.length,
      newCo: cos.filter(id => newCo.has(id)).length, newCon: cons.filter(id => newCon.has(id)).length, mb: R.MB.filter(r => sis.includes(r[2])).length, callList: calls, cosList: cos };
  };
  const all = R.SDRS.map((s, i) => i), T = crunch(all), per = R.SDRS.map((s, i) => ({ n: s.short, C: crunch([i]) }));
  const title = weekly ? 'w/c ' + new Date(R.day + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    : new Date(R.day + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const oc = {}; T.callList.forEach(a => { const k = lab(a[3]); oc[k] = (oc[k] || 0) + 1; });
  const outcomes = Object.keys(oc).sort((a, b) => oc[b] - oc[a]).map(k => [k, oc[k], pct(oc[k], T.calls)]);
  const ind = {}; T.cosList.forEach(id => { const k = (R.CO[id] && R.CO[id][1]) || 'No industry set'; ind[k] = (ind[k] || 0) + 1; });
  const industries = Object.keys(ind).sort((a, b) => ind[b] - ind[a]).slice(0, 5).map(k => k + ' ' + ind[k]);
  const leaders = [['Calls', C => C.calls], ['Connects', C => C.conn], ['Emails', C => C.ems], ['Replies', C => C.reps], ['Accounts', C => C.cos], ['Net new accts', C => C.newCo], ['Meetings', C => C.mb]]
    .map(([name, f]) => [name].concat(per.map(x => ({ n: x.n, v: f(x.C) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.n + ' ' + x.v)))
    .filter(r => r.length > 1);
  // open data fixes: records worked in the last 30 days, as they are in HubSpot now; plus what's new today
  const gapsOf = X => {
    const sname = i => X.SDRS[i] ? X.SDRS[i].short : 'Other', full = {}; X.SDRS.forEach(x => { full[x.name] = x.short; });
    const out = X.ACT.filter(a => a[2] !== 'r'), calls = X.ACT.filter(a => a[2] === 'c'), now = Date.now(), coBy = {};
    const cos = [...new Set(out.flatMap(a => a[4]))]; out.forEach(a => a[4].forEach(id => { (coBy[id] = coBy[id] || new Set()).add(sname(a[1])); }));
    const mw = r => [full[r[8]] || r[8] || sname(r[3])];
    return [
      ['Meeting: no type', X.MEET.filter(r => !r[6]).map(r => ['m' + r[0], mw(r)])],
      ['Meeting: no outcome', X.MEET.filter(r => r[5] && r[5] < now && (!r[7] || /SCHEDULED/i.test(r[7]))).map(r => ['m' + r[0], mw(r)])],
      ['Account: no SDR Owner', cos.filter(id => X.CO[id] && !X.CO[id][4]).map(id => ['o' + id, [...(coBy[id] || [])]])],
      ['Account: no status', cos.filter(id => X.CO[id] && !X.CO[id][3]).map(id => ['s' + id, [...(coBy[id] || [])]])],
      ['Call: no outcome', calls.filter(a => !a[3]).map(a => ['c' + a[7], [sname(a[1])]])],
      ['Call: no call type', calls.filter(a => !a[6]).map(a => ['t' + a[7], [sname(a[1])]])],
      ['Activity: no contact', out.filter(a => !a[5].length).map(a => ['n' + a[7], [sname(a[1])]])],
      ['Activity: no company', out.filter(a => !a[4].length).map(a => ['k' + a[7], [sname(a[1])]])],
      ['Slack meeting: not in HubSpot', (X.SLK || []).map(r => ['g' + r[5] + r[4].slice(0, 12), [r[1]]])]
    ];
  };
  const todayG = gapsOf(R), openG = R30 ? gapsOf(R30) : todayG, todayIds = new Set(todayG.flatMap(g => g[1].map(x => x[0])));
  openG.forEach((g, gi) => { const have = new Set(g[1].map(x => x[0])); todayG[gi][1].forEach(x => { if (!have.has(x[0])) g[1].push(x); }); });
  const sdrNames = R.SDRS.map(s => s.short);
  const gaps = openG.filter(g => g[1].length).map(([name, rows]) => {
    const c = {}; rows.forEach(r => r[1].forEach(n => { c[n] = (c[n] || 0) + 1; }));
    const other = Object.keys(c).filter(n => !sdrNames.includes(n)).reduce((t, n) => t + c[n], 0);
    return { name, open: rows.length, fresh: rows.filter(r => todayIds.has(r[0])).length, by: sdrNames.map(n => c[n] || 0), other, otherNames: Object.keys(c).filter(n => !sdrNames.includes(n)) };
  });
  return { kind: weekly ? 'weekly' : 'daily', name: weekly ? 'SDR weekly report' : 'SDR daily report', newLabel: weekly ? 'New this week' : 'New today', title, soFar: weekly ? R.today <= R.last : R.day === R.today, T, per, sdrNames, pct, outcomes, industries, leaders, gaps, windowed: !!R30,
    team: [['Accounts reached', T.cos + '  (' + T.newCo + ' net new)'], ['Contacts reached', T.cons + '  (' + T.newCon + ' net new)'], ['Calls', T.calls + '  (' + pct(T.conn, T.calls) + ' connect)'],
      ['Emails sent', String(T.ems)], ['Replies', T.reps + '  (' + pct(T.reps, T.ems) + ' reply rate)'], ['Meetings booked', String(T.mb)], ['Contacts per account', T.cos ? String(Math.round(T.cons / T.cos * 10) / 10) : '–']] };
}
// a fixed-width table for a Slack code block
function monoTable(head, rows, right) {
  const all = [head].concat(rows).map(r => r.map(String)), w = head.map((h, i) => Math.max(...all.map(r => (r[i] || '').length)));
  const line = r => r.map((v, i) => i === 0 || !right ? v.padEnd(w[i]) : v.padStart(w[i])).join('  ').replace(/\s+$/, '');
  return '```\n' + [line(all[0]), w.map(n => '-'.repeat(n)).join('  ')].concat(all.slice(1).map(line)).join('\n') + '\n```';
}
function slackTables(M) {
  const sdr = monoTable(['SDR', 'Accts', 'New', 'Contacts', 'Calls', 'Conn', 'Emails', 'Replies', 'Mtgs'],
    M.per.map(x => [x.n, x.C.cos, x.C.newCo, x.C.cons, x.C.calls, M.pct(x.C.conn, x.C.calls), x.C.ems, x.C.reps, x.C.mb])
      .concat([['Team', M.T.cos, M.T.newCo, M.T.cons, M.T.calls, M.pct(M.T.conn, M.T.calls), M.T.ems, M.T.reps, M.T.mb]]), true);
  const out = M.outcomes.length ? monoTable(['Outcome', 'Calls', 'Share'], M.outcomes, true) : '_No calls logged._';
  const lead = M.leaders.length ? monoTable(['Activity', '1st', '2nd', '3rd'], M.leaders.map(r => [r[0], r[1] || '', r[2] || '', r[3] || '']), false) : '_No activity yet._';
  const gaps = M.gaps.length ? monoTable(['Open fix', 'Open', 'New'].concat(M.sdrNames).concat(M.gaps.some(g => g.other) ? ['Other'] : []),
    M.gaps.map(g => [g.name, g.open, g.fresh].concat(g.by).concat(M.gaps.some(x => x.other) ? [g.other] : [])), true) : '_Nothing open. Nice work._';
  const others = [...new Set(M.gaps.flatMap(g => g.otherNames))];
  return { sdr, out, lead, gaps, others };
}
function slackBlocks(M) {
  const t = slackTables(M), sec = text => ({ type: 'section', text: { type: 'mrkdwn', text } });
  const fields = M.team.map(([k, v]) => ({ type: 'mrkdwn', text: '*' + k + '*\n' + v }));
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: M.name + ' · ' + M.title } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: (M.soFar ? (M.kind === 'weekly' ? 'So far this week · ' : 'So far today · ') : '') + 'UK time · <' + HS_DASH + '|Open the HubSpot dashboard>' }] },
    { type: 'section', text: { type: 'mrkdwn', text: '*Team*' }, fields: fields.slice(0, 6) },
    fields[6] ? { type: 'context', elements: [{ type: 'mrkdwn', text: 'Contacts per account: *' + M.team[6][1] + '*' + (M.industries.length ? '   ·   Top industries: ' + M.industries.join(', ') : '') }] } : null,
    { type: 'divider' }, sec('*By SDR*\n' + t.sdr),
    sec('*Call outcomes*\n' + t.out),
    sec('*Leaderboard*\n' + t.lead),
    M.visits ? sec('*Inbound visits* (<https://inploi.slack.com/archives/' + VISITS_CH + '|#inbound-visits>)\n' + visitsLine(M, true)) : null,
    { type: 'divider' }, sec('*Open data fixes*' + (M.windowed ? '  _(records worked in the last 30 days, as they are in HubSpot now)_' : '') + '\n' + t.gaps),
    { type: 'context', elements: [{ type: 'mrkdwn', text: (t.others.length ? 'Other = ' + t.others.join(', ') + '. ' : '') + 'Fix these in HubSpot.' }] }
  ].filter(Boolean);
  return blocks;
}
function slackFallback(M) {
  return M.name + ' · ' + M.title + ': ' + M.T.calls + ' calls, ' + M.T.ems + ' emails, ' + M.T.cos + ' accounts reached, ' + M.T.mb + ' meetings booked.';
}
function slackMarkdown(M) {
  const t = slackTables(M), tbl = (head, rows) => '| ' + head.join(' | ') + ' |\n|' + head.map(() => ' --- ').join('|') + '|\n' + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n');
  const L = ['**' + M.name + ' · ' + M.title + '**' + (M.soFar ? (M.kind === 'weekly' ? ' (so far this week)' : ' (so far today)') : ''), '',
    tbl(M.team.map(r => r[0]), [M.team.map(r => r[1])]), '',
    '**By SDR**', tbl(['SDR', 'Accounts', 'Net new', 'Contacts', 'Calls', 'Connect', 'Emails', 'Replies', 'Meetings'],
      M.per.map(x => [x.n, x.C.cos, x.C.newCo, x.C.cons, x.C.calls, M.pct(x.C.conn, x.C.calls), x.C.ems, x.C.reps, x.C.mb]).concat([['**Team**', M.T.cos, M.T.newCo, M.T.cons, M.T.calls, M.pct(M.T.conn, M.T.calls), M.T.ems, M.T.reps, M.T.mb]])), '',
    '**Call outcomes**', M.outcomes.length ? tbl(['Outcome', 'Calls', 'Share'], M.outcomes) : '_No calls logged._', '',
    '**Leaderboard**', M.leaders.length ? tbl(['Activity', '1st', '2nd', '3rd'], M.leaders.map(r => [r[0], r[1] || '', r[2] || '', r[3] || ''])) : '_No activity yet._', '',
    (M.visits ? '**Inbound visits**\n' + visitsLine(M, false).replace(/\n/g, '  \n') + '\n' : ''),
    '**Open data fixes**' + (M.windowed ? ' _(records worked in the last 30 days, as they are in HubSpot now)_' : ''),
    M.gaps.length ? tbl(['Open fix', 'Open', M.newLabel].concat(M.sdrNames).concat(t.others.length ? ['Other'] : []), M.gaps.map(g => [g.name, g.open, g.fresh].concat(g.by).concat(t.others.length ? [g.other] : []))) : '_Nothing open._',
    (t.others.length ? 'Other = ' + t.others.join(', ') + '. ' : '') + '[Open the HubSpot dashboard](' + HS_DASH + ')'];
  return L.join('\n');
}

// #grwth check: every "Meeting Booked" post by the team should be reflected in HubSpot
// (company found, Account Status = Meeting Booked, a meeting logged, and HubSpot's deal notification posted).
// Reads the channel with SLACK_USER_TOKEN (needs the channels:history user scope).
const GRWTH = process.env.SLACK_MEETINGS_CHANNEL || 'C051TCCG35K';
const SLACK_PEOPLE = { U091M9F594K: 'James', U0AEZD9MU76: 'Matthew', U091M9CPELB: 'Nikita', U091M9BGVH9: 'Evan', UJ4NW5RA6: 'Felix Dealtry', U0ALBK2EA31: 'Annie', U04Q69EU84X: 'Jake Donald', U0CLN2VM2: 'Matt', U0BJTG9SECB: 'Arushi', U07D0E25KK9: 'Jason Baaphy' };
// who gets the credit for a #grwth post: SDRs themselves; pod leads credit their pod's SDR (Jason -> James, Felix -> Matthew)
const SLACK_SDR = { U091M9F594K: 0, U0AEZD9MU76: 1, U091M9CPELB: 2, U091M9BGVH9: 3, U07D0E25KK9: 0, UJ4NW5RA6: 1 };
const normCo = t => String(t || '').toLowerCase().replace(/&amp;/g, '&').replace(/[’'`]/g, '').replace(/\([^)]*\)/g, ' ')
  .replace(/\b(the|ltd|limited|plc|group|uk|ireland|europe|international|holdings|inc|llp|co)\b/g, ' ').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const sameCo = (a, b) => { const x = normCo(a), y = normCo(b); if (!x || !y) return false; if (x === y || x.includes(y) || y.includes(x)) return true; const xs = x.split(' '), ys = new Set(y.split(' ')); const hit = xs.filter(w => w.length > 2 && ys.has(w)).length; return hit && hit >= Math.min(xs.length, ys.size) * 0.6; };
const slackCache = new Map();
async function grwthPosts(oldestSec, latestSec) {
  const token = process.env.SLACK_USER_TOKEN || '';
  if (!token) return { error: 'SLACK_USER_TOKEN is not set', posts: [] };
  const key = oldestSec + '|' + Math.floor(latestSec / 300);
  const hitS = slackCache.get(key); if (hitS) return hitS;
  const msgs = []; let cursor = '';
  for (let i = 0; i < 10; i++) {
    const u = 'https://slack.com/api/conversations.history?channel=' + GRWTH + '&limit=200&oldest=' + oldestSec + '&latest=' + latestSec + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
    const j = await fetch(u, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()).catch(e => ({ ok: false, error: String(e.message || e) }));
    if (!j.ok) {
      // say which permissions the token has (names only, never the token)
      let scopes = '';
      try { const r = await fetch('https://slack.com/api/auth.test', { headers: { Authorization: 'Bearer ' + token } }); scopes = r.headers.get('x-oauth-scopes') || ''; } catch (e) { scopes = ''; }
      const kind = token.startsWith('xoxp-') ? 'user token' : token.startsWith('xoxb-') ? 'bot token' : 'unrecognised token type';
      return { error: (j.error === 'missing_scope' ? 'the Slack token needs the channels:history scope' : (j.error || 'Slack error')) + ' (' + kind + '; it has: ' + (scopes || 'no scopes reported') + ')', posts: [] };
    }
    msgs.push(...(j.messages || []));
    cursor = j.response_metadata && j.response_metadata.next_cursor; if (!j.has_more || !cursor) break;
  }
  const clean = t => String(t || '').replace(/[*_]/g, '').replace(/&amp;/g, '&');
  const posts = [], deals = [];
  msgs.forEach(m => {
    const t = clean(m.text);
    if (/New Discovery Meeting Booked/i.test(t)) { const d = /Deal Name\s*-\s*(.+)/i.exec(t); if (d) deals.push({ name: d[1].trim(), ts: Number(m.ts) * 1000 }); return; }
    if (m.bot_id || !/^\s*Meeting Booked/i.test(t)) return;
    const tg = /Target:\s*(.+)/i.exec(t);
    if (!tg) return;
    posts.push({ ts: Number(m.ts) * 1000, uid: m.user, si: SLACK_SDR[m.user] != null ? SLACK_SDR[m.user] : -1, demo: /\bdemo\b/i.test(t), by: SLACK_PEOPLE[m.user] || 'Someone in #grwth', target: tg[1].trim(), link: 'https://inploi.slack.com/archives/' + GRWTH + '/p' + String(m.ts).replace('.', '') });
  });
  const v = { error: null, posts, deals };
  if (slackCache.size > 20) slackCache.clear(); slackCache.set(key, v);
  return v;
}
// the HubSpot company a #grwth "Target:" names (cached per target for 10 minutes)
const coMatchCache = new Map();
async function matchCo(target) {
  const hit = coMatchCache.get(target); if (hit && Date.now() - hit.at < 600000) return hit.co;
  let co = null;
  let failed = false;
  try { co = await (async () => {
      // search a few ways (full name, cleaned name, its longest word), then pick the closest name;
      // ties go to the company already marked Meeting Booked, so old duplicates don't win
      const words = t => String(t || '').toLowerCase().replace(/&amp;/g, '&').replace(/&/g, ' and ').replace(/[’'`]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !/^(the|ltd|limited|plc|group|uk|ireland|europe|international|holdings|inc|llp|co|and)$/.test(w));
      const tw = words(target), longest = tw.slice().sort((a, b) => b.length - a.length)[0] || target;
      const qs = [...new Set([target.replace(/[()]/g, ' ').slice(0, 80), normCo(target), longest])].filter(Boolean);
      const cands = {};
      const score = c => { const cw = new Set(words(c.properties.name)); if (!cw.size || !tw.length) return 0; const hit = tw.filter(w => cw.has(w)).length; return hit / Math.max(tw.length, cw.size); };
      for (const q of qs) {
        const r = await hs('/crm/v3/objects/companies/search', { query: q, limit: 20, properties: ['name', 'account_status', 'hs_lastmodifieddate'] });
        (r.results || []).forEach(c => { cands[c.id] = c; });
        if (Object.values(cands).some(c => score(c) >= 0.99)) break; // exact name found: no need for wider searches
      }
      const ranked = Object.values(cands).map(c => ({ c, s: score(c) + (sameCo(c.properties.name, target) ? 0.25 : 0) + (/meeting booked|opportunit/i.test(c.properties.account_status || '') ? 0.1 : 0) }))
        .filter(x => x.s >= 0.4).sort((a, b) => b.s - a.s);
      return ranked.length ? ranked[0].c : null;
    })(); } catch (e) { co = null; failed = true; }
  if (!failed) coMatchCache.set(target, { co, at: Date.now() });
  return co;
}

/* ---------- pods and new meetings ----------
   Only NEW meetings count as booked: a new discovery meeting (what HubSpot's bot posts as "New Discovery Meeting Booked").
   Demos, deal progression, QBRs and check-ins don't count, and nor does a meeting with a company already open in the pipeline.
   Companies with no SDR Owner are credited through the pods: the #grwth poster first, then the meeting's HubSpot owner.
   An SDR credits themselves; a pod lead credits their pod's SDR (Jason Baaphy -> James, Felix Dealtry -> Matthew). */
const podIx = ownerId => { const id = String(ownerId || ''); if (!id) return -1; const i = SDRS.findIndex(s => s.id === id); return i >= 0 ? i : SDRS.findIndex(s => s.leadId && s.leadId === id); };
const POD_OWNER_IDS = SDRS.map(s => s.id).concat(SDRS.map(s => s.leadId).filter(Boolean));
const NEW_MEETING_TYPE = t => !t || /discovery/i.test(t); // empty type is flagged as a data fix, but may still be new
// returns isOpen(companyId, ms): true if the company already had an open deal (created over 14 days before ms, not closed by then)
async function openPipeline(ids) {
  const list = [...new Set(ids.map(String))]; if (!list.length) return () => false;
  const ad = await assoc('companies', 'deals', list);
  const dids = [...new Set(Object.values(ad).flat())];
  const dp = dids.length ? await batchReadPar('deals', dids, ['createdate', 'closedate', 'hs_is_closed']) : {};
  return (id, t) => (ad[String(id)] || []).some(d => { const x = dp[d]; if (!x) return false; const c = toMs(x.createdate); if (c == null || c >= t - 14 * 86400000) return false; // the booking's own deal (even if HubSpot was updated late) isn't prior pipeline
    const cd = toMs(x.closedate); return String(x.hs_is_closed) !== 'true' || (cd != null && cd > t); });
}
// new meetings for companies with NO SDR Owner, credited through the pods. hasSdr(id) says whether a company has an SDR Owner.
// returns { att: {coId: sdrIndex}, slack: [{ coId, ts, si, demo }] (every #grwth post matched to a company), error }
async function podBookings(startMs, endMs, hasSdr) {
  const att = {}, slack = []; let error = null;
  const from = startMs - 21 * 86400000; // posts up to 3 weeks earlier date bookings HubSpot recorded late
  const g = await grwthPosts(Math.floor(from / 1000), Math.floor(endMs / 1000)).catch(e => ({ error: String(e.message || e), posts: [] }));
  if (g.error) error = g.error;
  const posts = (g.posts || []).filter(p => p.ts >= from && p.ts < endMs);
  for (let i = 0; i < posts.length; i += 4) {
    await Promise.all(posts.slice(i, i + 4).map(async p => { const co = await matchCo(p.target); if (co) slack.push({ coId: String(co.id), ts: p.ts, si: p.si, demo: p.demo, name: co.properties.name }); }));
  }
  slack.sort((a, b) => a.ts - b.ts);
  slack.forEach(x => { if (x.si >= 0 && !x.demo && !hasSdr(x.coId) && att[x.coId] == null) att[x.coId] = x.si; });
  const meets = await searchAll('meetings', [{ filters: [{ propertyName: 'hs_createdate', operator: 'GTE', value: String(from) }, { propertyName: 'hs_createdate', operator: 'LT', value: String(endMs) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: POD_OWNER_IDS }] }],
    ['hs_meeting_title', 'hs_activity_type', 'hubspot_owner_id', 'hs_createdate']).catch(() => []);
  const keep = meets.filter(m => NEW_MEETING_TYPE(m.properties.hs_activity_type) && !/^\[gong\]/i.test(m.properties.hs_meeting_title || ''));
  const mc = keep.length ? await assoc('meetings', 'companies', keep.map(m => m.id)) : {};
  keep.sort((a, b) => (toMs(a.properties.hs_createdate) || 0) - (toMs(b.properties.hs_createdate) || 0)).forEach(m => {
    const si = podIx(m.properties.hubspot_owner_id); if (si < 0) return;
    (mc[m.id] || []).forEach(id => { if (!hasSdr(id) && att[id] == null) att[id] = si; });
  });
  return { att, slack, error };
}
// combine HubSpot "Meeting Booked" transitions with #grwth posts into new bookings [coId, ms, sdrIndex, source]:
//  - a HubSpot transition is dated by the #grwth post for that company up to 21 days before it (HubSpot is often updated late)
//  - a #grwth post with no transition from 7 days before to 21 days after it counts on its own (HubSpot wasn't updated); not demo posts
//  - anything with a company already open in the pipeline is dropped (see openPipeline)
// sdrOfCo(id) -> SDR index from SDR Owner, or -1.
async function newBookings(mbT, pb, startMs, endMs, sdrOfCo) {
  const posts = {}; pb.slack.forEach(x => { (posts[x.coId] = posts[x.coId] || []).push(x); });
  const cand = [];
  Object.keys(mbT).forEach(id => (mbT[id] || []).forEach(t => {
    const ps = (posts[id] || []).filter(x => x.ts >= t - 21 * 86400000 && x.ts <= t + 86400000);
    const p = ps.length ? ps[0] : null; cand.push([String(id), p ? Math.min(p.ts, t) : t, 'hs', p ? p.si : -1]);
  }));
  pb.slack.forEach(x => { if (x.demo) return; const near = (mbT[x.coId] || []).some(t => t >= x.ts - 7 * 86400000 && t <= x.ts + 21 * 86400000); if (!near) cand.push([x.coId, x.ts, 'slack', x.si]); });
  const inWin = cand.filter(c => c[1] >= startMs && c[1] < endMs);
  const isOpen = await openPipeline(inWin.map(c => c[0]));
  const out = [];
  inWin.forEach(c => { if (isOpen(c[0], c[1])) return; let si = sdrOfCo(c[0]); if (si < 0) si = pb.att[c[0]] != null ? pb.att[c[0]] : c[3]; if (si >= 0) out.push([c[0], c[1], si, c[2]]); });
  return out.sort((a, b) => a[1] - b[1]);
}
// returns rows [ts, who, target, coId|null, issue, slackLink]
async function slackMeetingChecks(startMs, endMs) {
  const g = await grwthPosts(Math.floor(startMs / 1000), Math.floor(endMs / 1000));
  if (g.error) return { error: g.error, rows: [], posts: 0 };
  const posts = g.posts.filter(p => p.ts >= startMs && p.ts < endMs);
  const out = [];
  await Promise.all(posts.map(async p => {
    const co = await matchCo(p.target);
    const issues = [];
    if (!co) issues.push('Company not found in HubSpot');
    else {
      if (!/meeting booked|opportunit|customer|client/i.test(co.properties.account_status || '')) issues.push('Account Status is ' + (co.properties.account_status ? '"' + co.properties.account_status + '"' : 'empty') + ', not Meeting Booked');
      try {
        const am = await assoc('companies', 'meetings', [co.id]);
        const ids = am[String(co.id)] || [];
        const mp = ids.length ? await batchReadPar('meetings', ids.slice(-200), ['hs_createdate']) : {};
        const near = Object.values(mp).some(x => { const c = toMs(x.hs_createdate); return c != null && Math.abs(c - p.ts) <= 4 * 86400000; });
        if (!near) issues.push('No meeting logged in HubSpot');
      } catch (e) { /* skip this check if HubSpot is unavailable */ }
    }
    // a deal should exist on the company, created on or after the day of the post (checked in HubSpot, not Slack)
    let hasDeal = false;
    if (co) {
      try {
        const ad = await assoc('companies', 'deals', [co.id]);
        const dids = ad[String(co.id)] || [];
        const dp = dids.length ? await batchReadPar('deals', dids, ['createdate', 'hs_is_closed']) : {};
        hasDeal = Object.values(dp).some(x => { const c = toMs(x.createdate); return c != null && c >= p.ts - 86400000; });
        // already open in the pipeline: not a new meeting, so no new deal is expected
        if (!hasDeal && Object.values(dp).some(x => String(x.hs_is_closed) !== 'true')) hasDeal = true;
      } catch (e) { hasDeal = true; /* don't flag if HubSpot couldn't be read */ }
    }
    if (co && !hasDeal && !p.demo) issues.push('No new deal in HubSpot (the deal workflow didn’t run)');
    issues.forEach(i => out.push([p.ts, p.by, p.target, co ? String(co.id) : null, i, p.link, co ? co.properties.name : '']));
  }));
  out.sort((a, b) => a[0] - b[0]);
  return { error: null, rows: out, posts: posts.length };
}

// open data fixes, one row per person per record, for the Google Sheet (same rules as the Data fixes page in daily.js)
const HS_REC = 'https://app-eu1.hubspot.com/contacts/25735731/record/';
const FIX_INFO = {
  'New meeting with no meeting type': ['Meeting record → Meeting type', 'Set Meeting type (e.g. Discovery Call) on the meeting.', 'First meetings booked and held are counted from Meeting type. A meeting with no type doesn’t count towards the target.'],
  'Past meeting with no outcome': ['Meeting record → Outcome', 'Set the meeting outcome (Completed, No show, Cancelled, Rescheduled) once it has happened.', 'Held, no-show and cancelled numbers come from the outcome. Without it the meeting counts as “no outcome”.'],
  'Meeting on an account with no SDR Owner': ['Company record → SDR Owner', 'Set SDR Owner on the meeting’s company.', 'The account won’t show in the SDR’s assigned accounts or coverage until SDR Owner is set.'],
  'Meeting where Account Status isn’t Meeting Booked': ['Company record → Account Status', 'Set Account Status to Meeting Booked on the company.', 'Meetings booked are counted when Account Status changes to Meeting Booked. If it isn’t updated, the meeting isn’t counted.'],
  'Account worked with no SDR Owner': ['Company record → SDR Owner', 'Set SDR Owner on the company.', 'Accounts with no SDR Owner don’t count towards anyone’s assigned accounts, coverage or meetings booked.'],
  'Account worked with no Account Status': ['Company record → Account Status', 'Set Account Status on the company.', 'Account Status drives coverage, Meeting Booked counts and the stuck-account lists.'],
  'Call with no outcome': ['Call → Call outcome', 'Set Call outcome on the call.', 'Connect rate, conversations and the call reports only count calls with an outcome.'],
  'Call with no call type': ['Call → Call type', 'Set the activity (call) type on the call.', 'Call type separates cold calls from follow-ups in reporting.'],
  'Call or email not linked to a contact': ['Call or email → Associations → Contacts', 'Associate the activity with the contact spoken to.', 'Contacts reached and net-new contacts only count activity linked to a contact.'],
  'Companies in the same group that aren’t linked': ['Company record → Associations → Companies (Parent company)', 'Approve, and the child is linked to its parent with the Parent company label. Or link it yourself on the company record.', 'Linked companies roll activity, deals and meetings up to the group, so everyone sees the whole account and two SDRs don’t work the same group without knowing.'],
  'Call or email not linked to a company': ['Call or email → Associations → Companies (or link the contact to its company)', 'Associate the activity (or its contact) with the company.', 'Accounts reached, coverage and the account timeline miss activity that isn’t linked to a company.']
};
const FAMILY_FIX = 'Companies in the same group that aren’t linked';
function fixRows(D) {
  const sname = i => D.SDRS[i] ? D.SDRS[i].short : 'Other', full = {}; D.SDRS.forEach(x => { full[x.name] = x.short; });
  const out = D.ACT.filter(a => a[2] !== 'r'), calls = D.ACT.filter(a => a[2] === 'c'), now = Date.now();
  const coActs = {}; out.forEach(a => a[4].forEach(id => { (coActs[id] = coActs[id] || []).push(a); }));
  const mbCo = new Set(D.MB.map(r => r[0]));
  const coName = id => id ? (D.CO[id] ? D.CO[id][0] : 'Company ' + id) : '';
  const conNames = a => a[5].map(id => D.CON[id] ? D.CON[id][0] : '').filter(Boolean).join(', ');
  const day = ms => ms ? new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) : '';
  const rows = [];
  const add = (gap, key, who, rec, link, co, when, sug, ap) => { const i = FIX_INFO[gap]; who.forEach(w => rows.push({ key: gap + '|' + key + '|' + w, who: w, fix: gap, suggest: sug || '', apply: ap || null, record: rec, link, company: coName(co), worked: day(when), where: i[0], how: i[1], why: i[2] })); };
  const nice = ms => ms ? new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }) : '';
  const lab = d => d ? (D.labels[d] || '') : '';
  // who worked a company, most active first
  const workers = id => { const c = {}; (coActs[id] || []).forEach(a => { const n = sname(a[1]); c[n] = (c[n] || 0) + 1; }); return Object.keys(c).sort((x, y) => c[y] - c[x]).map(n => [n, c[n]]); };
  const coMeet = {}; D.MEET.forEach(r => { if (r[2] && !coMeet[r[2]]) coMeet[r[2]] = r; });
  // suggestions: what the field should probably be, and the evidence for it
  const sugMeetType = r => {
    const t = r[1] || '';
    if (/demo/i.test(t)) return 'Demo Meeting: the title mentions a demo.';
    if (/partner/i.test(t)) return 'Partnership Meeting: the title mentions a partnership.';
    if (/\bqbr\b|quarterly/i.test(t)) return 'QBR: the title mentions a quarterly review.';
    if (/check.?in|catch.?up/i.test(t)) return 'Check in: the title reads like a catch-up.';
    if (/proposal|pricing|commercial|negotiat|contract|progress/i.test(t)) return 'Deal Progression: the title is about the deal (proposal, pricing or contract).';
    if (/intro|discovery|x inploi|inploi x/i.test(t)) return 'Discovery Call: the title reads as a first intro meeting.';
    return 'Discovery Call if this is the first meeting with them, otherwise pick the type that matches "' + t + '".';
  };
  const sugOutcome = r => 'Completed if it went ahead on ' + nice(r[5]) + '. Otherwise No show, Cancelled or Rescheduled.';
  const sugOwnerCo = id => { const w = workers(id); return w.length ? 'SDR Owner = ' + w[0][0] + ': ' + w[0][0] + ' logged ' + w[0][1] + ' of the ' + (coActs[id] || []).length + ' calls and emails on this account in the last 30 days.' : 'Set it to the SDR who works this account.'; };
  const sugOwnerMeet = r => 'SDR Owner = ' + sname(r[3]) + ': ' + sname(r[3]) + ' booked "' + r[1] + '".';
  const sugStatusCo = id => {
    const m = coMeet[id]; if (m || mbCo.has(id)) return 'Meeting Booked: a meeting' + (m ? ' ("' + m[1] + '", ' + nice(m[4]) + ')' : '') + ' is logged on this account.';
    const acts = coActs[id] || [], calls = acts.filter(a => a[2] === 'c'), last = acts.reduce((t, a) => Math.max(t, a[0] || 0), 0);
    const lastOut = calls.length ? lab(calls.sort((a, b) => b[0] - a[0])[0][3]) : '';
    if (/not interested/i.test(lastOut)) return 'Not Interested: the latest call outcome was Not Interested.';
    if (/bad timing/i.test(lastOut)) return 'Nurture: the latest call outcome was Bad Timing.';
    return 'In Progress (SDR actively working): ' + acts.length + ' calls and emails in the last 30 days, most recently ' + nice(last) + '.';
  };
  const sugStatusMeet = r => 'Meeting Booked: "' + r[1] + '" was booked on ' + nice(r[4]) + '.';
  const sugCallOutcome = a => {
    const s = a[8] || 0, len = s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's';
    if (s === 0) return 'No answer: the call lasted 0s.';
    if (s < 30) return 'No answer (or Busy or Gatekeeper): the call lasted only ' + len + '.';
    if (s < 60) return 'Left voicemail: ' + len + ' is about voicemail length.';
    if (s < 180) return 'Connected: the call lasted ' + len + ', so someone picked up.';
    return 'Connected: the call lasted ' + len + ' (change it to Valuable Conversation if it was).';
  };
  const sugCallType = a => { const st = (D.CO[a[4][0]] || [])[3] || ''; return /opportunit/i.test(st) ? 'Deal Progression: the account is an Open Opportunity.' : /meeting booked/i.test(st) ? 'Check in: a meeting is already booked with this account.' : 'Cold Call: a prospecting call, with no meeting or opportunity on this account yet.'; };
  const sugContact = a => { const id = a[4][0]; const other = id && (coActs[id] || []).find(x => x[5].length && x[1] === a[1]); return other ? 'Link it to ' + (D.CON[other[5][0]] ? D.CON[other[5][0]][0] : 'the contact') + ': ' + sname(a[1]) + ' contacted them at ' + coName(id) + ' on ' + nice(other[0]) + '.' : 'Link it to the person you spoke to or emailed. Create the contact if they aren’t in HubSpot.'; };
  const sugCompany = a => { const c = a[5].map(id => D.CON[id]).filter(Boolean); return c.length ? 'Link ' + c[0][0] + ' to their company in HubSpot. The contact has no company, so this ' + (a[2] === 'c' ? 'call' : 'email') + ' doesn’t count towards any account.' : 'Link it to the company (and contact) it was for.'; };
  const fullName = short => { const x = D.SDRS.find(y => y.short === short); return x ? x.name : null; };
  const labelId = l => Object.keys(D.labels).find(k => D.labels[k] === l) || null;
  const ch = (object, id, property, field, value, label) => value ? { object, id: String(id), property, field, value, label: label || value } : null;
  const apOwnerCo = id => { const w = workers(id); const n = w.length && fullName(w[0][0]); return n ? ch('companies', id, 'sdr_owner', 'Company → SDR Owner', n) : null; };
  const apStatusCo = id => { const t = sugStatusCo(id); const v = t.split(':')[0]; return ch('companies', id, 'account_status', 'Company → Account Status', v); };
  const apMeetType = r => { const t = sugMeetType(r); return /^(Demo Meeting|Partnership Meeting|QBR|Check in|Deal Progression|Discovery Call):/.test(t) ? ch('meetings', r[0], 'hs_activity_type', 'Meeting → Meeting type', t.split(':')[0]) : null; };
  const apCallOutcome = a => { const l = sugCallOutcome(a).split(':')[0].replace(/ \(.*\)$/, ''); const id = labelId(l); return id ? ch('calls', a[7], 'hs_call_disposition', 'Call → Call outcome', id, l) : null; };
  const apCallType = a => ch('calls', a[7], 'hs_activity_type', 'Call → Call type', sugCallType(a).split(':')[0]);
  const meet = (gap, r, sug, ap) => add(gap, 'm' + r[0], [full[r[8]] || r[8] || sname(r[3])], r[1], HS_REC + '0-47/' + r[0], r[2], r[4], sug, ap);
  const company = (gap, id, sug, ap) => { const acts = coActs[id] || []; add(gap, 'c' + id, [...new Set(acts.map(a => sname(a[1])))], coName(id), HS_REC + '0-2/' + id, id, (acts[0] || [])[0], sug, ap); };
  const act = (gap, a, sug, ap) => { const c = conNames(a); add(gap, 'a' + a[7], [sname(a[1])], (a[2] === 'c' ? 'Call' : 'Email') + (c ? ' with ' + c : '') + (a[2] !== 'c' && a[6] ? ': ' + a[6] : ''), HS_REC + (a[2] === 'c' ? '0-48/' : '0-49/') + a[7], a[4][0], a[0], sug, ap); };
  D.MEET.filter(r => !r[6]).forEach(r => meet('New meeting with no meeting type', r, sugMeetType(r), apMeetType(r)));
  D.MEET.filter(r => r[5] && r[5] < now && (!r[7] || /SCHEDULED/i.test(r[7]))).forEach(r => meet('Past meeting with no outcome', r, sugOutcome(r)));
  D.MEET.filter(r => r[2] && D.CO[r[2]] && !D.CO[r[2]][4]).forEach(r => meet('Meeting on an account with no SDR Owner', r, sugOwnerMeet(r), ch('companies', r[2], 'sdr_owner', 'Company → SDR Owner', D.SDRS[r[3]] && D.SDRS[r[3]].name)));
  D.MEET.filter(r => r[2] && D.CO[r[2]] && !mbCo.has(r[2]) && !/meeting booked|opportunit|customer|client|disqualif|closed/i.test(D.CO[r[2]][3])).forEach(r => meet('Meeting where Account Status isn’t Meeting Booked', r, sugStatusMeet(r), ch('companies', r[2], 'account_status', 'Company → Account Status', 'Meeting Booked')));
  const cos = Object.keys(coActs);
  cos.filter(id => D.CO[id] && !D.CO[id][4]).forEach(id => company('Account worked with no SDR Owner', id, sugOwnerCo(id), apOwnerCo(id)));
  cos.filter(id => D.CO[id] && !D.CO[id][3]).forEach(id => company('Account worked with no Account Status', id, sugStatusCo(id), apStatusCo(id)));
  calls.filter(a => !a[3]).forEach(a => act('Call with no outcome', a, sugCallOutcome(a), apCallOutcome(a)));
  calls.filter(a => !a[6]).forEach(a => act('Call with no call type', a, sugCallType(a), apCallType(a)));
  out.filter(a => !a[5].length).forEach(a => act('Call or email not linked to a contact', a, sugContact(a)));
  out.filter(a => !a[4].length).forEach(a => act('Call or email not linked to a company', a, sugCompany(a)));
  (D.SLK || []).forEach(r => {
    const how = /not found/.test(r[4]) ? 'Find or create the company in HubSpot, then set Account Status to Meeting Booked and log the meeting.'
      : /Account Status/.test(r[4]) ? 'Set Account Status to Meeting Booked on the company.'
      : /meeting logged/.test(r[4]) ? 'Log the meeting on the company in HubSpot (from your calendar or the meeting tool).'
      : 'Create the deal by hand, or ask for the workflow to be checked (it skips companies that already have closed deals).';
    const sug = /Account Status/.test(r[4]) ? 'Meeting Booked: you posted this meeting in #grwth on ' + nice(r[0]) + '.' : 'Posted in #grwth on ' + nice(r[0]) + ': ' + r[2] + '.';
    const ap = /Account Status/.test(r[4]) && r[3] ? ch('companies', r[3], 'account_status', 'Company → Account Status', 'Meeting Booked') : null;
    rows.push({ key: 'Slack|' + r[5] + '|' + r[4].slice(0, 30) + '|' + r[1], who: r[1], fix: 'Meeting posted in #grwth: ' + r[4].replace(/ \(.*\)$/, '').replace(/ is .*, not/, ' isn’t'), suggest: sug, apply: ap,
      record: r[6] || r[2], link: r[3] ? HS_REC + '0-2/' + r[3] : r[5], company: r[6] || r[2], worked: day(r[0]), where: r[3] ? 'Company record in HubSpot' : '#grwth post', how, why: 'Meetings posted in Slack should match HubSpot, so they count on the dashboard, create a deal and reach the right AE.' });
  });
  return rows;
}

/* ---------- parent / child companies ----------
   Companies the SDRs work on (SDR Owner set, or worked in the last 30 days) that look like part of the same group as
   another company in HubSpot but aren't linked as parent and child. Matched in memory over every company:
   - the same name once country and legal words are removed (KPMG UK / KPMG Ireland, KFC / KFC Africa), or
   - the same website root on a different domain (kpmg.co.uk / kpmg.ie).
   Two records with the same domain AND the same name are duplicates, not parent and child, so they're left out.
   Companies already linked (or already under another parent) are left alone: HubSpot allows one parent per company. */
// words that don't change which business it is (removed to compare names)
const GEO = 'uk|u k|gb|great britain|britain|england|scotland|wales|ireland|northern ireland|europe|emea|apac|asia|international|global|worldwide|usa|us|america|north america|canada|australia|anz|new zealand|india|south africa|africa|sa|za|germany|deutschland|france|spain|italy|netherlands|nordics|benelux|middle east|uae|holdings|holding|group|plc|ltd|limited|llp|inc|corporation|corp|company|co|the|and|uki';
const GEO_RE = new RegExp('\\b(' + GEO + ')\\b', 'g');
const COUNTRY_RE = /\b(uk|u k|gb|great britain|britain|england|scotland|wales|ireland|northern ireland|usa|us|america|canada|australia|new zealand|india|south africa|sa|za|germany|deutschland|france|spain|italy|netherlands|uae)\b/;
const GROUPY_RE = /\b(group|holdings|holding|global|international|worldwide|corporation|emea|europe|apac)\b/;
const LEGAL = new Set(['ltd', 'limited', 'llp', 'inc', 'corp', 'co', 'company', 'the', 'and', 'plc']);
const famName = n => String(n || '').toLowerCase().replace(/&amp;/g, '&').replace(/[()]/g, ' ').replace(/&/g, ' and ').replace(/[’'`.]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const famKey = n => famName(n).replace(GEO_RE, ' ').replace(/\s+/g, ' ').trim();
// shared hosting / ATS / public-sector suffixes can't tell you two records are one group
const GENERIC_HOST = /^(linkedin|facebook|google|gmail|outlook|hotmail|yahoo|wixsite|wordpress|myworkdayjobs|workday|indeed|glassdoor|teamtailor|smartrecruiters|greenhouse|lever|bamboohr|tal|livevacancies|jobs|careers|pinpointhq|workable|recruitee|jobvite|icims|eploy|tribepad|talos360|applytojob|webitrent|networx|jobtrain|hireful|oleeo|cezanneondemand|co|com|org|net|gov|nhs|ac)$/;
const PUBLIC_SUFFIX = /\.(ac|gov|sch|nhs|police|mod|parliament|ac\.za|gov\.za)\.uk$|\.(ac|gov|sch|nhs|police|mod)\.uk$|\.gov$|\.edu$|\.ac\.za$|\.gov\.za$|\.edu\.au$|\.gov\.au$/;
const normDom = d => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
const domRoot = d => { d = normDom(d); if (!d || !d.includes('.') || PUBLIC_SUFFIX.test(d)) return '';
  const parts = d.split('.'); let i = parts.length - 1; if (parts.length >= 3 && /^(co|com|org|net|ltd|plc)$/.test(parts[i - 1])) i--; const r = parts[i - 1] || ''; return r.length >= 3 && !GENERIC_HOST.test(r) ? r : ''; };
let allCoCache = null;
async function allCompanies(props) {
  if (allCoCache && Date.now() - allCoCache.at < 900000 && allCoCache.props === props.join()) return allCoCache.v;
  const out = []; let after = '';
  for (let i = 0; i < 200; i++) {
    const r = await hs('/crm/v3/objects/companies?limit=100&archived=false&properties=' + props.join(',') + (after ? '&after=' + encodeURIComponent(after) : ''));
    out.push(...(r.results || [])); after = r.paging && r.paging.next && r.paging.next.after; if (!after) break;
    await sleep(150); // stay well under HubSpot's 10-second request limit
  }
  allCoCache = { at: Date.now(), props: props.join(), v: out };
  return out;
}
// decides whether two companies are parent and child, and which way round. Returns null when unsure, duplicate or unrelated.
function familyPair(A, B) {
  const nA = famName(A.name), nB = famName(B.name); if (!nA || !nB || nA === nB) return null; // same name = duplicate record
  const dA = normDom(A.domain), dB = normDom(B.domain); if (dA && dA === dB) return null;        // same website = duplicate record
  const cA = COUNTRY_RE.test(nA), cB = COUNTRY_RE.test(nB), gA = GROUPY_RE.test(nA), gB = GROUPY_RE.test(nB);
  const kA = famKey(A.name), kB = famKey(B.name);
  let dir = '';
  const pick = () => { // the parent: the one without a country, else the Group/Holdings/Global one, else .com over a country domain
    if (cA !== cB) { dir = 'the parent is the one without a country in its name'; return cA ? 'B' : 'A'; }
    if (gA !== gB) { dir = 'the parent is the one named Group / Holdings / Global'; return gA ? 'A' : 'B'; }
    const comA = /\.com$/.test(dA), comB = /\.com$/.test(dB); if (comA !== comB) { dir = 'the parent is the one on the global .com website'; return comA ? 'A' : 'B'; } return null; };
  if (kA && kA === kB && kA.length >= 2) {
    const ta = new Set(nA.split(' ')), tb = new Set(nB.split(' '));
    const diff = [...ta].filter(w => !tb.has(w)).concat([...tb].filter(w => !ta.has(w)));
    if (diff.every(w => LEGAL.has(w))) return null;   // only "Ltd" / "plc" / "Company" differ: duplicate
    if (cA && cB) return null;                         // two country entities (Aldi UK / Aldi Australia): siblings, no parent here
    if (gA && gB && !cA && !cB) return null;           // Group vs Holdings: duplicate or different companies
    const p = pick(); if (!p) return null;
    return { parent: p, why: 'same name apart from ' + (cA || cB ? 'the country' : 'region or Group / Holdings words'), dir, sure: true };
  }
  const rA = domRoot(dA), rB = domRoot(dB);
  if (rA && rA === rB) {
    // same website on another domain: the names must agree too (same first word, one name inside the other)
    const wa = kA.split(' '), wb = kB.split(' '); if (!wa[0] || wa[0] !== wb[0]) return null;
    const inside = (x, y) => (' ' + y + ' ').includes(' ' + x + ' '); if (!inside(kA, kB) && !inside(kB, kA)) return null;
    let p = pick(); if (!p) { p = kA.length < kB.length ? 'A' : kB.length < kA.length ? 'B' : null; dir = 'the parent is the one with the shorter, more general name'; } if (!p) return null;
    return { parent: p, why: 'same website (' + dA + ' / ' + dB + ') and matching names', dir, sure: false };
  }
  return null;
}
// rows: { child, parent, childName, parentName, why, sure }
async function familyLinks(workedIds, preloaded) {
  const cos = preloaded || await allCompanies(['name', 'domain', 'hs_parent_company_id', 'sdr_owner', 'hubspot_owner_id', 'numberofemployees', 'account_status']);
  const C = {}; cos.forEach(c => { C[c.id] = c.properties; });
  const kids = {}; cos.forEach(c => { const p = c.properties.hs_parent_company_id; if (p) (kids[p] = kids[p] || []).push(c.id); });
  const working = new Set(cos.filter(c => c.properties.sdr_owner).map(c => c.id).concat([...workedIds].map(String)).filter(id => C[id]));
  const byName = {}, byDom = {};
  cos.forEach(c => { const k = famKey(c.properties.name); if (k.length >= 2) (byName[k] = byName[k] || []).push(c.id); const r = domRoot(c.properties.domain); if (r) (byDom[r] = byDom[r] || []).push(c.id); });
  const cand = {}; // child -> best { parent, why, sure }
  working.forEach(w => {
    const k = famKey(C[w].name), r = domRoot(C[w].domain);
    const others = new Set([].concat(k.length >= 2 && (byName[k] || []).length <= 12 ? byName[k] : [], r && (byDom[r] || []).length <= 12 ? byDom[r] : []));
    others.forEach(o => {
      if (o === w) return; const A = C[w], B = C[o];
      if (A.hs_parent_company_id === o || B.hs_parent_company_id === w) return;                  // already linked
      if (A.hs_parent_company_id && A.hs_parent_company_id === B.hs_parent_company_id) return;  // already in the same group
      const f = familyPair(A, B); if (!f) return;
      const parent = f.parent === 'A' ? w : o, child = f.parent === 'A' ? o : w;
      if (C[child].hs_parent_company_id || (kids[child] || []).length || C[parent].hs_parent_company_id) return; // one parent each; don't nest
      const prev = cand[child]; if (!prev || (f.sure && !prev.sure)) cand[child] = Object.assign({}, f, { parent });
    });
  });
  // a company suggested as a parent shouldn't also be suggested as someone's child
  const parents = new Set(Object.values(cand).map(x => x.parent));
  return Object.keys(cand).filter(ch => !parents.has(ch)).map(ch => { const x = cand[ch]; return { child: ch, parent: x.parent, childName: (C[ch].name || '').trim(), parentName: (C[x.parent].name || '').trim(),
    childOwner: C[ch].sdr_owner || '', parentOwner: C[x.parent].sdr_owner || '', why: x.why, dir: x.dir || '', sure: x.sure,
    childDomain: normDom(C[ch].domain), parentDomain: normDom(C[x.parent].domain), childHsOwner: C[ch].hubspot_owner_id || '', parentHsOwner: C[x.parent].hubspot_owner_id || '',
    parentKids: (kids[x.parent] || []).length }; })
    .sort((a, b) => a.parentName.localeCompare(b.parentName));
}
// load every company now, return a function that finishes the matching once the worked ids are known
familyLinks.prefetch = async () => { const cos = await allCompanies(['name', 'domain', 'hs_parent_company_id', 'sdr_owner', 'hubspot_owner_id', 'numberofemployees', 'account_status']); return ids => familyLinks(ids, cos); };

/* ---------- #inbound-visits: daily company visits, net new companies and net new ICPs ----------
   Read from the Dealfront alerts in #inbound-visits. A company is net new on the day of its first-ever alert in the channel.
   ICP = scored 6/10 or higher, by Claude in Slack ("scores N/10") or by the SDR routing reply ("ICP N/10") in the alert's thread. */
const VISITS_CH = process.env.SLACK_VISITS_CHANNEL || 'C0BLTRVSEKA';
const ICP_MIN = 6;
let visitsHist = null; const replyCache = new Map();
async function slackGet(path) { const token = process.env.SLACK_USER_TOKEN || ''; if (!token) throw new Error('SLACK_USER_TOKEN is not set');
  for (let i = 0; i < 4; i++) { const r = await fetch('https://slack.com/api/' + path, { headers: { Authorization: 'Bearer ' + token } });
    if (r.status === 429) { await sleep((Number(r.headers.get('retry-after')) || 2) * 1000); continue; }
    const j = await r.json(); if (!j.ok) throw new Error('Slack: ' + (j.error || 'error')); return j; }
  throw new Error('Slack kept rate-limiting'); }
async function visitAlerts() {
  if (visitsHist && Date.now() - visitsHist.at < 300000) return visitsHist.v;
  const msgs = []; let cursor = '';
  for (let i = 0; i < 30; i++) { const j = await slackGet('conversations.history?channel=' + VISITS_CH + '&limit=200' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    msgs.push(...(j.messages || [])); cursor = j.response_metadata && j.response_metadata.next_cursor; if (!j.has_more || !cursor) break; }
  const clean = t => String(t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const v = msgs.map(m => { const a = (m.attachments || []).find(x => x.title); if (!a) return null;
    const raw = JSON.stringify(m.attachments || []).replace(/\\n/g, '\n');
    const t = /<[^|>]+\|([^>]+)>/.exec(a.title); const name = clean(t ? t[1] : a.title).replace(/\s*\((All ICP companies|[^)]*feed[^)]*)\)\s*$/i, '').trim();
    const loc = /(?:^|\n|")([^"\n:]+?):\s*Industry/.exec(raw) || [];
    return { ts: m.ts, at: Number(m.ts) * 1000, name, link: a.title_link || '', loc: clean(loc[1] || ''), inHubspot: /View in HubSpot/i.test(raw), replies: m.reply_count || 0 }; })
    .filter(Boolean).sort((x, y) => x.at - y.at);
  visitsHist = { at: Date.now(), v }; return v;
}
async function alertScore(a) {
  if (!a.replies) return null;
  const hit = replyCache.get(a.ts); if (hit && (hit.score != null || Date.now() - hit.at < 600000)) return hit.score;
  let score = null;
  try { const j = await slackGet('conversations.replies?channel=' + VISITS_CH + '&ts=' + a.ts + '&limit=50');
    (j.messages || []).slice(1).forEach(m => { const t = String(m.text || ''); const x = /scores?\s+(\d{1,2})\s*\/\s*10/i.exec(t) || /ICP[^0-9\n]{0,12}(\d{1,2})\s*\/\s*10/i.exec(t); if (x) score = Number(x[1]); });
  } catch (e) { /* keep unscored */ }
  replyCache.set(a.ts, { at: Date.now(), score }); return score;
}
async function buildVisits(q) {
  const days = Math.min(Math.max(Number(q && q.days) || 30, 1), 90);
  const all = await visitAlerts();
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
  const firstSeen = {}; all.forEach(a => { const k = normCo(a.name) || a.name.toLowerCase(); if (firstSeen[k] == null) firstSeen[k] = a.at; });
  const today = ymd.format(new Date()); const from = ymd.format(new Date(Date.now() - (days - 1) * 86400000));
  const win = all.filter(a => { const d = ymd.format(new Date(a.at)); return d >= from && d <= today; });
  for (let i = 0; i < win.length; i += 4) await Promise.all(win.slice(i, i + 4).map(async a => { a.score = await alertScore(a); }));
  // a repeat alert without its own score uses the company's latest known score
  const known = {}; win.forEach(a => { const k = normCo(a.name) || a.name.toLowerCase(); if (a.score != null) known[k] = a.score; else if (known[k] != null) a.score = known[k]; });
  win.slice().reverse().forEach(a => { const k = normCo(a.name) || a.name.toLowerCase(); if (a.score == null && known[k] != null) a.score = known[k]; });
  const byDay = {};
  for (let i = 0; i < days; i++) { const d = ymd.format(new Date(Date.now() - i * 86400000)); byDay[d] = { date: d, visits: 0, netNew: 0, netNewIcp: 0, icp: 0, unscored: 0, companies: [] }; }
  const seenDay = {};
  win.forEach(a => { const d = ymd.format(new Date(a.at)), x = byDay[d]; if (!x) return; const k = normCo(a.name) || a.name.toLowerCase();
    if (seenDay[d + '|' + k]) return; seenDay[d + '|' + k] = 1;
    const isNew = firstSeen[k] === a.at || ymd.format(new Date(firstSeen[k])) === d, icp = a.score != null && a.score >= ICP_MIN;
    x.visits++; if (isNew) x.netNew++; if (isNew && icp) x.netNewIcp++; if (icp) x.icp++; if (a.score == null) x.unscored++;
    x.companies.push({ name: a.name, at: a.at, loc: a.loc, score: a.score, icp, netNew: isNew, inHubspot: a.inHubspot, link: 'https://inploi.slack.com/archives/' + VISITS_CH + '/p' + a.ts.replace('.', '') }); });
  const list = Object.values(byDay).sort((a, b) => a.date < b.date ? 1 : -1);
  const tot = list.reduce((t, d) => ({ visits: t.visits + d.visits, netNew: t.netNew + d.netNew, netNewIcp: t.netNewIcp + d.netNewIcp }), { visits: 0, netNew: 0, netNewIcp: 0 });
  return { generatedAt: new Date().toISOString(), icpMin: ICP_MIN, channel: VISITS_CH, today, days: list, total: tot };
}

/* ---------- Arushi's report: what changed in HubSpot on a day ----------
   New contacts, companies and deals, and deal stage/pipeline moves, each with who did it and why (HubSpot's record source),
   split by user. Shown on the dashboard (Arushi's report) and sent to Arushi's Slack DM at the end of each day. */
const SOURCE_LABEL = { FORM: 'Form submission', CRM_UI: 'Created in HubSpot', IMPORT: 'Import', INTEGRATION: 'Integration', API: 'API', AUTOMATION_PLATFORM: 'Workflow', WORKFLOW: 'Workflow',
  MOBILE_IOS: 'HubSpot mobile app', MOBILE_ANDROID: 'HubSpot mobile app', SALES: 'Sales tools', EMAIL_INTEGRATION: 'Email integration', CONVERSATIONS: 'Chat', MEETINGS: 'Meetings booking',
  ANALYTICS: 'Website tracking', CALCULATED: 'HubSpot (calculated)', MIGRATION: 'Migration', BATCH_UPDATE: 'Bulk update', SALESFORCE: 'Salesforce sync', AI_GROUP: 'HubSpot AI', CRM_UI_BULK_ACTION: 'Bulk edit in HubSpot', CRM_SETTING: 'Auto-created by HubSpot' };
// HubSpot user id -> name (from the users object, 9 Nov 2026); used when the owners API doesn't carry the user id
const USER_NAMES = {"39760315": "Emerson Welch", "39424239": "Nicholas Masters", "38716950": "Emilie Bastrup", "38636883": "Elzane Dougall", "38079469": "Sean-Stanley Mbaeri", "37987484": "Raamis Abdul Razaque", "98497526": "James Badenhorst", "36339106": "Claude inploi", "36331131": "Joe Draper", "36304602": "Joseph Williams", "35568600": "Jolanta Jas", "35222671": "Arushi Mittal", "33852382": "Ares QA", "32978778": "Anushca Claassens", "32364701": "Matthew Meehan", "29569628": "Nikita Rohwer", "29569626": "Evan Williams", "29569627": "James Crawford", "69117355": "Jason Baaphy", "59791670": "Jake Donald", "51979207": "Raamis Abdul Razaque", "47708088": "Alexander Hanson-Smith", "47662469": "Matthew de la Hey", "47662451": "Felix Dealtry", "35660427": "Claude (HubSpot connector, Arushi's session)"};
async function buildAdmin(q) {
  const lp = londonParts(new Date());
  const day = /^\d{4}-\d{2}-\d{2}$/.test((q && q.day) || '') ? q.day : lp.y + '-' + String(lp.m).padStart(2, '0') + '-' + String(lp.d).padStart(2, '0');
  const [y, m, d] = day.split('-').map(Number), start = londonMidnight(y, m, d), end = londonMidnight(y, m, d + 1);
  const win = [{ propertyName: 'createdate', operator: 'GTE', value: String(start) }, { propertyName: 'createdate', operator: 'LT', value: String(end) }];
  const src = ['hs_object_source', 'hs_object_source_label', 'hs_object_source_detail_1', 'hs_object_source_detail_2', 'hs_created_by_user_id', 'hubspot_owner_id', 'createdate'];
  const [owners, pipes, contacts, companies, deals, touched] = await Promise.all([
    ownerNames(), hs('/crm/v3/pipelines/deals').catch(() => ({ results: [] })),
    searchAll('contacts', [{ filters: win }], src.concat(['firstname', 'lastname', 'email', 'company', 'jobtitle', 'recent_conversion_event_name', 'lifecyclestage']), 'createdate'),
    searchAll('companies', [{ filters: win }], src.concat(['name', 'domain', 'sdr_owner', 'account_status']), 'createdate'),
    searchAll('deals', [{ filters: win }], src.concat(['dealname', 'pipeline', 'dealstage', 'amount']), 'createdate'),
    searchAll('deals', [{ filters: [{ propertyName: 'hs_lastmodifieddate', operator: 'GTE', value: String(start) }] }], ['dealname', 'pipeline', 'dealstage'])
  ]);
  const P = {}, S = {}; (pipes.results || []).forEach(p => { P[p.id] = p.label; (p.stages || []).forEach(st => { S[st.id] = { label: st.label, pipe: p.label }; }); });
  // users who aren't owners (or whose owner record lacks the user id): fill from the users object
  try { let after = ''; for (let i = 0; i < 5; i++) { const r = await hs('/crm/v3/objects/users?limit=100&properties=hs_internal_user_id,hs_given_name,hs_family_name,hs_email' + (after ? '&after=' + after : ''));
    (r.results || []).forEach(u => { const x = u.properties || {}, n = [x.hs_given_name, x.hs_family_name].filter(Boolean).join(' ') || x.hs_email; if (x.hs_internal_user_id && n && !owners['u' + x.hs_internal_user_id]) owners['u' + x.hs_internal_user_id] = n; });
    after = r.paging && r.paging.next && r.paging.next.after; if (!after) break; } } catch (e) { /* keep ids */ }
  const user = id => id ? (owners['u' + id] || USER_NAMES[id] || 'HubSpot user ' + id) : '';
  const isAuto = p => /CRM_SETTING/.test((p.hs_object_source || '') + ' ' + (p.hs_object_source_label || ''));
  const who = p => user(p.hs_created_by_user_id) || (isAuto(p) ? 'HubSpot auto-create (contact email domain)' : [SOURCE_LABEL[p.hs_object_source] || p.hs_object_source_label || p.hs_object_source || 'Unknown', p.hs_object_source_detail_1].filter(Boolean).join(': '));
  const why = (p, extra) => { const s = p.hs_object_source, det = [p.hs_object_source_detail_1, p.hs_object_source_detail_2].filter(Boolean).join(' · ');
    if (isAuto(p)) return 'Auto-created by HubSpot from a contact\u2019s email domain (setting: “Create and associate companies with contacts”), not by a person' + (extra ? '. ' + extra : '');
    let r = s === 'CRM_UI' ? 'Created by ' + (user(p.hs_created_by_user_id) || 'a user') + ' in HubSpot' : (SOURCE_LABEL[s] || p.hs_object_source_label || s || 'Unknown source') + (det ? ': ' + det : '');
    if (s !== 'CRM_UI' && p.hs_created_by_user_id) r += ' (by ' + user(p.hs_created_by_user_id) + ')';
    return r + (extra ? '. ' + extra : ''); };
  const at = p => toMs(p.createdate);
  const C = contacts.map(c => { const p = c.properties; return { id: c.id, name: [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email || 'Unnamed contact', email: p.email || '', company: p.company || '', title: p.jobtitle || '',
    owner: owners[p.hubspot_owner_id] || '', by: who(p), at: at(p), reason: why(p, p.recent_conversion_event_name && p.hs_object_source === 'FORM' ? 'Converted on ' + p.recent_conversion_event_name : '') }; });
  const CO = companies.map(c => { const p = c.properties; return { id: c.id, name: (p.name || p.domain || 'Unnamed company').trim(), domain: p.domain || '', owner: owners[p.hubspot_owner_id] || '', sdr: p.sdr_owner || '', status: p.account_status || '', by: who(p), at: at(p), reason: why(p) }; });
  const D = deals.map(c => { const p = c.properties; return { id: c.id, name: p.dealname || 'Unnamed deal', pipeline: P[p.pipeline] || p.pipeline || '', stage: (S[p.dealstage] || {}).label || p.dealstage || '', amount: p.amount || '',
    owner: owners[p.hubspot_owner_id] || '', by: who(p), at: at(p), reason: why(p) }; });
  // stage and pipeline moves made on the day (from the property history, so each move is listed with who made it)
  const moves = [], ids = touched.map(x => x.id);
  for (let i = 0; i < ids.length; i += 50) {
    const r = await hs('/crm/v3/objects/deals/batch/read', { inputs: ids.slice(i, i + 50).map(id => ({ id })), properties: ['dealname', 'pipeline', 'createdate'], propertiesWithHistory: ['dealstage', 'pipeline'] }).catch(() => ({ results: [] }));
    (r.results || []).forEach(x => {
      const h = ((x.propertiesWithHistory || {}).dealstage || []).map(e => ({ v: e.value, t: toMs(e.timestamp), src: e.sourceType, by: e.updatedByUserId, sid: e.sourceId })).filter(e => e.t != null).sort((a, b) => a.t - b.t);
      h.forEach((e, k) => { if (e.t < start || e.t >= end) return; const prev = k > 0 ? h[k - 1].v : null; if (prev === e.v) return;
        const to = S[e.v] || {}, from = prev ? (S[prev] || {}) : null;
        const actor = user(e.by) || (e.src === 'CRM_UI' ? 'A user' : SOURCE_LABEL[e.src] || e.src || 'HubSpot');
        moves.push({ id: x.id, deal: (x.properties || {}).dealname || 'Unnamed deal', pipeline: to.pipe || '', from: from ? from.label || prev : '(new deal)', to: to.label || e.v, at: e.t, by: actor,
          reason: (from ? 'Stage changed' : 'Deal created in this stage') + ' by ' + actor + (e.src && e.src !== 'CRM_UI' ? ' (' + (SOURCE_LABEL[e.src] || e.src) + (e.sid ? ': ' + e.sid : '') + ')' : ' in HubSpot') }); });
      const ph = ((x.propertiesWithHistory || {}).pipeline || []).map(e => ({ v: e.value, t: toMs(e.timestamp), by: e.updatedByUserId, src: e.sourceType })).filter(e => e.t != null).sort((a, b) => a.t - b.t);
      ph.forEach((e, k) => { if (k === 0 || e.t < start || e.t >= end || ph[k - 1].v === e.v) return; const actor = user(e.by) || SOURCE_LABEL[e.src] || e.src || 'HubSpot';
        moves.push({ id: x.id, deal: (x.properties || {}).dealname || 'Unnamed deal', pipeline: P[e.v] || e.v, from: 'Pipeline: ' + (P[ph[k - 1].v] || ph[k - 1].v), to: 'Pipeline: ' + (P[e.v] || e.v), at: e.t, by: actor, reason: 'Moved to another pipeline by ' + actor }); });
    });
  }
  moves.sort((a, b) => a.at - b.at);
  const by = {}; const bump = (k, f) => { (by[k] = by[k] || { who: k, contacts: 0, companies: 0, deals: 0, moves: 0 })[f]++; };
  C.forEach(x => bump(x.by, 'contacts')); CO.forEach(x => bump(x.by, 'companies')); D.forEach(x => bump(x.by, 'deals')); moves.forEach(x => bump(x.by, 'moves'));
  const byUser = Object.values(by).sort((a, b) => (b.contacts + b.companies + b.deals + b.moves) - (a.contacts + a.companies + a.deals + a.moves));
  return { generatedAt: new Date().toISOString(), day, totals: { contacts: C.length, companies: CO.length, deals: D.length, moves: moves.length }, byUser, contacts: C, companies: CO, deals: D, moves };
}
function adminSlack(A) {
  const t = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  const rec = (type, id) => 'https://app-eu1.hubspot.com/contacts/25735731/record/' + type + '/' + id;
  const cap = (arr, f, n) => arr.slice(0, n).map(f).concat(arr.length > n ? ['… and ' + (arr.length - n) + ' more on the dashboard'] : []);
  const L = ['*Arushi’s HubSpot report · ' + A.day + '*', 'New contacts: *' + A.totals.contacts + '*  ·  New companies: *' + A.totals.companies + '*  ·  New deals: *' + A.totals.deals + '*  ·  Pipeline moves: *' + A.totals.moves + '*', ''];
  if (A.byUser.length) { L.push('*By user*'); A.byUser.forEach(u => L.push('• ' + u.who + ': ' + [u.contacts && u.contacts + ' contacts', u.companies && u.companies + ' companies', u.deals && u.deals + ' deals', u.moves && u.moves + ' moves'].filter(Boolean).join(', '))); L.push(''); }
  const autoCo = A.companies.filter(c => /^HubSpot auto-create/.test(c.by || '')), manCo = A.companies.filter(c => autoCo.indexOf(c) < 0);
  if (autoCo.length) { L.push('*Companies auto-created by HubSpot: ' + autoCo.length + '*'); L.push('From contacts\u2019 email domains (setting \u201cCreate and associate companies with contacts\u201d), not by a person. ' + autoCo.filter(c => !c.owner || c.owner === 'None').length + ' have no owner. ' + (autoCo.length > 20 ? 'This is unusually high: check whether the setting was switched on and backfilled. ' : '') + 'Full list: https://inploi-sdr-portal.vercel.app/#arushi'); L.push(''); }
  if (manCo.length) { L.push('*Companies created*'); L.push(...cap(manCo, c => '• <' + rec('0-2', c.id) + '|' + c.name + '> — ' + c.reason + (c.owner ? '. Owner: ' + c.owner : '. No owner'), 15)); L.push(''); }
  if (A.deals.length) { L.push('*Deals created*'); L.push(...cap(A.deals, c => '• <' + rec('0-3', c.id) + '|' + c.name + '> — ' + c.pipeline + ' / ' + c.stage + ' — ' + c.reason + (c.owner ? '. Owner: ' + c.owner : ''), 15)); L.push(''); }
  if (A.moves.length) { L.push('*Pipeline moves*'); L.push(...cap(A.moves, c => '• ' + t(c.at) + ' <' + rec('0-3', c.id) + '|' + c.deal + '> (' + c.pipeline + '): ' + c.from + ' → ' + c.to + ' — ' + c.reason, 20)); L.push(''); }
  if (A.contacts.length) { L.push('*Contacts created*'); L.push(...cap(A.contacts, c => '• <' + rec('0-1', c.id) + '|' + c.name + '>' + (c.company ? ' (' + c.company + ')' : '') + ' — ' + c.reason + (c.owner ? '. Owner: ' + c.owner : '. No owner'), 15)); L.push(''); }
  L.push('Full list with reasons: https://inploi-sdr-portal.vercel.app/#arushi');
  return L.join('\n');
}
async function fixesPayload() {
  // the 30-day report and the company list load in parallel to stay inside the time limit
  // one after the other: together they hit HubSpot's rate limit
  const D = await buildReport({ span: 'd30' });
  let FL = null; try { FL = await familyLinks.prefetch(); } catch (e) { console.log('[family-links] company list failed', String(e.message || e)); }
  const rows = fixRows(D);
  if (FL) try { const [links, owners, sdrOpts] = await Promise.all([FL(new Set(D.ACT.flatMap(a => a[4]).map(String))), ownerNames(), options('companies', 'sdr_owner')]); rows.push(...familyRows(D, links, owners, sdrOpts)); } catch (e) { console.log('[family-links] skipped', String(e.message || e)); }
  return { generatedAt: new Date().toISOString(), from: D.day, to: D.last, rows };
}
// every HubSpot user's name by owner id (for the company owner columns)
async function ownerNames() {
  const m = Object.assign({}, OWNER_NAMES); let after = '';
  try { for (let i = 0; i < 10; i++) { const r = await hs('/crm/v3/owners?limit=500' + (after ? '&after=' + after : '')); (r.results || []).forEach(o => { const n = [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || String(o.id); m[String(o.id)] = n; if (o.userId) m['u' + o.userId] = n; }); after = r.paging && r.paging.next && r.paging.next.after; if (!after) break; } } catch (e) { /* fall back to the names we know */ }
  return m;
}
// sheet rows for parent/child links; who = the SDR Owner of the child (else the parent), else whoever worked them most
function familyRows(D, links, owners, sdrOpts) {
  owners = owners || {}; sdrOpts = sdrOpts || {};
  const oName = id => id ? (owners[id] || 'Owner ' + id) : 'None', sName = v => v ? (sdrOpts[v] || v) : 'None';
  const shortOf = v => { v = String(v || '').toLowerCase(); const x = SDRS.find(s => v === s.id || v === s.name.toLowerCase() || v.startsWith(s.short.toLowerCase())); return x ? x.short : ''; };
  const workers = {}, lastDay = {};
  D.ACT.filter(a => a[2] !== 'r').forEach(a => a[4].forEach(id => { const n = D.SDRS[a[1]] ? D.SDRS[a[1]].short : ''; if (!n) return; (workers[id] = workers[id] || {})[n] = (workers[id][n] || 0) + 1; lastDay[id] = Math.max(lastDay[id] || 0, a[0] || 0); }));
  const top = id => { const w = workers[id] || {}; return Object.keys(w).sort((a, b) => w[b] - w[a])[0] || ''; };
  const info = FIX_INFO[FAMILY_FIX], out = [];
  links.forEach(l => {
    const who = shortOf(l.childOwner) || shortOf(l.parentOwner) || top(l.child) || top(l.parent); if (!who) return;
    const day = Math.max(lastDay[l.child] || 0, lastDay[l.parent] || 0);
    out.push({ key: FAMILY_FIX + '|c' + l.child + '|p' + l.parent + '|' + who, who, fix: FAMILY_FIX,
      suggest: 'Link ' + l.childName + ' as a child of ' + l.parentName + ' (association label: Parent company): ' + l.why + '.' + (l.sure ? '' : ' Check which one is the group parent before approving.'),
      family: {
        childOwner: oName(l.childHsOwner), childSdr: sName(l.childOwner), parentOwner: oName(l.parentHsOwner), parentSdr: sName(l.parentOwner),
        reasoning: 'They look like one group: ' + l.why + '. ' + (l.dir ? l.dir.charAt(0).toUpperCase() + l.dir.slice(1) + ', so ' + l.parentName + ' is the parent.' : '') +
          (l.parentKids ? ' ' + l.parentName + ' is already the parent of ' + l.parentKids + ' other compan' + (l.parentKids === 1 ? 'y' : 'ies') + ' in HubSpot.' : '') +
          ' Neither is linked to a parent yet.' + (l.sure ? '' : ' Matched on website, so please check before approving.'),
        source: 'HubSpot company records: "' + l.childName + '"' + (l.childDomain ? ' (' + l.childDomain + ')' : ' (no website)') + ' and "' + l.parentName + '"' + (l.parentDomain ? ' (' + l.parentDomain + ')' : ' (no website)') + '; Parent company field empty on both.',
        childLabel: 'Parent company → ' + l.parentName, parentLabel: 'Child company → ' + l.childName
      },
      apply: { object: 'companies', id: String(l.child), property: '__parent', field: 'Parent company', value: String(l.parent), label: l.parentName },
      record: l.childName, link: HS_REC + '0-2/' + l.child, company: l.parentName + ' (parent)', worked: day ? new Date(day).toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) : '',
      where: info[0], how: info[1], why: info[2] });
  });
  return out;
}

// the day's report plus the open data fixes from the last 30 days
async function weeklyModel(day) {
  // both in parallel so the pair stays inside the 60s function limit
  const [R, R30, V] = await Promise.all([buildReport({ span: 'week', day }), buildReport({ span: 'd30' }).catch(() => null), buildVisits({ days: 14 }).catch(() => null)]);
  return withVisits(slackModel(R, R30, 'weekly'), R, V);
}
async function dailyModel(day) {
  const [R, V] = await Promise.all([buildReport({ span: 'day', day }), buildVisits({ days: 14 }).catch(() => null)]);
  let R30 = null; try { R30 = await buildReport({ span: 'd30' }); } catch (e) { /* fall back to today's gaps only */ }
  return withVisits(slackModel(R, R30), R, V);
}
// inbound visits for the report's days (from #inbound-visits)
function withVisits(M, R, V) {
  if (!V) return M;
  const ds = V.days.filter(d => d.date >= R.day && d.date <= R.last);
  const cos = ds.flatMap(d => d.companies);
  M.visits = { visits: ds.reduce((t, d) => t + d.visits, 0), netNew: ds.reduce((t, d) => t + d.netNew, 0), netNewIcp: ds.reduce((t, d) => t + d.netNewIcp, 0),
    icpNames: cos.filter(c => c.netNew && c.icp).map(c => c.name + ' (' + c.score + '/10)'), unscored: ds.reduce((t, d) => t + d.unscored, 0) };
  return M;
}
function visitsLine(M, bold) { const v = M.visits; if (!v) return ''; const b = x => bold ? '*' + x + '*' : x;
  return 'Company visits: ' + b(v.visits) + '  ·  Net new companies: ' + b(v.netNew) + '  ·  Net new ICPs (6/10+): ' + b(v.netNewIcp) +
    (v.icpNames.length ? '\nNew ICPs: ' + v.icpNames.slice(0, 8).join(', ') : '') + (v.unscored ? '\n_' + v.unscored + ' not scored yet_' : ''); }
// the same report as an HTML email (tables with inline styles, which email clients need)
function emailHtml(M) {
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const th = 'style="text-align:left;padding:6px 10px;border-bottom:2px solid #222;font-size:12px;color:#555;text-transform:uppercase;letter-spacing:.04em"';
  const td = (v, i, bold, left) => '<td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;' + (i && !left ? 'text-align:right;' : '') + (bold ? 'font-weight:700;' : '') + '">' + esc(v) + '</td>';
  const table = (head, rows, lastBold, left) => '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:6px 0 18px">' +
    '<tr>' + head.map((h, i) => '<th ' + (i && !left ? th.replace('text-align:left', 'text-align:right') : th) + '>' + esc(h) + '</th>').join('') + '</tr>' +
    rows.map((r, ri) => '<tr>' + r.map((v, i) => td(v, i, lastBold && ri === rows.length - 1, left)).join('') + '</tr>').join('') + '</table>';
  const h2 = t => '<h2 style="font-size:15px;margin:22px 0 4px;color:#111">' + esc(t) + '</h2>';
  const others = [...new Set(M.gaps.flatMap(g => g.otherNames))], hasOther = M.gaps.some(g => g.other);
  return '<div style="font-family:Helvetica,Arial,sans-serif;color:#222;max-width:820px">' +
    '<h1 style="font-size:20px;margin:0 0 4px">SDR daily report · ' + esc(M.title) + '</h1>' +
    '<p style="margin:0 0 14px;color:#666;font-size:13px">' + (M.soFar ? 'So far today · ' : '') + 'UK time · <a href="' + PORTAL + '/#daily">Open the daily report</a></p>' +
    h2('Team') + table(M.team.map(r => r[0]), [M.team.map(r => r[1])]) +
    (M.industries.length ? '<p style="margin:-10px 0 14px;color:#666;font-size:13px">Top industries: ' + esc(M.industries.join(', ')) + '</p>' : '') +
    h2('By SDR') + table(['SDR', 'Accounts', 'Net new', 'Contacts', 'Calls', 'Connect', 'Emails', 'Replies', 'Meetings'],
      M.per.map(x => [x.n, x.C.cos, x.C.newCo, x.C.cons, x.C.calls, M.pct(x.C.conn, x.C.calls), x.C.ems, x.C.reps, x.C.mb]).concat([['Team', M.T.cos, M.T.newCo, M.T.cons, M.T.calls, M.pct(M.T.conn, M.T.calls), M.T.ems, M.T.reps, M.T.mb]]), true) +
    h2('Call outcomes') + (M.outcomes.length ? table(['Outcome', 'Calls', 'Share'], M.outcomes) : '<p>No calls logged.</p>') +
    h2('Leaderboard') + (M.leaders.length ? table(['Activity', '1st', '2nd', '3rd'], M.leaders.map(r => [r[0], r[1] || '', r[2] || '', r[3] || '']), false, true) : '<p>No activity yet.</p>') +
    (M.visits ? h2('Inbound visits') + '<p style="margin:0 0 14px">' + esc(visitsLine(M, false)).replace(/\n/g, '<br>') + '</p>' : '') +
    h2('Open data fixes') + (M.windowed ? '<p style="margin:0 0 4px;color:#666;font-size:13px">Records worked in the last 30 days, as they are in HubSpot now.</p>' : '') +
    (M.gaps.length ? table(['Open fix', 'Open', M.newLabel].concat(M.sdrNames).concat(hasOther ? ['Other'] : []), M.gaps.map(g => [g.name, g.open, g.fresh].concat(g.by).concat(hasOther ? [g.other] : []))) : '<p>Nothing open.</p>') +
    '<p style="color:#666;font-size:13px">' + (others.length ? 'Other = ' + esc(others.join(', ')) + '. ' : '') + 'Each person\u2019s list, with where and why: <a href="' + PORTAL + '/#fixes">Data fixes</a></p></div>';
}
async function slackPayload(day, mrkdwn, kind) {
  const M = await (kind === 'week' ? weeklyModel(day) : dailyModel(day));
  return mrkdwn ? { text: slackFallback(M), blocks: slackBlocks(M) } : { text: slackMarkdown(M) };
}

module.exports = async (req, res) => {
  if (!allowed(req, res)) return;
  TOKEN = process.env.HUBSPOT_TOKEN || '';
  if (!TOKEN) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ error: 'missing_token' })); return; }
  try {
    const part = String((req.query && req.query.part) || new URL(req.url, 'http://x').searchParams.get('part') || '');
    const sp = new URL(req.url, 'http://x').searchParams; const q = { from: (req.query && req.query.from) || sp.get('from'), to: (req.query && req.query.to) || sp.get('to'), day: (req.query && req.query.day) || sp.get('day'), days: (req.query && req.query.days) || sp.get('days'), span: (req.query && req.query.span) || sp.get('span') };
    const data = part === 'admin' ? await buildAdmin(q) : part === 'visits' ? await buildVisits(q) : part === 'families' ? { links: await familyLinks(new Set()) } : part === 'trends' ? await buildTrends() : part === 'matt' ? await buildMatt(q) : part === 'calls' ? await buildCalls(q) : part === 'report' ? await buildReport(q) : part === 'booked' ? await buildBookedMonths() : part === 'slackcheck' ? await (async () => { const d = Date.now(); return slackMeetingChecks(d - 30 * 86400000, d); })() : part === 'fixes' ? await fixesPayload() : part === 'slack' ? await slackPayload(q.day, sp.get('fmt') === 'blocks', (req.query && req.query.kind) || sp.get('kind')) : await build(q);
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

// for api/slack-daily.js
module.exports.buildReport = buildReport;
module.exports.slackPayload = slackPayload;
module.exports.buildAdmin = buildAdmin;
module.exports.adminSlack = adminSlack;
module.exports.dailyModel = dailyModel;
module.exports.weeklyModel = weeklyModel;
module.exports.fixRows = fixRows;
module.exports.slackBlocks = slackBlocks;
module.exports.slackFallback = slackFallback;
module.exports.emailHtml = emailHtml;
module.exports.setToken = t => { TOKEN = t; };
module.exports._fam = { famKey, domRoot, normDom, familyPair, familyLinks };
