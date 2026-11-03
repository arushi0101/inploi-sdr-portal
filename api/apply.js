// Applies one approved data fix from the "SDR data fixes" Google Sheet to HubSpot.
// POST { object, id, property, value, approvedBy, key } with "Authorization: Bearer <APPLY_SECRET>".
// Only fills an empty field: if HubSpot already has a different value, nothing is changed.
// Only the fields and values below can be written; values are checked against HubSpot's own options.
// Every attempt is logged (Vercel runtime logs) and the sheet keeps its own Change log tab.
const crypto = require('crypto');
const API = 'https://api.hubapi.com';
const ALLOWED = {
  companies: ['sdr_owner', 'account_status'],
  calls: ['hs_call_disposition', 'hs_activity_type'],
  meetings: ['hs_activity_type']
};

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function hs(path, token, body, method) {
  const r = await fetch(API + path, { method: method || (body ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) {
    const e = new Error(r.status === 403 ? 'HubSpot refused the change (403): the HubSpot key needs write access for ' + path.split('/')[4] + '.' : 'HubSpot ' + r.status + ': ' + text.slice(0, 200));
    e.status = r.status; throw e;
  }
  return text ? JSON.parse(text) : {};
}

module.exports = async (req, res) => {
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  const secret = process.env.APPLY_SECRET || '', token = process.env.HUBSPOT_TOKEN || '';
  if (!secret) return send(503, { ok: false, error: 'APPLY_SECRET is not set on Vercel' });
  if (!token) return send(503, { ok: false, error: 'missing_token' });
  if (req.method !== 'POST') return send(405, { ok: false, error: 'POST only' });
  const auth = (req.headers && req.headers.authorization) || '';
  if (!same(auth, 'Bearer ' + secret)) return send(401, { ok: false, error: 'wrong or missing secret' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') {
    const raw = await new Promise(r => { let d = ''; req.on('data', c => { d += c; }); req.on('end', () => r(d)); });
    try { b = JSON.parse(raw); } catch (e) { return send(400, { ok: false, error: 'bad JSON' }); }
  }
  const { object, id, property, value } = b;
  const who = String(b.approvedBy || 'unknown').slice(0, 120);
  if (!ALLOWED[object] || !ALLOWED[object].includes(property)) return send(400, { ok: false, error: 'that field can’t be changed from the sheet' });
  if (!/^\d+$/.test(String(id))) return send(400, { ok: false, error: 'bad record id' });

  try {
    const def = await hs('/crm/v3/properties/' + object + '/' + property, token);
    const opt = (def.options || []).find(o => o.value === value);
    if (!opt) return send(400, { ok: false, error: '"' + value + '" isn’t an option for ' + (def.label || property) });
    const cur = await hs('/crm/v3/objects/' + object + '/' + id + '?properties=' + property, token);
    const old = (cur.properties || {})[property] || '';
    const label = v => { const o = (def.options || []).find(x => x.value === v); return o ? o.label : v; };
    if (old === value) { log({ who, object, id, property, old, value, result: 'already set' }); return send(200, { ok: true, unchanged: true, old: label(old), new: opt.label }); }
    if (old) { log({ who, object, id, property, old, value, result: 'skipped, already set' }); return send(409, { ok: false, error: 'not changed: it is already set to "' + label(old) + '" in HubSpot', old: label(old) }); }
    await hs('/crm/v3/objects/' + object + '/' + id, token, { properties: { [property]: value } }, 'PATCH');
    log({ who, object, id, property, old, value, result: 'applied' });
    send(200, { ok: true, old: '', new: opt.label });
  } catch (e) {
    log({ who, object, id, property, value, result: 'error', error: e.message });
    send(e.status === 404 ? 404 : 502, { ok: false, error: e.status === 404 ? 'record not found in HubSpot (deleted or merged?)' : e.message });
  }
};

function log(x) { console.log('[data-fix]', JSON.stringify(Object.assign({ at: new Date().toISOString() }, x))); }
