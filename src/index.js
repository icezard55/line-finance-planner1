require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const liffAuth = require('./middleware/liffAuth');
const { crudRouter } = require('./lib/crudRouter');
const webhookRouter = require('./routes/webhook');
const profileRouter = require('./routes/profile');
const insuranceBenefitsRouter = require('./routes/insuranceBenefits');
const remindersJob = require('./jobs/reminders');

const app = express();

// Mounted before express.json() — LINE's own middleware needs the raw body
// to verify the webhook signature.
app.use('/webhook', webhookRouter);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// LIFF frontend (static files) — served from the same service, same origin as /api
app.use(express.static(path.join(__dirname, '..', 'public')));

const api = express.Router();
api.use(liffAuth);

api.use('/profile', profileRouter);
api.use('/insurance-policies/:policyId/benefits', insuranceBenefitsRouter);

const modules = [
  { path: 'accounts', table: 'accounts', columns: ['account_name', 'account_type', 'balance'] },
  { path: 'categories', table: 'categories', columns: ['name', 'type'] },
  { path: 'transactions', table: 'transactions', columns: ['account_id', 'category_id', 'type', 'amount', 'occurred_at', 'note', 'source'] },
  { path: 'budgets', table: 'budgets', columns: ['category_id', 'monthly_limit', 'alert_threshold_pct', 'effective_month'] },
  { path: 'risk-assessments', table: 'risk_assessments', columns: ['score', 'risk_level', 'answers', 'assessed_at'] },
  { path: 'insurance-policies', table: 'insurance_policies', columns: ['insurer', 'policy_type', 'policy_no', 'premium_amount', 'premium_cycle', 'coverage_amount', 'start_date', 'end_date', 'beneficiary'] },
  { path: 'assets', table: 'assets', columns: ['asset_name', 'asset_type', 'estimated_value', 'acquired_date'] },
  { path: 'liabilities', table: 'liabilities', columns: ['liability_name', 'liability_type', 'remaining_balance', 'interest_rate', 'due_day', 'min_payment'] },
  { path: 'family-members', table: 'family_members', columns: ['name', 'relationship', 'birth_date', 'is_dependent'] },
  { path: 'goals', table: 'goals', columns: ['goal_name', 'goal_type', 'target_amount', 'current_amount', 'target_date', 'priority'] },
  { path: 'reminders', table: 'reminders', columns: ['source_type', 'source_id', 'title', 'due_date', 'notify_days_before', 'repeat_cycle', 'status'] },
  { path: 'employee-benefits', table: 'employee_benefits', columns: ['benefit_type', 'employer_contribution', 'employee_contribution', 'accumulated_amount', 'start_date'] },
];

for (const { path, table, columns } of modules) {
  api.use(`/${path}`, crudRouter(table, columns));
}

app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`finance backend listening on :${port}`);
  remindersJob.start();
});
