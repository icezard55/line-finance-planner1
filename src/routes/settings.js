const express = require('express');
const pool = require('../lib/db');

// Per-user settings that live on finance.users (currently the single monthly
// spending budget shown on the dashboard).
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT monthly_budget FROM finance.users WHERE line_user_id = $1', [req.lineUserId]);
    const budget = rows[0] && rows[0].monthly_budget;
    res.json({ monthly_budget: budget === null || budget === undefined ? null : Number(budget) });
  } catch (err) {
    next(err);
  }
});

// Body: { monthly_budget: number | null }  (null clears the budget)
router.put('/', async (req, res, next) => {
  try {
    const raw = req.body.monthly_budget;
    const value = raw === null || raw === undefined || raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 1e9)) {
      return res.status(400).json({ error: 'monthly_budget must be a positive number or null' });
    }
    const { rows } = await pool.query(
      'UPDATE finance.users SET monthly_budget = $1 WHERE line_user_id = $2 RETURNING monthly_budget',
      [value, req.lineUserId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json({ monthly_budget: rows[0].monthly_budget === null ? null : Number(rows[0].monthly_budget) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
