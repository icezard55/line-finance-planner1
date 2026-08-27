const LIFF_ID = '2011118214-fbnXxp46';

const MODULES = [
  {
    key: 'transactions', label: 'รายรับ-รายจ่าย', path: 'transactions',
    fields: [
      { key: 'type', label: 'ประเภท', type: 'select', options: ['expense', 'income'], required: true },
      { key: 'amount', label: 'จำนวนเงิน', type: 'number', required: true },
      { key: 'account_id', label: 'ช่องทางชำระเงิน', type: 'account-select', required: false },
      { key: 'category_id', label: 'หมวด', type: 'category-select', required: false },
      { key: 'occurred_at', label: 'วันที่', type: 'date', required: false },
      { key: 'note', label: 'บันทึกช่วยจำ', type: 'text', required: false },
    ],
    columns: [
      { key: 'type', label: (r) => (r.type === 'income' ? '+' : '-') + Number(r.amount).toLocaleString('th-TH') },
      { key: 'note', label: (r) => r.note || '-' },
      { key: 'occurred_at', label: (r) => (r.occurred_at || '').slice(0, 10) },
    ],
  },
  {
    key: 'budgets', label: 'งบประมาณ', path: 'budgets',
    fields: [
      { key: 'category_id', label: 'หมวด', type: 'category-select', required: true },
      { key: 'monthly_limit', label: 'วงเงินต่อเดือน', type: 'number', required: true },
      { key: 'alert_threshold_pct', label: 'เตือนเมื่อใช้ถึง (%)', type: 'number', required: false },
    ],
  },
  {
    key: 'categories', label: 'หมวดหมู่', path: 'categories',
    fields: [
      { key: 'name', label: 'ชื่อหมวด', type: 'text', required: true },
      { key: 'type', label: 'ประเภท', type: 'select', options: ['expense', 'income'], required: true },
    ],
  },
  {
    key: 'assets', label: 'สินทรัพย์', path: 'assets',
    fields: [
      { key: 'asset_name', label: 'ชื่อทรัพย์สิน', type: 'text', required: true },
      { key: 'asset_type', label: 'ประเภท', type: 'text', required: true },
      { key: 'estimated_value', label: 'มูลค่าประเมิน', type: 'number', required: false },
    ],
  },
  {
    key: 'liabilities', label: 'หนี้สิน', path: 'liabilities',
    fields: [
      { key: 'liability_name', label: 'ชื่อหนี้', type: 'text', required: true },
      { key: 'liability_type', label: 'ประเภท', type: 'text', required: true },
      { key: 'remaining_balance', label: 'ยอดคงเหลือ', type: 'number', required: true },
      { key: 'due_day', label: 'วันครบกำหนด/เดือน', type: 'number', required: false },
    ],
  },
  {
    key: 'insurance-policies', label: 'ประกัน', path: 'insurance-policies',
    fields: [
      { key: 'insurer', label: 'บริษัทประกัน', type: 'text', required: true },
      { key: 'policy_type', label: 'ประเภทกรมธรรม์', type: 'text', required: true },
      { key: 'premium_amount', label: 'เบี้ยประกัน', type: 'number', required: false },
      { key: 'coverage_amount', label: 'ทุนประกัน', type: 'number', required: false },
      { key: 'end_date', label: 'ครบกำหนด', type: 'date', required: false },
    ],
  },
  {
    key: 'goals', label: 'เป้าหมาย', path: 'goals',
    fields: [
      { key: 'goal_name', label: 'ชื่อเป้าหมาย', type: 'text', required: true },
      { key: 'target_amount', label: 'ยอดเป้าหมาย', type: 'number', required: true },
      { key: 'current_amount', label: 'สะสมแล้ว', type: 'number', required: false },
      { key: 'target_date', label: 'วันที่ต้องการถึงเป้า', type: 'date', required: false },
    ],
  },
  {
    key: 'family-members', label: 'ครอบครัว', path: 'family-members',
    fields: [
      { key: 'name', label: 'ชื่อ', type: 'text', required: true },
      { key: 'relationship', label: 'ความสัมพันธ์', type: 'text', required: true },
      { key: 'birth_date', label: 'วันเกิด', type: 'date', required: false },
    ],
  },
  {
    key: 'reminders', label: 'แจ้งเตือน', path: 'reminders',
    fields: [
      { key: 'title', label: 'หัวข้อ', type: 'text', required: true },
      { key: 'due_date', label: 'วันครบกำหนด', type: 'date', required: true },
      { key: 'notify_days_before', label: 'แจ้งล่วงหน้า (วัน)', type: 'number', required: false },
      { key: 'repeat_cycle', label: 'ทำซ้ำ', type: 'select', options: ['once', 'monthly', 'yearly'], required: false },
    ],
    extraFields: { source_type: 'custom' },
  },
  {
    key: 'employee-benefits', label: 'สวัสดิการ', path: 'employee-benefits',
    fields: [
      { key: 'benefit_type', label: 'ประเภทสวัสดิการ', type: 'text', required: true },
      { key: 'employer_contribution', label: 'เงินสมทบนายจ้าง', type: 'number', required: false },
      { key: 'employee_contribution', label: 'เงินสมทบตัวเอง', type: 'number', required: false },
      { key: 'accumulated_amount', label: 'ยอดสะสม', type: 'number', required: false },
    ],
  },
  {
    key: 'risk-assessments', label: 'ความเสี่ยง', path: 'risk-assessments',
    fields: [
      { key: 'score', label: 'คะแนน', type: 'number', required: true },
      { key: 'risk_level', label: 'ระดับความเสี่ยง', type: 'select', options: ['ต่ำ', 'ปานกลาง', 'สูง'], required: true },
    ],
  },
  {
    key: 'recurring-transactions', label: 'จดประจำ', path: 'recurring-transactions',
    fields: [
      { key: 'type', label: 'ประเภท', type: 'select', options: ['expense', 'income'], required: true },
      { key: 'amount', label: 'จำนวนเงิน', type: 'number', required: true },
      { key: 'category_id', label: 'หมวด', type: 'category-select', required: false },
      { key: 'note', label: 'บันทึกช่วยจำ', type: 'text', required: false },
      { key: 'frequency', label: 'ความถี่', type: 'select', options: ['monthly', 'daily'], required: true },
      { key: 'day_of_month', label: 'วันที่ของเดือน (ถ้าเป็นรายเดือน)', type: 'number', required: false },
    ],
    columns: [
      { key: 'summary', label: (r) => (r.type === 'income' ? '+' : '-') + Number(r.amount).toLocaleString('th-TH') },
      { key: 'note', label: (r) => r.note || '-' },
      { key: 'schedule', label: (r) => (r.frequency === 'monthly' ? `ทุกวันที่ ${r.day_of_month || '?'}` : 'ทุกวัน') },
      { key: 'next', label: (r) => `ครั้งถัดไป ${(r.next_run_date || '').slice(0, 10)}` },
    ],
  },
];

