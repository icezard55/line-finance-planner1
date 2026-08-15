const cron = require('node-cron');
const pool = require('../lib/db');
const { client } = require('../lib/line');

function start() {
  // 08:00 Asia/Bangkok, every day
  cron.schedule('0 8 * * *', runReminderCheck, { timezone: 'Asia/Bangkok' });
  console.log('reminder cron scheduled: daily 08:00 Asia/Bangkok');
}

async function runReminderCheck() {
  const { rows } = await pool.query(`
    SELECT * FROM finance.reminders
    WHERE status = 'pending'
      AND due_date - (notify_days_before || ' days')::interval <= now()
  `);

  for (const reminder of rows) {
    try {
      await client.pushMessage({
        to: reminder.user_id,
        messages: [
          {
            type: 'text',
            text: `แจ้งเตือน: ${reminder.title} ครบกำหนด ${formatDate(reminder.due_date)}`,
          },
        ],
      });

      if (reminder.repeat_cycle === 'once') {
        await pool.query(
          `UPDATE finance.reminders SET status = 'sent' WHERE id = $1`,
          [reminder.id]
        );
      } else {
        const interval = reminder.repeat_cycle === 'yearly' ? '1 year' : '1 month';
        await pool.query(
          `UPDATE finance.reminders
           SET due_date = due_date + $2::interval, status = 'pending'
           WHERE id = $1`,
          [reminder.id, interval]
        );
      }
    } catch (err) {
      console.error('failed to push reminder', reminder.id, err);
    }
  }
}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

module.exports = { start, runReminderCheck };
