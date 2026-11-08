'use strict';
/*
 * MỘC 2 — Tổng quan (v2.0, thay moc2-diem.js)
 * Cắm vào #summary-slot (results.html): KHÔNG còn điểm /100, không xếp loại.
 * Render 3 khối:
 *   1) thống kê 4 trạng thái (Đạt / Cần cải thiện / Chưa đạt / Không xác định)
 *      + ghi chú minh bạch: unknown KHÔNG phải lỗi;
 *   2) bảng "Việc cần làm trước" — các mục P0 rồi P1 (từ PRIORITY_MAP v2.0);
 *   3) trả lời 6 câu hỏi doanh nghiệp bằng đúng bằng chứng các mục liên quan.
 * KHÔNG AI: mốc 3 là file riêng (moc3-ai.js) — hủy bỏ mọi logic AI ở đây.
 */
(function () {
  const SLOT = document.getElementById('summary-slot');
  if (!SLOT) return;
  const result = WebCheck.docKetQua();
  if (!result || !Array.isArray(result.checks)) return;

  const checks = result.checks;
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
  const STATUS = WebCheck.STATUS_WORDS;
  const PRIORITY = WebCheck.PRIORITY_WORDS;
  const GLYPHS = { pass: '✓', warn: '!', fail: '✕', unknown: '?' };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ── Khối 1: thống kê 4 trạng thái ──────────────────────────────────────── */

  const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
  for (const c of checks) if (counts[c.status] != null) counts[c.status] += 1;

  const wrap = el('div', 'ov');
  const h = el('h2', 'ov-title', 'Tổng quan');
  const stats = el('div', 'ov-stats');
  for (const st of ['pass', 'warn', 'fail', 'unknown']) {
    const box = el('div', 'ov-stat ov-st-' + st);
    box.setAttribute('data-status', st);
    const num = el('span', 'ov-num', String(counts[st]));
    const word = el('span', 'ov-word', STATUS[st]);
    box.appendChild(num);
    box.appendChild(word);
    stats.appendChild(box);
  }
  const noteUnknown = el('p', 'ov-note');
  noteUnknown.textContent = counts.unknown
    ? `${counts.unknown} mục "Không xác định" KHÔNG phải lỗi: WebCheck chỉ kết luận khi đủ bằng chứng (ví dụ site chặn bot quét robots.txt) — minh bạch hơn là suy đoán lung tung.`
    : 'Mọi hạng mục đều có đủ bằng chứng để kết luận trong lần kiểm tra này.';
  wrap.appendChild(h);
  wrap.appendChild(stats);
  wrap.appendChild(noteUnknown);

  /* ── Khối 2: "Việc cần làm trước" — P0 rồi P1 ───────────────────────────── */

  const pronto = checks
    .filter((c) => (c.priority === 'P0' || c.priority === 'P1') && (c.status === 'fail' || c.status === 'warn'))
    .sort((a, b) => {
      const pr = { P0: 0, P1: 1 };
      if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
      if (a.status !== b.status) return a.status === 'fail' ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

  if (pronto.length) {
    const box = el('div', 'ov-todo');
    const h3 = el('h3', 'ov-h3', 'Việc cần làm trước');
    const sub = el('p', 'ov-sub', 'Bắt đầu từ P0 (Khẩn) rồi P1 (Cao) — mỗi việc là một mục có đủ bằng chứng bên dưới.');
    const list = el('ul', 'ov-todo-list');
    for (const c of pronto) {
      const li = el('li', 'ov-todo-item ov-st-' + c.status);

      const head = el('p', 'ov-todo-head');
      const pr = el('span', 'pr-badge pr-' + c.priority, c.priority);
      pr.setAttribute('title', PRIORITY[c.priority]);
      const glyph = el('span', 'ov-glyph', GLYPHS[c.status]);
      glyph.setAttribute('aria-label', STATUS[c.status]);
      const name = el('span', 'ov-todo-name', c.label);
      head.appendChild(pr);
      head.appendChild(glyph);
      head.appendChild(name);
      li.appendChild(head);

      if (c.detail) li.appendChild(el('p', 'ov-todo-detail', c.detail));
      if (c.suggestion) li.appendChild(el('p', 'ov-todo-fix', 'Việc cần làm: ' + c.suggestion));
      list.appendChild(li);
    }
    box.appendChild(h3);
    box.appendChild(sub);
    box.appendChild(list);
    wrap.appendChild(box);
  }

  /* ── Khối 3: 6 câu hỏi doanh nghiệp — trả lời bằng đúng bằng chứng ─────── */

  const QUESTIONS = [
    { q: 'Trang của tôi chắc chắn được Google đọc và đưa lên kết quả tìm kiếm?', ids: ['robots_meta', 'robots_txt', 'sitemap', 'structured_data', 'canonical', 'https'] },
    { q: 'Khách mở trang bằng điện thoại có xem được không?', ids: ['viewport', 'img_wh', 'img_alt', 'lazy_load', 'theme_color'] },
    { q: 'Khách có nhìn thấy rõ trang bán gì, làm dịch vụ gì?', ids: ['product_service', 'h1', 'heading_system', 'support_info'] },
    { q: 'Khách muốn hỏi, muốn mua thì liên hệ được nhanh không?', ids: ['contact_info', 'contact_form', 'cta', 'social_links'] },
    { q: 'Có gì khiến khách tin tôi (đánh giá, địa chỉ, chính sách)?', ids: ['trust_signals', 'business_identity', 'policy_links', 'working_hours'] },
    { q: 'Trang có nhanh, có đo được khách đến từ đâu không?', ids: ['page_weight', 'resources', 'render_blocking', 'analytics', 'image_format'] },
  ];

  const replyFor = (ids) => {
    const cs = ids.map((id) => byId[id]).filter(Boolean);
    const fail = cs.filter((c) => c.status === 'fail');
    const warn = cs.filter((c) => c.status === 'warn');
    const unknown = cs.filter((c) => c.status === 'unknown');
    let st;
    let lead;
    if (fail.length) {
      st = 'fail';
      lead = `Chưa đạt — ${fail.length} mục phải xử lý ngay: `;
    } else if (warn.length) {
      st = 'warn';
      lead = `Cần cải thiện — ${warn.length} mục nên xử lý: `;
    } else if (unknown.length === cs.length) {
      st = 'unknown';
      lead = 'Không xác định — các mục này chưa đủ bằng chứng để kết luận.';
    } else if (unknown.length) {
      st = 'warn';
      lead = `Đạt các phần còn lại; ${unknown.map((c) => c.label).join(', ')} chưa đủ bằng chứng để kết luận.`;
    } else {
      st = 'pass';
      lead = `Đạt — trong ${cs.length} mục liên quan không thấy vấn đề nào.`;
    }
    const items = [...fail, ...warn];
    return { st, lead, items, all: cs };
  };

  const box = el('div', 'ov-questions');
  box.appendChild(el('h3', 'ov-h3', 'Sáu câu hỏi doanh nghiệp thường cần biết'));
  const dl = el('dl', 'ov-q-list');
  for (const { q, ids } of QUESTIONS) {
    const r = replyFor(ids);
    const dt = el('dt', 'ov-q', q);
    const dd = el('dd', 'ov-a ov-st-' + r.st);
    dd.appendChild(el('p', 'ov-a-lead', r.lead));
    for (const c of r.items) {
      const p = el('p', 'ov-a-item');
      const glyph = el('span', 'ov-glyph', GLYPHS[c.status]);
      glyph.setAttribute('aria-label', STATUS[c.status]);
      p.appendChild(glyph);
      // label + (mức P nếu có) + một câu bằng chứng rút gọn
      p.appendChild(document.createTextNode(
        `${c.label}${c.priority ? ` (${c.priority} ${PRIORITY[c.priority]})` : ''}`
      ));
      dd.appendChild(p);
      if (c.suggestion) dd.appendChild(el('p', 'ov-a-fix', c.suggestion));
    }
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  box.appendChild(dl);
  wrap.appendChild(box);

  SLOT.textContent = '';
  SLOT.appendChild(wrap);
})();