let idToken = null;
let categoriesCache = null;
let accountsCache = null;
let activeTab = 'dashboard';

const KNOWN_TABS = ['dashboard', 'profile', 'analysis', 'investment', 'education', ...MODULES.map((m) => m.key)];

function readRequestedTab() {
  const requested = new URLSearchParams(window.location.search).get('tab');
  return KNOWN_TABS.includes(requested) ? requested : 'dashboard';
}

async function main() {
  await liff.init({ liffId: LIFF_ID });
  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }
  idToken = liff.getIDToken();
  const profile = await liff.getProfile();
  document.getElementById('user-name').textContent = profile.displayName;
  if (profile.pictureUrl) document.getElementById('user-avatar').src = profile.pictureUrl;

  activeTab = readRequestedTab();

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  renderTabs();
  renderActiveTab();
}

function authFetch(path, options = {}) {
  return fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
      ...(options.headers || {}),
    },
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.text()) || r.statusText);
    if (r.status === 204) return null;
    return r.json();
  });
}

function renderTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  const entries = [
    { key: 'dashboard', label: 'แดชบอร์ด' },
    { key: 'analysis', label: 'วิเคราะห์' },
    { key: 'education', label: 'การศึกษาบุตร' },
    { key: 'investment', label: 'การลงทุน' },
    { key: 'profile', label: 'โปรไฟล์' },
    ...MODULES.map((m) => ({ key: m.key, label: m.label })),
  ];
  for (const e of entries) {
    const btn = document.createElement('button');
    btn.textContent = e.label;
    btn.className = e.key === activeTab ? 'active' : '';
    btn.onclick = () => {
      activeTab = e.key;
      renderTabs();
      renderActiveTab();
    };
    tabs.appendChild(btn);
  }
}

function renderActiveTab() {
  if (activeTab === 'dashboard') return renderDashboard();
  if (activeTab === 'analysis') return renderAnalysis();
  if (activeTab === 'profile') return renderProfile();
  if (activeTab === 'investment') return renderInvestmentCalculator();
  if (activeTab === 'education') return renderEducationPlan();
  const mod = MODULES.find((m) => m.key === activeTab);
  if (mod) return renderModule(mod);
}

