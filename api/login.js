// Swaps the portal password for the key the API calls need.
const { keyFor, same } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  const pw = process.env.PORTAL_PASSWORD || '';
  if (!pw) { res.statusCode = 503; res.end(JSON.stringify({ error: 'no_password' })); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'post_only' })); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const given = String((body && body.password) || '');
  if (!same(keyFor(given), keyFor(pw))) { await new Promise(r => setTimeout(r, 800)); res.statusCode = 401; res.end(JSON.stringify({ error: 'wrong_password' })); return; }
  res.statusCode = 200; res.end(JSON.stringify({ key: keyFor(pw) }));
};
