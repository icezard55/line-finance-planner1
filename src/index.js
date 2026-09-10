require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const liffAuth = require('./middleware/liffAuth');
const { crudRouter } = require('./lib/crudRouter');
const webhookRouter = require('./routes/webhook');
const profileRouter = require('./routes/profile');
const insuranceBenefitsRouter = require('./routes/insuranceBenefits');
const clientReport = require('./routes/clientReport');
const remindersJob = require('./jobs/reminders');
const recurringJob = require('./jobs/recurring');

const app = express();

// Mounted before express.json() — LINE's own middleware needs the raw body
// to verify the webhook signature.
app.use('/webhook', webhookRouter);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// Public client report — no LIFF auth, this is the link a client opens directly.
app.use('/api/public/report', clientReport.publicRouter);

// LIFF frontend (static files) — served from the same service, same origin as /api
app.use(express.static(path.join(__dirname, '..', 'public')));

const api = express.Router();
// Data changes every time a transaction is added (LIFF form, chat quick-log, or a
// confirmed slip) — never let the browser serve a stale cached/304 response here.
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
api.use(liffAuth);

api.use('/profile', profileRouter);
api.use('/insurance-policies/:policyId/benefits', insuranceBenefitsRouter);

const modules = [
  { path: 'clients', table: 'clients', columns: ['name', 'birth_date', 'occupation', 'marital_status', 'num_children', 'phone', 'line_contact', 'email', 'plan_started_at'] },
  { path: 'accounts', table: 'accounts', columns: ['account_name', 'account_type', 'balance'] },
  { path: 'categories', table: 'categories', columns: ['name', 'type'] },
  { path: 'transactions', table: 'transactions', columns: ['account_id', 'category_id', 'type', 'amount', 'occurred_at', 'note', 'source'], supportsClient: true },
  { path: 'budgets', table: 'budgets', columns: ['category_id', 'monthly_limit', 'alert_threshold_pct', 'effective_month'] },
  { path: 'risk-assessments', table: 'risk_assessments', columns: ['score', 'risk_level', 'answers', 'assessed_at'] },
  { path: 'insurance-policies', table: 'insurance_policies', columns: ['insurer', 'policy_type', 'policy_no', 'premium_amount', 'premium_cycle', 'coverage_amount', 'start_date', 'end_date', 'beneficiary'], supportsClient: true },
  { path: 'assets', table: 'assets', columns: ['asset_name', 'asset_type', 'estimated_value', 'acquired_date'], supportsClient: true },
  { path: 'liabilities', table: 'liabilities', columns: ['liability_name', 'liability_type', 'remaining_balance', 'interest_rate', 'due_day', 'min_payment'], supportsClient: true },
  { path: 'family-members', table: 'family_members', columns: ['name', 'relationship', 'birth_date', 'is_dependent'] },
  { path: 'goals', table: 'goals', columns: ['goal_name', 'goal_type', 'target_amount', 'current_amount', 'target_date', 'priority', 'family_member_id'], supportsClient: true },
  { path: 'reminders', table: 'reminders', columns: ['source_type', 'source_id', 'title', 'due_date', 'notify_days_before', 'repeat_cycle', 'status'] },
  { path: 'employee-benefits', table: 'employee_benefits', columns: ['benefit_type', 'employer_contribution', 'employee_contribution', 'accumulated_amount', 'start_date'] },
  { path: 'recurring-transactions', table: 'recurring_transactions', columns: ['type', 'amount', 'category_id', 'note', 'frequency', 'day_of_month', 'next_run_date', 'active'] },
];

for (const { path, table, columns, supportsClient } of modules) {
  api.use(`/${path}`, crudRouter(table, columns, { supportsClient }));
}

api.use('/clients', clientReport.authedRouter);
api.use('/score', clientReport.personalRouter);

app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`finance backend listening on :${port}`);
  remindersJob.start();
  recurringJob.start();
});