function goToTab(key) {
  activeTab = key;
  renderTabs();
  renderActiveTab();
}

async function getCategories() {
  if (!categoriesCache) categoriesCache = await authFetch('/categories');
  return categoriesCache;
}

async function getAccounts() {
  if (!accountsCache) accountsCache = await authFetch('/accounts');
  return accountsCache;
}

async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  const [transactions, reminders, budgets, cats, scoreReport] = await Promise.all([
    authFetch('/transactions'),
    authFetch('/reminders'),
    authFetch('/budgets'),
    getCategories(),
    authFetch('/score'),
  ]);
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const score = scoreReport.score;

  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const income = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const spentByCategory = {};
  for (const t of thisMonth) {
    if (t.type !== 'expense' || !t.category_id) continue;
    spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Number(t.amount);
  }
  const budgetRows = budgets.map((b) => {
    const spent = spentByCategory[b.category_id] || 0;
    const limit = Number(b.monthly_limit);
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const thresholdPct = b.alert_threshold_pct || 80;
    const status = spent >= limit ? 'over' : limit > 0 && (spent / limit) * 100 >= thresholdPct ? 'warn' : 'ok';
    return { name: catName[b.category_id] || 'ไม่ระบุหมวด', spent, limit, pct, status };
  });

  const upcoming = reminders
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  content.innerHTML = `
    <nav class="nav-tiles">${buildNavTiles()}</nav>
    <div class="card">
      <h3>คะแนนสุขภาพทางการเงิน</h3>
      <div class="gauge-wrap">
        ${buildScoreGaugeSvg(score.overall)}
        <p class="sub">${score.overall >= 70 ? 'ระดับ: ดี' : score.overall >= 40 ? 'ระดับ: ปานกลาง' : 'ระดับ: ควรปรับปรุง'}</p>
      </div>
      ${score.categories
        .map(
          (c) => `
        <div class="cat-row">
          <div class="cat-row-top"><span>${escapeHtml(c.label)}</span><span>${c.score}%</span></div>
          <div class="cat-bar"><div class="cat-bar-fill ${c.score < 40 ? 'status-over' : c.score < 70 ? 'status-warn' : ''}" style="width:${c.score}%"></div></div>
        </div>`
        )
        .join('')}
    </div>
    <div class="card">
      <h3>เดือนนี้</h3>
      <div class="row">
        <span class="stat income">+${income.toLocaleString('th-TH')}</span>
        <span class="stat expense">-${expense.toLocaleString('th-TH')}</span>
      </div>
      <div class="sub">รายรับ / รายจ่าย</div>
    </div>
    ${
      budgetRows.length
        ? `<div class="section-title">งบประมาณเดือนนี้</div>
    <div class="card">
      ${budgetRows
        .map(
          (b) => `
        <div class="cat-row">
          <div class="cat-row-top"><span>${escapeHtml(b.name)}</span><span>${b.spent.toLocaleString('th-TH')} / ${b.limit.toLocaleString('th-TH')}</span></div>
          <div class="cat-bar"><div class="cat-bar-fill status-${b.status}" style="width:${b.pct.toFixed(1)}%"></div></div>
        </div>`
        )
        .join('')}
    </div>`
        : ''
    }
    <div class="section-title">แจ้งเตือนใกล้ถึง</div>
    <div class="card">
      ${
        upcoming.length
          ? upcoming
              .map(
                (r) => `<div class="list-item"><span>${escapeHtml(r.title)}</span><span class="meta">${r.due_date.slice(0, 10)}</span></div>`
              )
              .join('')
          : '<p class="empty">ไม่มีแจ้งเตือนที่ใกล้ถึง</p>'
      }
    </div>
    <div class="section-title">รายการล่าสุด</div>
    <div class="card">
      ${
        transactions.slice(0, 5).length
          ? transactions
              .slice(0, 5)
              .map(
                (t) =>
                  `<div class="list-item"><span>${escapeHtml(t.note || (t.type === 'income' ? 'รายรับ' : 'รายจ่าย'))}</span><span class="meta">${t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString('th-TH')}</span></div>`
              )
              .join('')
          : '<p class="empty">ยังไม่มีรายการ</p>'
      }
    </div>
  `;
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

let analysisWindowOffset = 0; // 0 = most recent 6 months; +6 = the 6 months before that; etc.

