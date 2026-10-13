const cron = require('node-cron');
const pool = require('../lib/db');

// Unconfirmed entries (typed "-67" and never finished, slips never confirmed,
// abandoned batches) sit in finance.pending_slips. They are only drafts, so
// anything older than a day is dropped; tapping an old button then gets the
// usual "already confirmed or cancelled" reply.
const MAX_AGE = '1 day';

function start() {
  cron.schedule('30 3 * * *', runCleanup, { timezone: 'Asia/Bangkok' });
  console.log('draft cleanup scheduled: daily 03:30 Asia/Bangkok');
}

async function runCleanup() {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM finance.pending_slips WHERE created_at < now() - $1::interval`,
      [MAX_AGE]
    );
    if (rowCount) console.log(`draft cleanup removed ${rowCount} stale pending entries`);
    return rowCount;
  } catch (err) {
    console.error('draft cleanup failed', err);
    return 0;
  }
}

module.exports = { start, runCleanup };
