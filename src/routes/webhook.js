const crypto = require('crypto');
const express = require('express');
const pool = require('../lib/db');
const { config, client, middleware } = require('../lib/line');
const { extractSlipData } = require('../lib/anthropic');
const { alertAdmin, isAnthropicAccountProblem } = require('../lib/adminAlert');
const { suggestFor } = require('../lib/suggest');

const router = express.Router();

// Quick-log shorthand: "-150 กาแฟ" -> expense, "+500 โบนัส" -> income, and the
// note is optional ("-67", "+50"). A bare number with no sign and no note is
// ignored so ordinary chat like "7" or "2026" never creates an entry.
// Anything that doesn't match is left alone (treated as an ordinary chat message).
const QUICK_LOG = /^([+-])?\s*(\d+(?:\.\d+)?)(?:\s+(.+))?$/;

if (config.channelSecret && config.channelAccessToken) {
  // Acknowledge immediately and work in the background. Reading a slip takes a
  // few seconds, LINE gives up on the request after ~2s and re-sends the event,
  // and a re-sent image would be read (and billed) a second time.
  router.post('/', middleware(config), (req, res) => {
    res.sendStatus(200);
    for (const event of req.body.events) {
      if (isDuplicateEvent(event)) continue;
      handleEvent(event).catch((err) => console.error('webhook event failed', err));
    }
  });
} else {
  // LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN not set yet — keep the server
  // bootable during local dev before the LINE Developers Console channel exists.
  router.post('/', (req, res) => {
    res.status(503).json({ error: 'LINE channel not configured — set LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN in .env' });
  });
}

// Sent when someone taps "วิธีใช้" on the rich menu (that button sends this text).
const HOW_TO_TEXT = [
  'วิธีใช้ Planเงิน plan ชีวิต',
  '',
  '1) พิมพ์บันทึกในแชท',
  '   -150 กาแฟ  = รายจ่าย',
  '   +500 โบนัส = รายรับ',
  '   แล้วเลือกหมวด/ช่องทางชำระเงิน กดยืนยัน',
  '',
  '2) ส่งรูปสลิป AI จะอ่านยอดให้ แล้วเลือกหมวด/ช่องทาง กดยืนยัน',
  '   ส่งหลายใบพร้อมกันได้ เลือกหมวด/ช่องทางครั้งเดียวทั้งชุด',
  '',
  '3) ปุ่มเมนูด้านล่าง: สรุป วิเคราะห์ รายการ และหมวดหมู่ (เพิ่ม/แก้ชื่อหมวดได้เอง)',
].join('\n');

// LINE can still deliver the same event twice (e.g. a retry racing the first ack).
const SEEN_EVENT_LIMIT = 2000;
const seenEvents = new Set();

function isDuplicateEvent(event) {
  const id = event.webhookEventId;
  if (!id) return false;
  if (seenEvents.has(id)) return true;
  seenEvents.add(id);
  if (seenEvents.size > SEEN_EVENT_LIMIT) seenEvents.delete(seenEvents.values().next().value);
  return false;
}

async function handleEvent(event) {
  if (event.type === 'postback') return handlePostback(event);
  if (event.type !== 'message') return;
  if (event.message.type === 'image') return handleImageMessage(event);
  if (event.message.type !== 'text') return;

  const text = event.message.text.trim();
  if (text === 'วิธีใช้') return replyText(event.replyToken, HOW_TO_TEXT);

  const match = text.match(QUICK_LOG);
  if (!match) return;

  const userId = event.source.userId;
  const [, sign, amountStr, note] = match;
  if (!sign && !note) return;
  const type = sign === '+' ? 'income' : 'expense';
  const amount = Number(amountStr);

  await pool.query(
    'INSERT INTO finance.users (line_user_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [userId]
  );

  // Typed entries go through the same confirm flow as slips: category, then
  // payment channel, then confirm. Nothing is saved to transactions until then.
  const { rows: [draft] } = await pool.query(
    `INSERT INTO finance.pending_slips (user_id, amount, note, type, source)
     VALUES ($1, $2, $3, $4, 'chat')
     RETURNING *`,
    [userId, amount, note || null, type]
  );

  // A merchant/note the user has filed before: pre-fill category and channel and
  // go straight to the confirm summary. Otherwise ask for the category as usual.
  const suggested = await applySuggestion(draft, userId);

  try {
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [suggested ? await slipSummaryMessage(suggested, { suggested: true }) : await categoryPickerMessage(draft, userId)],
    });
  } catch (err) {
    console.error('chat entry reply failed', err);
  }
}

