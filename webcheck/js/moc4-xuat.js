'use strict';
/*
 * MỘC 4 — Xuất báo cáo text (v2.0)
 * Cắm vào #export-slot (results.html): báo cáo như thư gửi chủ doanh nghiệp —
 * mở đầu "trang đang ở đâu" + 5 việc đáng làm đầu tiên (P0→…, lời khuyên ngắn),
 * rồi chi tiết từng hạng mục theo nhóm; 3 nút: sao chép / tải .txt / xem trước.
 * KHÔNG ĐIỂM: v2.0 bỏ hoàn toàn điểm /100 — dùng đúng bảng từ của analyze.js
 * (WebCheck.STATUS_WORDS / PRIORITY_WORDS).
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

    // Đếm 4 trạng thái — cơ sở cho phần mở đầu và bảng tổng quan (không có điểm).
    const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
    for (const c of checks) if (counts[c.status] != null) counts[c.status] += 1;

    // Thứ tự "việc cần làm": ưu tiên trước (P0→P3), cùng mức thì Chưa đạt trước Cần cải thiện.
    const todoCmp = (a, b) =>
      prRank(a) - prRank(b) ||
      (a.status === b.status ? 0 : a.status === 'fail' ? -1 : 1) ||
      a.id.localeCompare(b.id);
    // Rút ngắn lời khuyên để mỗi dòng việc đầu tiên đọc trong một cái nhìn.
    const short = (s) => (s.length > 108 ? s.slice(0, 105) + '…' : s);

    // Phần mở đầu kiểu thư: "trang của bạn đang ở đâu" — kể từ số liệu, không chấm điểm.
    L.push('TRANG CỦA BẠN ĐANG Ở ĐÂU');
    L.push('-'.repeat(52));
    L.push(`Qua ${checks.length} hạng mục nền móng, ${safeHost} hiện có: ` +
      `${counts.pass} Đạt, ${counts.warn} Cần cải thiện, ${counts.fail} Chưa đạt` +
      (counts.unknown ? `, ${counts.unknown} Không xác định (chưa đủ bằng chứng — không phải lỗi)` : '') + '.');
    const todos = checks.filter((c) => c.status === 'fail' || c.status === 'warn').sort(todoCmp).slice(0, 5);
    if (todos.length) {
      const first = todos[0];
      const pr = first.priority ? `${first.priority} — ${PRIORITY[first.priority]}` : STATUS[first.status];
      L.push(`Việc nên bắt đầu: "${first.label}" [${pr}]`);
      if (first.suggestion) L.push(`Hướng làm: ${short(first.suggestion)}`);
    } else {
      L.push('Chưa có mục nào đang chưa ổn — nền móng trang ổn định, giữ hướng như phần chi tiết dưới đây.');
    }
    L.push('');

    // 5 việc đáng làm đầu tiên: P0 → P1 → P2… (mỗi dòng 1 việc + hướng khắc phục ngắn).
    L.push('5 VIỆC ĐÁNG LÀM ĐẦU TIÊN');
    L.push('-'.repeat(52));
    if (!todos.length) {
      L.push('  (Không có mục Chưa đạt / Cần cải thiện nào — danh sách trống là tin vui.)');
    }
    todos.forEach((c, i) => {
      const pr = c.priority ? `${c.priority} — ${PRIORITY[c.priority]}` : STATUS[c.status];
      L.push(`  ${i + 1}. [${pr}] ${c.label}${c.suggestion ? ` → ${short(c.suggestion)}` : ''}`);
    });
    L.push('');

    // Bảng đếm 4 trạng thái (tham khảo nhanh — unknown không phải lỗi).
    const pad = (s, w) => s + ' '.repeat(Math.max(0, w - s.length));
    L.push(`TỔNG QUAN (${checks.length} hạng mục)`);
    L.push(`  ${pad(STATUS.pass, 8)}: ${counts.pass}`);
    L.push(`  ${pad(STATUS.warn, 8)}: ${counts.warn}`);
    L.push(`  ${pad(STATUS.fail, 8)}: ${counts.fail}`);
    L.push(`  ${pad(STATUS.unknown, 8)}: ${counts.unknown}` +
      (counts.unknown ? '  (không phải lỗi — chưa đủ bằng chứng để kết luận)' : ''));
    L.push('');

    // Chi tiết từng hạng mục: nhóm theo đúng thứ tự DEFS (WebCheck.GROUPS), trong
    // nhóm sắp theo mức ưu tiên (sortChecks). Nhóm lạ ngoài bảng (Result dựng tay)
    // thêm ở cuối theo lần xuất hiện — không ghép lẫn, không in lặp header.
    L.push(`CHI TIẾT TỪNG HẠNG MỤC (${checks.length} mục)`);
    L.push('='.repeat(52));
    const grouped = new Map();
    for (const c of checks) {
      if (!grouped.has(c.group)) grouped.set(c.group, []);
      grouped.get(c.group).push(c);
    }
    const groupOrder = [...WebCheck.GROUPS].filter((g) => grouped.has(g));
    for (const g of grouped.keys()) if (!groupOrder.includes(g)) groupOrder.push(g);
    for (const g of groupOrder) {
      L.push(`[${g}]`);
      for (const c of sortChecks(grouped.get(g))) {
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

  const safeHost = (() => {
    try { return new URL(result.finalUrl || result.url).hostname.replace(/[^\w.-]/g, ''); }
    catch { return 'website'; }
  })();
  const text = buildReport();

  SLOT.innerHTML = `
  <div class="export">
    <h2 class="slot-title">Tải / sao chép báo cáo</h2>
    <p class="slot-help">Bản text như thư gửi khách: mở đầu "trang đang ở đâu", 5 việc đáng làm đầu tiên, tổng quan 4 trạng thái rồi chi tiết từng hạng mục theo nhóm.</p>
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
