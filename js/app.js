let currentCombos = [];
let currentComboIndex = 0;
let currentWeddingDate = null;
let currentBudgetTarget = 30000;
let currentBudgetMin = 0;
let currentBudgetMax = Infinity;
let currentReplacingType = null;

function initContractView() {
  document.getElementById('contract-no').value = generateContractNo();
  populateContractStaffSelects();
  populateContractBookingSelect();
  updateContractTotal();

  const today = new Date();
  today.setDate(today.getDate() + 7);
  if (!document.getElementById('contract-date').value) {
    document.getElementById('contract-date').value = formatDate(today);
  }

  renderContractPreviewFromForm();
}

function initExportView() {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  end.setDate(end.getDate() + 60);

  if (!document.getElementById('export-start').value) {
    document.getElementById('export-start').value = formatDate(start);
  }
  if (!document.getElementById('export-end').value) {
    document.getElementById('export-end').value = formatDate(end);
  }
}

function updateContractTotal() {
  let total = 0;
  ['contract-emcee', 'contract-photographer', 'contract-cameraman', 'contract-makeup'].forEach(id => {
    const sel = document.getElementById(id);
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.price) {
      total += parseInt(opt.dataset.price);
    }
  });
  document.getElementById('contract-total').value = formatCurrency(total);
}

function renderContractPreviewFromForm() {
  const depositRaw = document.getElementById('contract-deposit').value;
  const depositAmount = (depositRaw === '' || depositRaw === null || depositRaw === undefined)
    ? null : parseFloat(depositRaw);
  const bookingSelect = document.getElementById('contract-booking');
  const bookingId = bookingSelect ? bookingSelect.value : '';
  const formData = {
    contractNo: document.getElementById('contract-no').value,
    customerName: document.getElementById('contract-customer').value,
    customerPhone: document.getElementById('contract-phone').value,
    weddingDate: document.getElementById('contract-date').value,
    weddingVenue: document.getElementById('contract-venue').value,
    salesPerson: document.getElementById('contract-sales').value,
    depositAmount: depositAmount,
    balanceStatus: document.getElementById('contract-balance').value,
    emceeId: document.getElementById('contract-emcee').value || null,
    photographerId: document.getElementById('contract-photographer').value || null,
    cameramanId: document.getElementById('contract-cameraman').value || null,
    makeupId: document.getElementById('contract-makeup').value || null,
    remark: document.getElementById('contract-remark') ? document.getElementById('contract-remark').value : ''
  };
  const data = buildContractData(formData, bookingId || null);
  document.getElementById('contract-preview').innerHTML = renderContractPreview(data);
}

function syncContractToBooking() {
  const bookingSelect = document.getElementById('contract-booking');
  const bookingId = bookingSelect.value;
  if (!bookingId) return;
  const depositRaw = document.getElementById('contract-deposit').value;
  const depositAmount = (depositRaw === '' || depositRaw === null || depositRaw === undefined)
    ? null : parseFloat(depositRaw);
  const updates = {
    customerName: document.getElementById('contract-customer').value,
    customerPhone: document.getElementById('contract-phone').value,
    weddingVenue: document.getElementById('contract-venue').value,
    salesPerson: document.getElementById('contract-sales').value,
    depositAmount: depositAmount,
    balanceStatus: document.getElementById('contract-balance').value,
    remark: document.getElementById('contract-remark') ? document.getElementById('contract-remark').value : ''
  };
  updateBooking(bookingId, updates);
  populateContractBookingSelect();
  bookingSelect.value = bookingId;
}

