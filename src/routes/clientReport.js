const express = require('express');
const pool = require('../lib/db');
const { computeScore } = require('../lib/score');

// The caller's own personal financial health score.
const personalRouter = express.Router();

personalRouter.get('/', async (req, res, next) => {
  try {
    const report = await buildReport(req.lineUserId);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

async function buildReport(userId) {
  const [transactions, assets, liabilities, insurancePolicies, goals] = await Promise.all([
    pool.query('SELECT * FROM finance.transactions WHERE user_id = $1', [userId]),
    pool.query('SELECT * FROM finance.assets WHERE user_id = $1', [userId]),
    pool.query('SELECT * FROM finance.liabilities WHERE user_id = $1', [userId]),
    pool.query('SELECT * FROM finance.insurance_policies WHERE user_id = $1', [userId]),
    pool.query('SELECT * FROM finance.goals WHERE user_id = $1', [userId]),
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

module.exports = { personalRouter };
