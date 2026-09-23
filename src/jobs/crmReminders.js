const cron = require('node-cron');
const pool = require('../lib/db');
const { client } = require('../lib/line');

// Premium/birthday reminders created by finance-crm (06:00 daily) for customers
// who linked their LINE and opted into reminders. claim_line_reminders() marks
// each task done and logs it; a failed push hands the task back to the agent.
function start() {
  cron.schedule('30 8 * * *', runCrmReminders, { timezone: 'Asia/Bangkok' });
  console.log('crm reminder cron scheduled: daily 08:30 Asia/Bangkok');
}

async function runCrmReminders() {
  let rows;
  try {
    ({ rows } = await pool.query('SELECT * FROM crm_bridge.claim_line_reminders()'));
  } catch (err) {
    console.error('claim_line_reminders failed', err);
    return;
  }

  for (const r of rows) {
    try {
      await client.pushMessage({ to: r.line_user_id, messages: [{ type: 'text', text: r.message }] });
    } catch (err) {
      console.error('crm reminder push failed', r.task_id, err.message);
      await pool
        .query('SELECT crm_bridge.unclaim_line_reminder($1)', [r.task_id])
        .catch((e) => console.error('unclaim failed', r.task_id, e.message));
    }
  }
  if (rows.length) console.log(`crm reminders pushed: ${rows.length}`);
}

module.exports = { start, runCrmReminders };
