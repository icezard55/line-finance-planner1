// finance-crm link: consent screen for an agent's invite (?crm=CODE) and the
// "ตัวแทนของฉัน" tab. Loaded after app.js — uses its authFetch/escapeHtml/attr/goToTab.

const CRM_SCOPES = [
  { key: 'reminders', label: 'รับแจ้งเตือนเบี้ยประกันผ่าน LINE', hint: 'แจ้งก่อนครบกำหนดชำระ พร้อมลิงก์ช่องทางชำระของบริษัท', default: true },
  { key: 'family', label: 'ข้อมูลครอบครัว', hint: 'ชื่อ ความสัมพันธ์ วันเกิด ผู้อยู่ในอุปการะ' },
  { key: 'income', label: 'อาชีพและรายได้เฉลี่ย', hint: 'จากหน้าโปรไฟล์' },
  { key: 'goals', label: 'เป้าหมายการเงิน', hint: 'เช่น เกษียณ การศึกษาบุตร' },
  { key: 'balance_sheet', label: 'ทรัพย์สินและหนี้สิน', hint: 'ยอดรวมแต่ละรายการ' },
  { key: 'own_policies', label: 'กรมธรรม์ที่บันทึกเองในแอป', hint: 'รวมถึงกรมธรรม์จากบริษัทอื่น' },
];

const PAYMENT_MODE_TH = {
  monthly: 'รายเดือน', quarterly: 'ราย 3 เดือน', semiannual: 'ราย 6 เดือน', annual: 'รายปี', single: 'ชำระครั้งเดียว',
};

function thDate(iso) {
  if (!iso) return '-';
  return new Date(String(iso).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC',
  });
}

function scopeCheckboxes(selected, name) {
  return CRM_SCOPES.map(
    (s) => `
    <label class="list-item scope-item">
      <input type="checkbox" name="${name}" value="${s.key}" ${selected.includes(s.key) ? 'checked' : ''} />
      <span><strong>${escapeHtml(s.label)}</strong><br /><span class="meta">${escapeHtml(s.hint)}</span></span>
    </label>`
  ).join('');
}

function checkedValues(root, name) {
  return [...root.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
}

function clearCrmParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('crm');
  window.history.replaceState(null, '', url.toString());
}

async function renderCrmConsent(code) {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  let invite;
  try {
    invite = await authFetch('/crm/invite/' + encodeURIComponent(code));
  } catch {
    clearCrmParam();
    content.innerHTML = `<div class="card"><h3>ลิงก์เชิญใช้ไม่ได้</h3>
      <p class="sub">ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่จากตัวแทนของคุณ</p></div>`;
    return;
  }
  if (invite.already_linked) {
    clearCrmParam();
    return renderAgent();
  }

  const defaults = CRM_SCOPES.filter((s) => s.default).map((s) => s.key);
  content.innerHTML = `
    <div class="card">
      <h3>เชื่อมกับตัวแทนประกันของคุณ</h3>
      <p class="sub">คุณ${escapeHtml(invite.agent_name)}${invite.agent_phone ? ` (โทร ${escapeHtml(invite.agent_phone)})` : ''}
        ขอเชื่อมบัญชีเพื่อดูแลกรมธรรม์ของคุณ${escapeHtml(invite.customer_first_name)}</p>
      <p class="sub">เมื่อเชื่อมแล้ว คุณจะเห็นกรมธรรม์ที่ตัวแทนดูแลและวันครบกำหนดชำระในแอปนี้</p>
    </div>
    <div class="section-title">เลือกข้อมูลที่ยินยอมให้ตัวแทนเห็น</div>
    <div class="card">${scopeCheckboxes(defaults, 'crm-scope')}</div>
    <p class="sub crm-note">🔒 รายการรายรับ-รายจ่ายของคุณจะไม่ถูกแชร์ และยกเลิกการเชื่อมได้ทุกเมื่อที่แท็บ "ตัวแทนของฉัน"</p>
    <button class="primary crm-full" id="crm-accept">ยินยอมและเชื่อมบัญชี</button>
    <button class="link-btn crm-center" id="crm-decline">ไม่ใช่ตอนนี้</button>
  `;

  document.getElementById('crm-accept').onclick = async (e) => {
    e.target.disabled = true;
    try {
      await authFetch('/crm/accept', {
        method: 'POST',
        body: JSON.stringify({ code, scopes: checkedValues(content, 'crm-scope') }),
      });
      clearCrmParam();
      renderAgent();
    } catch (err) {
      e.target.disabled = false;
      alert('เชื่อมไม่สำเร็จ: ' + err.message);
    }
  };
  document.getElementById('crm-decline').onclick = () => {
    clearCrmParam();
    goToTab('dashboard');
  };
}