async function renderAnalysis() {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  const [transactions, cats] = await Promise.all([authFetch('/transactions'), getCategories()]);
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    months.push({ year: now.getFullYear(), month: now.getMonth() - i - analysisWindowOffset, income: 0, expense: 0 });
  }
  // normalize month index (getMonth() - i can go negative across a year boundary)
  for (const m of months) {
    const d = new Date(m.year, m.month, 1);
    m.year = d.getFullYear();
    m.month = d.getMonth();
  }

  for (const t of transactions) {
    const d = new Date(t.occurred_at);
    const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (!bucket) continue;
    if (t.type === 'income') bucket.income += Number(t.amount);
    else bucket.expense += Number(t.amount);
  }
  const maxVal = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));

  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const groupByCategory = (rows) => {
    const byCategory = {};
    for (const t of rows) {
      const key = t.category_id ? catName[t.category_id] || 'ไม่ระบุหมวด' : 'ไม่ระบุหมวด';
      byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
    }
    return Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
  };

  const categoryRows = groupByCategory(thisMonthTx.filter((t) => t.type === 'expense'));
  const maxCat = Math.max(1, ...categoryRows.map(([, v]) => v));

  const incomeCategoryRows = groupByCategory(thisMonthTx.filter((t) => t.type === 'income'));
  const maxIncomeCat = Math.max(1, ...incomeCategoryRows.map(([, v]) => v));

  const rangeLabel = `${THAI_MONTHS[months[0].month]} ${String(months[0].year + 543).slice(2)} - ${THAI_MONTHS[months[5].month]} ${String(months[5].year + 543).slice(2)}`;

  content.innerHTML = `
    <div class="card">
      <div class="row" style="align-items:center;margin-bottom:8px;">
        <h3 style="margin:0;">รายรับ-รายจ่ายย้อนหลัง 6 เดือน</h3>
      </div>
      <div class="month-nav">
        <button type="button" id="analysis-prev" aria-label="ย้อนหลังเพิ่ม">←</button>
        <span>${rangeLabel}</span>
        <button type="button" id="analysis-next" aria-label="ใกล้ปัจจุบันขึ้น" ${analysisWindowOffset === 0 ? 'disabled' : ''}>→</button>
      </div>
      ${buildMonthlyChartSvg(months, maxVal)}
      <div class="chart-legend">
        <span><i class="dot income"></i>รายรับ</span>
        <span><i class="dot expense"></i>รายจ่าย</span>
      </div>
    </div>
    <div class="section-title">รายจ่ายตามหมวด (เดือนนี้)</div>
    <div class="card">
      ${
        categoryRows.length
          ? categoryRows
              .map(
                ([name, val]) => `
        <div class="cat-row">
          <div class="cat-row-top"><span>${escapeHtml(name)}</span><span>${val.toLocaleString('th-TH')}</span></div>
          <div class="cat-bar"><div class="cat-bar-fill expense" style="width:${((val / maxCat) * 100).toFixed(1)}%"></div></div>
        </div>`
              )
              .join('')
          : '<p class="empty">ยังไม่มีรายจ่ายเดือนนี้</p>'
      }
    </div>
    <div class="section-title">รายรับตามหมวด (เดือนนี้)</div>
    <div class="card">
      ${
        incomeCategoryRows.length
          ? incomeCategoryRows
              .map(
                ([name, val]) => `
        <div class="cat-row">
          <div class="cat-row-top"><span>${escapeHtml(name)}</span><span>${val.toLocaleString('th-TH')}</span></div>
          <div class="cat-bar"><div class="cat-bar-fill income" style="width:${((val / maxIncomeCat) * 100).toFixed(1)}%"></div></div>
        </div>`
              )
              .join('')
          : '<p class="empty">ยังไม่มีรายรับเดือนนี้</p>'
      }
    </div>
  `;

  document.getElementById('analysis-prev').onclick = () => {
    analysisWindowOffset += 6;
    renderAnalysis();
  };
  document.getElementById('analysis-next').onclick = () => {
    if (analysisWindowOffset === 0) return;
    analysisWindowOffset = Math.max(0, analysisWindowOffset - 6);
    renderAnalysis();
  };
}

