const express = require('express');
const pool = require('../lib/db');
const { client } = require('../lib/line');

const router = express.Router();

router.use((req, res, next) => {
  if (req.lineUserId !== process.env.ADMIN_LINE_USER_ID) {
    return res.status(403).json({ error: 'admin only' });
  }
  next();
});

router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.line_user_id, u.plan, u.created_at,
              (SELECT count(*) FROM finance.transactions t WHERE t.user_id = u.line_user_id) AS tx_count
       FROM finance.users u
       ORDER BY u.created_at ASC`
    );

    const users = await Promise.all(
      rows.map(async (u) => {
        let displayName = null;
        try {
          const profile = await client.getProfile(u.line_user_id);
          displayName = profile.displayName;
        } catch {
          // blocked the bot or otherwise unreachable -- leave displayName null
        }
        return { ...u, displayName };
      })
    );

    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.put('/users/:userId/plan', async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (plan !== 'free' && plan !== 'premium') {
      return res.status(400).json({ error: 'plan must be "free" or "premium"' });
    }
    const { rows } = await pool.query(
      'UPDATE finance.users SET plan = $1 WHERE line_user_id = $2 RETURNING line_user_id, plan',
      [plan, req.params.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
