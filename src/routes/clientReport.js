const express = require('express');
const pool = require('../lib/db');
const { computeScore } = require('../lib/score');

// Behind liffAuth — the agent viewing their own client's report.
const authedRouter = express.Router();

authedRouter.get('/:id/report', async (req, res, next) => {
  try {
    const client = await pool.query(
      'SELECT * FROM finance.clients WHERE id = $1 AND user_id = $2',
      [req.params.id, req.lineUserId]
    );
    if (!client.rows[0]) return res.status(404).json({ error: 'not found' });

    const report = await buildReport({ clientId: req.params.id });
    res.json({ client: client.rows[0], ...report });
  } catch (err) {
    next(err);
  }
});

// The caller's own personal financial health score (client_id IS NULL data).
const personalRouter = express.Router();

personalRouter.get('/', async (req, res, next) => {
  try {
    const report = await buildReport({ userId: req.lineUserId });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// No auth — this is the link the client opens directly.
const publicRouter = express.Router();

publicRouter.get('/:token', async (req, res, next) => {
  try {
    const client = await pool.query('SELECT * FROM finance.clients WHERE share_token = $1', [req.params.token]);
    if (!client.rows[0]) return res.status(404).json({ error: 'not found' });

    const report = await buildReport({ clientId: client.rows[0].id });
    res.json({
      client: { name: client.rows[0].name, occupation: client.rows[0].occupation, plan_started_at: client.rows[0].plan_started_at },
      ...report,
    });
  } catch (err) {
    next(err);
  }
});

// clientId set -> that client's data. clientId omitted -> the caller's own
// personal data (client_id IS NULL), same convention as crudRouter's supportsClient.
async function buildReport({ userId, clientId }) {
  const where = clientId ? 'client_id = $1' : 'user_id = $1 AND client_id IS NULL';
  const param = clientId || userId;

  const [transactions, assets, liabilities, insurancePolicies, goals] = await Promise.all([
    pool.query(`SELECT * FROM finance.transactions WHERE ${where}`, [param]),
    pool.query(`SELECT * FROM finance.assets WHERE ${where}`, [param]),
    pool.query(`SELECT * FROM finance.liabilities WHERE ${where}`, [param]),
    pool.query(`SELECT * FROM finance.insurance_policies WHERE ${where}`, [param]),
    pool.query(`SELECT * FROM finance.goals WHERE ${where}`, [param]),
  ]);

  const score = computeScore({
    transactions: transactions.rows,
    assets: assets.rows,
    liabilities: liabilities.rows,
    insurancePolicies: insurancePolicies.rows,
    goals: goals.rows,
  });

  return {
    score,
    assets: assets.rows,
    liabilities: liabilities.rows,
    insurancePolicies: insurancePolicies.rows,
    goals: goals.rows,
  };
}

module.exports = { authedRouter, personalRouter, publicRouter };
