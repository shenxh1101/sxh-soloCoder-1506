function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showModal(contentHTML) {
  document.getElementById('modal-content').innerHTML = contentHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}

function switchView(viewName) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${viewName}`);
  });
  if (viewName === 'schedule') {
    renderStaffList('emcee');
    renderBookingList();
    populateBookingStaffSelect('emcee');
  } else if (viewName === 'contract') {
    initContractView();
  } else if (viewName === 'export') {
    initExportView();
  }
}

function renderStarsHTML(count) {
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += i < count ? '<span class="star">★</span>' : '<span class="star empty">☆</span>';
  }
  return html;
}

function renderStaffCard(staff, typeKey) {
  const typeInfo = TYPE_LABELS[staff.type];
  return `
    <div class="staff-card" data-staff-id="${staff.id}" data-type="${staff.type}" style="animation-delay:${typeKey * 0.08}s">
      <div class="staff-card-type">${typeInfo.icon} ${typeInfo.label}</div>
      <div class="staff-card-avatar">${staff.avatar}</div>
      <div class="staff-card-name">${staff.name}</div>
      <div class="staff-card-stars">${renderStarsHTML(staff.stars)}</div>
      <div class="staff-card-price">${formatCurrency(staff.price)}</div>
      <div class="staff-card-price-label">服务费用</div>
      <button class="staff-card-replace" data-replace="${staff.type}">
        <span class="staff-card-replace-icon">🔄</span>
        更换人员
      </button>
    </div>
  `;
}

function renderRecommendResults(combo, budgetTarget) {
  const container = document.getElementById('staff-cards');
  let html = '';
  const types = ['emcee', 'photographer', 'cameraman', 'makeup'];
  types.forEach((t, i) => {
    html += renderStaffCard(combo[t], i);
  });
  container.innerHTML = html;

  document.getElementById('total-price').textContent = formatCurrency(combo.totalPrice);
  const match = getBudgetMatchClass(combo.totalPrice, budgetTarget);
  const matchEl = document.getElementById('budget-match');
  matchEl.className = 'budget-match ' + match.class;
  matchEl.textContent = match.text;
}

function renderReplaceModal(candidates, currentStaff, budgetTarget, budgetMin, budgetMax) {
  const typeInfo = TYPE_LABELS[currentStaff.type];
  const budgetRangeText = budgetMin > 0 || (budgetMax && isFinite(budgetMax))
    ? ` · 预算范围 ${formatCurrency(budgetMin || 0)}-${formatCurrency(budgetMax || 99999999)}`
    : '';

  let inBudgetCount = 0, outBudgetCount = 0;
  let cardsHTML = candidates.map(c => {
    const diffText = c.priceDiff > 0
      ? `<span class="replace-price-diff up">+${formatCurrency(c.priceDiff)}</span>`
      : c.priceDiff < 0
        ? `<span class="replace-price-diff down">${formatCurrency(c.priceDiff)}</span>`
        : `<span class="replace-price-diff">价格相同</span>`;

    const budgetTag = c.withinBudget
      ? (inBudgetCount++, '<div style="margin-top:6px;"><span style="font-size:11px;background:rgba(45,106,79,0.12);color:#2D6A4F;padding:2px 10px;border-radius:10px;">✅ 在预算范围内</span></div>')
      : (outBudgetCount++, '<div style="margin-top:6px;"><span style="font-size:11px;background:rgba(201,24,74,0.1);color:#C9184A;padding:2px 10px;border-radius:10px;">⚠️ 超出预算范围</span></div>');

    const cardStyle = !c.withinBudget ? 'opacity:0.62;background:rgba(253,245,230,0.5);' : '';

    return `
      <div class="replace-card" data-staff-id="${c.staff.id}" data-price-diff="${c.priceDiff}" style="${cardStyle}">
        <div class="replace-avatar">${c.staff.avatar}</div>
        <div class="replace-name">${c.staff.name}</div>
        <div class="replace-stars">${renderStarsHTML(c.staff.stars)}</div>
        <div class="replace-price">${formatCurrency(c.staff.price)}</div>
        ${diffText}
        ${budgetTag}
      </div>
    `;
  }).join('');

  const summaryTip = budgetMin > 0 || (budgetMax && isFinite(budgetMax))
    ? `<div style="font-size:12px;color:#A0896C;margin-bottom:12px;">💡 绿色标记为换人后仍在预算范围内的人员（共${inBudgetCount}个），红色标记为超出预算（共${outBudgetCount}个）</div>`
    : '';

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">更换${typeInfo.icon} ${typeInfo.label}</h3>
      <p class="modal-subtitle">当前选择：${currentStaff.name} · ${formatCurrency(currentStaff.price)}${budgetRangeText}</p>
    </div>
    <div class="modal-body">
      ${summaryTip}
      ${candidates.length > 0
        ? `<div class="replace-list">${cardsHTML}</div>`
        : `<p class="empty-text">暂无其他可选人员</p>`}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">取消</button>
    </div>
  `;
  showModal(html);
}

