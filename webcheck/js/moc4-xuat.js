'use strict';
/*
 * MỘC 4 — Xuất báo cáo text (v1.3, làm bởi mốc 1 theo yêu cầu v1.3)
 * Cắm vào #export-slot (results.html): dựng báo cáo thuần text từ
 * Result + WebCheck.tinhDiem() rồi cho 2 nút: sao chép / tải .txt.
 * KHÔNG AI: báo cáo v1.3 chỉ có URL, thời điểm, điểm tổng, điểm nhóm, từng tiêu
 * chí (trạng thái, điểm, kết quả, gợi ý) — không nhận xét AI (contract.md mục 8).
 */
(function () {
  const SLOT = document.getElementById('export-slot');
  if (!SLOT) return;
  const result = WebCheck.docKetQua();
  if (!result) return;

  const s = WebCheck.tinhDiem(result);
  const fmt = (n) => (n == null ? '—' : (Math.round(n * 10) / 10).toString().replace('.', ','));
  const WORDS = { pass: 'Đạt', warn: 'Cảnh báo', fail: 'Chưa đạt', unknown: 'Không rõ' };

  // Thời điểm: ưu tiên fetchedAt từng Result; kết thúc bằng ISO → chuyển "7/11/2026 14:30".
  let khi = '—';
  if (result.fetchedAt) {
    try {
      khi = new Date(result.fetchedAt).toLocaleString('vi-VN', {
        hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      });
    } catch { khi = String(result.fetchedAt); }
  }

  function buildReport() {
    const L = [];
    L.push('WEBCHECK — BÁO CÁO KIỂM TRA WEBSITE');
    L.push('='.repeat(46));
    L.push(`Địa chỉ kiểm tra    : ${result.url || '—'}`);
    L.push(`Địa chỉ cuối cùng   : ${result.finalUrl || '—'}`);
    L.push(`Thời điểm kiểm tra  : ${khi}`);
    L.push(`Mã trạng thái HTTP  : ${result.statusCode == null ? '—' : result.statusCode}`);
    L.push(`Phiên bản bộ kiểm   : WebCheck v${result.version || '—'} (${WebCheck.VERSION})`);
    L.push('');
    L.push(`TỔNG ĐIỂM           : ${fmt(s.total)}/100 — xếp loại ${s.capDo}`);
    L.push(`Thực chấm được      : ${fmt(s.mauSo)}/100 trọng số` +
      (s.counts.unknown ? ` (${s.counts.unknown} mục unknown loại khỏi mẫu số)` : ''));
    L.push(`Đạt / Cảnh báo / Chưa đạt / Không rõ: ${s.counts.pass} / ${s.counts.warn} / ${s.counts.fail} / ${s.counts.unknown}`);
    L.push('');
    L.push('ĐIỂM THEO NHÓM');
    for (const g of s.groups) {
      L.push(`  • ${g.name}: ${fmt(g.earned)}/${fmt(g.max)} điểm` +
        (g.max < g.weight ? ` (thang đủ ${fmt(g.weight)}, unknown bị loại)` : ''));
    }
    L.push('');
    L.push('CHI TIẾT TỪNG TIÊU CHÍ');
    L.push('-'.repeat(46));
    let groupCur = '';
    for (const c of result.checks) {
      if (c.group !== groupCur) {
        groupCur = c.group;
        L.push(`[${groupCur}]`);
      }
      const diem = c.level === 'pass' ? c.weight : c.level === 'warn' ? c.weight / 2 : null;
      L.push(`  [${WORDS[c.level] || c.level}] ${c.label} — ${fmt(diem)}/${c.weight} điểm`);
      L.push(`    Kết quả: ${c.detail}`);
      if (c.suggestion) L.push(`    Gợi ý  : ${c.suggestion}`);
    }
    L.push('');
    L.push('Báo cáo sinh tự động từ dữ liệu HTML của trang (WebCheck v1.3, không dùng AI).');
    L.push('Kết quả phản ánh trang chủ tại thời điểm kiểm tra — không phủ toàn bộ website.');
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
    <p class="slot-help">Bản text đầy đủ: điểm tổng, điểm nhóm và từng tiêu chí (trạng thái, điểm, kết quả, gợi ý).</p>
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