function buildMonthlyChartSvg(months, maxVal) {
  const w = 320;
  const h = 170;
  const groupW = w / months.length;
  const barW = groupW * 0.28;
  const gap = barW * 0.15;
  const baseline = h - 24;
  const scale = (v) => (v / maxVal) * (baseline - 10);

  let bars = '';
  months.forEach((m, i) => {
    const cx = i * groupW + groupW / 2;
    const incH = scale(m.income);
    const expH = scale(m.expense);
    const incX = cx - barW - gap / 2;
    const expX = cx + gap / 2;
    bars += `<rect x="${incX.toFixed(1)}" y="${(baseline - incH).toFixed(1)}" width="${barW.toFixed(1)}" height="${incH.toFixed(1)}" rx="2" fill="var(--accent)"></rect>`;
    bars += `<rect x="${expX.toFixed(1)}" y="${(baseline - expH).toFixed(1)}" width="${barW.toFixed(1)}" height="${expH.toFixed(1)}" rx="2" fill="var(--danger)"></rect>`;
    bars += `<text x="${cx.toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="10" fill="var(--muted)">${THAI_MONTHS[m.month]}</text>`;
  });

  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="กราฟรายรับรายจ่ายย้อนหลัง 6 เดือน" style="width:100%;height:auto;display:block;">
    <line x1="0" y1="${baseline}" x2="${w}" y2="${baseline}" stroke="var(--line)" stroke-width="1"></line>
    ${bars}
  </svg>`;
}

function buildScoreGaugeSvg(score) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * (Math.max(0, Math.min(100, score)) / 100);
  return `<svg viewBox="0 0 132 132" width="132" height="132" role="img" aria-label="คะแนนสุขภาพทางการเงิน ${score} จาก 100">
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--line)" stroke-width="13"></circle>
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--accent)" stroke-width="13" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 66 66)"></circle>
    <text x="66" y="63" text-anchor="middle" font-size="28" font-weight="800" fill="var(--ink)">${score}</text>
    <text x="66" y="82" text-anchor="middle" font-size="12" fill="var(--muted)">/ 100</text>
  </svg>`;
}

const NAV_TILES = [
  {
    key: 'analysis', label: 'ภาพรวมการเงิน',
    icon: '<rect x="4" y="12" width="4" height="8" rx="1"></rect><rect x="10" y="7" width="4" height="13" rx="1"></rect><rect x="16" y="3" width="4" height="17" rx="1"></rect>',
  },
  {
    key: 'insurance-policies', label: 'ความคุ้มครอง',
    icon: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>',
  },
  {
    key: 'education', label: 'การศึกษาบุตร',
    icon: '<path d="M12 4L2 9l10 5 10-5-10-5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path><path d="M6 11.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4" fill="none" stroke="currentColor" stroke-width="2"></path>',
  },
  {
    key: 'goals', label: 'เป้าหมาย/เกษียณ',
    icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"></circle><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"></circle><circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>',
  },
  {
    key: 'investment', label: 'การลงทุน',
    icon: '<path d="M3 17l6-6 4 4 8-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15 6h6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>',
  },
];

function buildNavTiles() {
  return NAV_TILES.map(
    (t) => `
    <button class="nav-tile" onclick="goToTab('${t.key}')" type="button">
      <svg viewBox="0 0 24 24" width="26" height="26">${t.icon}</svg>
      <span>${t.label}</span>
    </button>`
  ).join('');
}

async function renderProfile() {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';
  const profile = (await authFetch('/profile')) || {};

  content.innerHTML = `
    <form class="entry-form" id="profile-form">
      <div class="field"><label>อาชีพ</label><input name="occupation" value="${attr(profile.occupation)}" /></div>
      <div class="field"><label>ลักษณะการทำงาน</label>
        <select name="employment_type">
          ${['ประจำ', 'ฟรีแลนซ์', 'เจ้าของกิจการ']
            .map((o) => `<option ${profile.employment_type === o ? 'selected' : ''}>${o}</option>`)
            .join('')}
        </select>
      </div>
      <div class="field"><label>สถานที่ทำงาน</label><input name="employer" value="${attr(profile.employer)}" /></div>
      <div class="field"><label>รายได้เฉลี่ย/เดือน</label><input type="number" name="monthly_income_avg" value="${attr(profile.monthly_income_avg)}" /></div>
      <div class="field"><label>เริ่มงานเมื่อ</label><input type="date" name="work_start_date" value="${attr((profile.work_start_date || '').slice(0, 10))}" /></div>
      <button class="primary" type="submit">บันทึกโปรไฟล์</button>
    </form>
  `;

  document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    await authFetch('/profile', { method: 'PUT', body: JSON.stringify(data) });
    renderProfile();
  };
}

function computeInvestmentProjection({ initial, monthly, annualRatePct, years }) {
  const r = annualRatePct / 100 / 12;
  const results = [];
  for (const y of [5, 10, 20]) {
    if (y > years) continue;
    const n = y * 12;
    const fv = r === 0 ? initial + monthly * n : initial * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
    results.push({ years: y, value: fv });
  }
  // also always show the requested horizon itself if it isn't one of the milestones
  if (![5, 10, 20].includes(years)) {
    const n = years * 12;
    const fv = r === 0 ? initial + monthly * n : initial * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
    results.push({ years, value: fv });
  }
  return results.sort((a, b) => a.years - b.years);
}

function renderInvestmentCalculator() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <form class="entry-form" id="invest-form">
      <div class="field"><label>เงินลงทุนเริ่มต้น</label><input type="number" name="initial" value="0" required /></div>
      <div class="field"><label>ลงทุนเพิ่มต่อเดือน</label><input type="number" name="monthly" value="0" required /></div>
      <div class="field"><label>ผลตอบแทนคาดหวังต่อปี (%)</label><input type="number" step="0.1" name="annualRatePct" value="5" required /></div>
      <div class="field"><label>ระยะเวลาลงทุน (ปี)</label><input type="number" name="years" value="20" required /></div>
      <button class="primary" type="submit">คำนวณ</button>
    </form>
    <div id="invest-result"></div>
    <p class="sub" style="text-align:center;">เป็นการประมาณการเท่านั้น ไม่ใช่การรับประกันผลตอบแทน</p>
  `;

  const form = document.getElementById('invest-form');
  const runCalc = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    const results = computeInvestmentProjection({
      initial: Number(data.initial) || 0,
      monthly: Number(data.monthly) || 0,
      annualRatePct: Number(data.annualRatePct) || 0,
      years: Number(data.years) || 0,
    });
    document.getElementById('invest-result').innerHTML = `
      <div class="section-title">มูลค่าที่คาดว่าจะได้รับ</div>
      <div class="card">
        ${results
          .map(
            (r) => `<div class="list-item"><span>${r.years} ปี</span><span class="meta">${Math.round(r.value).toLocaleString('th-TH')} บาท</span></div>`
          )
          .join('')}
      </div>
    `;
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    runCalc();
  };
  runCalc();
}

