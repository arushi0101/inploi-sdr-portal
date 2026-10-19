// Password gate for the portal. The password lives in the PORTAL_PASSWORD environment variable in Vercel.
// A correct password gets a key (an HMAC of the password); every API call must carry it as ?k=.
// The key is part of the URL, so Vercel's cache never serves data to a request without it.
const crypto = require('crypto');

function keyFor(pw) { return crypto.createHmac('sha256', pw).update('inploi-sdr-portal').digest('hex'); }
function same(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }

// true when the request may see data; otherwise sends a 401 and returns false
function allowed(req, res) {
  const pw = process.env.PORTAL_PASSWORD || '';
  const k = new URL(req.url, 'http://x').searchParams.get('k') || '';
  if (pw && k && same(k, keyFor(pw))) return true;
  res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: pw ? 'locked' : 'no_password' }));
  return false;
}

module.exports = { keyFor, same, allowed };
