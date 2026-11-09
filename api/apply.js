// Applies one approved data fix from the "SDR data fixes" Google Sheet to HubSpot.
// POST { object, id, property, value, approvedBy, key } with "Authorization: Bearer <APPLY_SECRET>".
// Only fills an empty field: if HubSpot already has a different value, nothing is changed.
// Only the fields and values below can be written; values are checked against HubSpot's own options.
// Uses HUBSPOT_WRITE_TOKEN when set (a key with write access), otherwise HUBSPOT_TOKEN.
// Every attempt is logged (Vercel runtime logs) and the sheet keeps its own Change log tab.
const crypto = require('crypto');
const API = 'https://api.hubapi.com';
const ALLOWED = {
  companies: ['sdr_owner', 'account_status', '__parent'], // __parent: link the company to a parent company (value = parent id)
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
  const secret = process.env.APPLY_SECRET || '', token = process.env.HUBSPOT_WRITE_TOKEN || process.env.HUBSPOT_TOKEN || ''; // a separate key with write access, if set
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

  if (property === '__parent') return linkParent(String(id), String(value || ''), who, token, send);
  try {
    const def = await hs('/crm/v3/properties/' + object + '/' + property, token);
    // call outcomes live in HubSpot's dispositions list, not in the property's options
    if (property === 'hs_call_disposition') {
      const disp = await hs('/calling/v1/dispositions', token).catch(() => []);
      def.options = (Array.isArray(disp) ? disp : []).map(x => ({ value: x.id, label: x.label })).concat(def.options || []);
    }
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

// links a child company to its parent with HubSpot's "Parent Company" association label.
// Only when the child has no parent yet (HubSpot allows one); never re-parents or creates loops. Checked after writing.
async function linkParent(child, parent, who, token, send) {
  const L = { who, object: 'companies', id: child, property: 'parent company', value: parent };
  if (!/^\d+$/.test(parent) || parent === child) return send(400, { ok: false, error: 'bad parent company id' });
  try {
    const read = id => hs('/crm/v3/objects/companies/' + id + '?properties=name,hs_parent_company_id', token);
    const [c, p] = await Promise.all([read(child), read(parent)]);
    const cName = (c.properties.name || '').trim(), pName = (p.properties.name || '').trim(), cur = c.properties.hs_parent_company_id || '';
    if (cur === parent) { log(Object.assign(L, { result: 'already set' })); return send(200, { ok: true, unchanged: true, old: pName, new: pName, child: cName, parent: pName }); }
    if (cur) { const o = await read(cur).catch(() => ({ properties: { name: 'company ' + cur } })); log(Object.assign(L, { old: cur, result: 'skipped, already has a parent' })); return send(409, { ok: false, error: 'not changed: ' + cName + ' already has a parent company (' + (o.properties.name || cur) + ')', old: o.properties.name || cur }); }
    if (p.properties.hs_parent_company_id === child) { log(Object.assign(L, { result: 'skipped, would loop' })); return send(409, { ok: false, error: 'not changed: ' + pName + ' is already a child of ' + cName }); }
    const labels = await hs('/crm/v4/associations/companies/companies/labels', token);
    const lab = re => (labels.results || []).find(x => re.test(x.label || '') && x.category === 'HUBSPOT_DEFINED');
    const parentLab = lab(/^parent/i), childLab = lab(/^child/i);
    if (!parentLab || !childLab) return send(502, { ok: false, error: 'HubSpot has no Parent / Child company association labels' });
    const put = t => hs('/crm/v4/objects/companies/' + child + '/associations/companies/' + parent, token, [{ associationCategory: t.category, associationTypeId: t.typeId }], 'PUT');
    // hs_parent_company_id can take a moment to update after the link
    const settled = async () => { for (let i = 0; i < 4; i++) { const x = await read(child); if (x.properties.hs_parent_company_id) return x; await new Promise(r => setTimeout(r, 1500)); } return read(child); };
    await put(parentLab);
    let now = await settled();
    if (now.properties.hs_parent_company_id !== parent) {
      // the label points the other way in this portal: undo and use the other label, so the PARENT stays the parent
      await hs('/crm/v4/objects/companies/' + child + '/associations/companies/' + parent, token, null, 'DELETE').catch(() => null);
      await put(childLab); now = await settled();
      if (now.properties.hs_parent_company_id !== parent) {
        await hs('/crm/v4/objects/companies/' + child + '/associations/companies/' + parent, token, null, 'DELETE').catch(() => null);
        log(Object.assign(L, { result: 'error', error: 'link not confirmed, undone' }));
        return send(502, { ok: false, error: 'HubSpot didn’t confirm the parent link, so it was undone' });
      }
    }
    log(Object.assign(L, { result: 'applied' }));
    return send(200, { ok: true, old: '', new: pName, child: cName, parent: pName });
  } catch (e) {
    log(Object.assign(L, { result: 'error', error: e.message }));
    return send(e.status === 404 ? 404 : 502, { ok: false, error: e.status === 404 ? 'company not found in HubSpot (deleted or merged?)' : e.message });
  }
}

function log(x) { console.log('[data-fix]', JSON.stringify(Object.assign({ at: new Date().toISOString() }, x))); }