async function renderEducationPlan() {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  const [members, goals] = await Promise.all([authFetch('/family-members'), authFetch('/goals')]);
  const goalByMember = Object.fromEntries(goals.filter((g) => g.family_member_id).map((g) => [g.family_member_id, g]));
  const children = members.filter((m) => (m.relationship || '').includes('บุตร'));

  content.innerHTML = `
    <div class="section-title">แผนการศึกษาบุตร</div>
    ${
      children.length
        ? children
            .map((child) => {
              const goal = goalByMember[child.id];
              if (goal) {
                const pct = Math.min(100, (Number(goal.current_amount || 0) / Math.max(1, Number(goal.target_amount || 1))) * 100);
                return `
              <div class="card">
                <h3>${escapeHtml(child.name)}</h3>
                <div class="cat-row">
                  <div class="cat-row-top"><span>${escapeHtml(goal.goal_name)}</span><span>${Number(goal.current_amount).toLocaleString('th-TH')} / ${Number(goal.target_amount).toLocaleString('th-TH')}</span></div>
                  <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
                </div>
                ${goal.target_date ? `<p class="sub">เป้าหมายภายใน ${goal.target_date.slice(0, 10)}</p>` : ''}
              </div>`;
              }
              return `
              <div class="card">
                <h3>${escapeHtml(child.name)}</h3>
                <p class="sub" style="margin-bottom:10px;">ยังไม่ได้ตั้งเป้าทุนการศึกษา</p>
                <form class="entry-form education-goal-form" data-member-id="${child.id}" style="margin:0;">
                  <div class="field"><label>ยอดเป้าหมาย</label><input type="number" name="target_amount" required /></div>
                  <div class="field"><label>สะสมแล้ว</label><input type="number" name="current_amount" value="0" /></div>
                  <div class="field"><label>ภายในวันที่</label><input type="date" name="target_date" /></div>
                  <button class="primary" type="submit">ตั้งเป้าการศึกษา</button>
                </form>
              </div>`;
            })
            .join('')
        : '<div class="card"><p class="empty">ยังไม่มีข้อมูลบุตรในแท็บ "ครอบครัว" — เพิ่มสมาชิกที่ระบุความสัมพันธ์เป็น "บุตร" ก่อน</p></div>'
    }
  `;

  document.querySelectorAll('.education-goal-form').forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      for (const k of Object.keys(data)) {
        if (data[k] === '') delete data[k];
      }
      data.family_member_id = form.dataset.memberId;
      data.goal_type = 'การศึกษา';
      data.goal_name = 'ทุนการศึกษา';
      await authFetch('/goals', { method: 'POST', body: JSON.stringify(data) });
      renderEducationPlan();
    };
  });
}

