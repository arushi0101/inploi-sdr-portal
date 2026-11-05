// Data-fix messages in Slack, sent for the "SDR data fixes" sheet's script:
//  - kind 'thanks' (Mondays): thank-you for the records fixed last week. POST { kind, fixed, byPerson: [[name, count]], open, sheetUrl }
//  - kind 'reminder' (Thursdays): the sheet, how many fixes each person has, and how to do them. POST { kind, open, byPerson, sheetUrl }
//  - kind 'linked' (after an apply run): confirms the parent/child company links made. POST { kind, items: [{ child, childId, parent, parentId, approvedBy, who }] }
//  - kind 'summary' (Mondays): the owner's private summary, POST { kind, text }, sent to SLACK_WEBHOOK_URL (your DM)
// All with "Authorization: Bearer <APPLY_SECRET>".
// Posts as the Slack user token (SLACK_USER_TOKEN) to SLACK_THANKS_CHANNEL (default #sdr-hub).
const crypto = require('crypto');
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1d2B025T2HnKKZ832Wenvs5_s-SYVnTpn7I_thseckQQ/edit';
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function reminder(b) {
  const open = Math.max(0, Number(b.open) || 0);
  const people = (Array.isArray(b.byPerson) ? b.byPerson : []).filter(p => p && Number(p[1]) > 0).slice(0, 10).map(p => [String(p[0]).slice(0, 60), Number(p[1])]);
  const url = /^https:\/\/docs\.google\.com\//.test(b.sheetUrl || '') ? b.sheetUrl : SHEET_URL, link = 'SDR data fixes sheet';
  if (!open) return '*Hi team, a quick Thursday note*\nThere are no open data fixes this week. Thank you all for keeping HubSpot so tidy!';
  const L = ['*Hi team, a gentle Thursday reminder* :wave:',
    'When you have a few minutes before the weekend, could you have a look at your data fixes in the ' + link + '? There are *' + open + '* open at the moment.', '', '*Spreadsheet:* ' + url];
  if (people.length) { L.push(''); L.push('*Your open fixes*'); people.forEach(p => L.push('• ' + p[0] + ': ' + p[1])); }
  L.push('', '*How to do it*',
    '1. Open the sheet and filter *Who fixes it* to your name.',
    '2. Read the *Suggested update* on each row. It says what the field should probably be and why.',
    '3. If it looks right, choose *Approve* in the *Approve / Reject* column. HubSpot is updated for you on Saturday or Monday morning.',
    '4. If it isn’t right, choose *Reject*. Nothing changes, and you can set the correct value yourself using the *Record* link.',
    '', '*What we’re hoping for*',
    'Please go through your rows by *Friday afternoon*, so the sheet refreshes with everything up to date. Even a handful helps, and there’s no need to do them all at once.',
    '', 'Thank you so much, this keeps our reporting accurate for all of us. Any questions, just ask here.');
  return L.join('\n');
}

const REC = 'https://app-eu1.hubspot.com/contacts/25735731/record/0-2/';
function linked(b) {
  const clean = v => String(v == null ? '' : v).replace(/[<>|*_~`]/g, '').slice(0, 80);
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).filter(x => x && /^\d+$/.test(String(x.childId)) && /^\d+$/.test(String(x.parentId)));
  if (!items.length) return '';
  const L = ['*HubSpot update: companies linked to their group* :link:',
    (items.length === 1 ? 'This was' : 'These ' + items.length + ' were') + ' approved in the SDR data fixes sheet and ' + (items.length === 1 ? 'is' : 'are') + ' now linked in HubSpot with the *Parent company* label:', ''];
  items.forEach(x => L.push('• <' + REC + x.childId + '|' + clean(x.child) + '> is now a child of <' + REC + x.parentId + '|' + clean(x.parent) + '>' + (x.approvedBy ? ' (approved by ' + clean(x.approvedBy) + ')' : '')));
  L.push('', 'Activity, deals and meetings on these companies now roll up to the group in HubSpot. Thank you!');
  return L.join('\n');
}

function message(b) {
  const fixed = Math.max(0, Number(b.fixed) || 0), open = Math.max(0, Number(b.open) || 0);
  const people = (Array.isArray(b.byPerson) ? b.byPerson : []).filter(p => p && Number(p[1]) > 0).slice(0, 10)
    .map(p => [String(p[0]).slice(0, 60), Number(p[1])]);
  const link = /^https:\/\/docs\.google\.com\//.test(b.sheetUrl || '') ? '<' + b.sheetUrl + '|Data fixes sheet>' : 'the Data fixes sheet';
  const L = [];
  if (fixed > 0) {
    L.push('*Happy Monday, team!* :tada:');
    L.push('Last week we fixed *' + fixed + '* HubSpot record' + (fixed === 1 ? '' : 's') + '. Thank you, every one of these makes our reporting more accurate.');
    if (people.length) { L.push(''); L.push('*Thank you to*'); people.forEach(p => L.push('• ' + p[0] + ': ' + p[1] + ' fixed')); }
    L.push('');
    L.push(open ? open + ' still open. Let’s keep the momentum going and keep HubSpot clean and happy. Everything is in ' + link + '.' : 'Nothing left open. Brilliant work, let’s keep it that way!');
  } else {
    L.push('*Happy Monday, team!*');
    L.push('No records were fixed last week. A few minutes each this week would make a real difference: ' + open + ' are waiting in ' + link + '. Thank you!');
  }
  return L.join('\n');
}

module.exports = async (req, res) => {
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  const secret = process.env.APPLY_SECRET || '', token = process.env.SLACK_USER_TOKEN || '', channel = process.env.SLACK_THANKS_CHANNEL || 'C0CEEB94MB2';
  if (!secret) return send(503, { ok: false, error: 'APPLY_SECRET is not set on Vercel' });
  if (!token) return send(503, { ok: false, error: 'SLACK_USER_TOKEN is not set on Vercel' });
  if (req.method !== 'POST') return send(405, { ok: false, error: 'POST only' });
  if (!same((req.headers && req.headers.authorization) || '', 'Bearer ' + secret)) return send(401, { ok: false, error: 'wrong or missing secret' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return send(400, { ok: false, error: 'bad JSON' });
  if (b.kind === 'summary') {
    const hooks = String(process.env.SLACK_WEBHOOK_URL || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!hooks.length) return send(503, { ok: false, error: 'SLACK_WEBHOOK_URL is not set on Vercel' });
    const text = String(b.text || '').slice(0, 3900);
    const st = [];
    for (const h of hooks) { try { const r = await fetch(h, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, unfurl_links: false }) }); st.push(r.status); } catch (e) { st.push('error'); } }
    console.log('[data-fix-summary]', JSON.stringify({ at: new Date().toISOString(), slack: st }));
    return send(st.every(x => x === 200) ? 200 : 502, { ok: st.every(x => x === 200), slack: st });
  }
  const text = b.kind === 'linked' ? linked(b) : b.kind === 'reminder' ? reminder(b) : message(b);
  if (!text) return send(200, { ok: true, skipped: 'nothing to send' });
  if (b.preview) return send(200, { ok: true, text });
  const r = await fetch('https://slack.com/api/chat.postMessage', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ channel, text, unfurl_links: false }) });
  const j = await r.json().catch(() => ({}));
  console.log('[data-fix-thanks]', JSON.stringify({ at: new Date().toISOString(), fixed: b.fixed, ok: !!j.ok, error: j.error }));
  send(j.ok ? 200 : 502, { ok: !!j.ok, error: j.error });
};
module.exports.message = message;
module.exports.reminder = reminder;
module.exports.linked = linked;
