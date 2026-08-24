function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function baht(n) {
  return Math.round(Number(n || 0)).toLocaleString('th-TH');
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

async function main() {
  const root = document.getElementById('report-root');
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    root.innerHTML = '<p class="empty">ไม่พบลิงก์รายงาน</p>';
    return;
  }

  let data;
  try {
    const res = await fetch('/api/public/report/' + encodeURIComponent(token));
    if (!res.ok) throw new Error('not found');
    data = await res.json();
  } catch (err) {
    root.innerHTML = '<p class="empty">ไม่พบรายงานนี้ ลิงก์อาจไม่ถูกต้อง</p>';
    return;
  }

  const { client, score, insurancePolicies, goals } = data;

  root.innerHTML = `
    <div class="topbar-title" style="margin-bottom:4px;">แผนการเงินของ</div>
    <h1 style="margin:0 0 4px;font-size:1.3rem;">${escapeHtml(client.name)}</h1>
    <p class="sub" style="margin:0 0 20px;">${escapeHtml(client.occupation || '')}</p>

    <div class="card">
      <h3>คะแนนสุขภาพทางการเงิน</h3>
      <div class="gauge-wrap">
        ${buildScoreGaugeSvg(score.overall)}
        <p class="sub">${score.overall >= 70 ? 'ระดับ: ดี' : score.overall >= 40 ? 'ระดับ: ปานกลาง' : 'ระดับ: ควรปรับปรุง'}</p>
      </div>
    </div>

    <div class="card">
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

    <div class="section-title">ภาพรวมการเงิน</div>
    <div class="card">
      <div class="list-item"><span>รายรับเฉลี่ย/เดือน</span><span class="meta">${baht(score.summary.avgMonthlyIncome)} บาท</span></div>
      <div class="list-item"><span>รายจ่ายเฉลี่ย/เดือน</span><span class="meta">${baht(score.summary.avgMonthlyExpense)} บาท</span></div>
      <div class="list-item"><span>สินทรัพย์รวม</span><span class="meta">${baht(score.summary.totalAssets)} บาท</span></div>
      <div class="list-item"><span>หนี้สินรวม</span><span class="meta">${baht(score.summary.totalLiabilities)} บาท</span></div>
      <div class="list-item"><span>มูลค่าสุทธิ</span><span class="meta">${baht(score.summary.netWorth)} บาท</span></div>
    </div>

    ${
      insurancePolicies.length
        ? `<div class="section-title">ความคุ้มครองปัจจุบัน</div>
    <div class="card">
      ${insurancePolicies
        .map(
          (p) => `<div class="list-item"><span>${escapeHtml(p.insurer)} · ${escapeHtml(p.policy_type)}</span><span class="meta">${baht(p.coverage_amount)} บาท</span></div>`
        )
        .join('')}
    </div>`
        : ''
    }

    ${
      goals.length
        ? `<div class="section-title">เป้าหมายชีวิต</div>
    <div class="card">
      ${goals
        .map(
          (g) => `
        <div class="cat-row">
          <div class="cat-row-top"><span>${escapeHtml(g.goal_name)}</span><span>${baht(g.current_amount)} / ${baht(g.target_amount)}</span></div>
          <div class="cat-bar"><div class="cat-bar-fill" style="width:${Math.min(100, (Number(g.current_amount || 0) / Math.max(1, Number(g.target_amount || 1))) * 100).toFixed(1)}%"></div></div>
        </div>`
        )
        .join('')}
    </div>`
        : ''
    }

    <p class="sub no-print" style="text-align:center;margin-top:24px;">รายงานนี้จัดทำโดยที่ปรึกษาการเงินของคุณ</p>
  `;
}

main();
