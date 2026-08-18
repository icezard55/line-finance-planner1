const cron = require('node-cron');
const pool = require('../lib/db');

function start() {
  // 06:30 Asia/Bangkok, every day — before the 08:00 reminder check
  cron.schedule('30 6 * * *', runRecurringCheck, { timezone: 'Asia/Bangkok' });
  console.log('recurring-transactions cron scheduled: daily 06:30 Asia/Bangkok');
}

async function runRecurringCheck() {
  const { rows } = await pool.query(`
    SELECT * FROM finance.recurring_transactions
    WHERE active = true AND next_run_date <= CURRENT_DATE
  `);

  for (const r of rows) {
    try {
      await pool.query(
        `INSERT INTO finance.transactions (user_id, category_id, type, amount, occurred_at, note, source)
         VALUES ($1, $2, $3, $4, now(), $5, 'recurring')`,
        [r.user_id, r.category_id, r.type, r.amount, r.note]
      );

      const interval = r.frequency === 'daily' ? '1 day' : '1 month';
      await pool.query(
        `UPDATE finance.recurring_transactions
         SET next_run_date = next_run_date + $2::interval
         WHERE id = $1`,
        [r.id, interval]
      );
    } catch (err) {
      console.error('failed to run recurring transaction', r.id, err);
    }
  }
}

module.exports = { start, runRecurringCheck };
