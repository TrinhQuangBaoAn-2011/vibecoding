'use strict';
/*
 * MỘC 4 — Xuất báo cáo text (v2.0)
 * Cắm vào #export-slot (results.html): dựng báo cáo thuần text từ Result v2.0
 * ({status, priority, detail, impact, suggestion}) rồi cho 3 nút: sao chép / tải .txt / xem trước.
 * KHÔNG ĐIỂM: v2.0 bỏ hoàn toàn điểm /100 — báo cáo sắp theo mức ưu tiên P0→P3,
 * dùng đúng bảng từ của analyze.js (WebCheck.STATUS_WORDS / PRIORITY_WORDS).
 * KHÔNG AI: không nhận xét tự động (contract.md mục 8 — moc3-ai.js là mốc riêng).
 */
(function () {
  const SLOT = document.getElementById('export-slot');
  if (!SLOT) return;
  const result = WebCheck.docKetQua();
  if (!result || !Array.isArray(result.checks)) return;

  const STATUS = WebCheck.STATUS_WORDS;
  const PRIORITY = WebCheck.PRIORITY_WORDS;
  const checks = result.checks;

  // Thời điểm: ưu tiên fetchedAt của Result; lỗi định dạng thì in nguyên chuỗi ISO.
  let khi = '—';
  if (result.fetchedAt) {
    try {
      khi = new Date(result.fetchedAt).toLocaleString('vi-VN', {
        hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch { khi = String(result.fetchedAt); }
  }

  // Dòng mục:  "[Chưa đạt · P1 — Cao] Tên hạng mục"
  const tagOf = (c) => {
    const st = STATUS[c.status] || c.status;
    return c.priority ? `[${st} · ${c.priority} — ${PRIORITY[c.priority]}]` : `[${st}]`;
  };
  // Thứ tự ưu tiên khi sắp trong nhóm: P0 → P1 → P2 → P3 → không có (pass/unknown đầu mục).
  const prRank = (c) => (c.priority ? Number(c.priority.slice(1)) : 9);
  const stRank = (c) => ({ fail: 0, warn: 1, unknown: 2, pass: 3 }[c.status] ?? 4);

  const sortChecks = (list) => list.slice().sort((a, b) => {
    if (stRank(a) !== stRank(b)) return stRank(a) - stRank(b);
    if (prRank(a) !== prRank(b)) return prRank(a) - prRank(b);
    return a.id.localeCompare(b.id);
  });

  function buildReport() {
    const L = [];
    L.push('WEBCHECK — BÁO CÁO KIỂM TRA WEBSITE (v2.0)');
    L.push('='.repeat(52));
    L.push(`Địa chỉ kiểm tra    : ${result.url || '—'}`);
    L.push(`Địa chỉ cuối cùng   : ${result.finalUrl || '—'}`);
    L.push(`Thời điểm kiểm tra  : ${khi}`);
    L.push(`Mã trạng thái HTTP  : ${result.statusCode == null ? '—' : result.statusCode}`);
    L.push(`Phiên bản bộ kiểm   : WebCheck v${result.version || '—'} (${WebCheck.VERSION})`);
    L.push('');

    // Tổng quan: đếm 4 trạng thái — không có điểm, không xếp loại.
    const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
    for (const c of checks) if (counts[c.status] != null) counts[c.status] += 1;
    L.push(`TỔNG QUAN (${checks.length} hạng mục)`);
    const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
    L.push(`  ${pad(STATUS.pass, 8)}: ${counts.pass}`);
    L.push(`  ${pad(STATUS.warn, 8)}: ${counts.warn}`);
    L.push(`  ${pad(STATUS.fail, 8)}: ${counts.fail}`);
    L.push(`  ${pad(STATUS.unknown, 8)}: ${counts.unknown}` +
      (counts.unknown ? '  (không phải lỗi — chưa đủ bằng chứng để kết luận)' : ''));
    L.push('');

    // Việc cần làm trước: P0 rồi P1 (fail/warn) — khuyến khích xử lý theo thứ tự.
    const pronto = sortChecks(checks.filter(
      (c) => (c.priority === 'P0' || c.priority === 'P1') && (c.status === 'fail' || c.status === 'warn'),
    ));
    L.push('CẦN LÀM TRƯỚC (P0 — Khẩn, P1 — Cao)');
    L.push('-'.repeat(52));
    if (!pronto.length) {
      L.push('  Không có mục nào ở mức P0/P1 cần xử lý trước. Hãy xem phần chi tiết');
      L.push('  để chọn việc theo mức P2 (Trung bình) và P3 (Khuyến nghị).');
    }
    for (const c of pronto) {
      L.push(`  ${tagOf(c)} ${c.label}`);
      if (c.detail) L.push(`      Bằng chứng   : ${c.detail}`);
      if (c.impact) L.push(`      Tác động     : ${c.impact}`);
      if (c.suggestion) L.push(`      Việc cần làm : ${c.suggestion}`);
      L.push('');
    }
    L.push('');

    // Chi tiết từng hạng mục: theo nhóm (đúng thứ tự DEFS), trong nhóm sắp P0→P3.
    L.push(`CHI TIẾT TỪNG HẠNG MỤC (${checks.length} mục)`);
    L.push('='.repeat(52));
    let groupCur = '';
    for (const c of sortChecks(checks)) {
      if (c.group !== groupCur) {
        groupCur = c.group;
        L.push(`[${groupCur}]`);
      }
      L.push(`  ${tagOf(c)} ${c.label}`);
      if (c.detail) L.push(`      Bằng chứng   : ${c.detail}`);
      if (c.status === 'warn' || c.status === 'fail') {
        if (c.impact) L.push(`      Tác động     : ${c.impact}`);
        if (c.suggestion) L.push(`      Việc cần làm : ${c.suggestion}`);
      } else if (c.suggestion) {
        L.push(`      Giữ hướng    : ${c.suggestion}`);
      }
      L.push('');
    }

    L.push('GIỚI HẠN CỦA BÁO CÁO');
    L.push('-'.repeat(52));
    L.push('- WebCheck đọc HTML tĩnh của trang chủ tại thời điểm kiểm tra; nội dung do');
    L.push('  JavaScript thêm sau khi tải (giỏ hàng, giá động…) không nằm trong kết quả.');
    L.push('- Kết quả phản ánh trang chủ, không phủ toàn bộ website (trang con, sản phẩm,');
    L.push('  landing quảng cáo).');
    L.push(`- Mục "${STATUS.unknown}" KHÔNG phải là lỗi: bộ kiểm chỉ kết luận khi có bằng`);
    L.push('  chứng chắc (ví dụ site chặn bot quét robots.txt thì không thể kết luận có tệp).');
    L.push('- Không chấm điểm, không xếp loại website: mỗi mục nêu Trạng thái + Mức ưu');
    L.push('  tiên + Bằng chứng để bạn tự quyết việc nào làm trước.');
    L.push('');
    L.push('Báo cáo sinh tự động từ dữ liệu HTML của trang (WebCheck v2.0, không dùng AI).');
    return L.join('\n');
  }

  const text = buildReport();
  const safeHost = (() => {
    try { return new URL(result.finalUrl || result.url).hostname.replace(/[^\w.-]/g, ''); }
    catch { return 'website'; }
  })();

  SLOT.innerHTML = `
  <div class="export">
    <h2 class="slot-title">Tải / sao chép báo cáo</h2>
    <p class="slot-help">Bản text đầy đủ: tổng quan 4 trạng thái, phần "Cần làm trước" (P0/P1) và từng hạng mục theo nhóm (trạng thái, mức ưu tiên, bằng chứng, việc cần làm).</p>
    <div class="export-actions">
      <button id="btn-report-copy" class="button" type="button">Sao chép báo cáo</button>
      <button id="btn-report-save" class="button" type="button">Tải tệp .txt</button>
      <button id="btn-report-view" class="button button-ghost" type="button" aria-expanded="false" aria-controls="report-view">Xem trước</button>
    </div>
    <p id="report-flash" class="export-flash" role="status" aria-live="polite"></p>
    <pre id="report-view" class="mono report-view" hidden></pre>
  </div>`;

  const flash = SLOT.querySelector('#report-flash');
  const pre = SLOT.querySelector('#report-view');
  pre.textContent = text;

  SLOT.querySelector('#btn-report-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      flash.textContent = 'Đã sao chép toàn bộ báo cáo vào clipboard.';
    } catch {
      pre.hidden = false;
      SLOT.querySelector('#btn-report-view').setAttribute('aria-expanded', 'true');
      flash.textContent = 'Trình duyệt chặn truy cập clipboard — dùng nút "Xem trước" rồi bôi đen/Ctrl+C.';
    }
  });

  SLOT.querySelector('#btn-report-view').addEventListener('click', (ev) => {
    const open = pre.hidden;
    pre.hidden = !open;
    ev.currentTarget.setAttribute('aria-expanded', String(open));
  });

  SLOT.querySelector('#btn-report-save').addEventListener('click', () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `webcheck-${safeHost}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    flash.textContent = `Đã tải webcheck-${safeHost}.txt.`;
  });
})();
