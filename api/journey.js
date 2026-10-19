// One company's history with inploi, from HubSpot: calls, emails, meetings, notes, deals and contacts, newest first.

const { allowed } = require('./_auth');
const API = 'https://api.hubapi.com';
const OWNER_NAMES = {
  '29569627': 'James Crawford', '32364701': 'Matthew Meehan', '29569628': 'Nikita Rohwer', '29569626': 'Evan Williams',
  '1709905072': 'Jason Baaphy', '511871441': 'Felix Dealtry', '32978778': 'Annie Claassens', '511871465': 'Matt de la Hey', '36304602': 'Joseph Williams'
};
const DISP = {
  'f240bbac-87c9-4f6e-bf70-924b57d47db7': 'Connected',
  'cac480f0-a8c0-4042-a92a-7a00144842f2': 'Valuable conversation',
  '522f6325-eb24-4b15-a96d-378c8dab9af8': 'Meeting booked',
  '73a0d17f-1163-4015-bdd5-ec830791da20': 'No answer',
  '1595831b-ac6b-4d8d-bac9-2f711edd96a7': 'Screening bot',
  'e769fdeb-c488-428d-9a5a-f9a6391f8aaa': 'Gatekeeper',
  '17b47fee-58de-441e-a44c-c6300d46f273': 'Wrong number',
  'e4c946f0-5174-48ed-b1d9-9ea275fa754a': 'Bad timing',
  '40854b06-5e3f-4748-8eb5-03008d8303d0': 'Not interested',
  'b2cf5968-551e-4856-9783-52b3da59a7d0': 'Left voicemail'
};
const CONV = new Set(['Connected', 'Valuable conversation', 'Meeting booked']);
const CAP = 250; // most recent items per type

let TOKEN = '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function hs(path, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 429 || r.status >= 500) { await sleep(500 * (attempt + 1)); continue; }
    const text = await r.text();
    if (!r.ok) { const e = new Error('HubSpot ' + r.status + ' on ' + path + ': ' + text.slice(0, 300)); e.status = r.status; throw e; }
    return text ? JSON.parse(text) : {};
  }
  throw new Error('HubSpot kept rate-limiting ' + path);
}
async function assocIds(from, id, to) {
  const out = []; let after;
  do {
    const r = await hs('/crm/v4/objects/' + from + '/' + id + '/associations/' + to + '?limit=500' + (after ? '&after=' + after : ''));
    (r.results || []).forEach(x => out.push(String(x.toObjectId)));
    after = r.paging && r.paging.next && r.paging.next.after;
  } while (after && out.length < 2000);
  return out;
}
async function batchRead(type, ids, properties) {
  const out = [];
  for (let i = 0; i < ids.length; i += 100) {
    const r = await hs('/crm/v3/objects/' + type + '/batch/read', { inputs: ids.slice(i, i + 100).map(id => ({ id })), properties });
    out.push(...(r.results || []));
  }
  return out;
}
async function batchAssoc(from, to, ids) {
  const map = {};
  for (let i = 0; i < ids.length; i += 1000) {
    const r = await hs('/crm/v4/associations/' + from + '/' + to + '/batch/read', { inputs: ids.slice(i, i + 1000).map(id => ({ id })) });
    (r.results || []).forEach(x => { map[String(x.from.id)] = (x.to || []).map(t => String(t.toObjectId)); });
  }
  return map;
}
// A type the token can't read shouldn't break the whole page
const safe = (p, fallback) => p.catch(e => { if (e.status === 401) throw e; return fallback; });