document.addEventListener('DOMContentLoaded', function() {
  initMockData();

  const today = new Date();
  today.setDate(today.getDate() + 7);
  document.getElementById('wedding-date').value = formatDate(today);
  document.getElementById('booking-date').value = formatDate(today);

  const budgetSlider = document.getElementById('budget-target');
  budgetSlider.addEventListener('input', function() {
    currentBudgetTarget = parseInt(this.value);
    document.getElementById('budget-target-display').textContent = formatCurrency(currentBudgetTarget);
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      switchView(this.dataset.view);
    });
  });

  document.getElementById('modal-close').addEventListener('click', hideModal);
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) hideModal();
  });

  document.getElementById('btn-recommend').addEventListener('click', handleRecommend);

  document.getElementById('btn-prev-combo').addEventListener('click', function() {
    if (currentComboIndex > 0) {
      currentComboIndex--;
      updateComboDisplay();
    }
  });

  document.getElementById('btn-next-combo').addEventListener('click', function() {
    if (currentComboIndex < currentCombos.length - 1) {
      currentComboIndex++;
      updateComboDisplay();
    }
  });

  document.getElementById('staff-cards').addEventListener('click', function(e) {
    const replaceBtn = e.target.closest('[data-replace]');
    if (replaceBtn) {
      currentReplacingType = replaceBtn.dataset.replace;
      handleReplace(currentReplacingType);
    }
  });

  document.getElementById('modal-content').addEventListener('click', function(e) {
    if (e.target.id === 'modal-cancel') {
      hideModal();
      return;
    }
    const card = e.target.closest('.replace-card');
    if (card && currentReplacingType) {
      const staffId = card.dataset.staffId;
      applyReplacement(currentReplacingType, staffId);
    }
  });

  document.getElementById('btn-confirm-booking').addEventListener('click', handleConfirmBooking);

  document.getElementById('booking-type').addEventListener('change', function() {
    populateBookingStaffSelect(this.value);
    document.getElementById('conflict-warning').classList.add('hidden');
    const submitBtn = document.querySelector('#booking-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
    setTimeout(checkBookingConflict, 50);
  });

  document.getElementById('booking-staff').addEventListener('change', checkBookingConflict);
  document.getElementById('booking-date').addEventListener('input', checkBookingConflict);
  document.getElementById('booking-date').addEventListener('change', checkBookingConflict);

  document.getElementById('booking-form').addEventListener('submit', function(e) {
    e.preventDefault();
    handleManualBooking();
  });

  document.getElementById('staff-tabs').addEventListener('click', function(e) {
    const tab = e.target.closest('.staff-tab');
    if (tab) {
      document.querySelectorAll('.staff-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderStaffList(tab.dataset.type);
    }
  });

  document.getElementById('booking-list').addEventListener('click', function(e) {
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      if (confirm('确定要取消此预订吗？取消后相关人员档期将被释放。')) {
        if (deleteBooking(delBtn.dataset.del)) {
          showToast('预订已取消，档期已释放', 'success');
          renderBookingList();
          populateBookingStaffSelect(document.getElementById('booking-type').value);
          populateContractBookingSelect();
        } else {
          showToast('取消失败', 'error');
        }
      }
      return;
    }

    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      openEditBookingModal(editBtn.dataset.edit);
    }
  });

  ['contract-emcee', 'contract-photographer', 'contract-cameraman', 'contract-makeup',
   'contract-customer', 'contract-phone', 'contract-date', 'contract-remark',
   'contract-venue', 'contract-sales', 'contract-deposit', 'contract-balance'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function() {
      updateContractTotal();
      renderContractPreviewFromForm();
    });
    el.addEventListener('input', function() {
      updateContractTotal();
      renderContractPreviewFromForm();
    });
  });

  document.getElementById('contract-booking').addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    const bookingId = opt && opt.value ? opt.value : '';

    ['contract-emcee', 'contract-photographer', 'contract-cameraman', 'contract-makeup'].forEach(id => {
      document.getElementById(id).value = '';
    });

    document.getElementById('contract-date').value = '';
    document.getElementById('contract-customer').value = '';
    document.getElementById('contract-phone').value = '';
    document.getElementById('contract-venue').value = '';
    document.getElementById('contract-sales').value = '';
    document.getElementById('contract-deposit').value = '';
    document.getElementById('contract-balance').value = 'unpaid';
    document.getElementById('contract-status').value = 'not_generated';
    if (document.getElementById('contract-remark')) {
      document.getElementById('contract-remark').value = '';
    }

    if (bookingId) {
      const isType = opt.dataset.istype;
      const contractNo = opt.dataset.contractno || '';

      document.getElementById('contract-date').value = opt.dataset.date || '';
      document.getElementById('contract-customer').value = opt.dataset.customer || '';
      document.getElementById('contract-phone').value = opt.dataset.phone || '';
      document.getElementById('contract-venue').value = opt.dataset.venue || '';
      document.getElementById('contract-sales').value = opt.dataset.sales || '';
      document.getElementById('contract-deposit').value = (opt.dataset.deposit !== null && opt.dataset.deposit !== undefined && opt.dataset.deposit !== '') ? opt.dataset.deposit : '';
      document.getElementById('contract-balance').value = opt.dataset.balance || 'unpaid';
      document.getElementById('contract-status').value = opt.dataset.status || 'not_generated';
      if (document.getElementById('contract-remark')) {
        document.getElementById('contract-remark').value = opt.dataset.remark || '';
      }

      if (isType) {
        if (isType === 'emcee') document.getElementById('contract-emcee').value = opt.dataset.emcee || '';
        if (isType === 'photographer') document.getElementById('contract-photographer').value = opt.dataset.photographer || '';
        if (isType === 'cameraman') document.getElementById('contract-cameraman').value = opt.dataset.cameraman || '';
        if (isType === 'makeup') document.getElementById('contract-makeup').value = opt.dataset.makeup || '';
      } else {
        document.getElementById('contract-emcee').value = opt.dataset.emcee || '';
        document.getElementById('contract-photographer').value = opt.dataset.photographer || '';
        document.getElementById('contract-cameraman').value = opt.dataset.cameraman || '';
        document.getElementById('contract-makeup').value = opt.dataset.makeup || '';
      }

      if (contractNo) {
        document.getElementById('contract-no').value = contractNo;
      } else {
        document.getElementById('contract-no').value = generateContractNo();
      }
    } else {
      document.getElementById('contract-no').value = generateContractNo();
    }
    
    updateContractTotal();
    renderContractPreviewFromForm();

    // 显示/隐藏跟进记录、收款流水、收款汇总
    const panels = ['followup-panel', 'payment-panel', 'payment-summary-panel'];
    panels.forEach(pid => {
      const el = document.getElementById(pid);
      if (el) el.style.display = bookingId ? 'block' : 'none';
    });
    if (bookingId) {
      renderFollowupList(bookingId);
      renderPaymentList(bookingId);
      renderPaymentSummary(bookingId);
    }
  });

  document.getElementById('btn-preview-contract').addEventListener('click', function() {
    renderContractPreviewFromForm();
    showToast('合同预览已更新', 'success');
  });

  document.getElementById('btn-print-contract').addEventListener('click', function() {
    renderContractPreviewFromForm();
    const html = document.getElementById('contract-preview').innerHTML;
    
    const bookingSelect = document.getElementById('contract-booking');
    const bookingId = bookingSelect.value;
    if (bookingId) {
      updateContractStatus(bookingId, CONTRACT_STATUS.PRINTED);
      document.getElementById('contract-status').value = CONTRACT_STATUS.PRINTED;
      showToast('合同已打印，状态已更新为「已打印」', 'success');
    }
    
    printContract(html);
  });

  document.getElementById('btn-mark-signed').addEventListener('click', function() {
    const bookingSelect = document.getElementById('contract-booking');
    const bookingId = bookingSelect.value;
    if (!bookingId) {
      showToast('请先选择预订记录', 'error');
      return;
    }
    if (confirm('确定要将此合同标记为「已签约」吗？')) {
      updateContractStatus(bookingId, CONTRACT_STATUS.SIGNED);
      document.getElementById('contract-status').value = CONTRACT_STATUS.SIGNED;
      populateContractBookingSelect();
      bookingSelect.value = bookingId;
      showToast('合同状态已更新为「已签约」', 'success');
    }
  });

  document.getElementById('contract-status').addEventListener('change', function() {
    const bookingSelect = document.getElementById('contract-booking');
    const bookingId = bookingSelect.value;
    if (!bookingId) return;
    const newStatus = this.value;
    updateContractStatus(bookingId, newStatus);
    populateContractBookingSelect();
    bookingSelect.value = bookingId;
    const statusLabel = CONTRACT_STATUS_LABELS[newStatus];
    showToast(`合同状态已更新为「${statusLabel.icon} ${statusLabel.label}」`, 'success');
  });

  document.getElementById('contract-venue').addEventListener('input', syncContractToBooking);
  document.getElementById('contract-sales').addEventListener('input', syncContractToBooking);
  document.getElementById('contract-deposit').addEventListener('input', syncContractToBooking);
  document.getElementById('contract-balance').addEventListener('change', syncContractToBooking);
  document.getElementById('contract-customer').addEventListener('input', syncContractToBooking);
  document.getElementById('contract-phone').addEventListener('input', syncContractToBooking);
  document.getElementById('contract-remark').addEventListener('input', syncContractToBooking);

  function applyBookingFilters() {
    const filters = {};
    const date = document.getElementById('filter-date').value;
    const customer = document.getElementById('filter-customer').value.trim();
    const status = document.getElementById('filter-status').value;
    const type = document.getElementById('filter-type').value;
    if (date) filters.date = date;
    if (customer) filters.customerName = customer;
    if (status) filters.contractStatus = status;
    if (type) filters.staffType = type;
    renderBookingList(filters);
    if (typeof calendarMode !== 'undefined' && calendarMode !== 'list') {
      renderCalendarView(filters);
    }
  }

  document.getElementById('filter-date').addEventListener('change', applyBookingFilters);
  document.getElementById('filter-customer').addEventListener('input', applyBookingFilters);
  document.getElementById('filter-status').addEventListener('change', applyBookingFilters);
  document.getElementById('filter-type').addEventListener('change', applyBookingFilters);

  document.getElementById('btn-clear-filters').addEventListener('click', function() {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-customer').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-type').value = '';
    renderBookingList();
    showToast('筛选条件已清除', 'success');
  });

  document.getElementById('btn-preview-export').addEventListener('click', function() {
    const exportType = document.getElementById('export-type') ? document.getElementById('export-type').value : 'schedule';
    if (exportType === 'followup') {
      document.getElementById('export-preview').innerHTML = renderFollowupExportPreview();
      return;
    }
    const startDate = document.getElementById('export-start').value;
    const endDate = document.getElementById('export-end').value;
    const types = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);

    if (!startDate || !endDate) {
      showToast('请选择日期范围', 'error');
      return;
    }
    if (startDate > endDate) {
      showToast('开始日期不能晚于结束日期', 'error');
      return;
    }
    if (types.length === 0) {
      showToast('请至少选择一种人员类型', 'error');
      return;
    }

    const data = getUnbookedSchedule(startDate, endDate, types);
    document.getElementById('export-preview').innerHTML = renderExportPreview(data);
  });

  document.getElementById('btn-export-csv').addEventListener('click', function() {
    const exportType = document.getElementById('export-type') ? document.getElementById('export-type').value : 'schedule';
    if (exportType === 'followup') {
      const result = exportFollowupToCSV();
      if (result.success) {
        showToast(`已成功导出 ${result.count} 条预订跟进记录：${result.filename}`, 'success');
      } else {
        showToast(result.message, 'error');
      }
      return;
    }
    const startDate = document.getElementById('export-start').value;
    const endDate = document.getElementById('export-end').value;
    const types = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);

    if (!startDate || !endDate) {
      showToast('请选择日期范围', 'error');
      return;
    }
    if (startDate > endDate) {
      showToast('开始日期不能晚于结束日期', 'error');
      return;
    }
    if (types.length === 0) {
      showToast('请至少选择一种人员类型', 'error');
      return;
    }

    const result = exportUnbookedToCSV(startDate, endDate, types);
    if (result.success) {
      showToast(`已成功导出 ${result.count} 条记录：${result.filename}`, 'success');
    } else {
      showToast(result.message, 'error');
    }
  });

  // 导出类型切换
  if (document.getElementById('export-type')) {
    document.getElementById('export-type').addEventListener('change', function() {
      const type = this.value;
      const optPanel = document.getElementById('schedule-export-options');
      const previewTitle = document.querySelector('.export-preview-panel h3');
      if (optPanel) optPanel.style.display = type === 'schedule' ? 'block' : 'none';
      if (previewTitle) previewTitle.textContent = type === 'schedule' ? '📋 未预订档期预览' : '📋 预订跟进表预览';
      document.getElementById('export-preview').innerHTML = '<p class="empty-text small">设置条件后点击"预览数据"查看</p>';
    });
  }

  // 跟进记录追加
  if (document.getElementById('btn-add-followup')) {
    document.getElementById('btn-add-followup').addEventListener('click', function() {
      const bookingSelect = document.getElementById('contract-booking');
      const bookingId = bookingSelect.value;
      if (!bookingId) { showToast('请先选择预订记录', 'error'); return; }
      const content = document.getElementById('followup-content').value.trim();
      const nextContact = document.getElementById('followup-next').value;
      const result = document.getElementById('followup-result').value;
      if (!content) { showToast('请填写沟通内容', 'error'); return; }
      addFollowup(bookingId, content, nextContact, result);
      document.getElementById('followup-content').value = '';
      document.getElementById('followup-next').value = '';
      renderFollowupList(bookingId);
      renderBookingList();
      populateContractBookingSelect();
      bookingSelect.value = bookingId;
      showToast('跟进记录已保存', 'success');
    });
  }

  // 跟进记录删除（事件委托）
  document.addEventListener('click', function(e) {
    const delBtn = e.target.closest('[data-fu-del]');
    if (delBtn) {
      if (confirm('确定要删除这条跟进记录吗？')) {
        deleteFollowup(delBtn.dataset.fuDel);
        const bookingSelect = document.getElementById('contract-booking');
        const bookingId = bookingSelect ? bookingSelect.value : '';
        if (bookingId) renderFollowupList(bookingId);
        renderBookingList();
        showToast('跟进记录已删除', 'success');
      }
      return;
    }
    // 收款流水删除
    const pyDelBtn = e.target.closest('[data-py-del]');
    if (pyDelBtn) {
      if (confirm('确定要删除这条收款记录吗？删除后会自动重新计算付款状态。')) {
        deletePayment(pyDelBtn.dataset.pyDel);
        const bookingSelect = document.getElementById('contract-booking');
        const bookingId = bookingSelect ? bookingSelect.value : '';
        if (bookingId) {
          renderPaymentList(bookingId);
          renderPaymentSummary(bookingId);
          renderContractPreviewFromForm();
          populateContractBookingSelect();
          bookingSelect.value = bookingId;
        }
        renderBookingList();
        showToast('收款记录已删除，付款状态已更新', 'success');
      }
      return;
    }
    // 预订列表"合同"按钮
    const jumpBtn = e.target.closest('[data-contract-jump]');
    if (jumpBtn) {
      switchView('contract');
      setTimeout(() => {
        populateContractBookingSelect();
        const sel = document.getElementById('contract-booking');
        if (sel) {
          sel.value = jumpBtn.dataset.contractJump;
          sel.dispatchEvent(new Event('change'));
        }
      }, 150);
      return;
    }
    // 日历单元格里的单子
    const calBooking = e.target.closest('[data-cal-booking]');
    if (calBooking) {
      const bid = calBooking.dataset.calBooking;
      if (confirm(`要打开这条预订记录吗？\n点击"确定"进入编辑，点击"取消"跳转到合同页。`)) {
        openEditBookingModal(bid);
      } else {
        switchView('contract');
        setTimeout(() => {
          populateContractBookingSelect();
          const sel = document.getElementById('contract-booking');
          if (sel) { sel.value = bid; sel.dispatchEvent(new Event('change')); }
        }, 150);
      }
      return;
    }
    // 视图模式按钮
    const vmBtn = e.target.closest('.view-mode-btn');
    if (vmBtn) {
      setCalendarMode(vmBtn.dataset.view);
      return;
    }
  });

  // 收款录入
  if (document.getElementById('btn-add-payment')) {
    document.getElementById('btn-add-payment').addEventListener('click', function() {
      const bookingSelect = document.getElementById('contract-booking');
      const bookingId = bookingSelect.value;
      if (!bookingId) { showToast('请先选择预订记录', 'error'); return; }
      const type = document.getElementById('payment-type').value;
      const amount = document.getElementById('payment-amount').value;
      const paidAt = document.getElementById('payment-date').value || new Date().toISOString().slice(0, 10);
      const remark = document.getElementById('payment-remark').value.trim();
      if (!amount || parseFloat(amount) <= 0) { showToast('请输入有效的金额', 'error'); return; }
      const result = addPayment(bookingId, type, amount, remark, paidAt);
      if (!result.success) { showToast(result.message, 'error'); return; }
      document.getElementById('payment-amount').value = '';
      document.getElementById('payment-remark').value = '';
      renderPaymentList(bookingId);
      renderPaymentSummary(bookingId);
      renderContractPreviewFromForm();
      renderBookingList();
      populateContractBookingSelect();
      bookingSelect.value = bookingId;
      showToast(`${PAYMENT_TYPE_LABELS[type].label}已录入，付款状态已更新`, 'success');
    });
  }

  // 日历控件：上一期/下一期/今天
  if (document.getElementById('btn-cal-prev')) {
    document.getElementById('btn-cal-prev').addEventListener('click', () => shiftCalendar(-1));
  }
  if (document.getElementById('btn-cal-next')) {
    document.getElementById('btn-cal-next').addEventListener('click', () => shiftCalendar(1));
  }
  if (document.getElementById('btn-cal-today')) {
    document.getElementById('btn-cal-today').addEventListener('click', function() {
      calendarAnchor = new Date();
      renderCalendarView();
    });
  }

  populateBookingStaffSelect('emcee');
  // 初始化日历视图的默认收款日期
  if (document.getElementById('payment-date')) {
    document.getElementById('payment-date').value = new Date().toISOString().slice(0, 10);
  }
});

