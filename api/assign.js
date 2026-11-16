// Assigns a form lead to an SDR from the dashboard (Inbound › Form submissions › Needs an owner).
// POST { contactId, sdr } where sdr is one of the four SDR owner IDs.
// Guard rails: only the contact owner of a contact that sent a form in the last year and isn't already owned by an
// active SDR or AE can change, and only to one of the four SDRs. The company's Company owner and SDR Owner are filled
// only when empty, and only for prospects (not customers, not companies with open deals, not personal email domains).
// Needs the portal password when PORTAL_PASSWORD is set. Uses HUBSPOT_WRITE_TOKEN if set, otherwise HUBSPOT_TOKEN.
// Every attempt is logged (Vercel runtime logs).
const { allowed } = require('./_auth');
const API = 'https://api.hubapi.com';
const SDRS = { '29569627': 'James Crawford', '32364701': 'Matthew Meehan', '29569628': 'Nikita Rohwer', '29569626': 'Evan Williams' };
const ACTIVE = new Set([...Object.keys(SDRS), '1709905072', '511871441']); // SDRs + AEs (Jason, Felix)
const FREE_DOMAIN = /^(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|icoud|aol|proton(mail)?|me)\.[a-z.]+$/i;

async function hs(path, token, body, method) {
  const r = await fetch(API + path, { method: method || (body ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) { const e = new Error(r.status === 403 ? 'HubSpot refused the change: the HubSpot key needs write access to contacts and companies.' : 'HubSpot ' + r.status + ': ' + text.slice(0, 200)); e.status = r.status; throw e; }
  return text ? JSON.parse(text) : {};
}

module.exports = async (req, res) => {
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  if (!allowed(req, res)) return;
  const token = process.env.HUBSPOT_WRITE_TOKEN || process.env.HUBSPOT_TOKEN || '';
  if (!token) return send(503, { ok: false, error: 'missing_token' });
  if (req.method === 'GET') { // can this key write owners? (returns the scope check only, never the key)
    try { const r = await fetch(API + '/oauth/v2/private-apps/get/access-token-info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokenKey: token }) });
      const j = await r.json(); const sc = j.scopes || [];
      return send(200, { ok: true, contactsWrite: sc.includes('crm.objects.contacts.write'), companiesWrite: sc.includes('crm.objects.companies.write'), usingWriteKey: !!process.env.HUBSPOT_WRITE_TOKEN });
    } catch (e) { return send(502, { ok: false, error: 'couldn’t check the key' }); } }
  if (req.method !== 'POST') return send(405, { ok: false, error: 'POST only' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') {
    const raw = await new Promise(r => { let d = ''; req.on('data', c => { d += c; if (d.length > 2000) req.destroy(); }); req.on('end', () => r(d)); });
    try { b = JSON.parse(raw); } catch (e) { return send(400, { ok: false, error: 'bad JSON' }); }
  }
  const contactId = String(b.contactId || ''), sdr = String(b.sdr || '');
  if (!/^\d+$/.test(contactId)) return send(400, { ok: false, error: 'bad contact id' });
  if (!SDRS[sdr]) return send(400, { ok: false, error: 'pick one of the four SDRs' });
  try {
    const c = await hs('/crm/v3/objects/contacts/' + contactId + '?properties=hubspot_owner_id,recent_conversion_date,associatedcompanyid', token);
    const p = c.properties || {}, old = p.hubspot_owner_id || '';
    const conv = Date.parse(p.recent_conversion_date) || Number(p.recent_conversion_date) || 0;
    if (!conv || Date.now() - conv > 366 * 86400000) return send(400, { ok: false, error: 'only contacts who sent a form in the last year can be assigned here' });
    if (old === sdr) return send(200, { ok: true, unchanged: true, owner: SDRS[sdr] });
    if (ACTIVE.has(old)) return send(409, { ok: false, error: 'this contact is already owned by an SDR or AE; change it in HubSpot if needed' });
    await hs('/crm/v3/objects/contacts/' + contactId, token, { properties: { hubspot_owner_id: sdr } }, 'PATCH');
    const out = { ok: true, contact: { id: contactId, old, owner: SDRS[sdr] }, company: null };
    const coId = p.associatedcompanyid;
    if (coId) {
      const co = await hs('/crm/v3/objects/companies/' + coId + '?properties=hubspot_owner_id,sdr_owner,lifecyclestage,hs_num_open_deals,domain', token);
      const q = co.properties || {}, domain = String(q.domain || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      const prospect = q.lifecyclestage !== 'customer' && !(Number(q.hs_num_open_deals) > 0) && !FREE_DOMAIN.test(domain);
      const set = {};
      if (prospect && !q.hubspot_owner_id) set.hubspot_owner_id = sdr;
      if (prospect && !q.sdr_owner) set.sdr_owner = SDRS[sdr];
      if (Object.keys(set).length) await hs('/crm/v3/objects/companies/' + coId, token, { properties: set }, 'PATCH');
      out.company = { id: coId, filled: Object.keys(set), skipped: prospect ? '' : 'customer, open deal or personal email domain' };
    }
    console.log('assign', JSON.stringify({ at: new Date().toISOString(), contactId, from: old, to: sdr, company: out.company }));
    return send(200, out);
  } catch (e) {
    console.log('assign failed', contactId, sdr, String(e.message || e));
    return send(e.status === 403 ? 403 : 502, { ok: false, error: String(e.message || e).slice(0, 300) });
  }
};
