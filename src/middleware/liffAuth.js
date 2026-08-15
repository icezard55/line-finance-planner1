const pool = require('../lib/db');
const { verifyIdToken } = require('../lib/line');

// Verifies the LIFF ID token sent as `Authorization: Bearer <idToken>`,
// then auto-provisions/updates the finance.users row for that person.
module.exports = async function liffAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ error: 'missing bearer id token' });
    }

    const profile = await verifyIdToken(idToken);
    req.lineUserId = profile.sub;

    await pool.query(
      `INSERT INTO finance.users (line_user_id, display_name, picture_url, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (line_user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         picture_url = EXCLUDED.picture_url`,
      [profile.sub, profile.name || null, profile.picture || null, profile.email || null]
    );

    next();
  } catch (err) {
    console.error('liffAuth failed:', err.message);
    res.status(401).json({ error: 'unauthorized' });
  }
};