function renderStaffList(type) {
  const staff = getStaffByType(type);
  const container = document.getElementById('staff-list');
  const today = getToday();

  let html = '';
  staff.forEach(s => {
    const isAvailable = !s.bookedDates.includes(today);
    const upcomingDates = s.bookedDates.filter(d => d >= today).slice(0, 5);
    html += `
      <div class="staff-mini-card" data-staff-id="${s.id}">
        <div class="staff-mini-header">
          <div>
            <div class="staff-mini-name">${s.avatar} ${s.name}</div>
            <div class="staff-mini-stars">${renderStarsHTML(s.stars)}</div>
          </div>
          <span class="status-dot ${isAvailable ? 'free' : 'busy'}" title="${isAvailable ? '今日空闲' : '今日已预订'}"></span>
        </div>
        <div class="staff-mini-price">${formatCurrency(s.price)}</div>
        ${upcomingDates.length > 0 ? `
          <div class="staff-mini-dates">
            <div class="staff-mini-dates-label">📅 已预订 (${s.bookedDates.length})：</div>
            ${upcomingDates.map(d => `<span class="staff-mini-date-tag">${d}</span>`).join('')}
            ${s.bookedDates.length > 5 ? `<span class="staff-mini-date-tag">+${s.bookedDates.length - 5}更多</span>` : ''}
          </div>
        ` : '<div class="staff-mini-dates"><span style="color:#2D6A4F;">✅ 暂无预订档期</span></div>'}
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderBookingList() {
  const bookings = getBookings().slice().reverse();
  const container = document.getElementById('booking-list');

  if (bookings.length === 0) {
    container.innerHTML = '<p class="empty-text small" style="padding:32px;">暂无预订记录</p>';
    return;
  }

  let html = '';
  bookings.forEach(b => {
    let typeIcon = '📋';
    let staffName = '组合预订';
    if (b.singleType) {
      const staff = getStaffById(b.emceeId || b.photographerId || b.cameramanId || b.makeupId);
      if (staff) {
        typeIcon = TYPE_LABELS[b.singleType].icon;
        staffName = staff.name;
      }
    } else {
      const names = [];
      if (b.emceeId) { const s = getStaffById(b.emceeId); if (s) names.push(s.name); }
      if (b.photographerId) { const s = getStaffById(b.photographerId); if (s) names.push(s.name); }
      if (b.cameramanId) { const s = getStaffById(b.cameramanId); if (s) names.push(s.name); }
      if (b.makeupId) { const s = getStaffById(b.makeupId); if (s) names.push(s.name); }
      staffName = names.join('、');
    }
    html += `
      <div class="booking-item" data-booking-id="${b.id}">
        <div class="booking-type-icon">${typeIcon}</div>
        <div class="booking-info">
          <div class="booking-info-main">${staffName}</div>
          <div class="booking-info-sub">客户：${b.customerName || '未填写'} ${b.customerPhone ? '· ' + b.customerPhone : ''}</div>
        </div>
        <div class="booking-date">${b.date}</div>
        <button class="booking-del-btn" data-del="${b.id}">取消</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function populateBookingStaffSelect(type) {
  const staff = getStaffByType(type);
  const select = document.getElementById('booking-staff');
  select.innerHTML = staff.map(s =>
    `<option value="${s.id}">${s.avatar} ${s.name} · ${renderStarsHTML(s.stars)} · ${formatCurrency(s.price)}</option>`
  ).join('');
}

function populateContractStaffSelects() {
  const types = [
    { key: 'emcee', el: 'contract-emcee' },
    { key: 'photographer', el: 'contract-photographer' },
    { key: 'cameraman', el: 'contract-cameraman' },
    { key: 'makeup', el: 'contract-makeup' }
  ];
  types.forEach(t => {
    const staff = getStaffByType(t.key);
    const el = document.getElementById(t.el);
    el.innerHTML = '<option value="">请选择</option>' +
      staff.map(s => `<option value="${s.id}" data-price="${s.price}">${s.avatar} ${s.name} · ${formatCurrency(s.price)}</option>`).join('');
  });
}

function populateContractBookingSelect() {
  const bookings = getBookings().slice().reverse();
  const select = document.getElementById('contract-booking');
  select.innerHTML = '<option value="">— 手动选择人员 —</option>' +
    bookings.map(b => {
      let typeLabel = '🎎 四大金刚整套';
      if (b.singleType) {
        typeLabel = TYPE_LABELS[b.singleType].icon + ' ' + TYPE_LABELS[b.singleType].label + '（单项）';
      } else {
        let staffCount = 0;
        if (b.emceeId) staffCount++;
        if (b.photographerId) staffCount++;
        if (b.cameramanId) staffCount++;
        if (b.makeupId) staffCount++;
        if (staffCount < 4) typeLabel = `🎎 组合服务（${staffCount}项）`;
      }
      const customerText = b.customerName || '未命名客户';
      return `<option value="${b.id}" 
        data-date="${b.date}" 
        data-emcee="${b.emceeId || ''}" 
        data-photographer="${b.photographerId || ''}" 
        data-cameraman="${b.cameramanId || ''}" 
        data-makeup="${b.makeupId || ''}" 
        data-customer="${b.customerName || ''}" 
        data-phone="${b.customerPhone || ''}"
        data-remark="${(b.remark || '').replace(/"/g, '&quot;')}"
        data-istype="${b.singleType || ''}"
      >${b.date} · ${typeLabel} · ${customerText} · ${formatCurrency(b.totalPrice)}</option>`;
    }).join('');
}