function handleRecommend() {
  const date = document.getElementById('wedding-date').value;
  const budgetMin = parseInt(document.getElementById('budget-min').value) || 0;
  const budgetMax = parseInt(document.getElementById('budget-max').value) || 99999999;
  const budgetTarget = parseInt(document.getElementById('budget-target').value) || 30000;

  if (!date) {
    showToast('请选择婚礼日期', 'error');
    return;
  }
  if (date < getToday()) {
    showToast('婚礼日期不能早于今天', 'error');
    return;
  }
  if (budgetMin > budgetMax) {
    showToast('最低预算不能大于最高预算', 'error');
    return;
  }

  currentWeddingDate = date;
  currentBudgetTarget = budgetTarget;
  currentBudgetMin = budgetMin;
  currentBudgetMax = budgetMax;

  const { combos, missing } = generateAllCombos(date);

  if (missing) {
    const missingTypes = getMissingTypesText(missing);
    document.getElementById('recommend-empty').classList.remove('hidden');
    document.getElementById('recommend-results').classList.add('hidden');
    document.getElementById('recommend-empty').innerHTML = `
      <div class="empty-illustration">😔</div>
      <p class="empty-text">抱歉，${date} 当天无可用组合</p>
      <p style="color:#C9184A;margin-top:12px;font-size:14px;">缺少可预订的：${missingTypes}</p>
      <p style="color:#A0896C;margin-top:8px;font-size:13px;">请尝试选择其他日期</p>
    `;
    return;
  }

  const inBudgetCombos = combos.filter(c =>
    c.totalPrice >= budgetMin && c.totalPrice <= budgetMax
  );

  if (inBudgetCombos.length === 0) {
    const prices = combos.map(c => c.totalPrice).sort((a, b) => a - b);
    const lowestPrice = prices[0];
    const highestPrice = prices[prices.length - 1];

    document.getElementById('recommend-empty').classList.remove('hidden');
    document.getElementById('recommend-results').classList.add('hidden');

    let suggestHTML = '';
    if (lowestPrice > budgetMax) {
      const diff = lowestPrice - budgetMax;
      suggestHTML = `<p style="color:#C9184A;margin-top:12px;font-size:14px;">当前所有组合均超出预算范围，最低价格 ${formatCurrency(lowestPrice)}，比您的最高预算高出 ${formatCurrency(diff)}</p>`;
    } else if (highestPrice < budgetMin) {
      suggestHTML = `<p style="color:#2D6A4F;margin-top:12px;font-size:14px;">当前所有组合均低于您的最低预算，最高价格 ${formatCurrency(highestPrice)}</p>`;
    } else {
      suggestHTML = `<p style="color:#B8956A;margin-top:12px;font-size:14px;">您的预算范围为 ${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)}<br>当前可用组合价格范围为 ${formatCurrency(lowestPrice)} - ${formatCurrency(highestPrice)}</p>`;
    }

    document.getElementById('recommend-empty').innerHTML = `
      <div class="empty-illustration">💐</div>
      <p class="empty-text">已为您找到 ${combos.length} 组可用组合</p>
      ${suggestHTML}
      <p style="color:#A0896C;margin-top:12px;font-size:13px;">但没有完全符合您预算范围 ${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)} 的组合</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="relaxBudget('expand_min');">
          降低最低预算至 ${formatCurrency(lowestPrice < budgetMin ? 0 : Math.max(0, budgetMin - 5000))}
        </button>
        <button class="btn btn-primary" onclick="relaxBudget('expand_max');">
          提高最高预算至 ${formatCurrency(highestPrice > budgetMax ? highestPrice : budgetMax + 5000)}
        </button>
        <button class="btn btn-secondary" onclick="relaxBudget('clear_all');">
          清除所有预算限制
        </button>
      </div>
    `;
    return;
  }

  currentCombos = sortCombosByBudget(inBudgetCombos, budgetTarget, budgetMin, budgetMax);
  currentComboIndex = 0;

  document.getElementById('recommend-empty').classList.add('hidden');
  document.getElementById('recommend-results').classList.remove('hidden');

  const subtitle = `${date} · 共找到 ${currentCombos.length} 组匹配组合 · 按预算接近度排序 · 预算范围 ${formatCurrency(budgetMin)}-${formatCurrency(budgetMax)}`;
  document.getElementById('results-subtitle').textContent = subtitle;

  updateComboDisplay();
  showToast(`已为您匹配 ${currentCombos.length} 组黄金组合！`, 'success');
}

