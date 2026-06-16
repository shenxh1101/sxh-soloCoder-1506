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

function renderBookingList(filters = {}) {
  const bookings = getBookings(filters).slice().reverse();
  const container = document.getElementById('booking-list');

  if (bookings.length === 0) {
    container.innerHTML = '<p class="empty-text small" style="padding:32px;">暂无匹配的预订记录</p>';
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

    const contractBadge = b.contractNo
      ? `<span style="display:inline-block;font-size:10px;background:rgba(212,165,116,0.15);color:#B8956A;padding:2px 8px;border-radius:10px;margin-left:6px;">📄 ${b.contractNo}</span>`
      : '';

    const statusLabel = CONTRACT_STATUS_LABELS[b.contractStatus] || CONTRACT_STATUS_LABELS.not_generated;
    const statusBadge = `<span style="display:inline-block;font-size:10px;background:${statusLabel.color}15;color:${statusLabel.color};padding:2px 8px;border-radius:10px;margin-left:6px;">${statusLabel.icon} ${statusLabel.label}</span>`;

    const balanceLabel = BALANCE_STATUS_LABELS[b.balanceStatus] || BALANCE_STATUS_LABELS.unpaid;
    const balanceBadge = `<span style="display:inline-block;font-size:10px;background:${balanceLabel.color}15;color:${balanceLabel.color};padding:2px 8px;border-radius:10px;margin-left:6px;">${balanceLabel.icon} ${balanceLabel.label}</span>`;

    const subInfo = [];
    subInfo.push(`客户：${b.customerName || '未填写'}`);
    if (b.customerPhone) subInfo.push(b.customerPhone);
    if (b.salesPerson) subInfo.push(`销售：${b.salesPerson}`);
    if (b.depositAmount > 0) subInfo.push(`定金：${formatCurrency(b.depositAmount)}`);
    if (b.remark) subInfo.push(`💬 ${b.remark.substring(0, 15) + (b.remark.length > 15 ? '...' : '')}`);

    html += `
      <div class="booking-item" data-booking-id="${b.id}">
        <div class="booking-type-icon">${typeIcon}</div>
        <div class="booking-info">
          <div class="booking-info-main">${staffName}${contractBadge}${statusBadge}${balanceBadge}</div>
          <div class="booking-info-sub">${subInfo.join(' · ')}</div>
        </div>
        <div class="booking-date">${b.date}</div>
        <div style="display:flex;gap:6px;">
          <button class="booking-del-btn" data-edit="${b.id}" style="background:rgba(45,106,79,0.1);color:#2D6A4F;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(45,106,79,0.2)'" onmouseout="this.style.background='rgba(45,106,79,0.1)'">✏️ 编辑</button>
          <button class="booking-del-btn" data-del="${b.id}">取消</button>
        </div>
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
      const contractBadge = b.contractNo ? ` [${b.contractNo}]` : '';
      const statusLabel = CONTRACT_STATUS_LABELS[b.contractStatus] || CONTRACT_STATUS_LABELS.not_generated;
      const statusText = ` ${statusLabel.icon}${statusLabel.label}`;
      return `<option value="${b.id}" 
        data-date="${b.date}" 
        data-emcee="${b.emceeId || ''}" 
        data-photographer="${b.photographerId || ''}" 
        data-cameraman="${b.cameramanId || ''}" 
        data-makeup="${b.makeupId || ''}" 
        data-customer="${b.customerName || ''}" 
        data-phone="${b.customerPhone || ''}"
        data-venue="${(b.weddingVenue || '').replace(/"/g, '&quot;')}"
        data-sales="${(b.salesPerson || '').replace(/"/g, '&quot;')}"
        data-deposit="${(b.depositAmount !== null && b.depositAmount !== undefined && b.depositAmount !== '') ? b.depositAmount : ''}"
        data-balance="${b.balanceStatus || 'unpaid'}"
        data-status="${b.contractStatus || 'not_generated'}"
        data-remark="${(b.remark || '').replace(/"/g, '&quot;')}"
        data-istype="${b.singleType || ''}"
        data-contractno="${b.contractNo || ''}"
      >${b.date} · ${typeLabel} · ${customerText}${contractBadge}${statusText} · ${formatCurrency(b.totalPrice)}</option>`;
    }).join('');
}

// ==================== 跟进记录渲染 ====================
function renderFollowupList(bookingId) {
  const container = document.getElementById('followup-list');
  if (!container) return;
  const followups = getFollowups(bookingId);
  if (followups.length === 0) {
    container.innerHTML = '<p class="empty-text small" style="padding:16px;text-align:center;">暂无跟进记录，销售可在上方追加沟通内容</p>';
    return;
  }
  container.innerHTML = followups.map(f => {
    const resultLabel = FOLLOWUP_RESULT_LABELS[f.result] || FOLLOWUP_RESULT_LABELS.pending;
    const time = new Date(f.createdAt).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    return `
      <div style="display:flex;gap:10px;padding:10px 12px;background:#fff;border-radius:8px;margin-bottom:8px;border-left:3px solid ${resultLabel.color};">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:11px;color:#A0896C;">${time}</span>
            <span style="font-size:11px;padding:1px 8px;border-radius:10px;background:${resultLabel.color}15;color:${resultLabel.color};">${resultLabel.icon} ${resultLabel.label}</span>
            ${f.nextContactAt ? `<span style="font-size:11px;color:#1971C2;">📅 下次：${f.nextContactAt}</span>` : ''}
          </div>
          <div style="font-size:13px;color:#3D2914;line-height:1.6;word-break:break-word;">${escapeHtml(f.content) || '（未填写内容）'}</div>
        </div>
        <button data-fu-del="${f.id}" style="background:transparent;border:none;color:#C92A2A;cursor:pointer;font-size:12px;padding:2px 6px;border-radius:4px;" onmouseover="this.style.background='rgba(201,42,42,0.1)'" onmouseout="this.style.background='transparent'">删除</button>
      </div>
    `;
  }).join('');
}

// ==================== 收款流水渲染 ====================
function renderPaymentList(bookingId) {
  const container = document.getElementById('payment-list');
  if (!container) return;
  const payments = getPayments(bookingId);
  if (payments.length === 0) {
    container.innerHTML = '<p class="empty-text small" style="padding:16px;text-align:center;">暂无收款记录，录入后会自动更新付款状态和定金金额</p>';
    return;
  }
  container.innerHTML = payments.map(p => {
    const typeLabel = PAYMENT_TYPE_LABELS[p.type] || PAYMENT_TYPE_LABELS.deposit;
    const sign = p.type === PAYMENT_TYPE.REFUND ? '-' : '+';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border-radius:8px;margin-bottom:6px;">
        <span style="font-size:12px;padding:2px 8px;border-radius:10px;background:${typeLabel.color}15;color:${typeLabel.color};min-width:72px;text-align:center;">${typeLabel.icon} ${typeLabel.label}</span>
        <span style="font-size:13px;color:#3D2914;font-weight:600;flex-shrink:0;">${sign}${formatCurrency(p.amount)}</span>
        <span style="font-size:11px;color:#A0896C;">${p.paidAt || ''}</span>
        <span style="flex:1;font-size:12px;color:#6B4423;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.remark) || ''}</span>
        <button data-py-del="${p.id}" style="background:transparent;border:none;color:#C92A2A;cursor:pointer;font-size:12px;padding:2px 6px;border-radius:4px;flex-shrink:0;" onmouseover="this.style.background='rgba(201,42,42,0.1)'" onmouseout="this.style.background='transparent'">删除</button>
      </div>
    `;
  }).join('');
}