const toMs = v => { if (v == null || v === '') return null; const n = Number(v); return isNaN(n) ? Date.parse(v) : n; };
const text = (html, n) => {
  if (!html) return '';
  const t = String(html).replace(/<br\s*\/?>|<\/p>|<\/div>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trim() + '\u2026' : t;
};
const owner = id => id ? (OWNER_NAMES[id] || 'Another user') : '';
const latest = ids => ids.map(Number).sort((a, b) => b - a).slice(0, CAP).map(String);

async function options(type, prop) {
  try { const r = await hs('/crm/v3/properties/' + type + '/' + prop); const m = {}; (r.options || []).forEach(o => { m[o.value] = o.label; }); return m; }
  catch (e) { return {}; }
}

async function journey(id) {
  const [coArr, statusOpts, engOpts, sdrOpts, pipes] = await Promise.all([
    batchRead('companies', [id], ['name', 'domain', 'industry', 'numberofemployees', 'lifecyclestage', 'createdate', 'hubspot_owner_id', 'sdr_owner', 'account_status', 'call_outcome__account_engagement', 'notes_last_contacted']),
    options('companies', 'account_status'), options('companies', 'call_outcome__account_engagement'), options('companies', 'sdr_owner'),
    hs('/crm/v3/pipelines/deals').catch(() => ({ results: [] }))
  ]);
  if (!coArr.length) { const e = new Error('not found'); e.status = 404; throw e; }
  const c = coArr[0].properties;
  const stageLabel = {}; (pipes.results || []).forEach(p => (p.stages || []).forEach(s => { stageLabel[s.id] = s.label; }));

  const [conIds, dealIds, callIds, emailIds, meetIds, noteIds] = await Promise.all(
    ['contacts', 'deals', 'calls', 'emails', 'meetings', 'notes'].map(t => safe(assocIds('companies', id, t), []))
  );
  const [contacts, deals, calls, emails, meetings, notes] = await Promise.all([
    safe(batchRead('contacts', latest(conIds), ['firstname', 'lastname', 'jobtitle', 'email']), []),
    safe(batchRead('deals', latest(dealIds), ['dealname', 'dealstage', 'amount', 'createdate', 'closedate', 'hs_is_closed', 'hs_is_closed_won', 'hubspot_owner_id']), []),
    safe(batchRead('calls', latest(callIds), ['hs_timestamp', 'hs_call_title', 'hs_call_disposition', 'hs_call_body', 'hs_call_direction', 'hubspot_owner_id']), []),
    safe(batchRead('emails', latest(emailIds), ['hs_timestamp', 'hs_email_subject', 'hs_email_direction', 'hs_sequence_id', 'hubspot_owner_id']), []),
    safe(batchRead('meetings', latest(meetIds), ['hs_meeting_start_time', 'hs_createdate', 'hs_meeting_title', 'hs_meeting_outcome', 'hubspot_owner_id']), []),
    safe(batchRead('notes', latest(noteIds), ['hs_timestamp', 'hs_note_body', 'hubspot_owner_id']), [])
  ]);

  // Who each call and email was with
  const people = {}; contacts.forEach(x => { const p = x.properties; people[x.id] = [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email || ''; });
  const [callWho, emailWho, meetWho] = await Promise.all([
    calls.length ? safe(batchAssoc('calls', 'contacts', calls.map(x => x.id)), {}) : {},
    emails.length ? safe(batchAssoc('emails', 'contacts', emails.map(x => x.id)), {}) : {},
    meetings.length ? safe(batchAssoc('meetings', 'contacts', meetings.map(x => x.id)), {}) : {}
  ]);
  const who = (map, oid) => (map[oid] || []).map(cid => people[cid]).filter(Boolean).slice(0, 3).join(', ');

  const T = [];
  calls.forEach(x => {
    const p = x.properties; const out = DISP[p.hs_call_disposition] || (p.hs_call_disposition ? 'Other outcome' : 'No outcome logged');
    T.push({ t: 'call', ts: toMs(p.hs_timestamp), by: owner(p.hubspot_owner_id), with: who(callWho, x.id), title: p.hs_call_title || 'Call', out, conv: CONV.has(out), body: text(p.hs_call_body, 320) });
  });
  emails.forEach(x => {
    const p = x.properties; const inc = p.hs_email_direction === 'INCOMING_EMAIL';
    T.push({ t: inc ? 'reply' : 'email', ts: toMs(p.hs_timestamp), by: owner(p.hubspot_owner_id), with: who(emailWho, x.id), title: p.hs_email_subject || '(no subject)', seq: !!p.hs_sequence_id });
  });
  meetings.forEach(x => {
    const p = x.properties; const o = (p.hs_meeting_outcome || '').toUpperCase();
    const outLabel = { COMPLETED: 'Held', NO_SHOW: 'No show', CANCELED: 'Cancelled', CANCELLED: 'Cancelled', RESCHEDULED: 'Rescheduled' }[o] || '';
    const start = toMs(p.hs_meeting_start_time);
    T.push({ t: 'meeting', ts: start, by: owner(p.hubspot_owner_id), with: who(meetWho, x.id), title: p.hs_meeting_title || 'Meeting', out: outLabel || (start > Date.now() ? 'Upcoming' : 'No outcome'), booked: toMs(p.hs_createdate) });
  });
  notes.forEach(x => { const p = x.properties; const b = text(p.hs_note_body, 320); if (b) T.push({ t: 'note', ts: toMs(p.hs_timestamp), by: owner(p.hubspot_owner_id), title: 'Note', body: b }); });
  deals.forEach(x => {
    const p = x.properties;
    T.push({ t: 'deal', ts: toMs(p.createdate), by: owner(p.hubspot_owner_id), title: (p.dealname || 'Deal').replace(/&amp;/g, '&'), out: stageLabel[p.dealstage] || p.dealstage || '', amount: p.amount ? Number(p.amount) : null, id: x.id });
  });
  T.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const sum = {
    calls: calls.length, conv: T.filter(x => x.t === 'call' && x.conv).length,
    emails: T.filter(x => x.t === 'email').length, replies: T.filter(x => x.t === 'reply').length,
    meetings: meetings.length, held: T.filter(x => x.t === 'meeting' && x.out === 'Held').length,
    deals: deals.length, contacts: conIds.length,
    first: T.length ? T[T.length - 1].ts : null, last: toMs(c.notes_last_contacted),
    capped: [callIds, emailIds, meetIds, noteIds].some(a => a.length > CAP)
  };
  return {
    id, name: (c.name || 'Unnamed company').trim(), domain: c.domain || '', industry: c.industry || '', employees: c.numberofemployees || '',
    status: statusOpts[c.account_status] || c.account_status || '', engagement: engOpts[c.call_outcome__account_engagement] || c.call_outcome__account_engagement || '',
    sdr: sdrOpts[c.sdr_owner] || owner(c.sdr_owner) || c.sdr_owner || '', owner: owner(c.hubspot_owner_id), created: toMs(c.createdate),
    contacts: contacts.map(x => ({ id: x.id, n: people[x.id] || 'Unnamed', j: x.properties.jobtitle || '' })).slice(0, 30),
    deals: deals.map(x => { const p = x.properties; return { id: x.id, n: (p.dealname || 'Deal').replace(/&amp;/g, '&'), st: stageLabel[p.dealstage] || p.dealstage || '', a: p.amount ? Number(p.amount) : null, won: p.hs_is_closed_won === 'true', closed: p.hs_is_closed === 'true' }; }),
    summary: sum, timeline: T
  };
}

module.exports = async (req, res) => {
  if (!allowed(req, res)) return;
  res.setHeader('Content-Type', 'application/json');
  TOKEN = process.env.HUBSPOT_TOKEN || '';
  const id = String((req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id') || '');
  if (!TOKEN) { res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ error: 'missing_token' })); return; }
  if (!/^\d+$/.test(id)) { res.statusCode = 400; res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ error: 'bad_id' })); return; }
  try {
    const data = await journey(id);
    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.end(JSON.stringify(data));
  } catch (e) {
    res.statusCode = e.status === 404 ? 404 : e.status === 401 || e.status === 403 ? 502 : 500;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: e.status === 404 ? 'not_found' : e.status === 401 ? 'bad_token' : e.status === 403 ? 'missing_scope' : 'hubspot_error', message: String(e.message || e).slice(0, 400) }));
  }
};