async function renderModule(mod, opts = {}) {
  const { containerId = 'content', clientId } = opts;
  const content = document.getElementById(containerId);
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  let categoryOptions = '';
  if (mod.fields.some((f) => f.type === 'category-select')) {
    const cats = await getCategories();
    categoryOptions = cats.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }
  let accountOptions = '';
  if (mod.fields.some((f) => f.type === 'account-select')) {
    const accts = await getAccounts();
    accountOptions = accts.map((a) => `<option value="${a.id}">${escapeHtml(a.account_name)}</option>`).join('');
  }

  const rows = await authFetch('/' + mod.path + (clientId ? '?client_id=' + clientId : ''));

  let coverageGapHtml = '';
  if (mod.key === 'insurance-policies' && !clientId) {
    const { score } = await authFetch('/score');
    const s = score.summary;
    const lifePct = s.recommendedLifeCoverage > 0 ? Math.min(100, (s.lifeCoverage / s.recommendedLifeCoverage) * 100) : 100;
    const healthPct = s.recommendedHealthCoverage > 0 ? Math.min(100, (s.healthCoverage / s.recommendedHealthCoverage) * 100) : 100;
    coverageGapHtml = `
      <div class="card">
        <h3>ช่องว่างความคุ้มครอง</h3>
        <div class="cat-row">
          <div class="cat-row-top"><span>ชีวิต — มี ${s.lifeCoverage.toLocaleString('th-TH')} / ควรมี ${s.recommendedLifeCoverage.toLocaleString('th-TH')}</span></div>
          <div class="cat-bar"><div class="cat-bar-fill ${lifePct < 40 ? 'status-over' : lifePct < 70 ? 'status-warn' : ''}" style="width:${lifePct.toFixed(1)}%"></div></div>
          <p class="sub">${s.lifeCoverageGap > 0 ? 'ยังขาด ' + s.lifeCoverageGap.toLocaleString('th-TH') + ' บาท' : 'ครบตามเกณฑ์แนะนำแล้ว'}</p>
        </div>
        <div class="cat-row">
          <div class="cat-row-top"><span>สุขภาพ — มี ${s.healthCoverage.toLocaleString('th-TH')} / ควรมี ${s.recommendedHealthCoverage.toLocaleString('th-TH')}</span></div>
          <div class="cat-bar"><div class="cat-bar-fill ${healthPct < 40 ? 'status-over' : healthPct < 70 ? 'status-warn' : ''}" style="width:${healthPct.toFixed(1)}%"></div></div>
          <p class="sub">${s.healthCoverageGap > 0 ? 'ยังขาด ' + s.healthCoverageGap.toLocaleString('th-TH') + ' บาท' : 'ครบตามเกณฑ์แนะนำแล้ว'}</p>
        </div>
      </div>
    `;
  }

  const formFields = mod.fields
    .map((f) => {
      if (f.type === 'select') {
        return `<div class="field"><label>${f.label}</label><select name="${f.key}" ${f.required ? 'required' : ''}>${f.options
          .map((o) => `<option value="${o}">${o}</option>`)
          .join('')}</select></div>`;
      }
      if (f.type === 'category-select') {
        return `<div class="field"><label>${f.label}</label><select name="${f.key}" ${f.required ? 'required' : ''}><option value="">ไม่ระบุ</option>${categoryOptions}</select></div>`;
      }
      if (f.type === 'account-select') {
        return `<div class="field"><label>${f.label}</label><select name="${f.key}" ${f.required ? 'required' : ''}><option value="">ไม่ระบุ</option>${accountOptions}</select></div>`;
      }
      return `<div class="field"><label>${f.label}</label><input type="${f.type}" name="${f.key}" ${f.required ? 'required' : ''} /></div>`;
    })
    .join('');

  const formId = containerId + '-add-form';
  const listId = containerId + '-list';

  content.innerHTML = `
    ${coverageGapHtml}
    <form class="entry-form" id="${formId}">
      ${formFields}
      <button class="primary" type="submit">เพิ่ม</button>
    </form>
    <div class="section-title">รายการทั้งหมด (${rows.length})</div>
    <div class="card" id="${listId}"></div>
  `;

  renderList(mod, rows, { containerId, listId, clientId });

  document.getElementById(formId).onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    for (const k of Object.keys(data)) {
      if (data[k] === '') delete data[k];
    }
    Object.assign(data, mod.extraFields || {});
    if (clientId) data.client_id = clientId;
    await authFetch('/' + mod.path, { method: 'POST', body: JSON.stringify(data) });
    invalidateLookupCache(mod.path);
    renderModule(mod, opts);
  };
}

