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
