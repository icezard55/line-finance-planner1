function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function baht(n) {
  return Math.round(Number(n || 0)).toLocaleString('th-TH');
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
      <div class="stat income">${score.overall} / 100</div>
      <p class="sub">${score.overall >= 70 ? 'ระดับ: ดี' : score.overall >= 40 ? 'ระดับ: ปานกลาง' : 'ระดับ: ควรปรับปรุง'}</p>
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