// ==================== 收款汇总渲染 ====================
function renderPaymentSummary(bookingId) {
  const panel = document.getElementById('payment-summary-panel');
  if (!panel) return;
  if (!bookingId) {
    panel.style.display = 'none';
    return;
  }
  const summary = calculatePaymentSummary(bookingId);
  if (!summary) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';
  const balanceLabel = BALANCE_STATUS_LABELS[summary.balanceStatus] || BALANCE_STATUS_LABELS.unpaid;
  document.getElementById('sum-total-price').textContent = formatCurrency(summary.totalPrice);
  document.getElementById('sum-paid').textContent = formatCurrency(summary.totalPaid);
  document.getElementById('sum-due').textContent = formatCurrency(summary.amountDue);
  document.getElementById('sum-status').textContent = balanceLabel.icon + ' ' + balanceLabel.label;
  document.getElementById('sum-status').style.color = balanceLabel.color;
}

// ==================== 日历视图 ====================
let calendarMode = 'list'; // list | week | month
let calendarAnchor = new Date();

function setCalendarMode(mode) {
  calendarMode = mode;
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    if (btn.dataset.view === mode) {
      btn.classList.add('active');
      btn.style.background = '#fff';
      btn.style.boxShadow = '0 1px 4px rgba(184,149,106,0.2)';
      btn.style.fontWeight = '600';
    } else {
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.boxShadow = 'none';
      btn.style.fontWeight = '400';
    }
  });
  const isCal = mode !== 'list';
  document.getElementById('booking-list').style.display = isCal ? 'none' : 'block';
  document.getElementById('calendar-view').style.display = isCal ? 'block' : 'none';
  document.getElementById('calendar-controls').style.display = isCal ? 'flex' : 'none';
  if (isCal) renderCalendarView();
}

