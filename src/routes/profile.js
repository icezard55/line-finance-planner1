const express = require('express');
const pool = require('../lib/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM finance.profiles WHERE user_id = $1',
      [req.lineUserId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const { occupation, employment_type, employer, monthly_income_avg, work_start_date } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO finance.profiles (user_id, occupation, employment_type, employer, monthly_income_avg, work_start_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         occupation = EXCLUDED.occupation,
         employment_type = EXCLUDED.employment_type,
         employer = EXCLUDED.employer,
         monthly_income_avg = EXCLUDED.monthly_income_avg,
         work_start_date = EXCLUDED.work_start_date,
         updated_at = now()
       RETURNING *`,
      [req.lineUserId, occupation, employment_type, employer, monthly_income_avg, work_start_date]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
