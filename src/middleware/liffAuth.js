const pool = require('../lib/db');
const { verifyIdToken } = require('../lib/line');

// Verifies the LIFF ID token sent as `Authorization: Bearer <idToken>`,
// then auto-provisions/updates the finance.users row for that person.
module.exports = async function liffAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ error: 'missing bearer id token' });
    }

    const profile = await verifyIdToken(idToken);
    req.lineUserId = profile.sub;

    const { rows } = await pool.query(
      `INSERT INTO finance.users (line_user_id, display_name, picture_url, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (line_user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         picture_url = EXCLUDED.picture_url
       RETURNING (xmax = 0) AS inserted`,
      [profile.sub, profile.name || null, profile.picture || null, profile.email || null]
    );

    if (rows[0].inserted) {
      await seedDefaults(profile.sub);
    }

    next();
  } catch (err) {
    console.error('liffAuth failed:', err.message);
    res.status(401).json({ error: 'unauthorized' });
  }
};

// New users start with no categories/payment methods at all, which leaves every
// dropdown in the app empty on first use. Seed the standard starter set so the
// app is usable immediately — the user can rename/delete/add to these freely.
async function seedDefaults(userId) {
  await pool.query(
    `INSERT INTO finance.accounts (user_id, account_name, account_type) VALUES
       ($1, 'เงินสด', 'cash'),
       ($1, 'เงินโอน', 'bank'),
       ($1, 'ทรูวอเลต', 'e-wallet'),
       ($1, 'บัตรเครดิต', 'credit'),
       ($1, 'อื่นๆ', 'other'),
       ($1, 'กรุงเทพ', 'bank'),
       ($1, 'กสิกรไทย', 'bank'),
       ($1, 'ออมสิน', 'bank'),
       ($1, 'กรุงไทย', 'bank'),
       ($1, 'กรุงศรี', 'bank'),
       ($1, 'ธกส', 'bank')`,
    [userId]
  );
  await pool.query(
    `INSERT INTO finance.categories (user_id, name, type) VALUES
       ($1, 'เงินเดือน', 'income'),
       ($1, 'รายได้ค่าคอม', 'income'),
       ($1, 'อาหาร(ซื้อ)', 'expense'),
       ($1, 'อาหาร(วัตถุดิบ)', 'expense'),
       ($1, 'ของหวาน(น้ำหวาน)', 'expense'),
       ($1, 'ค่าเดินทาง(น้ำมัน)', 'expense'),
       ($1, 'ค่าเดินทาง(ชาร์จไฟ)', 'expense'),
       ($1, 'ค่าเทอม', 'expense'),
       ($1, 'ค่าเรียนพิเศษ', 'expense'),
       ($1, 'ค่าไฟ', 'expense'),
       ($1, 'ค่าน้ำ', 'expense'),
       ($1, 'ท่องเที่ยว', 'expense'),
       ($1, 'หวย', 'expense'),
       ($1, 'สลาก', 'expense'),
       ($1, 'เงินฝาก', 'expense'),
       ($1, 'หุ้น', 'expense'),
       ($1, 'ประกัน', 'expense'),
       ($1, 'ลงทุนค่าเงิน', 'expense'),
       ($1, 'ทองคำ', 'expense'),
       ($1, 'หนังสือ', 'expense'),
       ($1, 'อุปกรณ์ไอที', 'expense'),
       ($1, 'ของขวัญ', 'expense')`,
    [userId]
  );
}
