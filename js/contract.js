function generateContractNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `LYG-${y}${m}${d}-${rand}`;
}

function renderStars(count) {
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

function buildContractData(formData) {
  const emcee = getStaffById(formData.emceeId);
  const photographer = getStaffById(formData.photographerId);
  const cameraman = getStaffById(formData.cameramanId);
  const makeup = getStaffById(formData.makeupId);

  const staffList = [];
  if (emcee) staffList.push({ type: '司仪', typeIcon: '🎤', ...emcee });
  if (photographer) staffList.push({ type: '摄影师', typeIcon: '📷', ...photographer });
  if (cameraman) staffList.push({ type: '摄像师', typeIcon: '🎥', ...cameraman });
  if (makeup) staffList.push({ type: '化妆师', typeIcon: '💄', ...makeup });

  const totalPrice = staffList.reduce((sum, s) => sum + s.price, 0);

  return {
    contractNo: formData.contractNo || generateContractNo(),
    customerName: formData.customerName || '____________',
    customerPhone: formData.customerPhone || '____________',
    weddingDate: formData.weddingDate || '____________',
    staffList: staffList,
    totalPrice: totalPrice,
    totalPriceCN: numberToChinese(totalPrice),
    signDate: formatDate(new Date())
  };
}

function numberToChinese(num) {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];
  const s = String(num);
  let result = '';
  for (let i = 0; i < s.length; i++) {
    const d = parseInt(s[i]);
    const unitIdx = s.length - 1 - i;
    if (d === 0) {
      if (!result.endsWith('零')) result += '零';
    } else {
      result += digits[d] + units[unitIdx];
    }
  }
  result = result.replace(/零+$/, '');
  return result ? result + '元整' : '零元整';
}

function renderContractHTML(data) {
  let staffRows = '';
  data.staffList.forEach((s, idx) => {
    staffRows += `
      <tr>
        <td style="padding:12px 14px;border:1px solid #D4A574;text-align:center;">${idx + 1}</td>
        <td style="padding:12px 14px;border:1px solid #D4A574;text-align:center;">${s.typeIcon} ${s.type}</td>
        <td style="padding:12px 14px;border:1px solid #D4A574;text-align:center;">${s.name}</td>
        <td style="padding:12px 14px;border:1px solid #D4A574;text-align:center;color:#FFC857;">${renderStars(s.stars)}</td>
        <td style="padding:12px 14px;border:1px solid #D4A574;text-align:right;font-family:'Playfair Display',serif;font-weight:600;">${formatCurrency(s.price)}</td>
      </tr>`;
  });

  return `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:14px;letter-spacing:6px;color:#B8956A;margin-bottom:8px;">❦ 良缘阁婚庆策划 ❦</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:36px;color:#3D2914;letter-spacing:8px;margin:0 0 4px 0;">婚庆服务合同</h1>
      <div style="font-size:13px;color:#A0896C;letter-spacing:2px;">WEDDING SERVICE CONTRACT</div>
      <div style="margin-top:12px;font-size:13px;color:#6B4423;">合同编号：<span style="font-weight:600;color:#B8956A;letter-spacing:1px;">${data.contractNo}</span></div>
    </div>

    <div style="margin-bottom:28px;padding:20px;background:#FFF8F0;border-radius:8px;border:1px solid #E8C4A0;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:14px;color:#3D2914;">
        <div><span style="color:#6B4423;">甲方（客户）：</span><span style="font-weight:600;">${data.customerName}</span></div>
        <div><span style="color:#6B4423;">联系电话：</span><span style="font-weight:600;">${data.customerPhone}</span></div>
        <div style="grid-column:1/-1;"><span style="color:#6B4423;">婚礼日期：</span><span style="font-weight:600;">${data.weddingDate}</span></div>
        <div style="grid-column:1/-1;"><span style="color:#6B4423;">乙方（服务方）：</span><span style="font-weight:600;">良缘阁婚庆策划有限公司</span></div>
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <h3 style="font-family:'Playfair Display',serif;font-size:18px;color:#3D2914;margin:0 0 14px 0;padding-bottom:8px;border-bottom:2px solid #D4A574;">一、服务人员清单</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:linear-gradient(135deg,#D4A574,#E8C4A0);color:white;">
            <th style="padding:12px 14px;border:1px solid #B8956A;width:60px;">序号</th>
            <th style="padding:12px 14px;border:1px solid #B8956A;">服务岗位</th>
            <th style="padding:12px 14px;border:1px solid #B8956A;">人员姓名</th>
            <th style="padding:12px 14px;border:1px solid #B8956A;width:120px;">星级</th>
            <th style="padding:12px 14px;border:1px solid #B8956A;width:120px;">服务费用</th>
          </tr>
        </thead>
        <tbody>
          ${staffRows}
          <tr>
            <td colspan="4" style="padding:14px;border:1px solid #D4A574;text-align:right;font-weight:600;background:#FFF8F0;">合计金额（大写）</td>
            <td style="padding:14px;border:1px solid #D4A574;text-align:right;background:#FFF8F0;font-weight:600;">${data.totalPriceCN}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding:14px;border:1px solid #D4A574;text-align:right;font-weight:600;background:#FFF8F0;">合计金额（小写）</td>
            <td style="padding:14px;border:1px solid #D4A574;text-align:right;background:#FFF8F0;font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#B8956A;">${formatCurrency(data.totalPrice)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="margin-bottom:24px;">
      <h3 style="font-family:'Playfair Display',serif;font-size:18px;color:#3D2914;margin:0 0 14px 0;padding-bottom:8px;border-bottom:2px solid #D4A574;">二、服务条款</h3>
      <div style="font-size:13px;line-height:1.9;color:#6B4423;padding:0 8px;">
        <p style="margin:0 0 8px 0;">1. 乙方应按照约定日期提供上述人员的婚庆服务，确保服务质量符合行业标准。</p>
        <p style="margin:0 0 8px 0;">2. 甲方应于合同签订时支付服务总金额的 50% 作为定金，尾款于婚礼当日结清。</p>
        <p style="margin:0 0 8px 0;">3. 如因甲方原因取消服务，定金不予退还；如因乙方原因无法提供服务，应双倍返还定金。</p>
        <p style="margin:0 0 8px 0;">4. 服务人员如需临时更换，乙方需提前 7 日通知甲方，并提供同等或更高星级人员。</p>
        <p style="margin:0 0 8px 0;">5. 本合同一式两份，甲乙双方各执一份，自双方签字之日起生效。</p>
      </div>
    </div>

    <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px;padding-top:24px;border-top:1px dashed #D4A574;">
      <div>
        <div style="font-size:14px;color:#3D2914;margin-bottom:40px;">甲方（客户）签字：</div>
        <div style="border-bottom:1px solid #3D2914;padding-bottom:4px;"></div>
        <div style="font-size:12px;color:#A0896C;margin-top:8px;">签署日期：${data.signDate}</div>
      </div>
      <div>
        <div style="font-size:14px;color:#3D2914;margin-bottom:40px;">乙方（服务方）盖章：</div>
        <div style="border-bottom:1px solid #3D2914;padding-bottom:4px;"></div>
        <div style="font-size:12px;color:#A0896C;margin-top:8px;">良缘阁婚庆策划有限公司</div>
      </div>
    </div>
  `;
}

function renderContractPreview(data) {
  return renderContractHTML(data);
}

function printContract(contractHTML) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>婚庆服务合同</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Noto Serif SC', serif; padding: 40px; color: #3D2914; }
        @page { size: A4; margin: 15mm; }
      </style>
    </head>
    <body>
      ${contractHTML}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
