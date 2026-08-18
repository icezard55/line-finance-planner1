const LIFF_ID = '2011118214-fbnXxp46';

const MODULES = [
  {
    key: 'transactions', label: 'รายรับ-รายจ่าย', path: 'transactions',
    fields: [
      { key: 'type', label: 'ประเภท', type: 'select', options: ['expense', 'income'], required: true },
      { key: 'amount', label: 'จำนวนเงิน', type: 'number', required: true },
      { key: 'category_id', label: 'ช่องทางชำระเงิน', type: 'category-select', required: false },
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
      { key: 'category_id', label: 'ช่องทางชำระเงิน', type: 'category-select', required: false },
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
let activeTab = 'dashboard';

const KNOWN_TABS = ['dashboard', 'profile', 'analysis', ...MODULES.map((m) => m.key)];

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
  const mod = MODULES.find((m) => m.key === activeTab);
  if (mod) return renderModule(mod);
}

async function getCategories() {
  if (!categoriesCache) categoriesCache = await authFetch('/categories');
  return categoriesCache;
}

async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  const [transactions, reminders, budgets, cats] = await Promise.all([
    authFetch('/transactions'),
    authFetch('/reminders'),
    authFetch('/budgets'),
    getCategories(),
  ]);
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));

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

async function renderAnalysis() {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  const [transactions, cats] = await Promise.all([authFetch('/transactions'), getCategories()]);
  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    months.push({ year: now.getFullYear(), month: now.getMonth() - i, income: 0, expense: 0 });
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

  const thisMonthExpenses = transactions.filter((t) => {
    const d = new Date(t.occurred_at);
    return t.type === 'expense' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const byCategory = {};
  for (const t of thisMonthExpenses) {
    const key = t.category_id ? catName[t.category_id] || 'ไม่ระบุหมวด' : 'ไม่ระบุหมวด';
    byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
  }
  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCat = Math.max(1, ...categoryRows.map(([, v]) => v));

  content.innerHTML = `
    <div class="card">
      <h3>รายรับ-รายจ่ายย้อนหลัง 6 เดือน</h3>
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
          <div class="cat-bar"><div class="cat-bar-fill" style="width:${((val / maxCat) * 100).toFixed(1)}%"></div></div>
        </div>`
              )
              .join('')
          : '<p class="empty">ยังไม่มีรายจ่ายเดือนนี้</p>'
      }
    </div>
  `;
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

async function renderModule(mod) {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  let categoryOptions = '';
  if (mod.fields.some((f) => f.type === 'category-select')) {
    const cats = await getCategories();
    categoryOptions = cats.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }

  const rows = await authFetch('/' + mod.path);

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
      return `<div class="field"><label>${f.label}</label><input type="${f.type}" name="${f.key}" ${f.required ? 'required' : ''} /></div>`;
    })
    .join('');

  content.innerHTML = `
    <form class="entry-form" id="add-form">
      ${formFields}
      <button class="primary" type="submit">เพิ่ม</button>
    </form>
    <div class="section-title">รายการทั้งหมด (${rows.length})</div>
    <div class="card" id="list"></div>
  `;

  renderList(mod, rows);

  document.getElementById('add-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    for (const k of Object.keys(data)) {
      if (data[k] === '') delete data[k];
    }
    Object.assign(data, mod.extraFields || {});
    await authFetch('/' + mod.path, { method: 'POST', body: JSON.stringify(data) });
    invalidateLookupCache(mod.path);
    renderModule(mod);
  };
}

function invalidateLookupCache(path) {
  if (path === 'categories') categoriesCache = null;
}

function renderList(mod, rows) {
  const list = document.getElementById('list');
  if (!rows.length) {
    list.innerHTML = '<p class="empty">ยังไม่มีข้อมูล</p>';
    return;
  }
  const cols = mod.columns || mod.fields.slice(0, 2).map((f) => ({ key: f.key, label: (r) => r[f.key] }));
  list.innerHTML = rows
    .map(
      (r) => `
      <div class="list-item">
        <span>${cols.map((c) => escapeHtml(String(c.label(r) ?? ''))).join(' · ')}</span>
        <button class="del" data-id="${r.id}">ลบ</button>
      </div>`
    )
    .join('');

  list.querySelectorAll('.del').forEach((btn) => {
    btn.onclick = async () => {
      await authFetch('/' + mod.path + '/' + btn.dataset.id, { method: 'DELETE' });
      invalidateLookupCache(mod.path);
      renderModule(mod);
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
