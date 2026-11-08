'use strict';
/*
 * MỐC 5 — Lịch sử kiểm tra (v2.0)
 * Cắm vào #history-slot (results.html): mỗi lần trang kết quả mở, tự ghi 1 bản
 * ghi GỌN vào localStorage("webcheck:history") — thời điểm, host, đếm 4 trạng
 * thái + đếm P0/P1; KHÔNG lưu mảng checks (tránh phình quota). Vẽ dòng thời gian
 * bằng câu tự nhiên, mới nhất trên đầu, tối đa 20 bản; tự sinh câu so sánh 2
 * lượt gần nhất CÙNG website và cùng loại (demo so riêng với demo).
 * Bản chạy ?demo=1 được gắn nhãn "(demo)" — không lẫn lịch sử thật.
 * KHÔNG ĐIỂM: dùng đúng bảng từ WebCheck.STATUS_WORDS / PRIORITY_WORDS; không
 * gọi API, không đụng key "webcheck:result" của mốc 1.
 */
(function () {
  const SLOT = document.getElementById('history-slot');
  if (!SLOT) return;
  const doc = WebCheck.docKetQua();
  if (!doc || !Array.isArray(doc.checks)) return;

  const KEY = 'webcheck:history';
  const KEEP_MAX = 20;
  const STATUS = WebCheck.STATUS_WORDS;
  const PRIORITY = WebCheck.PRIORITY_WORDS;
  const isDemo = new URLSearchParams(location.search).has('demo');

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  let host = 'website chưa rõ';
  try { host = new URL(doc.finalUrl || doc.url).hostname; } catch { /* URL lỗi → dùng chữ chung */ }

  // Bản ghi của lượt vừa mở: đếm 4 trạng thái + đếm P0/P1 (theo mức ưu tiên).
  const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
  let p0 = 0;
  let p1 = 0;
  for (const c of doc.checks) {
    if (counts[c.status] != null) counts[c.status] += 1;
    if (c.priority === 'P0') p0 += 1;
    else if (c.priority === 'P1') p1 += 1;
  }
  const record = { t: Date.now(), host, demo: isDemo, counts: { ...counts }, p0, p1 };

  // Nạp lịch sử cũ; dữ liệu hỏng/chặn ghi thì coi như trống — không làm hỏng trang.
  let list = [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(raw)) {
      list = raw.filter((r) => r && typeof r === 'object' && r.counts && typeof r.t === 'number');
    }
  } catch { /* localStorage bị chặn (chế độ riêng tư…) */ }

  list.unshift(record);
  list = list.slice(0, KEEP_MAX);
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch { return false; }
  }
  const saved = persist();

  /* ── Vẽ ─────────────────────────────────────────────────────────────────── */

  // "Cách đây …" đủ đọc trong một cái nhìn, không đòi người đọc tính giờ.
  function whenLabel(t) {
    const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
    if (sec < 60) return 'Vừa ghi nhận';
    if (sec < 3600) return `Cách đây ${Math.round(sec / 60)} phút`;
    if (sec < 86400) return `Cách đây ${Math.round(sec / 3600)} giờ`;
    const days = Math.round(sec / 86400);
    if (days < 30) return `Cách đây ${days} ngày`;
    return 'Ngày ' + new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  // Câu so sánh với lượt gần nhất trước đó (cùng website, cùng loại thật/demo).
  function deltaSentence(prev, cur) {
    const diff = ['pass', 'warn', 'fail']
      .map((k) => ({ k, v: cur.counts[k] - prev.counts[k] }))
      .filter((x) => x.v);
    let line;
    if (!diff.length) {
      line = 'So với lần trước: chưa đổi mục nào đáng kể';
    } else {
      line = 'So với lần trước: ' + diff
        .map((x) => `${x.v > 0 ? '+' : ''}${x.v} mục ${STATUS[x.k]}`)
        .join(', ');
      const good = diff.some((x) => (x.k === 'pass' && x.v > 0) || (x.k !== 'pass' && x.v < 0));
      const bad = diff.some((x) => (x.k === 'pass' && x.v < 0) || (x.k !== 'pass' && x.v > 0));
      if (good && !bad) line += ' — tốt hơn trước';
      else if (bad && !good) line += ' — hơi tụt, xem mục Chưa đạt/Cần cải thiện';
      else line += ' — có mục tốt hơn, có mục tụt lại';
    }
    if (prev.p0 > 0 && cur.p0 === 0) line += '. Nhờ đó đã hết việc Khẩn (P0)!';
    else if (cur.p0 > prev.p0) line += `. Đáng chú ý: xuất hiện thêm ${cur.p0 - prev.p0} việc Khẩn (P0).`;
    else if (cur.p0 > 0) line += `. Vẫn còn ${cur.p0} việc Khẩn (P0) chờ xử lý.`;
    return line;
  }

  function countsLine(r) {
    const base = [
      `${r.counts.pass} ${STATUS.pass}`,
      `${r.counts.warn} ${STATUS.warn}`,
      `${r.counts.fail} ${STATUS.fail}`,
      `${r.counts.unknown} ${STATUS.unknown}`,
    ].join(' · ');
    const jobs = [];
    if (r.p0) jobs.push(`${r.p0} việc Khẩn (P0)`);
    if (r.p1) jobs.push(`${r.p1} việc Cao (P1)`);
    return jobs.length ? `${base} — ${jobs.join(', ')}` : base;
  }

  function render() {
    SLOT.textContent = '';

    const box = el('div', 'his');
    box.appendChild(el('h2', 'slot-title', 'Lịch sử kiểm tra'));
    box.appendChild(el('p', 'slot-help',
      'Mỗi lần mở trang kết quả, máy bạn tự ghi lại 1 lượt trong localStorage — tối đa 20 lượt. Bản chạy demo được đánh dấu riêng để không lẫn lịch sử thật.'));
    if (!saved) {
      box.appendChild(el('p', 'his-warn',
        'Trình duyệt chặn ghi localStorage nên lượt vừa rồi không được lưu — phần cũ vẫn xem được.'));
    }
    if (!list.length) {
      box.appendChild(el('p', 'his-empty',
        'Chưa có lượt nào trong máy — chạy một lượt kiểm tra thật để bắt đầu dòng thời gian.'));
      SLOT.appendChild(box);
      return;
    }

    const listEl = el('ol', 'his-list');
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const li = el('li', 'his-item');

      const head = el('p', 'his-head');
      head.appendChild(el('span', 'his-when', whenLabel(r.t)));
      head.appendChild(el('span', 'his-host', r.host || 'website chưa rõ'));
      if (r.demo) head.appendChild(el('span', 'his-tag', 'demo'));
      const del = el('button', 'his-del', 'Xoá');
      del.type = 'button';
      del.setAttribute('aria-label', `Xoá bản ghi lượt ${whenLabel(r.t)}`);
      del.addEventListener('click', () => {
        if (!confirm(`Xoá lượt kiểm ${whenLabel(r.t)} — ${r.host || 'website chưa rõ'}?`)) return;
        list.splice(i, 1);
        persist();
        render();
      });
      head.appendChild(del);
      li.appendChild(head);

      li.appendChild(el('p', 'his-counts', countsLine(r)));

      // Câu so sánh chỉ đặt ở bản ghi thứ hai trở đi — tìm lượt cũ nhất định
      // CÙNG website + cùng loại (thật với thật, demo với demo).
      if (i < list.length - 1) {
        const prev = list.slice(i + 1).find((p) => p.host === r.host && !!p.demo === !!r.demo);
        if (prev) li.appendChild(el('p', 'his-delta', deltaSentence(prev, r)));
      }
      listEl.appendChild(li);
    }
    box.appendChild(listEl);

    const clearAll = el('button', 'button button-ghost', 'Xoá toàn bộ lịch sử');
    clearAll.type = 'button';
    clearAll.addEventListener('click', () => {
      if (!confirm(`Xoá toàn bộ ${list.length} bản ghi lịch sử?`)) return;
      list = [];
      persist();
      render();
    });
    const actions = el('div', 'export-actions');
    actions.appendChild(clearAll);
    box.appendChild(actions);

    SLOT.appendChild(box);
  }

  render();
})();
