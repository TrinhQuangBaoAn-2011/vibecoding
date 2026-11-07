'use strict';
/*
 * MỘC 2 — Điểm /100 (v1.3, làm bởi mốc 1 theo yêu cầu v1.3)
 * Cắm vào #score-slot (results.html): đọc Result → WebCheck.tinhDiem() (nằm
 * trong js/analyze.js) rồi render:
 *   1) điểm tổng + xếp loại   2) thanh điểm từng nhóm   3) số đếm pass/warn/fail/unknown
 *   4) ghi chú minh bạch về các mục unknown (bị loại khỏi mẫu số).
 * IKHO AI: file này KHÔNG render nhận xét/dự phóng (đã tách khỏi v1.3) — khối AI
 * sẽ cắm qua #ai-slot sau (js/moc3-ai.js, xem contract.md mục 9).
 */
(function () {
  const SLOT = document.getElementById('score-slot');
  if (!SLOT) return;
  const result = WebCheck.docKetQua();
  if (!result) return;

  const s = WebCheck.tinhDiem(result);
  // "79,6" — dấu phẩy thập phân kiểu Việt Nam.
  const fmt = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');

  const rows = s.groups.map((g) => {
    const pct = g.max > 0 ? Math.max(0, Math.min(1, g.earned / g.max)) * 100 : 0;
    const note = g.max < g.weight
      ? `  • chấm được trên ${fmt(g.max)} (unknown bị loại)` : '';
    return `<li class="gbar-row">
      <span class="gbar-name">${escapeHtml(g.name)}</span>
      <span class="gbar" role="img" aria-label="nhóm ${escapeHtml(g.name)}: ${fmt(g.earned)} trên ${fmt(g.max)} điểm">
        <span class="gbar-fill" style="width:${pct.toFixed(1)}%"></span>
      </span>
      <span class="gbar-pts mono">${fmt(g.earned)}/${fmt(g.max)}</span>
      <span class="gbar-note">${escapeHtml(note)}</span>
    </li>`;
  }).join('');

  const noteUnknown = s.counts.unknown > 0
    ? `<p class="score-note">Chấm điểm trên <b>${fmt(s.mauSo)}</b>/100 trọng số thật —
       ${s.counts.unknown} mục không xác định được từ dữ liệu của trang (unknown) được
       <b>loại khỏi mẫu số</b>, không bị tính như lỗi.</p>`
    : '';

  SLOT.innerHTML = `
  <section class="score" aria-label="Điểm kiểm tra website">
    <div class="score-hero">
      <p class="score-num mono" aria-label="Điểm tổng">
        <span class="score-big">${fmt(s.total)}</span><span class="score-of">/100</span>
      </p>
      <div class="score-side">
        <p class="score-grade" data-grade="${escapeHtml(s.capDo)}" aria-hidden="true">${escapeHtml(s.capDo)}</p>
        <ul class="counts">
          <li class="c-pass"><span class="glyph" aria-hidden="true">✓</span> Đạt: <b>${s.counts.pass}</b></li>
          <li class="c-warn"><span class="glyph" aria-hidden="true">!</span> Cảnh báo: <b>${s.counts.warn}</b></li>
          <li class="c-fail"><span class="glyph" aria-hidden="true">✕</span> Chưa đạt: <b>${s.counts.fail}</b></li>
          <li class="c-unknown"><span class="glyph" aria-hidden="true">?</span> Không rõ: <b>${s.counts.unknown}</b></li>
        </ul>
      </div>
    </div>
    <ul class="gbars" aria-label="Điểm theo nhóm">${rows}</ul>
    ${noteUnknown}
  </section>`;

  function escapeHtml(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[m]));
  }
})();
