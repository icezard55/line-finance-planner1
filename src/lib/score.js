// Financial health score — 5 rule-of-thumb dimensions, each 0-100, overall = simple average.
// These are deliberately simple starting formulas, not actuarial advice. Every
// benchmark below is a named constant specifically so it's easy to find and tune.
const MONTHS_OF_EXPENSE_FOR_EMERGENCY_FUND = 6;
const LIFE_COVERAGE_INCOME_MULTIPLE = 5;
const HEALTH_COVERAGE_BENCHMARK = 500000;
const INVESTMENT_INCOME_MULTIPLE = 3;

function clamp(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function sum(rows, field) {
  return rows.reduce((s, r) => s + Number(r[field] || 0), 0);
}

function avgMonthlyByType(transactions, type) {
  const rows = transactions.filter((t) => t.type === type);
  if (!rows.length) return 0;
  const byMonth = {};
  for (const t of rows) {
    const d = new Date(t.occurred_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth[key] = (byMonth[key] || 0) + Number(t.amount);
  }
  const months = Object.values(byMonth);
  return months.reduce((s, v) => s + v, 0) / months.length;
}

function computeScore({ transactions = [], assets = [], liabilities = [], insurancePolicies = [], goals = [] }) {
  const avgMonthlyIncome = avgMonthlyByType(transactions, 'income');
  const avgMonthlyExpense = avgMonthlyByType(transactions, 'expense');
  const totalAssets = sum(assets, 'estimated_value');
  const totalLiabilities = sum(liabilities, 'remaining_balance');

  const lifeCoverage = sum(
    insurancePolicies.filter((p) => (p.policy_type || '').includes('ชีวิต')),
    'coverage_amount'
  );
  const healthCoverage = sum(
    insurancePolicies.filter((p) => (p.policy_type || '').includes('สุขภาพ')),
    'coverage_amount'
  );

  const investmentTypes = ['หุ้น', 'กองทุน', 'ทองคำ', 'ลงทุน'];
  const investmentAssets = sum(
    assets.filter((a) => investmentTypes.some((t) => (a.asset_type || '').includes(t))),
    'estimated_value'
  );

  const retirementGoals = goals.filter(
    (g) => (g.goal_type || '').includes('เกษียณ') || (g.goal_name || '').includes('เกษียณ')
  );
  const retirementTarget = sum(retirementGoals, 'target_amount');
  const retirementCurrent = sum(retirementGoals, 'current_amount');

  const emergencyFund = clamp(
    avgMonthlyExpense > 0 ? (totalAssets / (avgMonthlyExpense * MONTHS_OF_EXPENSE_FOR_EMERGENCY_FUND)) * 100 : 0
  );
  const lifeCoverageScore = clamp(
    avgMonthlyIncome > 0 ? (lifeCoverage / (avgMonthlyIncome * 12 * LIFE_COVERAGE_INCOME_MULTIPLE)) * 100 : 0
  );
  const healthCoverageScore = clamp((healthCoverage / HEALTH_COVERAGE_BENCHMARK) * 100);
  const retirementScore = clamp(retirementTarget > 0 ? (retirementCurrent / retirementTarget) * 100 : 0);
  const investmentScore = clamp(
    avgMonthlyIncome > 0 ? (investmentAssets / (avgMonthlyIncome * 12 * INVESTMENT_INCOME_MULTIPLE)) * 100 : 0
  );

  const categories = [
    { key: 'emergency_fund', label: 'เงินสำรองฉุกเฉิน', score: Math.round(emergencyFund) },
    { key: 'life_coverage', label: 'ความคุ้มครองชีวิต', score: Math.round(lifeCoverageScore) },
    { key: 'health_coverage', label: 'สุขภาพ', score: Math.round(healthCoverageScore) },
    { key: 'retirement', label: 'เกษียณ', score: Math.round(retirementScore) },
    { key: 'investment', label: 'การลงทุน', score: Math.round(investmentScore) },
  ];

  const overall = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);

  const recommendedLifeCoverage = avgMonthlyIncome * 12 * LIFE_COVERAGE_INCOME_MULTIPLE;
  const recommendedHealthCoverage = HEALTH_COVERAGE_BENCHMARK;

  return {
    overall,
    categories,
    summary: {
      avgMonthlyIncome,
      avgMonthlyExpense,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      lifeCoverage,
      healthCoverage,
      recommendedLifeCoverage,
      recommendedHealthCoverage,
      lifeCoverageGap: Math.max(0, recommendedLifeCoverage - lifeCoverage),
      healthCoverageGap: Math.max(0, recommendedHealthCoverage - healthCoverage),
    },
  };
}

module.exports = { computeScore };
