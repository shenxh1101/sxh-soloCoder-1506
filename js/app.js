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
  const formData = {
    contractNo: document.getElementById('contract-no').value,
    customerName: document.getElementById('contract-customer').value,
    customerPhone: document.getElementById('contract-phone').value,
    weddingDate: document.getElementById('contract-date').value,
    emceeId: document.getElementById('contract-emcee').value || null,
    photographerId: document.getElementById('contract-photographer').value || null,
    cameramanId: document.getElementById('contract-cameraman').value || null,
    makeupId: document.getElementById('contract-makeup').value || null,
    remark: document.getElementById('contract-remark') ? document.getElementById('contract-remark').value : ''
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
        } else {
          showToast('取消失败', 'error');
        }
      }
    }
  });

  ['contract-emcee', 'contract-photographer', 'contract-cameraman', 'contract-makeup',
   'contract-customer', 'contract-phone', 'contract-date', 'contract-remark'].forEach(id => {
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
    if (opt && opt.value) {
      if (opt.dataset.date) document.getElementById('contract-date').value = opt.dataset.date;
      if (opt.dataset.customer) document.getElementById('contract-customer').value = opt.dataset.customer;
      if (opt.dataset.phone) document.getElementById('contract-phone').value = opt.dataset.phone;
      if (opt.dataset.remark && document.getElementById('contract-remark')) {
        document.getElementById('contract-remark').value = opt.dataset.remark;
      }
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

  if (newTotal < currentBudgetMin || newTotal > currentBudgetMax) {
    if (!confirm(`换人后新组合总价为 ${formatCurrency(newTotal)}，超出您设定的预算范围 ${formatCurrency(currentBudgetMin)} - ${formatCurrency(currentBudgetMax)}。\n\n是否仍要继续？`)) {
      return;
    }
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
        <div>
          <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#6B4423;">订单备注</label>
          <textarea id="pre-remark" class="form-input" rows="3" placeholder="可选：如婚礼地点、特殊要求、对接说明等..." style="width:100%;resize:vertical;font-family:'Noto Serif SC',serif;"></textarea>
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
        const remark = document.getElementById('pre-remark').value.trim();

        if (!customerName) {
          showToast('请填写客户姓名', 'error');
          return;
        }
        if (!customerPhone) {
          showToast('请填写联系电话', 'error');
          return;
        }

        const booking = addBooking({
          date: currentWeddingDate,
          customerName: customerName,
          customerPhone: customerPhone,
          remark: remark,
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
          document.getElementById('contract-date').value = currentWeddingDate;
          document.getElementById('contract-customer').value = customerName;
          document.getElementById('contract-phone').value = customerPhone;
          if (document.getElementById('contract-remark')) {
            document.getElementById('contract-remark').value = remark;
          }
          document.getElementById('contract-emcee').value = emcee.id;
          document.getElementById('contract-photographer').value = photographer.id;
          document.getElementById('contract-cameraman').value = cameraman.id;
          document.getElementById('contract-makeup').value = makeup.id;
          document.getElementById('contract-no').value = generateContractNo();
          updateContractTotal();
          renderContractPreviewFromForm();
          populateContractBookingSelect();
        }, 600);
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

  const result = addSingleBooking(type, staffId, date, customerName, customerPhone, remark);
  if (result.success) {
    showToast('预订保存成功！', 'success');
    document.getElementById('booking-customer').value = '';
    document.getElementById('booking-phone').value = '';
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