function relaxBudget(mode) {
  const { combos } = generateAllCombos(currentWeddingDate);
  const prices = combos.map(c => c.totalPrice).sort((a, b) => a - b);
  const lowestPrice = prices[0];
  const highestPrice = prices[prices.length - 1];

  if (mode === 'expand_min') {
    document.getElementById('budget-min').value = lowestPrice < currentBudgetMin ? 0 : Math.max(0, currentBudgetMin - 5000);
  } else if (mode === 'expand_max') {
    document.getElementById('budget-max').value = highestPrice > currentBudgetMax ? highestPrice : currentBudgetMax + 5000;
  } else if (mode === 'clear_all') {
    document.getElementById('budget-min').value = 0;
    document.getElementById('budget-max').value = 99999999;
  }
  handleRecommend();
}

function updateComboDisplay() {
  if (currentCombos.length === 0) return;
  const combo = currentCombos[currentComboIndex];
  renderRecommendResults(combo, currentBudgetTarget);
  document.getElementById('combo-index').textContent = `${currentComboIndex + 1} / ${currentCombos.length}`;
  document.getElementById('btn-prev-combo').disabled = currentComboIndex === 0;
  document.getElementById('btn-next-combo').disabled = currentComboIndex >= currentCombos.length - 1;
}

function handleReplace(type) {
  if (currentCombos.length === 0) return;
  const currentCombo = currentCombos[currentComboIndex];
  const candidates = getReplaceCandidates(
    currentCombo, type, currentBudgetTarget, currentWeddingDate,
    currentBudgetMin, currentBudgetMax
  );
  const currentStaff = currentCombo[type];
  renderReplaceModal(candidates, currentStaff, currentBudgetTarget, currentBudgetMin, currentBudgetMax);
}

