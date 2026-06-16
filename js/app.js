let currentCombos = [];
let currentComboIndex = 0;
let currentWeddingDate = null;
let currentBudgetTarget = 30000;
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
  const formData = {
    contractNo: document.getElementById('contract-no').value,
    customerName: document.getElementById('contract-customer').value,
    customerPhone: document.getElementById('contract-phone').value,
    weddingDate: document.getElementById('contract-date').value,
    emceeId: document.getElementById('contract-emcee').value || null,
    photographerId: document.getElementById('contract-photographer').value || null,
    cameramanId: document.getElementById('contract-cameraman').value || null,
    makeupId: document.getElementById('contract-makeup').value || null
  };
  const data = buildContractData(formData);
  document.getElementById('contract-preview').innerHTML = renderContractPreview(data);
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
  });

  document.getElementById('booking-staff').addEventListener('change', checkBookingConflict);
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
        } else {
          showToast('取消失败', 'error');
        }
      }
    }
  });

  ['contract-emcee', 'contract-photographer', 'contract-cameraman', 'contract-makeup',
   'contract-customer', 'contract-phone', 'contract-date'].forEach(id => {
    document.getElementById(id).addEventListener('change', function() {
      updateContractTotal();
      renderContractPreviewFromForm();
    });
    document.getElementById(id).addEventListener('input', function() {
      updateContractTotal();
      renderContractPreviewFromForm();
    });
  });

  document.getElementById('contract-booking').addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    if (opt && opt.value) {
      if (opt.dataset.date) document.getElementById('contract-date').value = opt.dataset.date;
      if (opt.dataset.customer) document.getElementById('contract-customer').value = opt.dataset.customer;
      if (opt.dataset.phone) document.getElementById('contract-phone').value = opt.dataset.phone;
      if (opt.dataset.emcee) document.getElementById('contract-emcee').value = opt.dataset.emcee;
      if (opt.dataset.photographer) document.getElementById('contract-photographer').value = opt.dataset.photographer;
      if (opt.dataset.cameraman) document.getElementById('contract-cameraman').value = opt.dataset.cameraman;
      if (opt.dataset.makeup) document.getElementById('contract-makeup').value = opt.dataset.makeup;
      updateContractTotal();
      renderContractPreviewFromForm();
    }
  });

  document.getElementById('btn-preview-contract').addEventListener('click', function() {
    renderContractPreviewFromForm();
    showToast('合同预览已更新', 'success');
  });

  document.getElementById('btn-print-contract').addEventListener('click', function() {
    renderContractPreviewFromForm();
    const html = document.getElementById('contract-preview').innerHTML;
    printContract(html);
  });

  document.getElementById('btn-preview-export').addEventListener('click', function() {
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

  populateBookingStaffSelect('emcee');
});

function handleRecommend() {
  const date = document.getElementById('wedding-date').value;
  const budgetMin = parseInt(document.getElementById('budget-min').value) || 0;
  const budgetMax = parseInt(document.getElementById('budget-max').value) || Infinity;
  const budgetTarget = parseInt(document.getElementById('budget-target').value) || 30000;

  if (!date) {
    showToast('请选择婚礼日期', 'error');
    return;
  }
  if (date < getToday()) {
    showToast('婚礼日期不能早于今天', 'error');
    return;
  }

  currentWeddingDate = date;
  currentBudgetTarget = budgetTarget;

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

  currentCombos = sortCombosByBudget(combos, budgetTarget, budgetMin, budgetMax);
  currentComboIndex = 0;

  if (currentCombos.length === 0) {
    document.getElementById('recommend-empty').classList.remove('hidden');
    document.getElementById('recommend-results').classList.add('hidden');
    document.getElementById('recommend-empty').innerHTML = `
      <div class="empty-illustration">💐</div>
      <p class="empty-text">已为您找到 ${combos.length} 组组合</p>
      <p style="color:#A0896C;margin-top:8px;font-size:13px;">但没有完全符合预算范围 ${formatCurrency(budgetMin)} - ${formatCurrency(budgetMax)} 的组合</p>
      <button class="btn btn-secondary" style="margin-top:16px;" onclick="document.getElementById('budget-min').value=0;document.getElementById('budget-max').value=999999;handleRecommend();">
        清除预算限制，查看全部组合
      </button>
    `;
    return;
  }

  document.getElementById('recommend-empty').classList.add('hidden');
  document.getElementById('recommend-results').classList.remove('hidden');

  const subtitle = `${date} · 共找到 ${currentCombos.length} 组匹配组合 · 按预算接近度排序`;
  document.getElementById('results-subtitle').textContent = subtitle;

  updateComboDisplay();
  showToast(`已为您匹配 ${currentCombos.length} 组黄金组合！`, 'success');
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
  const candidates = getReplaceCandidates(currentCombo, type, currentBudgetTarget, currentWeddingDate);
  const currentStaff = currentCombo[type];
  renderReplaceModal(candidates, currentStaff, currentBudgetTarget);
}