function invalidateLookupCache(path) {
  if (path === 'categories') categoriesCache = null;
  if (path === 'accounts') accountsCache = null;
}

function renderList(mod, rows, opts = {}) {
  const { containerId = 'content', listId = 'list', clientId } = opts;
  const list = document.getElementById(listId);
  if (!rows.length) {
    list.innerHTML = '<p class="empty">ยังไม่มีข้อมูล</p>';
    return;
  }
  const cols = mod.columns || mod.fields.slice(0, 2).map((f) => ({ key: f.key, label: (r) => r[f.key] }));
  const showBenefits = mod.key === 'insurance-policies' && !clientId;
  list.innerHTML = rows
    .map(
      (r) => `
      <div class="list-item">
        <span>${cols.map((c) => escapeHtml(String(c.label(r) ?? ''))).join(' · ')}</span>
        <span class="item-actions">
          ${showBenefits ? `<button class="link-btn" data-benefits-id="${r.id}">สิทธิ</button>` : ''}
          <button class="del" data-id="${r.id}">ลบ</button>
        </span>
      </div>`
    )
    .join('');

  list.querySelectorAll('.del').forEach((btn) => {
    btn.onclick = async () => {
      await authFetch('/' + mod.path + '/' + btn.dataset.id, { method: 'DELETE' });
      invalidateLookupCache(mod.path);
      renderModule(mod, { containerId, clientId });
    };
  });

  if (showBenefits) {
    list.querySelectorAll('[data-benefits-id]').forEach((btn) => {
      btn.onclick = () => {
        const policy = rows.find((r) => r.id === btn.dataset.benefitsId);
        renderInsuranceBenefits(policy, mod);
      };
    });
  }
}

async function renderInsuranceBenefits(policy, parentMod) {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  const benefits = await authFetch(`/insurance-policies/${policy.id}/benefits`);

  content.innerHTML = `
    <button class="link-btn back-btn" id="back-to-policies">← กลับไปหน้าประกัน</button>
    <div class="card">
      <h3>${escapeHtml(policy.insurer)}</h3>
      <p class="sub">${escapeHtml(policy.policy_type)} · สิทธิความคุ้มครอง</p>
    </div>
    <form class="entry-form" id="benefit-form">
      <div class="field"><label>ชื่อสิทธิ</label><input name="benefit_name" required /></div>
      <div class="field"><label>วงเงิน/สิทธิสูงสุด</label><input type="number" name="benefit_limit" /></div>
      <div class="field"><label>ใช้ไปแล้ว</label><input type="number" name="used_amount" /></div>
      <div class="field"><label>รอบต่ออายุ</label>
        <select name="renew_cycle">
          <option value="รายปี">รายปี</option>
          <option value="ต่อครั้ง">ต่อครั้ง</option>
        </select>
      </div>
      <button class="primary" type="submit">เพิ่มสิทธิ</button>
    </form>
    <div class="section-title">สิทธิทั้งหมด (${benefits.length})</div>
    <div class="card" id="benefit-list">
      ${
        benefits.length
          ? benefits
              .map(
                (b) => `
        <div class="list-item">
          <span>${escapeHtml(b.benefit_name)}<span class="meta"> · ${Number(b.used_amount || 0).toLocaleString('th-TH')}/${b.benefit_limit ? Number(b.benefit_limit).toLocaleString('th-TH') : '-'}</span></span>
          <button class="del" data-bid="${b.id}">ลบ</button>
        </div>`
              )
              .join('')
          : '<p class="empty">ยังไม่มีสิทธิ</p>'
      }
    </div>
  `;

  document.getElementById('back-to-policies').onclick = () => renderModule(parentMod);

  document.getElementById('benefit-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    for (const k of Object.keys(data)) {
      if (data[k] === '') delete data[k];
    }
    await authFetch(`/insurance-policies/${policy.id}/benefits`, { method: 'POST', body: JSON.stringify(data) });
    renderInsuranceBenefits(policy, parentMod);
  };

  document.querySelectorAll('#benefit-list .del').forEach((btn) => {
    btn.onclick = async () => {
      await authFetch(`/insurance-policies/${policy.id}/benefits/${btn.dataset.bid}`, { method: 'DELETE' });
      renderInsuranceBenefits(policy, parentMod);
    };
  });
}


function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function attr(v) {
  return v === undefined || v === null ? '' : String(v);
}

main().catch((err) => {
  document.getElementById('login-screen').innerHTML = `<p>เกิดข้อผิดพลาด: ${escapeHtml(err.message)}</p>`;
  console.error(err);
});
