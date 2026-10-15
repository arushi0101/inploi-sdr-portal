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

/* ---------- main ---------- */
async function build() {
  const now = new Date();
  const P = periods(now);
  const minStart = Math.min(P.wk.start, P.mtd.start);
  const trendStart = minStart; // the 8-week history is served separately by ?part=trends
  const callsFrom = minStart;
  const wkIdx = ms => { if (ms == null || ms < trendStart) return -1; let i = P.weeks.length - 1; while (i > 0 && ms < P.weeks[i]) i--; return i; };
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', hourCycle: 'h23' });
  const WD = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
  const yearStart = londonMidnight(londonParts(now).y, 1, 1);
  const inP = (ms, k) => ms != null && ms >= P[k].start;
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
    ['name', 'sdr_owner', 'account_status', 'call_outcome__account_engagement', 'notes_last_contacted', 'pod_catagory']);
  const coById = {};
  companies.forEach(c => { const p = c.properties; coById[c.id] = { name: (p.name || '').trim(), sdr: sdrFromCompany(p.sdr_owner), status: statusOpts[p.account_status] || p.account_status || '', eng: engOpts[p.call_outcome__account_engagement] || p.call_outcome__account_engagement || '', last: toMs(p.notes_last_contacted), pod: !!p.pod_catagory }; });

  // Contacts touched in the period (for contacts reached and two-way contacts)
  const contacts = await searchAll('contacts', [{ filters: [{ propertyName: 'notes_last_contacted', operator: 'GTE', value: String(minStart) }] }],
    ['notes_last_contacted', 'associatedcompanyid', 'hs_lead_status']);
  const twoWay = v => /two.?way/i.test(leadOpts[v] || v || '');

  // Emails by the SDRs
  const emails = await searchAll('emails', [{ filters: [{ propertyName: 'hs_timestamp', operator: 'GTE', value: String(callsFrom) }, { propertyName: 'hubspot_owner_id', operator: 'IN', values: SDR_IDS }] }],
    ['hs_email_direction', 'hs_sequence_id', 'hs_timestamp', 'hubspot_owner_id']);

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
  const mbIds = Object.keys(coById).filter(id => coById[id].sdr && /^meeting booked$/i.test(coById[id].status));
  const mbAt = mbIds.length ? await statusSetAt(mbIds) : {};
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
  const d30 = now.getTime() - 30 * 86400000;
  mbIds.forEach(id => {
    const c = coById[id], at = mbAt[id], x = S[c.sdr.k]; if (at == null) return;
    K.forEach(k => { if (at >= P[k].start) { x.first[k]++; add('booked', c.sdr.k, k, id); } });
    if (at >= d30) { x.booked30++; add('booked30', c.sdr.k, 'all', id); }
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
      const rows = callRows.filter(r => r.s && r.s.k === s.k && r.ts >= P[k].start);
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
    const bookedIn = k => created != null && created >= P[k].start, heldIn = k => done && start >= P[k].start && start < P.today + 86400000;
    let o;
    if (done) o = ['ok', 'Held']; else if (noShow) o = ['bad', 'No show']; else if (cancelled) o = ['bad', 'Cancelled']; else if (resched) o = ['warn', 'Rescheduled'];
    else if (startIso === P.todayIso) o = ['info', 'Today']; else if (start > P.today) o = ['info', 'Upcoming']; else o = ['bad', 'No outcome'];
    const x = S[co.sdr.k];
    const hwi = wkIdx(start); if (done && hwi >= 0 && start < P.today + 86400000) TR[co.sdr.k].held[hwi]++;
    if (heldIn('mtd')) { x.held++; add('held', co.sdr.k, 'all', coId); }
    if (o[1] === 'No outcome' && start >= P.mtd.start) { x.review.noOutcome++; add('noOutcome', co.sdr.k, 'all', coId); }
    const relevant = bookedIn('mtd') || start >= P.mtd.start;
    if (!relevant) return;
    MEETINGS.push({ c: co.name, id: Number(coId), mid: m.id, m: title, s: co.sdr.k, by: OWNER_NAMES[p.hubspot_owner_id] || 'Someone else', d: nice(startIso), ds: startIso, booked: nice(iso(created)), kind: 'First meeting held', o, x: gongHeld && !/COMPLETED/i.test(p.hs_meeting_outcome || '') ? ['warn', 'Held per Gong; outcome not updated'] : null, wk: bookedIn('wk') || (start >= P.wk.start && start < P.wk.start + 7 * 86400000), bookedWk: false, heldWk: heldIn('wk') });
  });
  // Booked meetings: every company moved to Meeting Booked in the period, with its meeting if one is logged
  const meetByCo = {};
  meetings.forEach(m => { const p = m.properties, t = (p.hs_meeting_title || '').trim(); if (!t || /^\[gong\]/i.test(t)) return;
    (meetCo[m.id] || []).forEach(co => { (meetByCo[co] = meetByCo[co] || []).push({ t, start: toMs(p.hs_meeting_start_time), owner: p.hubspot_owner_id, out: p.hs_meeting_outcome || '' }); }); });
  const inTable = {}; MEETINGS.forEach(m => { inTable[m.id] = m; });
  mbIds.forEach(id => {
    const at = mbAt[id]; if (at == null || at < minStart) return;
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
    const row = { c: c.name, id: Number(id), m: title, s: c.sdr.k, by, d, ds, booked: nice(iso(at)), kind: 'Meeting booked ' + nice(iso(at)), o, x: xx, wk: at >= P.wk.start || (mt && mt.start >= P.wk.start && mt.start < P.wk.start + 7 * 86400000), bookedWk: at >= P.wk.start, heldWk: false };
    if (inTable[id]) { inTable[id].kind = row.kind; inTable[id].bookedWk = row.bookedWk; inTable[id].wk = inTable[id].wk || row.wk; } else MEETINGS.push(row);
  });
  MEETINGS.sort((a, b) => a.ds < b.ds ? -1 : 1);

  /* ----- deals ----- */
  const dealCo = deals.length ? await assoc('deals', 'companies', deals.map(d => d.id)) : {};
  const DEALS = []; let closedWon = 0, createdMtd = 0;
  deals.forEach(d => {
    const p = d.properties; const s = sdrOf(p.sdr_beneficiary_s_); if (!s) return;
    if (toMs(p.createdate) >= P.mtd.start) createdMtd++;
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
    periods: { wk: { start: P.wk.startIso, end: P.todayIso }, mtd: { start: P.mtd.startIso, end: P.todayIso }, dayOfMonth: P.dayOfMonth, daysInMonth: P.daysInMonth },
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
  const companies = await searchAll('companies', [{ filters: [{ propertyName: 'sdr_owner', operator: 'HAS_PROPERTY' }] }], ['sdr_owner']);
  const coSdr = {}; companies.forEach(c => { const s = sdrOf(c.properties.sdr_owner) || sdrOf(sdrOpts[c.properties.sdr_owner]); if (s) coSdr[c.id] = s; });

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
  const mb = await searchAll('companies', [{ filters: [{ propertyName: 'account_status', operator: 'EQ', value: 'Meeting Booked' }, { propertyName: 'sdr_owner', operator: 'HAS_PROPERTY' }] }], ['sdr_owner']);
  const mbAt = mb.length ? await statusSetAt(mb.map(c => c.id)) : {};
  mb.forEach(c => { const s = coSdr[c.id]; const wi = wkIdx(mbAt[c.id]); if (s && wi >= 0) TR[s.k].booked[wi]++; });
  return { generatedAt: now.toISOString(), TRENDS: { weeks: P.weeks.map(iso), bySdr: TR } };
}

module.exports = async (req, res) => {
  TOKEN = process.env.HUBSPOT_TOKEN || '';
  if (!TOKEN) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ error: 'missing_token' })); return; }
  try {
    const part = String((req.query && req.query.part) || new URL(req.url, 'http://x').searchParams.get('part') || '');
    const data = part === 'trends' ? await buildTrends() : await build();
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
