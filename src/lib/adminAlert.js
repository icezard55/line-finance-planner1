const { client } = require('./line');

// Pushes a LINE message to the admin (ADMIN_LINE_USER_ID). Each distinct `key`
// is sent at most once per `cooldownMs`, so a broken API key does not spam the
// admin once per slip.
const lastSent = new Map();

async function alertAdmin(key, text, cooldownMs = 6 * 60 * 60 * 1000) {
  const to = process.env.ADMIN_LINE_USER_ID;
  if (!to) return false;
  const now = Date.now();
  if (now - (lastSent.get(key) || 0) < cooldownMs) return false;
  lastSent.set(key, now);
  try {
    await client.pushMessage({ to, messages: [{ type: 'text', text }] });
    return true;
  } catch (err) {
    console.error('admin alert push failed', err.message);
    lastSent.delete(key);
    return false;
  }
}

// True when an Anthropic failure means "the key/billing needs a human" rather
// than a one-off hiccup: bad or expired key, or the credit balance ran out.
function isAnthropicAccountProblem(err) {
  if (!err || !err.status) return false;
  if (err.status === 401 || err.status === 403) return true;
  return err.status === 400 && /credit balance/i.test(err.detail || '');
}

module.exports = { alertAdmin, isAnthropicAccountProblem };
