// Weekday SDR daily report to Slack. Run by the Vercel cron in vercel.json.
// Needs SLACK_WEBHOOK_URL (a Slack incoming webhook) and HUBSPOT_TOKEN. If CRON_SECRET is set, only Vercel's cron (which sends it) can trigger a post.
const data = require('./data.js');

module.exports = async (req, res) => {
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  const secret = process.env.CRON_SECRET || '';
  const auth = (req.headers && req.headers.authorization) || '';
  const ua = (req.headers && req.headers['user-agent']) || '';
  if (secret ? auth !== 'Bearer ' + secret : !/^vercel-cron\//.test(ua)) { send(401, { error: 'not_cron' }); return; }
  const hook = process.env.SLACK_WEBHOOK_URL || '';
  if (!hook) { send(503, { error: 'missing_slack_webhook' }); return; }
  if (!process.env.HUBSPOT_TOKEN) { send(503, { error: 'missing_token' }); return; }
  let msg;
  try {
    data.setToken(process.env.HUBSPOT_TOKEN);
    msg = await data.slackPayload(undefined, true);
  } catch (e) {
    msg = { text: 'Today\'s SDR daily report couldn\'t be generated (' + String(e.message || e).slice(0, 200) + '). <https://inploi-sdr-portal.vercel.app/#daily|Open the daily report>' };
  }
  const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ unfurl_links: false }, msg)) });
  send(r.ok ? 200 : 502, { sent: r.ok, slackStatus: r.status });
};
