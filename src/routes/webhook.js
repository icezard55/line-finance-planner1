const express = require('express');
const pool = require('../lib/db');
const { config, client, middleware } = require('../lib/line');
const { extractSlipData } = require('../lib/anthropic');

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
  if (event.type === 'postback') return handlePostback(event);
  if (event.type !== 'message') return;
  if (event.message.type === 'image') return handleImageMessage(event);
  if (event.message.type !== 'text') return;

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

const FREE_SLIP_MONTHLY_LIMIT = 5;

async function handleImageMessage(event) {
  const userId = event.source.userId;

  await pool.query(
    'INSERT INTO finance.users (line_user_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [userId]
  );

  if (!process.env.ANTHROPIC_API_KEY) {
    return replyText(event.replyToken, 'ยังไม่ได้ตั้งค่าระบบอ่านสลิป รบกวนพิมพ์บันทึกเองก่อนนะครับ เช่น -150 กาแฟ');
  }

  const { rows: [user] } = await pool.query('SELECT plan FROM finance.users WHERE line_user_id = $1', [userId]);
  if (user.plan !== 'premium') {
    const { rows: [{ count }] } = await pool.query(
      `SELECT count(*) FROM finance.transactions
       WHERE user_id = $1 AND source = 'slip' AND created_at >= date_trunc('month', now())`,
      [userId]
    );
    if (Number(count) >= FREE_SLIP_MONTHLY_LIMIT) {
      return replyText(
        event.replyToken,
        `เดือนนี้ใช้โควตาอ่านสลิปฟรีครบ ${FREE_SLIP_MONTHLY_LIMIT} รายการแล้วครับ\nพิมพ์บันทึกเองได้ไม่จำกัด เช่น -150 กาแฟ\nหรือติดต่อแอดมินเพื่ออัปเกรดเป็นพรีเมียม (อ่านสลิปไม่จำกัด)`
      );
    }
  }

  let imageBase64;
  try {
    const contentRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
      headers: { Authorization: 'Bearer ' + config.channelAccessToken },
    });
    if (!contentRes.ok) throw new Error(`download failed: ${contentRes.status}`);
    const buf = Buffer.from(await contentRes.arrayBuffer());
    imageBase64 = buf.toString('base64');
  } catch (err) {
    console.error('slip image download failed', err);
    return replyText(event.replyToken, 'ดาวน์โหลดรูปไม่สำเร็จ ลองส่งใหม่อีกครั้งนะครับ');
  }

  let extracted;
  try {
    extracted = await extractSlipData(imageBase64);
  } catch (err) {
    console.error('slip extraction failed', err);
    return replyText(event.replyToken, 'อ่านสลิปไม่สำเร็จ รบกวนพิมพ์บันทึกเองแทนนะครับ เช่น -150 กาแฟ');
  }

  if (extracted.amount === null) {
    return replyText(event.replyToken, 'อ่านจำนวนเงินในสลิปไม่ชัดเจน รบกวนพิมพ์บันทึกเองแทนนะครับ เช่น -150 กาแฟ');
  }

  const { rows } = await pool.query(
    `INSERT INTO finance.pending_slips (user_id, amount, occurred_at, note, type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, extracted.amount, extracted.occurred_at, extracted.note, extracted.type]
  );
  const pendingId = rows[0].id;

  const sign = extracted.type === 'income' ? '+' : '-';
  const summary = `อ่านได้: ${sign}${extracted.amount.toLocaleString('th-TH')} บาท${extracted.note ? ` (${extracted.note})` : ''}${extracted.occurred_at ? `\nวันที่: ${extracted.occurred_at}` : ''}\n\nยืนยันบันทึกไหมครับ?`;

  try {
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: 'text',
          text: summary,
          quickReply: {
            items: [
              {
                type: 'action',
                action: { type: 'postback', label: 'ยืนยัน', data: `confirm_slip:${pendingId}`, displayText: 'ยืนยัน' },
              },
              {
                type: 'action',
                action: { type: 'postback', label: 'ยกเลิก', data: `cancel_slip:${pendingId}`, displayText: 'ยกเลิก' },
              },
            ],
          },
        },
      ],
    });
  } catch (err) {
    console.error('slip summary reply failed', err);
  }
}

async function handlePostback(event) {
  const [action, pendingId] = (event.postback.data || '').split(':');
  if (!pendingId || (action !== 'confirm_slip' && action !== 'cancel_slip')) return;

  const userId = event.source.userId;

  if (action === 'cancel_slip') {
    await pool.query('DELETE FROM finance.pending_slips WHERE id = $1 AND user_id = $2', [pendingId, userId]);
    return replyText(event.replyToken, 'ยกเลิกแล้วครับ');
  }

  const { rows } = await pool.query(
    'SELECT * FROM finance.pending_slips WHERE id = $1 AND user_id = $2',
    [pendingId, userId]
  );
  const draft = rows[0];
  if (!draft) {
    return replyText(event.replyToken, 'รายการนี้ถูกยืนยันหรือยกเลิกไปแล้ว');
  }

  await pool.query(
    `INSERT INTO finance.transactions (user_id, type, amount, occurred_at, note, source)
     VALUES ($1, $2, $3, COALESCE($4, now()), $5, 'slip')`,
    [userId, draft.type, draft.amount, draft.occurred_at, draft.note]
  );
  await pool.query('DELETE FROM finance.pending_slips WHERE id = $1', [pendingId]);

  const sign = draft.type === 'income' ? '+' : '-';
  return replyText(event.replyToken, `บันทึกแล้ว: ${sign}${Number(draft.amount).toLocaleString('th-TH')} บาท${draft.note ? ` (${draft.note})` : ''}`);
}

async function replyText(replyToken, text) {
  try {
    await client.replyMessage({ replyToken, messages: [{ type: 'text', text }] });
  } catch (err) {
    console.error('reply failed', err);
  }
}

module.exports = router;
