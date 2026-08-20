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
// dropdown in the app empty on first use. Seed a generic starter set so the app
// is usable immediately — the user can rename/delete/add to these freely.
async function seedDefaults(userId) {
  await pool.query(
    `INSERT INTO finance.accounts (user_id, account_name, account_type) VALUES
       ($1, 'เงินสด', 'cash'),
       ($1, 'เงินโอน', 'bank'),
       ($1, 'ทรูวอเลต', 'e-wallet'),
       ($1, 'บัตรเครดิต', 'credit'),
       ($1, 'อื่นๆ', 'other')`,
    [userId]
  );
  await pool.query(
    `INSERT INTO finance.categories (user_id, name, type) VALUES
       ($1, 'เงินเดือน', 'income'),
       ($1, 'รายได้เสริม', 'income'),
       ($1, 'อาหาร', 'expense'),
       ($1, 'เดินทาง', 'expense'),
       ($1, 'ที่พัก', 'expense'),
       ($1, 'ช้อปปิ้ง', 'expense'),
       ($1, 'บันเทิง', 'expense'),
       ($1, 'สุขภาพ', 'expense'),
       ($1, 'ค่าโทรศัพท์/อินเทอร์เน็ต', 'expense'),
       ($1, 'อื่นๆ', 'expense')`,
    [userId]
  );
}
