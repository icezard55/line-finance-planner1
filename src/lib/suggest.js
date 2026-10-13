const pool = require('./db');

// Suggests a category and payment channel for a new entry from what this user
// chose for similar notes before. Done in JS (not pg_trgm) so it needs no
// database extension; one user's history is small enough to scan.
const HISTORY_LIMIT = 400;
const MIN_SIMILARITY = 0.55;
const MIN_AGREEMENT = Number(process.env.SUGGEST_MIN_AGREEMENT || 0.7);

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s()[\]{}.,:;\-_/\\|'"!?]+/g, '');
}

function bigrams(s) {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

// Dice coefficient over character bigrams: works for Thai (no word spaces).
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [g, n] of A) overlap += Math.min(n, B.get(g) || 0);
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

// Pure scoring step (exported for tests): history rows are
// { note, category_id, account_id } newest first.
function pickSuggestion(note, history) {
  const target = normalize(note);
  if (target.length < 2) return null;

  const catScore = new Map();
  const matches = [];
  history.forEach((h, i) => {
    const sim = similarity(target, normalize(h.note));
    if (sim < MIN_SIMILARITY) return;
    // Newer entries count a little more, so a changed habit wins over time.
    const weight = sim * (1 + 0.5 * (1 - i / history.length));
    catScore.set(h.category_id, (catScore.get(h.category_id) || 0) + weight);
    matches.push(h);
  });
  if (!catScore.size) return null;

  const ranked = [...catScore.entries()].sort((a, b) => b[1] - a[1]);
  const [categoryId, topScore] = ranked[0];
  const total = ranked.reduce((sum, [, v]) => sum + v, 0);
  // Mixed history for this merchant (user filed it under several categories): don't guess.
  if (topScore / total < MIN_AGREEMENT) return null;

  const acctCount = new Map();
  for (const h of matches) {
    if (h.category_id !== categoryId || !h.account_id) continue;
    acctCount.set(h.account_id, (acctCount.get(h.account_id) || 0) + 1);
  }
  const accountId = acctCount.size ? [...acctCount.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
  return { categoryId, accountId };
}

async function suggestFor(userId, note, type) {
  if (!note) return null;
  const { rows } = await pool.query(
    `SELECT t.note, t.category_id, t.account_id
     FROM finance.transactions t
     JOIN finance.categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND c.type = $2 AND t.note IS NOT NULL AND t.note <> ''
     ORDER BY t.created_at DESC
     LIMIT $3`,
    [userId, type, HISTORY_LIMIT]
  );
  return pickSuggestion(note, rows);
}

module.exports = { suggestFor, pickSuggestion, similarity, normalize };