function applyReplacement(type, newStaffId) {
  if (currentCombos.length === 0) return;
  const combo = currentCombos[currentComboIndex];
  const newStaff = getStaffById(newStaffId);
  if (!newStaff) return;

  const oldStaff = combo[type];
  const othersTotal = combo.totalPrice - oldStaff.price;

  const newCombo = {
    ...combo,
    [type]: newStaff,
    totalPrice: othersTotal + newStaff.price
  };
  newCombo.budgetDiff = Math.abs(newCombo.totalPrice - currentBudgetTarget);

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

  const msg = `确认预订以下人员？\n\n📅 日期：${currentWeddingDate}\n🎤 司仪：${emcee.name} (${formatCurrency(emcee.price)})\n📷 摄影：${photographer.name} (${formatCurrency(photographer.price)})\n🎥 摄像：${cameraman.name} (${formatCurrency(cameraman.price)})\n💄 化妆：${makeup.name} (${formatCurrency(makeup.price)})\n\n💰 总价：${formatCurrency(combo.totalPrice)}`;

  if (!confirm(msg)) return;

  const booking = addBooking({
    date: currentWeddingDate,
    customerName: '',
    customerPhone: '',
    emceeId: emcee.id,
    photographerId: photographer.id,
    cameramanId: cameraman.id,
    makeupId: makeup.id,
    totalPrice: combo.totalPrice
  });

  showToast('预订成功！即将跳转至合同页面...', 'success');

  setTimeout(() => {
    switchView('contract');
    document.getElementById('contract-date').value = currentWeddingDate;
    document.getElementById('contract-emcee').value = emcee.id;
    document.getElementById('contract-photographer').value = photographer.id;
    document.getElementById('contract-cameraman').value = cameraman.id;
    document.getElementById('contract-makeup').value = makeup.id;
    document.getElementById('contract-no').value = generateContractNo();
    updateContractTotal();
    renderContractPreviewFromForm();
    populateContractBookingSelect();
  }, 800);
}

function checkBookingConflict() {
  const staffId = document.getElementById('booking-staff').value;
  const date = document.getElementById('booking-date').value;
  const warning = document.getElementById('conflict-warning');
  const warningText = document.getElementById('conflict-text');
  const submitBtn = document.querySelector('#booking-form button[type="submit"]');

  if (!staffId || !date) {
    warning.classList.add('hidden');
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

  const result = addSingleBooking(type, staffId, date, customerName, customerPhone);
  if (result.success) {
    showToast('预订保存成功！', 'success');
    document.getElementById('booking-customer').value = '';
    document.getElementById('booking-phone').value = '';
    document.getElementById('conflict-warning').classList.add('hidden');
    renderStaffList(document.querySelector('.staff-tab.active').dataset.type);
    renderBookingList();
    populateContractBookingSelect();
  } else {
    showToast(result.message, 'error');
  }
}