function shiftCalendar(delta) {
  if (calendarMode === 'week') {
    calendarAnchor.setDate(calendarAnchor.getDate() + delta * 7);
  } else if (calendarMode === 'month') {
    calendarAnchor.setMonth(calendarAnchor.getMonth() + delta);
  }
  renderCalendarView();
}

function renderCalendarView(filters = null) {
  const container = document.getElementById('calendar-view');
  if (!container) return;
  const bookings = getBookings(filters || {});
  const staff = getStaffList();
  const emcees = staff.filter(s => s.type === STAFF_TYPES.EMCEE);
  const photographers = staff.filter(s => s.type === STAFF_TYPES.PHOTOGRAPHER);
  const cameramen = staff.filter(s => s.type === STAFF_TYPES.CAMERAMAN);
  const makeupArtists = staff.filter(s => s.type === STAFF_TYPES.MAKEUP);

  let dates = [];
  let title = '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (calendarMode === 'week') {
    const start = new Date(calendarAnchor);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    title = `第 ${getWeekNumber(start)} 周 · ${formatDate(start)} ~ ${formatDate(new Date(start.getTime() + 6 * 86400000))}`;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
  } else {
    const year = calendarAnchor.getFullYear();
    const month = calendarAnchor.getMonth();
    title = `${year}年${month + 1}月`;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay() || 7;
    for (let i = 1 - startWeekday; i <= lastDay.getDate(); i++) {
      dates.push(new Date(year, month, i < 1 ? 1 : i));
      if (i < 1) dates[dates.length - 1] = new Date(year, month - 1, new Date(year, month, 0).getDate() + i);
    }
  }

  document.getElementById('calendar-title').textContent = title;

  const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  const dateStrs = dates.map(formatDate);

  // 构建每一天的预订字典
  const byDate = {};
  for (const b of bookings) {
    if (!byDate[b.date]) byDate[b.date] = [];
    byDate[b.date].push(b);
  }

  // 检查每种人员在某天是否有档期
  function hasBooking(typeList, dateStr) {
    for (const s of typeList) {
      if (!s.bookedDates.includes(dateStr)) return false;
    }
    return true;
  }

  let html = '';
  html += '<div style="display:grid;grid-template-columns:80px repeat(' + dates.length + ', 1fr);gap:1px;background:#E8C4A0;border:1px solid #E8C4A0;border-radius:8px;overflow:hidden;font-size:12px;">';
  // 星期头
  html += '<div style="background:#FAF5EA;padding:6px;text-align:center;font-weight:600;color:#6B4423;">类型</div>';
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = formatDate(d) === formatDate(today);
    html += `<div style="background:${isToday ? 'rgba(212,165,116,0.2)' : '#FAF5EA'};padding:6px;text-align:center;font-weight:600;color:${isWeekend ? '#C9184A' : '#6B4423'};">${weekdayLabels[i % 7]}<br><span style="font-size:14px;color:#3D2914;">${d.getDate()}</span></div>`;
  }
  // 司仪行
  html += '<div style="background:#fff;padding:8px;color:#6B4423;font-weight:500;">🎤 司仪</div>';
  for (let i = 0; i < dates.length; i++) {
    const ds = dateStrs[i];
    const busyCount = emcees.filter(s => s.bookedDates.includes(ds)).length;
    const conflict = busyCount === emcees.length;
    html += `<div style="background:${conflict ? 'rgba(201,42,42,0.08)' : '#fff'};padding:4px;text-align:center;color:${conflict ? '#C92A2A' : (busyCount > 0 ? '#B8956A' : '#2D6A4F')};font-size:11px;">${busyCount}/${emcees.length}</div>`;
  }
  // 摄影行
  html += '<div style="background:#fff;padding:8px;color:#6B4423;font-weight:500;">📷 摄影</div>';
  for (let i = 0; i < dates.length; i++) {
    const ds = dateStrs[i];
    const busyCount = photographers.filter(s => s.bookedDates.includes(ds)).length;
    const conflict = busyCount === photographers.length;
    html += `<div style="background:${conflict ? 'rgba(201,42,42,0.08)' : '#fff'};padding:4px;text-align:center;color:${conflict ? '#C92A2A' : (busyCount > 0 ? '#B8956A' : '#2D6A4F')};font-size:11px;">${busyCount}/${photographers.length}</div>`;
  }
  // 摄像行
  html += '<div style="background:#fff;padding:8px;color:#6B4423;font-weight:500;">🎥 摄像</div>';
  for (let i = 0; i < dates.length; i++) {
    const ds = dateStrs[i];
    const busyCount = cameramen.filter(s => s.bookedDates.includes(ds)).length;
    const conflict = busyCount === cameramen.length;
    html += `<div style="background:${conflict ? 'rgba(201,42,42,0.08)' : '#fff'};padding:4px;text-align:center;color:${conflict ? '#C92A2A' : (busyCount > 0 ? '#B8956A' : '#2D6A4F')};font-size:11px;">${busyCount}/${cameramen.length}</div>`;
  }
  // 化妆行
  html += '<div style="background:#fff;padding:8px;color:#6B4423;font-weight:500;">💄 化妆</div>';
  for (let i = 0; i < dates.length; i++) {
    const ds = dateStrs[i];
    const busyCount = makeupArtists.filter(s => s.bookedDates.includes(ds)).length;
    const conflict = busyCount === makeupArtists.length;
    html += `<div style="background:${conflict ? 'rgba(201,42,42,0.08)' : '#fff'};padding:4px;text-align:center;color:${conflict ? '#C92A2A' : (busyCount > 0 ? '#B8956A' : '#2D6A4F')};font-size:11px;">${busyCount}/${makeupArtists.length}</div>`;
  }
  // 订单行
  html += '<div style="background:#fff;padding:8px;color:#6B4423;font-weight:500;">📋 订单</div>';
  for (let i = 0; i < dates.length; i++) {
    const ds = dateStrs[i];
    const bList = byDate[ds] || [];
    let cellHtml = '';
    if (bList.length > 0) {
      cellHtml = bList.slice(0, 3).map(b => {
        const statusLabel = CONTRACT_STATUS_LABELS[b.contractStatus] || CONTRACT_STATUS_LABELS.not_generated;
        return `<div data-cal-booking="${b.id}" style="font-size:10px;background:${statusLabel.color}12;color:${statusLabel.color};padding:2px 4px;border-radius:4px;margin-bottom:2px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(b.customerName || '未命名')} · ${formatCurrency(b.totalPrice)}">${statusLabel.icon}${escapeHtml((b.customerName || '未命名').substring(0, 4))}</div>`;
      }).join('');
      if (bList.length > 3) cellHtml += `<div style="font-size:10px;color:#A0896C;">+${bList.length - 3}</div>`;
    }
    html += `<div style="background:#fff;padding:2px;min-height:40px;">${cellHtml}</div>`;
  }
  html += '</div>';
  html += '<div style="margin-top:8px;font-size:11px;color:#A0896C;display:flex;gap:16px;">';
  html += '<span><span style="display:inline-block;width:10px;height:10px;background:rgba(45,106,79,0.3);border-radius:2px;margin-right:4px;"></span>档期充足</span>';
  html += '<span><span style="display:inline-block;width:10px;height:10px;background:rgba(184,149,106,0.3);border-radius:2px;margin-right:4px;"></span>部分预订</span>';
  html += '<span><span style="display:inline-block;width:10px;height:10px;background:rgba(201,42,42,0.3);border-radius:2px;margin-right:4px;"></span>当日全满（冲突）</span>';
  html += '</div>';
  container.innerHTML = html;
}