function applyReplacement(type, newStaffId) {
  if (currentCombos.length === 0) return;
  const combo = currentCombos[currentComboIndex];
  const newStaff = getStaffById(newStaffId);
  if (!newStaff) return;

  const oldStaff = combo[type];
  const othersTotal = combo.totalPrice - oldStaff.price;
  const newTotal = othersTotal + newStaff.price;

  const hasBudgetLimit = currentBudgetMin > 0 || (currentBudgetMax && isFinite(currentBudgetMax) && currentBudgetMax < 99999999);
  if (hasBudgetLimit && (newTotal < currentBudgetMin || newTotal > currentBudgetMax)) {
    showToast(`⚠️ 该人员替换后总价 ${formatCurrency(newTotal)} 超出预算范围 ${formatCurrency(currentBudgetMin)}-${formatCurrency(currentBudgetMax)}\n\n如需超预算，请先点击「清除预算限制」或重新调整预算后再匹配`, 'error', 5000);
    return;
  }

  const newCombo = {
    ...combo,
    [type]: newStaff,
    totalPrice: newTotal
  };
  newCombo.budgetDiff = Math.abs(newTotal - currentBudgetTarget);

  currentCombos[currentComboIndex] = newCombo;

  const remaining = currentCombos.filter((_, i) => i !== currentComboIndex);
  remaining.push(newCombo);
  remaining.sort((a, b) => a.budgetDiff - b.budgetDiff);
  currentCombos = remaining;
  currentComboIndex = currentCombos.findIndex(c => c[type] && c[type].id === newStaffId);
  if (currentComboIndex === -1) currentComboIndex = 0;

  updateComboDisplay();
  hideModal();
  currentReplacingType = null;
  showToast(`已更换为 ${newStaff.name}`, 'success');
}

