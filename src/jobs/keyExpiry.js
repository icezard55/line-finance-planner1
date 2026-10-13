const cron = require('node-cron');
const { alertAdmin } = require('../lib/adminAlert');

// ANTHROPIC_KEY_EXPIRES=YYYY-MM-DD is set by hand when a key is created (the
// Console shows the date). From 7 days out the admin gets a daily LINE nudge
// until the date is updated -- an expired key silently breaks slip reading.
function start() {
  cron.schedule('0 9 * * *', checkKeyExpiry, { timezone: 'Asia/Bangkok' });
  console.log('anthropic key expiry check scheduled: daily 09:00 Asia/Bangkok');
}

async function checkKeyExpiry() {
  const raw = process.env.ANTHROPIC_KEY_EXPIRES;
  if (!raw) return;
  const expires = new Date(raw + 'T00:00:00+07:00');
  if (Number.isNaN(expires.getTime())) {
    console.error('ANTHROPIC_KEY_EXPIRES is not a valid YYYY-MM-DD date:', raw);
    return;
  }
  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000);
  if (daysLeft > 7) return;

  const text =
    daysLeft > 0
      ? `Anthropic API key จะหมดอายุในอีก ${daysLeft} วัน (${raw})\nสร้างคีย์ใหม่ที่ console.anthropic.com แล้วอัปเดต ANTHROPIC_API_KEY และ ANTHROPIC_KEY_EXPIRES ใน Railway ไม่งั้นระบบอ่านสลิปจะหยุดทำงาน`
      : `Anthropic API key หมดอายุแล้ว (${raw}) ระบบอ่านสลิปใช้ไม่ได้\nสร้างคีย์ใหม่ที่ console.anthropic.com แล้วอัปเดต ANTHROPIC_API_KEY และ ANTHROPIC_KEY_EXPIRES ใน Railway`;
  await alertAdmin('key-expiry', text, 20 * 60 * 60 * 1000);
}

module.exports = { start, checkKeyExpiry };
