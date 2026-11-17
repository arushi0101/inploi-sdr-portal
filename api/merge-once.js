// One-off (17 Nov 2026, Arushi asked): merge the workflow-created duplicate Care Dorset deal 542521411812 into 542185459936.
// Hard-coded IDs, POST only; removed again right after use.
const PRIMARY = '542185459936', DUP = '542521411812';
module.exports = async (req, res) => {
  const send = (c, b) => { res.statusCode = c; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(b)); };
  if (req.method !== 'POST') return send(405, { ok: false, error: 'POST only' });
  const token = process.env.HUBSPOT_WRITE_TOKEN || process.env.HUBSPOT_TOKEN || '';
  const h = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const dup = await fetch('https://api.hubapi.com/crm/v3/objects/deals/' + DUP + '?properties=dealname', { headers: h });
  if (dup.status === 404) return send(200, { ok: true, already: true });
  const r = await fetch('https://api.hubapi.com/crm/v3/objects/deals/merge', { method: 'POST', headers: h, body: JSON.stringify({ primaryObjectId: PRIMARY, objectIdToMerge: DUP }) });
  const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch (e) {}
  console.log('merge-once', r.status, t.slice(0, 200));
  return send(r.ok ? 200 : 502, { ok: r.ok, status: r.status, id: j.id || null, error: r.ok ? null : t.slice(0, 300) });
};
