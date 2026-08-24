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

    const report = await buildReport(req.params.id);
    res.json({ client: client.rows[0], ...report });
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

    const report = await buildReport(client.rows[0].id);
    res.json({
      client: { name: client.rows[0].name, occupation: client.rows[0].occupation, plan_started_at: client.rows[0].plan_started_at },
      ...report,
    });
  } catch (err) {
    next(err);
  }
});

async function buildReport(clientId) {
  const [transactions, assets, liabilities, insurancePolicies, goals] = await Promise.all([
    pool.query('SELECT * FROM finance.transactions WHERE client_id = $1', [clientId]),
    pool.query('SELECT * FROM finance.assets WHERE client_id = $1', [clientId]),
    pool.query('SELECT * FROM finance.liabilities WHERE client_id = $1', [clientId]),
    pool.query('SELECT * FROM finance.insurance_policies WHERE client_id = $1', [clientId]),
    pool.query('SELECT * FROM finance.goals WHERE client_id = $1', [clientId]),
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

module.exports = { authedRouter, publicRouter };
