function generateCSVContent(rows) {
  if (!rows || rows.length === 0) return '';

  const headers = [
    '日期',
    '星期',
    '人员类型',
    '姓名',
    '星级',
    '服务价格',
    '档期状态'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [];
  lines.push('\uFEFF' + headers.map(escapeCSV).join(','));

  rows.forEach(r => {
    lines.push([
      r.date,
      r.weekday,
      r.staffTypeLabel,
      r.staffName,
      '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars),
      r.price,
      '可预订'
    ].map(escapeCSV).join(','));
  });

  return lines.join('\r\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportUnbookedToCSV(startDate, endDate, types) {
  const data = getUnbookedSchedule(startDate, endDate, types);
  if (data.length === 0) {
    return { success: false, message: '所选条件下没有可导出的未预订档期' };
  }
  const csv = generateCSVContent(data);
  const filename = `婚庆四大金刚未预订档期_${startDate}_${endDate}.csv`;
  downloadCSV(csv, filename);
  return { success: true, count: data.length, filename };
}

function renderExportPreview(rows) {
  if (!rows || rows.length === 0) {
    return '<p class="empty-text small">暂无符合条件的数据</p>';
  }

  let html = '<table class="export-table"><thead><tr>';
  html += '<th>日期</th><th>星期</th><th>类型</th><th>姓名</th><th>星级</th><th>价格</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    const starsHtml = '★'.repeat(r.stars) + '<span class="star empty">☆</span>'.repeat(5 - r.stars);
    html += `<tr>
      <td>${r.date}</td>
      <td>${r.weekday}</td>
      <td>${r.staffTypeIcon} ${r.staffTypeLabel}</td>
      <td>${r.staffName}</td>
      <td>${starsHtml}</td>
      <td>${r.priceFormatted}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  html += `<p class="empty-text small" style="padding:16px 0 0;text-align:right;color:#6B4423;">共 ${rows.length} 条可预订档期记录</p>`;
  return html;
}

// ==================== 预订跟进表导出 ====================
function generateFollowupCSVContent(bookings) {
  if (!bookings || bookings.length === 0) return '';

  const headers = [
    '客户姓名', '联系电话', '婚礼日期', '婚礼地点', '销售负责人',
    '服务类型', '司仪', '摄影师', '摄像师', '化妆师',
    '合同编号', '合同状态', '付款状态',
    '定金金额', '已收总额', '待收金额',
    '最近跟进时间', '最近跟进内容', '最近跟进结果', '下次联系时间',
    '订单备注'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [];
  lines.push('\uFEFF' + headers.map(escapeCSV).join(','));

  bookings.forEach(b => {
    const emcee = b.emceeId ? getStaffById(b.emceeId) : null;
    const photographer = b.photographerId ? getStaffById(b.photographerId) : null;
    const cameraman = b.cameramanId ? getStaffById(b.cameramanId) : null;
    const makeup = b.makeupId ? getStaffById(b.makeupId) : null;

    let serviceType = '四大金刚整套';
    if (b.singleType) {
      serviceType = TYPE_LABELS[b.singleType].label + '（单项）';
    } else {
      let cnt = 0;
      if (emcee) cnt++; if (photographer) cnt++; if (cameraman) cnt++; if (makeup) cnt++;
      if (cnt < 4 && cnt > 0) serviceType = `组合服务（${cnt}项）`;
      else if (cnt === 0) serviceType = '未选人员';
    }

    const contractLabel = CONTRACT_STATUS_LABELS[b.contractStatus] || CONTRACT_STATUS_LABELS.not_generated;
    const balanceLabel = BALANCE_STATUS_LABELS[b.balanceStatus] || BALANCE_STATUS_LABELS.unpaid;

    const summary = calculatePaymentSummary(b.id);
    const latestFu = getLatestFollowup(b.id);

    lines.push([
      b.customerName || '',
      b.customerPhone || '',
      b.date || '',
      b.weddingVenue || '',
      b.salesPerson || '',
      serviceType,
      emcee ? emcee.name : '',
      photographer ? photographer.name : '',
      cameraman ? cameraman.name : '',
      makeup ? makeup.name : '',
      b.contractNo || '',
      contractLabel.label,
      balanceLabel.label,
      (summary && summary.totalDeposit > 0) ? summary.totalDeposit : (b.depositAmount || ''),
      summary ? summary.totalPaid : '',
      summary ? summary.amountDue : '',
      latestFu ? new Date(latestFu.createdAt).toLocaleString('zh-CN') : '',
      latestFu ? latestFu.content : '',
      latestFu ? (FOLLOWUP_RESULT_LABELS[latestFu.result] || { label: '' }).label : '',
      latestFu ? latestFu.nextContactAt : '',
      b.remark || ''
    ].map(escapeCSV).join(','));
  });

  return lines.join('\r\n');
}

function exportFollowupToCSV() {
  const bookings = getBookings();
  if (bookings.length === 0) {
    return { success: false, message: '暂无预订记录可导出' };
  }
  const csv = generateFollowupCSVContent(bookings);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `婚庆预订跟进表_${today}.csv`;
  downloadCSV(csv, filename);
  return { success: true, count: bookings.length, filename };
}

function renderFollowupExportPreview() {
  const bookings = getBookings();
  if (!bookings || bookings.length === 0) {
    return '<p class="empty-text small">暂无预订记录</p>';
  }

  let html = '<table class="export-table"><thead><tr>';
  html += '<th>日期</th><th>客户</th><th>电话</th><th>销售</th><th>合同状态</th><th>付款状态</th><th>已收/待收</th><th>最近跟进</th>';
  html += '</tr></thead><tbody>';

  bookings.slice(0, 50).forEach(b => {
    const contractLabel = CONTRACT_STATUS_LABELS[b.contractStatus] || CONTRACT_STATUS_LABELS.not_generated;
    const balanceLabel = BALANCE_STATUS_LABELS[b.balanceStatus] || BALANCE_STATUS_LABELS.unpaid;
    const summary = calculatePaymentSummary(b.id);
    const latestFu = getLatestFollowup(b.id);
    html += `<tr>
      <td>${b.date}</td>
      <td>${escapeHtml(b.customerName || '未填写')}</td>
      <td>${escapeHtml(b.customerPhone || '')}</td>
      <td>${escapeHtml(b.salesPerson || '')}</td>
      <td><span style="color:${contractLabel.color}">${contractLabel.icon} ${contractLabel.label}</span></td>
      <td><span style="color:${balanceLabel.color}">${balanceLabel.icon} ${balanceLabel.label}</span></td>
      <td>${summary ? (formatCurrency(summary.totalPaid) + ' / ' + formatCurrency(summary.amountDue)) : '-'}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${latestFu ? escapeHtml(latestFu.content.substring(0, 15) + (latestFu.content.length > 15 ? '...' : '')) : '-'}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  html += `<p class="empty-text small" style="padding:16px 0 0;text-align:right;color:#6B4423;">共 ${bookings.length} 条预订记录${bookings.length > 50 ? '（仅预览前50条，导出为全部）' : ''}</p>`;
  return html;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