function policyCard(p, today) {
  const overdue = p.next_due_date && String(p.next_due_date).slice(0, 10) < today;
  const payUrl = p.app_url || p.payment_url;
  return `
    <div class="card">
      <p class="sub crm-tight">${escapeHtml(p.insurer)}</p>
      <h3>${escapeHtml(p.plan_name || 'กรมธรรม์')} · ${escapeHtml(p.policy_no)}</h3>
      <p class="sub">เบี้ย ${Number(p.premium).toLocaleString('th-TH')} บาท (${PAYMENT_MODE_TH[p.payment_mode] || p.payment_mode})
        ${p.sum_assured ? ` · ทุนประกัน ${Number(p.sum_assured).toLocaleString('th-TH')} บาท` : ''}</p>
      ${
        p.next_due_date
          ? `<p class="crm-due ${overdue ? 'overdue' : ''}">งวดถัดไป ${thDate(p.next_due_date)} ·
               ${Number(p.next_due_amount).toLocaleString('th-TH')} บาท${overdue ? ' (เลยกำหนด)' : ''}</p>`
          : ''
      }
      <div class="row crm-actions">
        ${payUrl && p.payment_method === 'self_pay' ? `<button class="primary" data-pay="${attr(payUrl)}">ชำระเบี้ย</button>` : ''}
        ${p.next_due_date ? `<button class="link-btn" data-paid="${attr(p.policy_id)}">แจ้งตัวแทนว่าจ่ายแล้ว</button>` : ''}
      </div>
    </div>`;
}

function linkCard(l) {
  return `
    <div class="card">
      <h3>${escapeHtml(l.agent_name)}</h3>
      <p class="sub">${l.agent_phone ? `<a href="tel:${attr(l.agent_phone)}">📞 ${escapeHtml(l.agent_phone)}</a> · ` : ''}เชื่อมเมื่อ ${thDate(l.consented_at)}</p>
      <div>${scopeCheckboxes(l.scopes, 'scope-' + l.link_id)}</div>
      <div class="row crm-actions">
        <button class="primary" data-save-link="${attr(l.link_id)}">บันทึกการตั้งค่า</button>
        <button class="link-btn crm-danger" data-revoke-link="${attr(l.link_id)}">ยกเลิกการเชื่อม</button>
      </div>
    </div>`;
}

async function renderAgent() {
  const content = document.getElementById('content');
  content.innerHTML = '<p class="empty">กำลังโหลด...</p>';

  const [links, policies] = await Promise.all([authFetch('/crm/links'), authFetch('/crm/policies')]);

  if (links.length === 0) {
    content.innerHTML = `<div class="card"><h3>ยังไม่ได้เชื่อมกับตัวแทนประกัน</h3>
      <p class="sub">ขอลิงก์เชิญจากตัวแทนประกันของคุณ แล้วเปิดลิงก์ใน LINE เพื่อดูกรมธรรม์และรับแจ้งเตือนเบี้ยอัตโนมัติ</p></div>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  content.innerHTML = `
    <div class="section-title">กรมธรรม์ที่ตัวแทนดูแล</div>
    ${policies.length ? policies.map((p) => policyCard(p, today)).join('') : '<p class="empty">ตัวแทนยังไม่ได้บันทึกกรมธรรม์</p>'}
    <div class="section-title">ตัวแทนและข้อมูลที่แชร์</div>
    ${links.map(linkCard).join('')}
  `;

  content.querySelectorAll('[data-pay]').forEach((btn) => {
    btn.onclick = () => liff.openWindow({ url: btn.dataset.pay, external: true });
  });
  content.querySelectorAll('[data-paid]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('แจ้งตัวแทนว่าชำระเบี้ยงวดนี้แล้ว?')) return;
      await authFetch(`/crm/policies/${btn.dataset.paid}/paid`, { method: 'POST' });
      btn.textContent = 'แจ้งแล้ว ✓';
      btn.disabled = true;
    };
  });
  content.querySelectorAll('[data-save-link]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.saveLink;
      await authFetch('/crm/links/' + id, {
        method: 'PUT',
        body: JSON.stringify({ scopes: checkedValues(content, 'scope-' + id) }),
      });
      btn.textContent = 'บันทึกแล้ว ✓';
    };
  });
  content.querySelectorAll('[data-revoke-link]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('ยกเลิกการเชื่อมกับตัวแทนนี้? ตัวแทนจะไม่เห็นข้อมูลของคุณ และคุณจะไม่ได้รับแจ้งเตือนเบี้ยทาง LINE')) return;
      await authFetch('/crm/links/' + btn.dataset.revokeLink, { method: 'DELETE' });
      renderAgent();
    };
  });
}