function handleConfirmBooking() {
  if (currentCombos.length === 0) return;
  const combo = currentCombos[currentComboIndex];

  const conflict = checkComboConflict(combo, currentWeddingDate);
  if (conflict.hasConflict) {
    showToast('档期已被占用，请刷新或更换人员', 'error');
    handleRecommend();
    return;
  }

  const emcee = combo.emcee;
  const photographer = combo.photographer;
  const cameraman = combo.cameraman;
  const makeup = combo.makeup;

  const summaryHTML = `
    <div style="background:#FFF8F0;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid #E8C4A0;">
      <div style="font-size:12px;color:#A0896C;letter-spacing:1px;margin-bottom:8px;">📅 预订日期：<strong style="color:#3D2914;">${currentWeddingDate}</strong></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;font-size:13px;color:#6B4423;">
        <div>🎤 司仪：<strong style="color:#3D2914;">${emcee.name}</strong> <span style="color:#B8956A;">· ${formatCurrency(emcee.price)}</span></div>
        <div>📷 摄影：<strong style="color:#3D2914;">${photographer.name}</strong> <span style="color:#B8956A;">· ${formatCurrency(photographer.price)}</span></div>
        <div>🎥 摄像：<strong style="color:#3D2914;">${cameraman.name}</strong> <span style="color:#B8956A;">· ${formatCurrency(cameraman.price)}</span></div>
        <div>💄 化妆：<strong style="color:#3D2914;">${makeup.name}</strong> <span style="color:#B8956A;">· ${formatCurrency(makeup.price)}</span></div>
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px dashed #E8C4A0;text-align:right;">
        <span style="color:#6B4423;">组合总价：</span><strong style="font-family:'Playfair Display',serif;font-size:22px;background:linear-gradient(135deg,#B8956A,#D4A574);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${formatCurrency(combo.totalPrice)}</strong>
      </div>
    </div>
  `;

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">📝 确认预订并完善客户信息</h3>
      <p class="modal-subtitle">请填写客户信息，将与预订记录一起保存并自动带入合同</p>
    </div>
    <div class="modal-body" style="padding:20px 28px;">
      ${summaryHTML}
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">客户姓名 <span style="color:#C9184A;">*</span></label>
            <input type="text" id="pre-customer" class="form-input" placeholder="请输入新人姓名" style="width:100%;">
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">联系电话 <span style="color:#C9184A;">*</span></label>
            <input type="tel" id="pre-phone" class="form-input" placeholder="请输入联系电话" style="width:100%;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">婚礼地点</label>
            <input type="text" id="pre-venue" class="form-input" placeholder="酒店/宴会厅名称" style="width:100%;">
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">销售负责人</label>
            <input type="text" id="pre-sales" class="form-input" placeholder="销售顾问姓名" style="width:100%;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">定金金额</label>
            <input type="number" id="pre-deposit" class="form-input" placeholder="已收定金金额" style="width:100%;">
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">尾款状态</label>
            <select id="pre-balance" class="form-select" style="width:100%;">
              <option value="unpaid">💸 未付款</option>
              <option value="partial">💰 部分付款</option>
              <option value="paid">✅ 已结清</option>
            </select>
          </div>
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">订单备注</label>
          <textarea id="pre-remark" class="form-input" rows="2" placeholder="可选：婚礼主题、特殊要求、对接说明等..." style="width:100%;resize:vertical;font-family:'Noto Serif SC',serif;"></textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">返回修改</button>
      <button class="btn btn-primary" id="modal-confirm-booking">
        <span class="btn-icon">✓</span> 确认预订并生成合同
      </button>
    </div>
  `;

  showModal(html);

  setTimeout(() => {
    const confirmBtn = document.getElementById('modal-confirm-booking');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        const customerName = document.getElementById('pre-customer').value.trim();
        const customerPhone = document.getElementById('pre-phone').value.trim();
        const venue = document.getElementById('pre-venue').value.trim();
        const sales = document.getElementById('pre-sales').value.trim();
        const depositRaw = document.getElementById('pre-deposit').value.trim();
        const deposit = (depositRaw === '' || depositRaw === null || depositRaw === undefined)
          ? null : parseFloat(depositRaw);
        const balance = document.getElementById('pre-balance').value;
        const remark = document.getElementById('pre-remark').value.trim();

        if (!customerName) {
          showToast('请填写客户姓名', 'error');
          return;
        }
        if (!customerPhone) {
          showToast('请填写联系电话', 'error');
          return;
        }

        const contractNo = generateContractNo();

        const booking = addBooking({
          date: currentWeddingDate,
          customerName: customerName,
          customerPhone: customerPhone,
          weddingVenue: venue,
          salesPerson: sales,
          depositAmount: deposit,
          balanceStatus: balance,
          remark: remark,
          contractNo: contractNo,
          contractStatus: CONTRACT_STATUS.DRAFT,
          emceeId: emcee.id,
          photographerId: photographer.id,
          cameramanId: cameraman.id,
          makeupId: makeup.id,
          totalPrice: combo.totalPrice
        });

        hideModal();
        showToast('预订成功！正在跳转至合同页面...', 'success');

        setTimeout(() => {
          switchView('contract');
          populateContractBookingSelect();
          const sel = document.getElementById('contract-booking');
          sel.value = booking.id;
          sel.dispatchEvent(new Event('change'));
        }, 300);
      });
    }
  }, 50);
}

function checkBookingConflict() {
  const staffId = document.getElementById('booking-staff').value;
  const date = document.getElementById('booking-date').value;
  const warning = document.getElementById('conflict-warning');
  const warningText = document.getElementById('conflict-text');
  const submitBtn = document.querySelector('#booking-form button[type="submit"]');

  if (!staffId || !date) {
    warning.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = !staffId || !date;
    return;
  }

  if (date < getToday()) {
    warning.classList.remove('hidden');
    warningText.textContent = '⚠️ 预订日期不能早于今天';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  const result = checkStaffConflict(staffId, date);
  if (result.hasConflict) {
    warning.classList.remove('hidden');
    warningText.textContent = result.conflictInfo;
    if (submitBtn) submitBtn.disabled = true;
  } else {
    warning.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;
  }
}

function handleManualBooking() {
  const type = document.getElementById('booking-type').value;
  const staffId = document.getElementById('booking-staff').value;
  const date = document.getElementById('booking-date').value;
  const customerName = document.getElementById('booking-customer').value.trim();
  const customerPhone = document.getElementById('booking-phone').value.trim();
  const venue = document.getElementById('booking-venue') ? document.getElementById('booking-venue').value.trim() : '';
  const sales = document.getElementById('booking-sales') ? document.getElementById('booking-sales').value.trim() : '';
  const depositRaw = document.getElementById('booking-deposit') ? document.getElementById('booking-deposit').value.trim() : '';
  const deposit = (depositRaw === '' || depositRaw === null || depositRaw === undefined)
    ? null : parseFloat(depositRaw);
  const balance = document.getElementById('booking-balance') ? document.getElementById('booking-balance').value : 'unpaid';
  const remark = document.getElementById('booking-remark') ? document.getElementById('booking-remark').value.trim() : '';

  if (!staffId || !date) {
    showToast('请选择人员和日期', 'error');
    return;
  }
  if (date < getToday()) {
    showToast('预订日期不能早于今天', 'error');
    return;
  }

  const conflict = checkStaffConflict(staffId, date);
  if (conflict.hasConflict) {
    showToast(conflict.conflictInfo, 'error');
    return;
  }

  const contractNo = generateContractNo();
  const extraData = {
    weddingVenue: venue,
    salesPerson: sales,
    depositAmount: deposit,
    balanceStatus: balance
  };
  const result = addSingleBooking(type, staffId, date, customerName, customerPhone, remark, contractNo, extraData);
  if (result.success) {
    showToast('预订保存成功！', 'success');
    document.getElementById('booking-customer').value = '';
    document.getElementById('booking-phone').value = '';
    if (document.getElementById('booking-venue')) document.getElementById('booking-venue').value = '';
    if (document.getElementById('booking-sales')) document.getElementById('booking-sales').value = '';
    if (document.getElementById('booking-deposit')) document.getElementById('booking-deposit').value = '';
    if (document.getElementById('booking-balance')) document.getElementById('booking-balance').value = 'unpaid';
    if (document.getElementById('booking-remark')) {
      document.getElementById('booking-remark').value = '';
    }
    document.getElementById('conflict-warning').classList.add('hidden');
    renderStaffList(document.querySelector('.staff-tab.active').dataset.type);
    renderBookingList();
    populateContractBookingSelect();
    checkBookingConflict();
  } else {
    showToast(result.message, 'error');
  }
}

function openEditBookingModal(bookingId) {
  const booking = getBookingById(bookingId);
  if (!booking) {
    showToast('预订记录不存在', 'error');
    return;
  }

  let staffInfoHTML = '';
  let staffLabel = '';
  if (booking.singleType) {
    const staff = getStaffById(booking.emceeId || booking.photographerId || booking.cameramanId || booking.makeupId);
    const typeInfo = TYPE_LABELS[booking.singleType];
    staffLabel = typeInfo.icon + ' ' + typeInfo.label + '（单项）';
    if (staff) {
      staffInfoHTML = `<div style="background:#FFF8F0;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid #E8C4A0;">
        <div style="font-size:12px;color:#A0896C;letter-spacing:1px;margin-bottom:8px;">📋 当前预订 · ${staffLabel}</div>
        <div style="font-size:15px;color:#3D2914;font-weight:600;">${staff.avatar} ${staff.name} · ${formatCurrency(staff.price)} · ⭐${'★'.repeat(staff.stars)}${'☆'.repeat(5 - staff.stars)}</div>
      </div>`;
    }
  } else {
    const names = [];
    if (booking.emceeId) { const s = getStaffById(booking.emceeId); if (s) names.push('🎤 ' + s.name); }
    if (booking.photographerId) { const s = getStaffById(booking.photographerId); if (s) names.push('📷 ' + s.name); }
    if (booking.cameramanId) { const s = getStaffById(booking.cameramanId); if (s) names.push('🎥 ' + s.name); }
    if (booking.makeupId) { const s = getStaffById(booking.makeupId); if (s) names.push('💄 ' + s.name); }
    staffLabel = '🎎 四大金刚整套';
    staffInfoHTML = `<div style="background:#FFF8F0;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid #E8C4A0;">
      <div style="font-size:12px;color:#A0896C;letter-spacing:1px;margin-bottom:8px;">📋 当前预订 · ${staffLabel} · 总价 ${formatCurrency(booking.totalPrice)}</div>
      <div style="font-size:13px;color:#3D2914;line-height:2;">${names.join('　')}</div>
    </div>`;
  }

  const contractBadge = booking.contractNo
    ? `<div style="margin-bottom:12px;padding:10px 14px;background:rgba(212,165,116,0.1);border-radius:8px;font-size:12px;color:#B8956A;">📄 关联合同：<strong style="color:#6B4423;">${booking.contractNo}</strong>（修改后合同页打开将自动读取最新信息）</div>`
    : `<div style="margin-bottom:12px;padding:10px 14px;background:rgba(201,24,74,0.05);border-radius:8px;font-size:12px;color:#A0896C;">⚠️ 尚未生成正式合同编号</div>`;

  const statusLabel = CONTRACT_STATUS_LABELS[booking.contractStatus] || CONTRACT_STATUS_LABELS.not_generated;
  const balanceLabel = BALANCE_STATUS_LABELS[booking.balanceStatus] || BALANCE_STATUS_LABELS.unpaid;

  const html = `
    <div class="modal-header">
      <h3 class="modal-title">✏️ 编辑预订记录</h3>
      <p class="modal-subtitle">修改客户信息和备注，调整日期时会自动检查档期冲突</p>
    </div>
    <div class="modal-body" style="padding:20px 28px;">
      ${staffInfoHTML}
      ${contractBadge}
      <div style="margin-bottom:16px;padding:10px 14px;background:#FAF5EA;border-radius:8px;display:flex;gap:16px;">
        <div style="font-size:12px;">📄 合同状态：<strong style="color:${statusLabel.color};">${statusLabel.icon} ${statusLabel.label}</strong></div>
        <div style="font-size:12px;">💰 付款状态：<strong style="color:${balanceLabel.color};">${balanceLabel.icon} ${balanceLabel.label}</strong></div>
        ${booking.depositAmount > 0 ? `<div style="font-size:12px;">已收定金：<strong style="color:#2D6A4F;">${formatCurrency(booking.depositAmount)}</strong></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">客户姓名</label>
            <input type="text" id="edit-customer" class="form-input" placeholder="请输入客户姓名" style="width:100%;" value="${booking.customerName || ''}">
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">联系电话</label>
            <input type="tel" id="edit-phone" class="form-input" placeholder="请输入联系电话" style="width:100%;" value="${booking.customerPhone || ''}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">婚礼地点</label>
            <input type="text" id="edit-venue" class="form-input" placeholder="酒店/宴会厅名称" style="width:100%;" value="${booking.weddingVenue || ''}">
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">销售负责人</label>
            <input type="text" id="edit-sales" class="form-input" placeholder="销售顾问姓名" style="width:100%;" value="${booking.salesPerson || ''}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">定金金额</label>
            <input type="number" id="edit-deposit" class="form-input" placeholder="已收定金金额" style="width:100%;" value="${(booking.depositAmount !== null && booking.depositAmount !== undefined && booking.depositAmount !== '') ? booking.depositAmount : ''}">
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">尾款状态</label>
            <select id="edit-balance" class="form-select" style="width:100%;">
              <option value="unpaid" ${booking.balanceStatus === 'unpaid' ? 'selected' : ''}>💸 未付款</option>
              <option value="partial" ${booking.balanceStatus === 'partial' ? 'selected' : ''}>💰 部分付款</option>
              <option value="paid" ${booking.balanceStatus === 'paid' ? 'selected' : ''}>✅ 已结清</option>
            </select>
          </div>
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">婚礼日期 <span style="color:#C9184A;">*</span></label>
          <input type="date" id="edit-date" class="form-input" style="width:100%;" value="${booking.date}" min="${getToday()}">
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">订单备注</label>
          <textarea id="edit-remark" class="form-input" rows="3" placeholder="可选：婚礼主题、特殊要求、对接说明等..." style="width:100%;resize:vertical;font-family:'Noto Serif SC',serif;">${booking.remark || ''}</textarea>
        </div>
        <div id="edit-warning" class="conflict-warning hidden" style="margin-top:4px;">
          <span id="edit-warning-text"></span>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">取消</button>
      <button class="btn btn-primary" id="modal-save-edit">
        <span class="btn-icon">✓</span> 保存修改
      </button>
    </div>
  `;

  showModal(html);

  setTimeout(() => {
    const dateInput = document.getElementById('edit-date');
    if (dateInput) {
      dateInput.addEventListener('change', function() {
        const warning = document.getElementById('edit-warning');
        const warningText = document.getElementById('edit-warning-text');
        const saveBtn = document.getElementById('modal-save-edit');
        const newDate = this.value;

        if (newDate < getToday()) {
          warning.classList.remove('hidden');
          warningText.textContent = '⚠️ 预订日期不能早于今天';
          if (saveBtn) saveBtn.disabled = true;
          return;
        }

        if (newDate === booking.date) {
          warning.classList.add('hidden');
          if (saveBtn) saveBtn.disabled = false;
          return;
        }

        const staffIds = [];
        if (booking.emceeId) staffIds.push(booking.emceeId);
        if (booking.photographerId) staffIds.push(booking.photographerId);
        if (booking.cameramanId) staffIds.push(booking.cameramanId);
        if (booking.makeupId) staffIds.push(booking.makeupId);

        let hasConflict = false;
        let conflictMsg = '';
        for (const sid of staffIds) {
          const conflict = checkStaffConflict(sid, newDate);
          if (conflict.hasConflict) {
            hasConflict = true;
            conflictMsg = conflict.conflictInfo;
            break;
          }
        }

        if (hasConflict) {
          warning.classList.remove('hidden');
          warningText.textContent = conflictMsg;
          if (saveBtn) saveBtn.disabled = true;
        } else {
          warning.classList.add('hidden');
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    const saveBtn = document.getElementById('modal-save-edit');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        const customerName = document.getElementById('edit-customer').value.trim();
        const customerPhone = document.getElementById('edit-phone').value.trim();
        const venue = document.getElementById('edit-venue').value.trim();
        const sales = document.getElementById('edit-sales').value.trim();
        const depositRaw = document.getElementById('edit-deposit').value.trim();
        const deposit = (depositRaw === '' || depositRaw === null || depositRaw === undefined)
          ? null : parseFloat(depositRaw);
        const balance = document.getElementById('edit-balance').value;
        const date = document.getElementById('edit-date').value;
        const remark = document.getElementById('edit-remark').value.trim();

        if (!date) {
          showToast('请选择婚礼日期', 'error');
          return;
        }
        if (date < getToday()) {
          showToast('预订日期不能早于今天', 'error');
          return;
        }

        if (date !== booking.date) {
          const staffIds = [];
          if (booking.emceeId) staffIds.push(booking.emceeId);
          if (booking.photographerId) staffIds.push(booking.photographerId);
          if (booking.cameramanId) staffIds.push(booking.cameramanId);
          if (booking.makeupId) staffIds.push(booking.makeupId);

          for (const sid of staffIds) {
            const conflict = checkStaffConflict(sid, date);
            if (conflict.hasConflict) {
              showToast(conflict.conflictInfo, 'error');
              return;
            }
          }
        }

        const result = updateBooking(bookingId, {
          customerName: customerName,
          customerPhone: customerPhone,
          weddingVenue: venue,
          salesPerson: sales,
          depositAmount: deposit,
          balanceStatus: balance,
          date: date,
          remark: remark
        });

        if (result.success) {
          hideModal();
          showToast('预订记录已更新！合同页将读取最新信息', 'success');
          renderStaffList(document.querySelector('.staff-tab.active').dataset.type);
          renderBookingList();
          populateContractBookingSelect();
        } else {
          showToast(result.message, 'error');
        }
      });
    }
  }, 50);
}
