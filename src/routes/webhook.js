const express = require('express');
const pool = require('../lib/db');
const { config, client, middleware } = require('../lib/line');

const router = express.Router();

// Quick-log shorthand: "-150 กาแฟ" -> expense, "+500 โบนัส" -> income.
// Anything that doesn't match is left alone (treated as an ordinary chat message).
const QUICK_LOG = /^([+-])?\s*(\d+(?:\.\d+)?)\s+(.+)$/;

if (config.channelSecret && config.channelAccessToken) {
  router.post('/', middleware(config), async (req, res) => {
    try {
      await Promise.all(req.body.events.map(handleEvent));
      res.sendStatus(200);
    } catch (err) {
      console.error('webhook handling failed', err);
      res.sendStatus(500);
    }
  });
} else {
  // LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN not set yet — keep the server
  // bootable during local dev before the LINE Developers Console channel exists.
  router.post('/', (req, res) => {
    res.status(503).json({ error: 'LINE channel not configured — set LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN in .env' });
  });
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const match = event.message.text.trim().match(QUICK_LOG);
  if (!match) return;

  const userId = event.source.userId;
  const [, sign, amountStr, note] = match;
  const type = sign === '+' ? 'income' : 'expense';
  const amount = Number(amountStr);

  await pool.query(
    'INSERT INTO finance.users (line_user_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [userId]
  );
  await pool.query(
    `INSERT INTO finance.transactions (user_id, type, amount, note, source)
     VALUES ($1, $2, $3, $4, 'chat')`,
    [userId, type, amount, note]
  );

  // The transaction is already saved at this point — a reply failure (e.g. an
  // expired reply token because we were slow) must not turn into a 500, or LINE
  // will retry the whole webhook and insert this transaction a second time.
  try {
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: `บันทึกแล้ว: ${type === 'expense' ? '-' : '+'}${amount.toLocaleString('th-TH')} บาท (${note})`,
        },
      ],
    });
  } catch (err) {
    console.error('reply failed (transaction was still saved)', err);
  }
}

module.exports = router;
