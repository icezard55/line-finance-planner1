const express = require('express');
const pool = require('./db');

// Generic per-user CRUD router for a `finance.<table>` that has a `user_id` column.
// `table` and `columns` always come from our own hardcoded module config (never
// from request input), so interpolating them into SQL here is safe.
function crudRouter(table, columns) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM finance.${table} WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.lineUserId]
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const keys = columns.filter((c) => c in req.body);
      const values = keys.map((k) => req.body[k]);
      const colList = keys.length ? `, ${keys.join(', ')}` : '';
      const placeholders = keys.map((_, i) => `$${i + 2}`).join(', ');
      const valuesList = keys.length ? `, ${placeholders}` : '';

      const { rows } = await pool.query(
        `INSERT INTO finance.${table} (user_id${colList})
         VALUES ($1${valuesList})
         RETURNING *`,
        [req.lineUserId, ...values]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const keys = columns.filter((c) => c in req.body);
      if (keys.length === 0) {
        return res.status(400).json({ error: 'no updatable fields in body' });
      }
      const setClause = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
      const values = keys.map((k) => req.body[k]);

      const { rows } = await pool.query(
        `UPDATE finance.${table} SET ${setClause}
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [req.params.id, req.lineUserId, ...values]
      );
      if (!rows[0]) return res.status(404).json({ error: 'not found' });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM finance.${table} WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.lineUserId]
      );
      if (!rowCount) return res.status(404).json({ error: 'not found' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { crudRouter };