// Returns the draft updated with a history-based category/channel, or null when
// there is nothing confident to suggest. Never throws: a failed suggestion must
// not break the normal flow.
async function applySuggestion(draft, userId) {
  try {
    const s = await suggestFor(userId, draft.note, draft.type);
    if (!s) return null;
    const { rows: [updated] } = await pool.query(
      'UPDATE finance.pending_slips SET category_id = $1, account_id = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [s.categoryId, s.accountId, draft.id, userId]
    );
    return updated || null;
  } catch (err) {
    console.error('suggestion failed', err);
    return null;
  }
}

const FREE_SLIP_MONTHLY_LIMIT = 5;

// Serialises slip reads per user: a batch of photos arrives as parallel events,
// and reading them one at a time keeps the monthly-quota check honest (they
// would otherwise all pass the check before any read is recorded).
const userLocks = new Map();

function withUserLock(userId, task) {
  const prev = userLocks.get(userId) || Promise.resolve();
  const run = prev.catch(() => {}).then(task);
  const tail = run.catch(() => {});
  userLocks.set(userId, tail);
  tail.then(() => {
    if (userLocks.get(userId) === tail) userLocks.delete(userId);
  });
  return run;
}

// Reads one slip photo into a pending draft. Returns { draft, suggested } on
// success or { failure: '<text for the user>' }. It never replies itself so the
// caller can answer once for a single photo, or once for a whole batch.
function processSlipImage(event, { batchId = null } = {}) {
  return withUserLock(event.source.userId, () => readSlipImage(event, batchId));
}

