export const printTransactionSheets = (rows) => {
  const win = window.open('', 'PRINT_MULTI', 'width=900,height=1200');
  if (!win) return;

  const money = (v) => {
    const n = Number(
      String(v ?? '')
        .toString()
        .replace(/,/g, ''),
    );
    if (!isFinite(n)) return '0';
    return n.toLocaleString('ko-KR');
  };

  // 합계 계산
  let totalSupply = 0;
  let totalTax = 0;
  rows.forEach((hw) => {
    const unit = Number(String(hw.unitPrice ?? '').replace(/,/g, '')) || 0;
    const qty = Number(hw.quantity || 0);
    const supplyRaw = hw.supplyAmount ?? qty * unit;
    const taxRaw = hw.taxAmount ?? Math.round((supplyRaw || 0) * 0.1);
    totalSupply += Number(supplyRaw) || 0;
    totalTax += Number(taxRaw) || 0;
  });

  const style = `
    <style>
      @media print { 
        @page { size: A4 portrait; margin: 8mm; } 
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-button { display: none !important; }
      }
      body { font-family: 'Malgun Gothic', Dotum, sans-serif; padding: 0; margin: 0; font-size: 10px; }
      .page-container { padding: 12px; box-sizing: border-box; height: 48vh; }
      .page-container:last-child { page-break-after: avoid; }
      .transaction-header { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 4px; letter-spacing: 6px; }
      .subtitle { text-align: center; font-size: 9px; margin-bottom: 12px; }
      .cut-line { 
        text-align: center; 
        // padding: 10px 0; 
        color: #666; 
        font-size: 12px; 
        border-top: 1px dashed #999; 
        letter-spacing: 3px;
      }
      .print-button { 
        position: fixed; 
        top: 20px; 
        right: 20px; 
        padding: 12px 24px; 
        background: #0066cc; 
        color: white; 
        border: none; 
        border-radius: 4px; 
        cursor: pointer; 
        font-size: 14px; 
        font-weight: bold; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.2); 
        z-index: 1000;
      }
      .print-button:hover { background: #0052a3; }
      .parties { display: flex; gap: 8px; margin-bottom: 12px; }
      .party-box { flex: 1; }
      .party-title { padding: 3px 6px; text-align: center; font-weight: bold; font-size: 9px; }
      .party-row { display: flex; }
      .party-label { width: 70px; padding: 3px 5px; font-weight: bold; text-align: center; font-size: 9px; }
      .party-value { flex: 1; padding: 3px 5px; font-size: 9px; }
      .party-row-split { display: flex; }
      .party-row-split > div { flex: 1; display: flex; }
      .party-box { position: relative; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th, td { padding: 3px 4px; text-align: center; font-size: 9px; }
      th { font-weight: bold; }
      .right { text-align: right; }
      .left { text-align: left; }
      .total-row { font-weight: bold; }
      .footer { display: flex; gap: 15px; justify-content: flex-end; margin-top: 10px; }
      .footer-item { text-align: center; }
      .footer-label { font-size: 9px; margin-bottom: 3px; }
      .footer-space { width: 100px; height: 25px; }
      .seal-image { position: absolute; right: 15px; top: 15px; width: 60px; height: 60px; opacity: 0.8; }
      
      /* 파란색 테마 */
      .blue .transaction-header { color: #0066cc; }
      .blue .party-box { border: 2px solid #0066cc; }
      .blue .party-title { background: #e6f2ff; border-bottom: 1px solid #0066cc; }
      .blue .party-row { border-bottom: 1px solid #0066cc; }
      .blue .party-row:last-child { border-bottom: none; }
      .blue .party-label { border-right: 1px solid #0066cc; background: #f0f7ff; }
      .blue .party-row-split > div:first-child { border-right: 1px solid #0066cc; }
      .blue table th, .blue table td { border: 1px solid #0066cc; }
      .blue table th { background: #e6f2ff; }
      .blue .total-row { background: #f0f7ff; }
      .blue .footer-space { border-bottom: 1px solid #0066cc; }
      
      /* 빨간색 테마 */
      .red .transaction-header { color: #cc0000; }
      .red .party-box { border: 2px solid #cc0000; }
      .red .party-title { background: #ffe6e6; border-bottom: 1px solid #cc0000; }
      .red .party-row { border-bottom: 1px solid #cc0000; }
      .red .party-row:last-child { border-bottom: none; }
      .red .party-label { border-right: 1px solid #cc0000; background: #fff0f0; }
      .red .party-row-split > div:first-child { border-right: 1px solid #cc0000; }
      .red table th, .red table td { border: 1px solid #cc0000; }
      .red table th { background: #ffe6e6; }
      .red .total-row { background: #fff0f0; }
      .red .footer-space { border-bottom: 1px solid #cc0000; }
    </style>`;

  const renderSheet = (colorTheme, subtitle) => {
    const primary = rows?.[0] || {};
    const customerName =
      primary.deliveryLocation || primary.collectionLocation || '';
    const customerBizNo = primary.customerBizNo || primary.customerCode || '';
    const customerAddr = primary.customerAddress || '';
    const customerTel = primary.customerTel || '';
    const customerEmail = primary.customerEmail || '';

    let html = `<div class="page-container ${colorTheme}">`;
    html += `<div class="transaction-header">거래명세서</div>`;
    html += `<div class="subtitle">${subtitle}</div>`;

    // 공급받는자 / 공급자 정보
    html += `<div class="parties">`;

    // 공급받는자 (왼쪽)
    html += `
      <div class="party-box">
        <div class="party-title">공급받는자</div>
        <div class="party-row">
          <div class="party-label">등록번호</div>
          <div class="party-value">${customerBizNo}</div>
        </div>
        <div class="party-row">
          <div class="party-label">상호<br/>(성명)</div>
          <div class="party-value">${customerName || ''}</div>
        </div>
        <div class="party-row">
          <div class="party-label">사업장<br/>주소</div>
          <div class="party-value">${customerAddr || ''}</div>
        </div>
        <div class="party-row party-row-split">
          <div>
            <div class="party-label">전화</div>
            <div class="party-value">${customerTel || ''}</div>
          </div>
          <div>
            <div class="party-label">이메일</div>
            <div class="party-value">${customerEmail || ''}</div>
          </div>
        </div>
      </div>
    `;

    // 공급자 (오른쪽)
    html += `
      <div class="party-box">
        <img src="/sign.png" class="seal-image" alt="법인도장" />
        <div class="party-title">공급자</div>
        <div class="party-row">
          <div class="party-label">등록번호</div>
          <div class="party-value">135-86-06250</div>
        </div>
        <div class="party-row">
          <div class="party-label">상호<br/>(성명)</div>
          <div class="party-value">에프원소프트(주)</div>
        </div>
        <div class="party-row">
          <div class="party-label">사업장<br/>주소</div>
          <div class="party-value">경기도 화성시 동탄순환대로 823,611호</div>
        </div>
        <div class="party-row party-row-split">
          <div>
            <div class="party-label">전화</div>
            <div class="party-value">031-5183-5341</div>
          </div>
          <div>
            <div class="party-label">이메일</div>
            <div class="party-value">info@f1soft.co.kr</div>
          </div>
        </div>
      </div>
    `;

    html += `</div>`; // parties end

    // 품목 테이블
    html += `<table>`;
    html += `
      <thead>
        <tr>
          <th style="width:35px">년/월/일</th>
          <th style="width:45px">품목</th>
          <th style="width:160px">품명</th>
          <th style="width:75px">규격</th>
          <th style="width:35px">수량</th>
          <th style="width:75px">단가</th>
          <th style="width:85px">공급가액</th>
          <th style="width:65px">세액</th>
        </tr>
      </thead>
      <tbody>
    `;

    rows.forEach((hw) => {
      const unit = Number(String(hw.unitPrice ?? '').replace(/,/g, '')) || 0;
      const qty = Number(hw.quantity || 0);
      const supplyRaw = hw.supplyAmount ?? qty * unit;
      const taxRaw = hw.taxAmount ?? Math.round((supplyRaw || 0) * 0.1);
      const dateStr =
        hw.category === '고장회수'
          ? hw.collectionDate || hw.deliveryDate || ''
          : hw.deliveryDate || hw.collectionDate || '';
      const dateLabel = dateStr ? dateStr.replace(/-/g, '/') : '';

      html += `
        <tr>
          <td>${dateLabel}</td>
          <td>${hw.category || ''}</td>
          <td class="left" style="padding-left:6px">${hw.hwName || ''}</td>
          <td>${hw.specification || ''}</td>
          <td>${qty}</td>
          <td class="right">${money(unit)}</td>
          <td class="right">${money(supplyRaw)}</td>
          <td class="right">${money(taxRaw)}</td>
        </tr>
      `;
    });

    // 빈 줄 추가
    const emptyRows = Math.max(0, 10 - rows.length);
    for (let i = 0; i < emptyRows; i++) {
      html += `
        <tr>
          <td>&nbsp;</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    }

    // 합계 행
    html += `
      <tr class="total-row">
        <td colspan="6">합 계</td>
        <td class="right">${money(totalSupply)}</td>
        <td class="right">${money(totalTax)}</td>
      </tr>
    `;

    html += `</tbody></table>`;

    // 하단 서명란
    html += `
      <div class="footer">
        <div class="footer-item">
          <div class="footer-label">인수자</div>
          <div class="footer-space"></div>
          <div style="font-size:8px;margin-top:2px">(인)</div>
        </div>
        <div class="footer-item">
          <div class="footer-label">납품자</div>
          <div class="footer-space"></div>
          <div style="font-size:8px;margin-top:2px">(인)</div>
        </div>
        <div class="footer-item">
          <div class="footer-label">미수금</div>
          <div class="footer-space"></div>
          <div style="font-size:8px;margin-top:2px">(인)</div>
        </div>
      </div>
    `;

    html += `</div>`; // page-container end
    return html;
  };

  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>거래명세서</title>${style}</head><body>`,
  );

  // 인쇄 버튼
  win.document.write(
    `<button class="print-button" onclick="window.print()">🖨️ 인쇄</button>`,
  );

  // 파란색 버전 (공급받는자 보관용)
  win.document.write(renderSheet('blue', '(공급받는자 보관용)'));

  // 절취선
  win.document.write(
    `<div class="cut-line">✂ - - - - - - - - - - - - - - - - - 절 취 선 - - - - - - - - - - - - - - - - - ✂</div>`,
  );

  // 빨간색 버전 (공급자 보관용)
  win.document.write(renderSheet('red', '(공급자 보관용)'));

  win.document.write(
    `<script>window.onload = () => { window.print(); }</script>`,
  );
  win.document.write(`</body></html>`);
  win.document.close();
};
