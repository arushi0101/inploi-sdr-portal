// Weekday SDR daily report, sent to Slack and by email. Run by the Vercel cron in vercel.json.
// SLACK_WEBHOOK_URL: one or more Slack incoming webhooks, comma-separated (e.g. your DM and the SDR Updates channel).
// RESEND_API_KEY + EMAIL_FROM + EMAIL_TO: send the same report by email through Resend (EMAIL_TO is comma-separated; everyone goes on the To line).
// If CRON_SECRET is set, only Vercel's cron (which sends it) can trigger a send.
const data = require('./data.js');

const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);

module.exports = async (req, res) => {
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  const secret = process.env.CRON_SECRET || '';
  const auth = (req.headers && req.headers.authorization) || '';
  const ua = (req.headers && req.headers['user-agent']) || '';
  if (secret ? auth !== 'Bearer ' + secret : !/^vercel-cron\//.test(ua)) { send(401, { error: 'not_cron' }); return; }
  const hooks = list(process.env.SLACK_WEBHOOK_URL), to = list(process.env.EMAIL_TO), key = process.env.RESEND_API_KEY || '', from = process.env.EMAIL_FROM || '';
  if (!hooks.length && !(key && from && to.length)) { send(503, { error: 'nothing_to_send_to' }); return; }
  if (!process.env.HUBSPOT_TOKEN) { send(503, { error: 'missing_token' }); return; }

  let M = null, err = '';
  try { data.setToken(process.env.HUBSPOT_TOKEN); M = await data.dailyModel(); } catch (e) { err = String(e.message || e).slice(0, 200); }
  const failText = 'Today\'s SDR daily report couldn\'t be generated (' + err + ').';
  const result = { slack: [], email: null };

  for (const hook of hooks) {
    const msg = M ? { text: data.slackFallback(M), blocks: data.slackBlocks(M) } : { text: failText + ' <https://inploi-sdr-portal.vercel.app/#daily|Open the daily report>' };
    try { const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ unfurl_links: false }, msg)) }); result.slack.push(r.status); }
    catch (e) { result.slack.push('error'); }
  }
  if (key && from && to.length) {
    const subject = M ? 'SDR daily report · ' + M.title : 'SDR daily report could not be generated';
    const html = M ? data.emailHtml(M) : '<p>' + failText + ' <a href="https://inploi-sdr-portal.vercel.app/#daily">Open the daily report</a></p>';
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, subject, html, text: M ? data.slackFallback(M) : failText }) });
      result.email = r.status;
    } catch (e) { result.email = 'error'; }
  }
  const ok = result.slack.every(s => s === 200) && (result.email === null || (result.email >= 200 && result.email < 300));
  send(ok ? 200 : 502, result);
};