async function readSlipImage(event, batchId) {
  const userId = event.source.userId;

  await pool.query(
    'INSERT INTO finance.users (line_user_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [userId]
  );

  if (!process.env.ANTHROPIC_API_KEY) {
    return { failure: 'ยังไม่ได้ตั้งค่าระบบอ่านสลิป รบกวนพิมพ์บันทึกเองก่อนนะครับ เช่น -150 กาแฟ' };
  }

  const { rows: [user] } = await pool.query('SELECT plan FROM finance.users WHERE line_user_id = $1', [userId]);
  if (user.plan !== 'premium') {
    // Every successful read counts, confirmed or not -- the API cost is spent either way.
    const { rows: [{ count }] } = await pool.query(
      `SELECT count(*) FROM finance.slip_reads
       WHERE user_id = $1 AND created_at >= date_trunc('month', now())`,
      [userId]
    );
    if (Number(count) >= FREE_SLIP_MONTHLY_LIMIT) {
      return {
        failure: `เดือนนี้ใช้โควตาอ่านสลิปฟรีครบ ${FREE_SLIP_MONTHLY_LIMIT} รายการแล้วครับ\nพิมพ์บันทึกเองได้ไม่จำกัด เช่น -150 กาแฟ\nหรือติดต่อแอดมินเพื่ออัปเกรดเป็นพรีเมียม (อ่านสลิปไม่จำกัด)`,
      };
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
    return { failure: 'ดาวน์โหลดรูปไม่สำเร็จ ลองส่งใหม่อีกครั้งนะครับ' };
  }

  let extracted;
  try {
    extracted = await extractSlipData(imageBase64);
  } catch (err) {
    console.error('slip extraction failed', err);
    if (isAnthropicAccountProblem(err)) {
      const reason = err.status === 400 ? 'เครดิต Anthropic หมด' : 'API key ใช้ไม่ได้หรือหมดอายุ';
      alertAdmin(
        'anthropic-account',
        `ระบบอ่านสลิปหยุดทำงาน: ${reason} (Anthropic ตอบ ${err.status})\nแก้ที่ console.anthropic.com แล้วอัปเดต ANTHROPIC_API_KEY ใน Railway`
      ).catch(() => {});
    }
    return { failure: 'อ่านสลิปไม่สำเร็จ รบกวนพิมพ์บันทึกเองแทนนะครับ เช่น -150 กาแฟ' };
  }

  // The API call went through, so this read counts toward the monthly quota.
  await pool.query('INSERT INTO finance.slip_reads (user_id) VALUES ($1)', [userId]);

  if (extracted.amount === null) {
    return { failure: 'อ่านจำนวนเงินในสลิปไม่ชัดเจน รบกวนพิมพ์บันทึกเองแทนนะครับ เช่น -150 กาแฟ' };
  }

  const { rows } = await pool.query(
    `INSERT INTO finance.pending_slips (user_id, amount, occurred_at, note, type, batch_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, extracted.amount, extracted.occurred_at, extracted.note, extracted.type, batchId]
  );
  const draft = rows[0];
  const suggested = await applySuggestion(draft, userId);
  return { draft: suggested || draft, suggested: Boolean(suggested) };
}

async function handleImageMessage(event) {
  const set = event.message.imageSet;
  if (set && set.total > 1) return handleImageInBatch(event, set);

  const result = await processSlipImage(event);
  if (result.failure) return replyText(event.replyToken, result.failure);

  await replyOrPush(event.replyToken, event.source.userId, await slipSummaryMessage(result.draft, { suggested: result.suggested }));
}

// Several photos sent together arrive as separate events sharing imageSet.id.
// Each is read into a draft tagged with one batch id; when the last one is done,
// a single summary goes out (one category/channel choice then covers them all).
const BATCH_TTL_MS = 5 * 60 * 1000;
const batches = new Map();

async function handleImageInBatch(event, set) {
  const userId = event.source.userId;
  const key = `${userId}:${set.id}`;
  let batch = batches.get(key);
  if (!batch) {
    batch = { batchId: crypto.randomUUID(), total: set.total, finished: 0, failures: [], results: [] };
    batches.set(key, batch);
    setTimeout(() => batches.delete(key), BATCH_TTL_MS).unref();
  }

  const result = await processSlipImage(event, { batchId: batch.batchId });
  if (result.failure) batch.failures.push(result.failure);
  else batch.results.push(result);
  batch.finished += 1;
  if (batch.finished < batch.total) return;

  batches.delete(key);
  if (!batch.results.length) return replyText(event.replyToken, batch.failures[0]);
  const message = await batchSummaryMessage(batch.batchId, userId, {
    failures: batch.failures.length,
    suggested: batch.results.some((r) => r.suggested),
  });
  await replyOrPush(event.replyToken, userId, message);
}

function buildSlipSummary(draft, categoryName, accountName, suggested) {
  const sign = draft.type === 'income' ? '+' : '-';
  const lines = [`${draft.source === 'chat' ? 'รายการ' : 'อ่านได้'}: ${sign}${Number(draft.amount).toLocaleString('th-TH')} บาท${draft.note ? ` (${draft.note})` : ''}`];
  if (draft.occurred_at) lines.push(`วันที่: ${String(draft.occurred_at).slice(0, 10)}`);
  lines.push(`หมวด: ${categoryName || 'ไม่ระบุ'}`);
  lines.push(`ช่องทาง: ${accountName || 'ไม่ระบุ'}`);
  if (suggested) lines.push('', 'เลือกให้จากรายการที่เคยบันทึก ถ้าไม่ใช่ กดเปลี่ยนหมวด/ช่องทางได้');
  lines.push('', 'ยืนยันบันทึกไหมครับ?');
  return lines.join('\n');
}

async function slipSummaryMessage(draft, { suggested = false } = {}) {
  const [cat, acct] = await Promise.all([
    draft.category_id ? pool.query('SELECT name FROM finance.categories WHERE id = $1', [draft.category_id]) : null,
    draft.account_id ? pool.query('SELECT account_name FROM finance.accounts WHERE id = $1', [draft.account_id]) : null,
  ]);
  const categoryName = cat && cat.rows[0] && cat.rows[0].name;
  const accountName = acct && acct.rows[0] && acct.rows[0].account_name;
  return {
    type: 'text',
    text: buildSlipSummary(draft, categoryName, accountName, suggested),
    quickReply: buildSlipQuickReply(draft, Boolean(categoryName), Boolean(accountName)),
  };
}

// Quick-reply category picker for `type`; each button's postback data is
// `${dataPrefix}:${categoryId}` (or `:none`). Used for single drafts and batches.
async function buildCategoryPicker(userId, type, head, dataPrefix) {
  const { rows: categories } = await pool.query(
    `SELECT c.id, c.name,
            (SELECT max(t.created_at) FROM finance.transactions t WHERE t.category_id = c.id AND t.user_id = c.user_id) AS last_used
     FROM finance.categories c
     WHERE c.user_id = $1 AND c.type = $2
     ORDER BY last_used DESC NULLS LAST, c.name ASC
     LIMIT $3`,
    [userId, type, CATEGORY_PICKER_LIMIT]
  );

  const items = categories.map((c) => ({
    type: 'action',
    action: {
      type: 'postback',
      label: c.name.length > 20 ? c.name.slice(0, 19) + '…' : c.name,
      data: `${dataPrefix}:${c.id}`,
      displayText: c.name,
    },
  }));
  items.push({
    type: 'action',
    action: { type: 'postback', label: 'ไม่ระบุหมวด', data: `${dataPrefix}:none`, displayText: 'ไม่ระบุหมวด' },
  });
  return { type: 'text', text: `${head}\nเลือกหมวดครับ`, quickReply: { items } };
}

function categoryPickerMessage(draft, userId) {
  const sign = draft.type === 'income' ? '+' : '-';
  const head = `${sign}${Number(draft.amount).toLocaleString('th-TH')} บาท${draft.note ? ` (${draft.note})` : ''}`;
  return buildCategoryPicker(userId, draft.type, head, `set_category:${draft.id}`);
}

async function buildAccountPicker(userId, dataPrefix) {
  const { rows: accounts } = await pool.query(
    `SELECT a.id, a.account_name,
            (SELECT max(t.created_at) FROM finance.transactions t WHERE t.account_id = a.id AND t.user_id = a.user_id) AS last_used
     FROM finance.accounts a
     WHERE a.user_id = $1
     ORDER BY last_used DESC NULLS LAST, a.account_name ASC
     LIMIT $2`,
    [userId, CATEGORY_PICKER_LIMIT]
  );
  const items = accounts.map((a) => ({
    type: 'action',
    action: {
      type: 'postback',
      label: a.account_name.length > 20 ? a.account_name.slice(0, 19) + '…' : a.account_name,
      data: `${dataPrefix}:${a.id}`,
      displayText: a.account_name,
    },
  }));
  items.push({
    type: 'action',
    action: { type: 'postback', label: 'ไม่ระบุช่องทาง', data: `${dataPrefix}:none`, displayText: 'ไม่ระบุช่องทาง' },
  });
  return { type: 'text', text: 'จ่าย/รับผ่านช่องทางไหนครับ?', quickReply: { items } };
}

function accountPickerMessage(draft, userId) {
  return buildAccountPicker(userId, `set_account:${draft.id}`);
}

// ---- batches (several slip photos sent together) ----

const money = (n) => Number(n).toLocaleString('th-TH');

async function batchSummaryMessage(batchId, userId, { failures = 0, suggested = false } = {}) {
  const { rows: drafts } = await pool.query(
    'SELECT * FROM finance.pending_slips WHERE batch_id = $1 AND user_id = $2 ORDER BY created_at, id',
    [batchId, userId]
  );
  if (!drafts.length) return { type: 'text', text: 'รายการชุดนี้ถูกยืนยันหรือยกเลิกไปแล้ว' };

  const [cats, accts] = await Promise.all([
    pool.query('SELECT id, name FROM finance.categories WHERE user_id = $1', [userId]),
    pool.query('SELECT id, account_name FROM finance.accounts WHERE user_id = $1', [userId]),
  ]);
  const catName = new Map(cats.rows.map((r) => [r.id, r.name]));
  const acctName = new Map(accts.rows.map((r) => [r.id, r.account_name]));

  const total = drafts.reduce((s, d) => s + (d.type === 'income' ? 1 : -1) * Number(d.amount), 0);
  const lines = [`อ่านสลิปได้ ${drafts.length} ใบ รวม ${total < 0 ? '-' : '+'}${money(Math.abs(total))} บาท`, ''];
  drafts.forEach((d, i) => {
    lines.push(`${i + 1}) ${d.type === 'income' ? '+' : '-'}${money(d.amount)}${d.note ? ` ${d.note}` : ''}`);
    lines.push(`    ${catName.get(d.category_id) || 'ไม่ระบุหมวด'} · ${acctName.get(d.account_id) || 'ไม่ระบุช่องทาง'}`);
  });
  if (failures) lines.push('', `อ่านไม่ได้อีก ${failures} ใบ (พิมพ์บันทึกเองแทนได้)`);
  if (suggested) lines.push('', 'บางรายการเลือกหมวด/ช่องทางให้จากที่เคยบันทึก');
  lines.push('', 'ยืนยันบันทึกทั้งหมดไหมครับ? (ถ้าบางใบไม่ถูก ยกเลิกแล้วส่งใบนั้นแยก)');

  const act = (label, data) => ({ type: 'action', action: { type: 'postback', label, data, displayText: label } });
  return {
    type: 'text',
    text: lines.join('\n'),
    quickReply: {
      items: [
        act('ยืนยันทั้งหมด', `confirm_batch:${batchId}`),
        act('เลือกหมวดทั้งชุด', `pick_category_batch:${batchId}`),
        act('เลือกช่องทางทั้งชุด', `pick_account_batch:${batchId}`),
        act('ยกเลิกทั้งหมด', `cancel_batch:${batchId}`),
      ],
    },
  };
}

async function handleBatchPostback(event, action, batchId, extra) {
  const userId = event.source.userId;
  const send = (message) => client.replyMessage({ replyToken: event.replyToken, messages: [message] }).catch((err) => console.error('batch reply failed', err));
  const gone = () => replyText(event.replyToken, 'รายการชุดนี้ถูกยืนยันหรือยกเลิกไปแล้ว');

  if (action === 'cancel_batch') {
    const { rowCount } = await pool.query('DELETE FROM finance.pending_slips WHERE batch_id = $1 AND user_id = $2', [batchId, userId]);
    return rowCount ? replyText(event.replyToken, `ยกเลิกทั้งหมดแล้ว ${rowCount} รายการ`) : gone();
  }

  if (action === 'confirm_batch') {
    // One statement: moves the drafts into transactions and removes them, so a
    // double tap cannot save the batch twice.
    const { rows } = await pool.query(
      `WITH moved AS (
         DELETE FROM finance.pending_slips WHERE batch_id = $1 AND user_id = $2 RETURNING *
       )
       INSERT INTO finance.transactions (user_id, type, amount, occurred_at, note, source, category_id, account_id)
       SELECT user_id, type, amount, COALESCE(occurred_at, now()), note, source, category_id, account_id FROM moved
       RETURNING type, amount`,
      [batchId, userId]
    );
    if (!rows.length) return gone();
    const total = rows.reduce((s, r) => s + (r.type === 'income' ? 1 : -1) * Number(r.amount), 0);
    return replyText(event.replyToken, `บันทึกแล้ว ${rows.length} รายการ รวม ${total < 0 ? '-' : '+'}${money(Math.abs(total))} บาท`);
  }

  const { rows: drafts } = await pool.query('SELECT type FROM finance.pending_slips WHERE batch_id = $1 AND user_id = $2', [batchId, userId]);
  if (!drafts.length) return gone();

  if (action === 'pick_category_batch') {
    // The picker lists one type's categories; use whichever type most of the batch is.
    const incomeCount = drafts.filter((d) => d.type === 'income').length;
    const type = incomeCount > drafts.length / 2 ? 'income' : 'expense';
    return send(await buildCategoryPicker(userId, type, `ทั้งชุด ${drafts.length} รายการ`, `set_category_batch:${batchId}`));
  }

  if (action === 'set_category_batch') {
    if (extra === 'none') {
      await pool.query('UPDATE finance.pending_slips SET category_id = NULL WHERE batch_id = $1 AND user_id = $2', [batchId, userId]);
    } else {
      // Only drafts of the category's own type take it (a mixed batch keeps the rest as they were).
      await pool.query(
        `UPDATE finance.pending_slips p SET category_id = c.id
         FROM finance.categories c
         WHERE c.id = $3 AND c.user_id = $2 AND p.batch_id = $1 AND p.user_id = $2 AND p.type = c.type`,
        [batchId, userId, extra]
      );
    }
    const { rows: [{ missing }] } = await pool.query(
      'SELECT count(*) FILTER (WHERE account_id IS NULL) AS missing FROM finance.pending_slips WHERE batch_id = $1 AND user_id = $2',
      [batchId, userId]
    );
    if (Number(missing) > 0) return send(await buildAccountPicker(userId, `set_account_batch:${batchId}`));
    return send(await batchSummaryMessage(batchId, userId));
  }

  if (action === 'pick_account_batch') return send(await buildAccountPicker(userId, `set_account_batch:${batchId}`));

  if (action === 'set_account_batch') {
    await pool.query('UPDATE finance.pending_slips SET account_id = $3 WHERE batch_id = $1 AND user_id = $2', [
      batchId,
      userId,
      extra === 'none' ? null : extra,
    ]);
    return send(await batchSummaryMessage(batchId, userId));
  }
}

// Reply with the one-time reply token; if that has expired (a long batch), push instead.
async function replyOrPush(replyToken, userId, message) {
  try {
    await client.replyMessage({ replyToken, messages: [message] });
  } catch (err) {
    console.error('reply failed, falling back to push', err.message);
    await client.pushMessage({ to: userId, messages: [message] }).catch((e) => console.error('push fallback failed', e.message));
  }
}

function buildSlipQuickReply(draft, hasCategory, hasAccount) {
  const toggleLabel = draft.type === 'income' ? 'เปลี่ยนเป็นรายจ่าย' : 'เปลี่ยนเป็นรายรับ';
  return {
    items: [
      { type: 'action', action: { type: 'postback', label: 'ยืนยัน', data: `confirm_slip:${draft.id}`, displayText: 'ยืนยัน' } },
      { type: 'action', action: { type: 'postback', label: toggleLabel, data: `toggle_type:${draft.id}`, displayText: toggleLabel } },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: hasCategory ? 'เปลี่ยนหมวด' : 'เลือกหมวด',
          data: `pick_category:${draft.id}`,
          displayText: hasCategory ? 'เปลี่ยนหมวด' : 'เลือกหมวด',
        },
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: hasAccount ? 'เปลี่ยนช่องทาง' : 'เลือกช่องทาง',
          data: `pick_account:${draft.id}`,
          displayText: hasAccount ? 'เปลี่ยนช่องทาง' : 'เลือกช่องทาง',
        },
      },
      { type: 'action', action: { type: 'postback', label: 'ยกเลิก', data: `cancel_slip:${draft.id}`, displayText: 'ยกเลิก' } },
    ],
  };
}

// LINE quick-reply caps: 13 items total, 20-char labels.
const CATEGORY_PICKER_LIMIT = 12;

async function handlePostback(event) {
  const data = event.postback.data || '';
  const [action, pendingId, extra] = data.split(':');
  if (!pendingId) return;

  const userId = event.source.userId;

  if (action.endsWith('_batch')) return handleBatchPostback(event, action, pendingId, extra);

  if (action === 'cancel_slip') {
    await pool.query('DELETE FROM finance.pending_slips WHERE id = $1 AND user_id = $2', [pendingId, userId]);
    return replyText(event.replyToken, 'ยกเลิกแล้วครับ');
  }

  if (action === 'pick_category') {
    const { rows: [draft] } = await pool.query(
      'SELECT * FROM finance.pending_slips WHERE id = $1 AND user_id = $2',
      [pendingId, userId]
    );
    if (!draft) return replyText(event.replyToken, 'รายการนี้ถูกยืนยันหรือยกเลิกไปแล้ว');

    return client
      .replyMessage({ replyToken: event.replyToken, messages: [await categoryPickerMessage(draft, userId)] })
      .catch((err) => console.error('category picker reply failed', err));
  }

  if (action === 'set_category') {
    const categoryId = extra === 'none' ? null : extra;
    const { rows: [draft] } = await pool.query(
      'UPDATE finance.pending_slips SET category_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [categoryId, pendingId, userId]
    );
    if (!draft) return replyText(event.replyToken, 'รายการนี้ถูกยืนยันหรือยกเลิกไปแล้ว');

    // Right after a category is picked, ask for the payment channel too (unless
    // one is already set -- e.g. the user is only changing the category).
    const next = draft.account_id ? await slipSummaryMessage(draft) : await accountPickerMessage(draft, userId);
    return client
      .replyMessage({ replyToken: event.replyToken, messages: [next] })
      .catch((err) => console.error('slip reply failed', err));
  }

  if (action === 'pick_account') {
    const { rows: [draft] } = await pool.query(
      'SELECT * FROM finance.pending_slips WHERE id = $1 AND user_id = $2',
      [pendingId, userId]
    );
    if (!draft) return replyText(event.replyToken, 'รายการนี้ถูกยืนยันหรือยกเลิกไปแล้ว');
    return client
      .replyMessage({ replyToken: event.replyToken, messages: [await accountPickerMessage(draft, userId)] })
      .catch((err) => console.error('account picker reply failed', err));
  }

  if (action === 'set_account') {
    const accountId = extra === 'none' ? null : extra;
    const { rows: [draft] } = await pool.query(
      'UPDATE finance.pending_slips SET account_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [accountId, pendingId, userId]
    );
    if (!draft) return replyText(event.replyToken, 'รายการนี้ถูกยืนยันหรือยกเลิกไปแล้ว');
    return client
      .replyMessage({ replyToken: event.replyToken, messages: [await slipSummaryMessage(draft)] })
      .catch((err) => console.error('slip summary reply failed', err));
  }

  if (action === 'toggle_type') {
    // Categories are type-specific, so a leftover category_id from the old type
    // would silently mislabel the transaction -- clear it on every toggle.
    const { rows: [draft] } = await pool.query(
      `UPDATE finance.pending_slips
       SET type = CASE WHEN type = 'income' THEN 'expense' ELSE 'income' END, category_id = NULL
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [pendingId, userId]
    );
    if (!draft) return replyText(event.replyToken, 'รายการนี้ถูกยืนยันหรือยกเลิกไปแล้ว');

    return client
      .replyMessage({
        replyToken: event.replyToken,
        messages: [await slipSummaryMessage(draft)],
      })
      .catch((err) => console.error('slip summary reply failed', err));
  }

  if (action !== 'confirm_slip') return;

  const { rows } = await pool.query(
    'SELECT * FROM finance.pending_slips WHERE id = $1 AND user_id = $2',
    [pendingId, userId]
  );
  const draft = rows[0];
  if (!draft) {
    return replyText(event.replyToken, 'รายการนี้ถูกยืนยันหรือยกเลิกไปแล้ว');
  }

  await pool.query(
    `INSERT INTO finance.transactions (user_id, type, amount, occurred_at, note, source, category_id, account_id)
     VALUES ($1, $2, $3, COALESCE($4, now()), $5, $6, $7, $8)`,
    [userId, draft.type, draft.amount, draft.occurred_at, draft.note, draft.source, draft.category_id, draft.account_id]
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
