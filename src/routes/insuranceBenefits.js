const express = require('express');
const pool = require('../lib/db');

// Nested under an insurance policy: /api/insurance-policies/:policyId/benefits
// Every query joins back to insurance_policies to confirm the policy belongs
// to the caller before touching its benefits.
const router = express.Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.* FROM finance.insurance_benefits b
       JOIN finance.insurance_policies p ON p.id = b.policy_id
       WHERE b.policy_id = $1 AND p.user_id = $2
       ORDER BY b.benefit_name`,
      [req.params.policyId, req.lineUserId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { benefit_name, benefit_limit, used_amount, renew_cycle } = req.body;
    const owns = await pool.query(
      'SELECT 1 FROM finance.insurance_policies WHERE id = $1 AND user_id = $2',
      [req.params.policyId, req.lineUserId]
    );
    if (!owns.rows[0]) return res.status(404).json({ error: 'policy not found' });

    const { rows } = await pool.query(
      `INSERT INTO finance.insurance_benefits (policy_id, benefit_name, benefit_limit, used_amount, renew_cycle)
       VALUES ($1, $2, $3, COALESCE($4, 0), $5)
       RETURNING *`,
      [req.params.policyId, benefit_name, benefit_limit, used_amount, renew_cycle]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { benefit_name, benefit_limit, used_amount, renew_cycle } = req.body;
    const { rows } = await pool.query(
      `UPDATE finance.insurance_benefits b SET
         benefit_name = COALESCE($3, b.benefit_name),
         benefit_limit = COALESCE($4, b.benefit_limit),
         used_amount = COALESCE($5, b.used_amount),
         renew_cycle = COALESCE($6, b.renew_cycle)
       FROM finance.insurance_policies p
       WHERE b.id = $1 AND b.policy_id = $2
         AND p.id = b.policy_id AND p.user_id = $7
       RETURNING b.*`,
      [req.params.id, req.params.policyId, benefit_name, benefit_limit, used_amount, renew_cycle, req.lineUserId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM finance.insurance_benefits b
       USING finance.insurance_policies p
       WHERE b.id = $1 AND b.policy_id = $2 AND p.id = b.policy_id AND p.user_id = $3`,
      [req.params.id, req.params.policyId, req.lineUserId]
    );
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