function getWeekNumber(d) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ==================== 预订列表渲染（增加最近跟进内容） ====================
const _origRenderBookingList = renderBookingList;
renderBookingList = function(filters) {
  const container = document.getElementById('booking-list');
  if (!container) return;
  const bookings = getBookings(filters);
  if (bookings.length === 0) {
    container.innerHTML = '<p class="empty-text">暂无预订记录</p>';
    return;
  }
  let html = '';
  bookings.forEach(b => {
    let staffName = '';
    let typeIcon = '🎎';
    if (b.singleType) {
      const t = TYPE_LABELS[b.singleType];
      typeIcon = t.icon;
      const s = getStaffById(b.emceeId || b.photographerId || b.cameramanId || b.makeupId);
      staffName = s ? s.name : '未知人员';
    } else {
      const names = [];
      if (b.emceeId) { const s = getStaffById(b.emceeId); if (s) names.push(s.name); }
      if (b.photographerId) { const s = getStaffById(b.photographerId); if (s) names.push(s.name); }
      if (b.cameramanId) { const s = getStaffById(b.cameramanId); if (s) names.push(s.name); }
      if (b.makeupId) { const s = getStaffById(b.makeupId); if (s) names.push(s.name); }
      staffName = names.join(' · ');
    }

    const contractBadge = b.contractNo
      ? `<span style="display:inline-block;font-size:10px;background:rgba(212,165,116,0.15);color:#B8956A;padding:2px 8px;border-radius:10px;margin-left:6px;">📄 ${b.contractNo}</span>`
      : '';

    const statusLabel = CONTRACT_STATUS_LABELS[b.contractStatus] || CONTRACT_STATUS_LABELS.not_generated;
    const statusBadge = `<span style="display:inline-block;font-size:10px;background:${statusLabel.color}15;color:${statusLabel.color};padding:2px 8px;border-radius:10px;margin-left:6px;">${statusLabel.icon} ${statusLabel.label}</span>`;

    const balanceLabel = BALANCE_STATUS_LABELS[b.balanceStatus] || BALANCE_STATUS_LABELS.unpaid;
    const balanceBadge = `<span style="display:inline-block;font-size:10px;background:${balanceLabel.color}15;color:${balanceLabel.color};padding:2px 8px;border-radius:10px;margin-left:6px;">${balanceLabel.icon} ${balanceLabel.label}</span>`;

    const latestFu = getLatestFollowup(b.id);

    const subInfo = [];
    subInfo.push(`客户：${b.customerName || '未填写'}`);
    if (b.customerPhone) subInfo.push(b.customerPhone);
    if (b.salesPerson) subInfo.push(`销售：${b.salesPerson}`);
    if (b.depositAmount !== null && b.depositAmount !== undefined && b.depositAmount !== '' && parseFloat(b.depositAmount) > 0) {
      subInfo.push(`定金：${formatCurrency(parseFloat(b.depositAmount))}`);
    }
    if (latestFu && latestFu.content) {
      subInfo.push(`📞 ${latestFu.content.substring(0, 12) + (latestFu.content.length > 12 ? '...' : '')}`);
    }
    if (b.remark) subInfo.push(`💬 ${b.remark.substring(0, 10) + (b.remark.length > 10 ? '...' : '')}`);

    html += `
      <div class="booking-item" data-booking-id="${b.id}">
        <div class="booking-type-icon">${typeIcon}</div>
        <div class="booking-info">
          <div class="booking-info-main">${staffName}${contractBadge}${statusBadge}${balanceBadge}</div>
          <div class="booking-info-sub">${subInfo.join(' · ')}</div>
        </div>
        <div class="booking-date">${b.date}</div>
        <div style="display:flex;gap:6px;">
          <button class="booking-del-btn" data-edit="${b.id}" style="background:rgba(45,106,79,0.1);color:#2D6A4F;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(45,106,79,0.2)'" onmouseout="this.style.background='rgba(45,106,79,0.1)'">✏️ 编辑</button>
          <button class="booking-del-btn" data-contract-jump="${b.id}" style="background:rgba(25,113,194,0.1);color:#1971C2;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(25,113,194,0.2)'" onmouseout="this.style.background='rgba(25,113,194,0.1)'">📄 合同</button>
          <button class="booking-del-btn" data-del="${b.id}">取消</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
};
