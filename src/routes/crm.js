const express = require('express');
const pool = require('../lib/db');

// Bridge to finance-crm (the agent's CRM). finance_app has no access to CRM
// tables — only to the crm_bridge.* functions, which enforce the customer's
// consent (customer_links) themselves.
const router = express.Router();

const SCOPES = ['reminders', 'family', 'income', 'goals', 'balance_sheet', 'own_policies'];

function cleanScopes(input) {
  return Array.isArray(input) ? input.filter((s) => SCOPES.includes(s)) : [];
}

router.get('/invite/:code', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM crm_bridge.invite_info($1)', [req.params.code]);
    const invite = rows[0];
    if (!invite) return res.status(404).json({ error: 'invite not found' });
    if (invite.linked_line_user_id && invite.linked_line_user_id !== req.lineUserId) {
      return res.status(409).json({ error: 'invite already used' });
    }
    res.json({
      agent_name: invite.agent_name,
      agent_phone: invite.agent_phone,
      customer_first_name: invite.customer_first_name,
      already_linked: invite.linked_line_user_id === req.lineUserId,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/accept', async (req, res, next) => {
  try {
    const { code, scopes } = req.body;
    if (!code) return res.status(400).json({ error: 'missing code' });
    const { rows } = await pool.query('SELECT crm_bridge.accept_invite($1, $2, $3) AS link_id', [
      code,
      req.lineUserId,
      cleanScopes(scopes),
    ]);
    res.json({ link_id: rows[0].link_id });
  } catch (err) {
    if (/invite not found/.test(err.message)) return res.status(404).json({ error: 'invite not found or already used' });
    next(err);
  }
});

router.get('/links', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM crm_bridge.my_links($1)', [req.lineUserId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.put('/links/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT crm_bridge.update_scopes($1, $2, $3) AS ok', [
      req.lineUserId,
      req.params.id,
      cleanScopes(req.body.scopes),
    ]);
    if (!rows[0].ok) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/links/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT crm_bridge.revoke_link($1, $2) AS ok', [req.lineUserId, req.params.id]);
    if (!rows[0].ok) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/policies', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM crm_bridge.my_policies($1)', [req.lineUserId]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/policies/:id/paid', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT crm_bridge.report_paid($1, $2) AS ok', [req.lineUserId, req.params.id]);
    if (!rows[0].ok) return res.status(404).json({ error: 'no pending premium' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
