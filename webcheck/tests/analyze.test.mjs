import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DOMParser } from 'linkedom';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'js', 'analyze.js'), 'utf8');
// js/analyze.js là plain script (không import/export) để chạy được cả trong
// trình duyệt lẫn qua sandbox ở đây — đây chính là seam công khai của mốc 1.
const WebCheck = new Function(src + '\n;return WebCheck;')();
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');

const GOOD_ROBOTS = 'User-agent: *\nDisallow: /admin/\nSitemap: https://atlas-cafe.vn/sitemap.xml\n';
const GOOD_SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://atlas-cafe.vn/</loc></url>\n  <url><loc>https://atlas-cafe.vn/thuc-don</loc></url>\n</urlset>';

// Meta mặc định: trang HTTPS chuẩn; robots.txt + sitemap.xml "từng fetch sẵn" (?soft=1).
// Fake một trang đủ tốt để các check nền không nhiễu vào trường hợp đang thử.
const BASE = 'Quán cà phê Atlas — rang xay Đà Lạt';          // title 36 ký tự (đạt 30–60)
const DESC = 'Quán cà phê rang xay tại Đà Lạt. Rang mộc từng mẻ, giao toàn quốc, đặt bàn online.'; // ~96 ký tự
const page = (body) => `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">` +
  `<title>${BASE}</title><meta name="description" content="${DESC}">` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">` +
  `</head><body>${body}</body></html>`;

const defMeta = (extra = {}) => ({
  inputUrl: 'atlas-cafe.vn',
  finalUrl: 'https://atlas-cafe.vn/',
  statusCode: 200,
  elapsedMs: 800,
  robots: { statusCode: 200, text: GOOD_ROBOTS },
  sitemap: { statusCode: 200, text: GOOD_SITEMAP },
  ...extra,
});
const run = (body, extra) => WebCheck.runChecks(page(body), defMeta(extra), parse);
const runDoc = (fullHtml, extra) => WebCheck.runChecks(fullHtml, defMeta(extra), parse);
const lv = (r, id) => r.checks.find((c) => c.id === id).level;
const rst = (r, id) => r.checks.find((c) => c.id === id);

/* ── 1) Cấu trúc bộ tiêu chí v1.3 ───────────────────────────────────────── */

test('v1.3: 34 mục, không trùng ID, tổng trọng số đúng 100, version 1.3', () => {
  assert.equal(WebCheck.DEFS.length, 34);
  const ids = WebCheck.DEFS.map((d) => d.id);
  assert.equal(new Set(ids).size, 34);
  assert.equal(WebCheck.DEFS.reduce((s, d) => s + d.weight, 0), 100);
  assert.equal(WebCheck.VERSION, '1.3');
});

test('v1.3: giữ nguyên đủ 22 ID cũ của v1.2', () => {
  const ids = new Set(WebCheck.DEFS.map((d) => d.id));
  for (const id of ['title', 'meta_description', 'open_graph', 'canonical', 'robots_meta',
    'robots_txt', 'sitemap', 'structured_data', 'https', 'lang', 'charset', 'h1',
    'heading_system', 'links', 'analytics', 'viewport', 'img_alt', 'favicon',
    'theme_color', 'lazy_load', 'resources', 'page_weight']) {
    assert.ok(ids.has(id), 'mất ID cũ: ' + id);
  }
});

test('v1.3: đúng 6 nhóm với trọng số nhóm chốt trong hợp đồng', () => {
  const byGroup = {};
  for (const d of WebCheck.DEFS) byGroup[d.group] = (byGroup[d.group] || 0) + d.weight;
  assert.deepEqual(byGroup, {
    'SEO & hiển thị': 26,
    'Chuẩn kỹ thuật': 23,
    'Di động & hình ảnh': 17,
    'Tốc độ tải nội dung': 3,
    'Marketing & chuyển đổi': 18,
    'Trải nghiệm & truy cập': 13,
  });
});

test('runChecks: Result trả đủ 34 check đúng thứ tự DEFS', () => {
  const r = run('<p>chào</p>');
  assert.equal(r.version, '1.3');
  assert.equal(r.checks.length, 34);
  assert.deepEqual(r.checks.map((c) => c.id), WebCheck.DEFS.map((d) => d.id));
});

/* ── 2) Nhóm marketing & chuyển đổi ─────────────────────────────────────── */

test('cta: CTA rõ ràng → pass; chỉ đường dẫn liên hệ thường → warn; réo hính không mục đích nào → fail', () => {
  assert.equal(lv(run('<p>a</p><a class="btn-main" href="/dat-ban">Đặt bàn</a>'), 'cta'), 'pass');
  assert.equal(lv(run('<p>a</p><a href="/lien-he">Liên hệ</a>'), 'cta'), 'warn');
  assert.equal(lv(run('<p>chào bạn</p>'), 'cta'), 'fail');
});

test('contact_info: ≥2 kênh liên hệ → pass; 1 kênh → warn; không → fail (số VN nhận cả dạng có dấu chấm)', () => {
  assert.equal(lv(run('<p>a</p><a href="tel:0917000111">Gọi</a><a href="mailto:hi@quanmoc.vn">Email</a>'), 'contact_info'), 'pass');
  assert.equal(lv(run('<p>Hotline 0917.000.111</p>'), 'contact_info'), 'warn');
  assert.equal(lv(run('<p>chào</p>'), 'contact_info'), 'fail');
});

test('contact_form: form có trường nhập + nút gửi → pass; form thiếu nút gửi → warn; không form → fail', () => {
  assert.equal(lv(run('<form><input type="email"><button type="submit">Gửi</button></form>'), 'contact_form'), 'pass');
  assert.equal(lv(run('<form><input type="text"></form>'), 'contact_form'), 'warn');
  assert.equal(lv(run('<p>x</p>'), 'contact_form'), 'fail');
});

test('social_links: link trang fanpage → pass; chỉ link share → warn; không → fail', () => {
  assert.equal(lv(run('<a href="https://facebook.com/quanmoc">Fanpage</a>'), 'social_links'), 'pass');
  assert.equal(lv(run('<a href="https://www.facebook.com/sharer/sharer.php?u=/x">Chia sẻ</a>'), 'social_links'), 'warn');
  assert.equal(lv(run('<p>x</p>'), 'social_links'), 'fail');
});

test('policy_links: ≥2 trang chính sách/quy định → pass; 1 → warn; 0 → fail', () => {
  assert.equal(lv(run('<a href="/dieu-khoan">Điều khoản</a><a href="/chinh-sach-bao-mat">Bảo mật</a>'), 'policy_links'), 'pass');
  assert.equal(lv(run('<a href="/chinh-sach">Chính sách</a>'), 'policy_links'), 'warn');
  assert.equal(lv(run('<p>x</p>'), 'policy_links'), 'fail');
});

/* ── 3) Nhóm chuẩn kỹ thuật (mới) ───────────────────────────────────────── */

test('duplicate_ids: ID trùng → fail kèm tên ID trong chi tiết; không trùng → pass', () => {
  const bad = run('<div id="x"></div><span id="x"></span>');
  assert.equal(lv(bad, 'duplicate_ids'), 'fail');
  assert.ok(rst(bad, 'duplicate_ids').detail.includes('"x"'));
  assert.equal(lv(run('<div id="ok"></div>'), 'duplicate_ids'), 'pass');
});

test('mixed_content: script/CSS http → fail; ảnh http → warn; sạch → pass; trang HTTP → unknown', () => {
  assert.equal(lv(run('<img src="http://ads.example.com/x.jpg" alt="a">'), 'mixed_content'), 'warn');
  assert.equal(lv(run('<script src="http://ads.example.com/a.js"></script>'), 'mixed_content'), 'fail');
  assert.equal(lv(run('<img src="photo.jpg" alt="a"><script src="/app.js"></script>'), 'mixed_content'), 'pass');
  assert.equal(lv(run('<p>x</p>', { finalUrl: 'http://atlas-cafe.vn/' }), 'mixed_content'), 'unknown');
});

test('img_wh: ảnh thiếu width/height tối đa chỉ warn — không bao giờ fail (CSS aspect-ratio không thấy được)', () => {
  assert.equal(lv(run('<img alt="a">'), 'img_wh'), 'warn');
  assert.equal(lv(run('<img alt="a" width="800" height="600">'), 'img_wh'), 'pass');
  assert.equal(lv(run('<p>không có ảnh</p>'), 'img_wh'), 'pass');
});

test('lang: "vi" → pass; giá trị khai báo không chuẩn → warn; không khai báo → fail', () => {
  const head = (lang) => `<!DOCTYPE html><html${lang ? ` lang="${lang}"` : ''}><head><meta charset="utf-8"><title>${BASE}</title><meta name="description" content="${DESC}"></head><body><p>x</p></body></html>`;
  assert.equal(lv(runDoc(head('vi')), 'lang'), 'pass');
  assert.equal(lv(runDoc(head('vn')), 'lang'), 'warn');
  assert.equal(lv(runDoc(head('')), 'lang'), 'fail');
});

/* ── 4) Nhóm trải nghiệm & truy cập ─────────────────────────────────────── */

test('semantic_html: mainящий (kèm header/footer) → pass; có ≥1 landmark nhưng thiếu chủ chốt → warn; chỉ div → fail', () => {
  assert.equal(lv(run('<main><h1>t</h1><footer>f</footer></main>'), 'semantic_html'), 'pass');
  assert.equal(lv(run('<section>x</section>'), 'semantic_html'), 'warn');
  assert.equal(lv(run('<div>x</div>'), 'semantic_html'), 'fail');
});

test('form_labels: đủ nhãn → pass; thiếu một phần → warn; thiếu quá nửa → fail; không có trường nhập → pass', () => {
  assert.equal(lv(run('<form><label>Tên<input type="text"></label></form>'), 'form_labels'), 'pass');
  assert.equal(lv(run('<form><label for="a">A</label><input id="a"><input type="text"></form>'), 'form_labels'), 'warn');
  assert.equal(lv(run('<form><input type="text"><input type="email"><input type="tel"></form>'), 'form_labels'), 'fail');
  assert.equal(lv(run('<p>x</p>'), 'form_labels'), 'pass');
});

test('form_labels: placeholder không được tính thay nhãn; aria-label thì được tính', () => {
  assert.equal(lv(run('<form><input type="text" placeholder="Tên"></form>'), 'form_labels'), 'fail');
  assert.equal(lv(run('<form><input type="text" aria-label="Tên"></form>'), 'form_labels'), 'pass');
});

test('accessible_names: đủ tên truy cập → pass; ≤2 thiếu → warn; >2 → fail (nút icon có aria-label vẫn đạt)', () => {
  assert.equal(lv(run('<a href="/x">Mua</a><button aria-label="Gọi">📞</button>'), 'accessible_names'), 'pass');
  assert.equal(lv(run('<a href="/x"></a><button aria-label="Gọi">📞</button>'), 'accessible_names'), 'warn');
  assert.equal(lv(run('<a href="/x"></a><button></button><a href="/y"></a><a href="/z">Z</a>'), 'accessible_names'), 'fail');
});

test('blank_links: target=_blank đủ rel bảo mật → pass; 1–2 thiếu → warn; ≥3 → fail', () => {
  assert.equal(lv(run('<a href="https://a.vn" target="_blank" rel="noopener">x</a>'), 'blank_links'), 'pass');
  assert.equal(lv(run('<a href="https://a.vn" target="_blank">x</a>'), 'blank_links'), 'warn');
  assert.equal(lv(run('<a target="_blank">1</a><a target="_blank">2</a><a target="_blank">3</a>'), 'blank_links'), 'fail');
});

/* ── 5) Mở rộng check cũ: links chụp luôn fragment hỏng ─────────────────── */

test('links (rộng hơn khi v1.2): href="#fragment" mà không có id đó cũng là liên kết lỗi', () => {
  const r = run('<a href="#phuc-tra-khong-ton-tai">Chi tiết</a>');
  assert.equal(lv(r, 'links'), 'warn');
  assert.ok(rst(r, 'links').detail.toLowerCase().includes('anchor'));
});

/* ── 6) Unknown: không coi là lỗi, chẵng được tính điểm sai ─────────────── */

test('robots_txt/sitemap: không có dữ liệu mạng → unknown (giữ đúng hợp đồng mốc 1)', () => {
  const r = run('<p>x</p>', { robots: null, sitemap: null });
  assert.equal(lv(r, 'robots_txt'), 'unknown');
  assert.equal(lv(r, 'sitemap'), 'unknown');
});

/* ── 7) tinhDiem — công thức minh bạch ──────────────────────────────────── */

test('tinhDiem: demo — tổng 79,6/100 xếp "Khá", điểm từng nhóm đúng, unknown loại khỏi mẫu số', () => {
  const s = WebCheck.tinhDiem(WebCheck.demoResult(parse));
  assert.equal(s.total, 79.6);
  assert.equal(s.capDo, 'Khá');
  assert.equal(s.mauSo, 98);
  assert.deepEqual(s.counts, { pass: 20, warn: 13, fail: 0, unknown: 1 });
  const g = Object.fromEntries(s.groups.map((x) => [x.name, x]));
  assert.equal(g['SEO & hiển thị'].earned, 14.5);
  assert.equal(g['SEO & hiển thị'].max, 24);          // 26 − 2 (robots_txt unknown)
  assert.equal(g['Chuẩn kỹ thuật'].earned, 21);
  assert.equal(g['Di động & hình ảnh'].earned, 14);
  assert.equal(g['Tốc độ tải nội dung'].earned, 2.5);
  assert.equal(g['Marketing & chuyển đổi'].earned, 17);
  assert.equal(g['Trải nghiệm & truy cập'].earned, 9);
});

test('tinhDiem: unknown bị loại khỏi mẫu số — KHÔNG bị coi là fail', () => {
  const s = WebCheck.tinhDiem({ checks: [
    { id: 'a', group: 'G', weight: 5, level: 'pass' },
    { id: 'b', group: 'G', weight: 5, level: 'unknown' },
  ] });
  assert.equal(s.total, 100);
  assert.equal(s.mauSo, 5);
});

test('tinhDiem: pass = đủ trọng số, warn = nửa, fail = 0; nhóm có điểm riêng', () => {
  const s = WebCheck.tinhDiem({ checks: [
    { id: 'a', group: 'G1', weight: 6, level: 'pass' },
    { id: 'b', group: 'G1', weight: 4, level: 'warn' },
    { id: 'c', group: 'G2', weight: 6, level: 'fail' },
    { id: 'd', group: 'G2', weight: 4, level: 'pass' },
  ] });
  assert.equal(s.total, 60); // (6 + 4/2 + 0 + 4) / 20 = 12/20
  const g = Object.fromEntries(s.groups.map((x) => [x.name, x]));
  assert.equal(g.G1.earned, 8);
  assert.equal(g.G2.earned, 4);
  assert.equal(g.G2.max, 10);
});

/* ── 8) renderChecklist dạng details + chip điểm ────────────────────────── */

test('renderChecklist: 6 khối <details> theo nhóm, duy nhất 34 chip điểm "x/w"', () => {
  const mount = new DOMParser().parseFromString('<div id="m"></div>', 'text/html').getElementById('m');
  WebCheck.renderChecklist(WebCheck.demoResult(parse), mount);
  const blocks = mount.querySelectorAll('details');
  assert.equal(blocks.length, 6);
  assert.ok(mount.querySelector('summary').textContent.includes('SEO'));
  assert.equal(mount.querySelectorAll('.check-pts').length, 34);
  // demo có 1 mục unknown (robots_txt) — chip phải hiện "—/2" thay số, không phải "0"
  const chips = Array.from(mount.querySelectorAll('.check-pts'));
  assert.ok(chips.some((c) => c.textContent === '—/2'), 'chip unknown phải là —/2');
  assert.ok(mount.querySelector('.check-group .check-row'), 'mỗi nhóm phải có hàng mục');
});

test('demoResult: trang mẫu có đủ 3 trạng thái pass/warn/unknown (fail có qua test tinhDiem riêng)', () => {
  const levels = new Set(WebCheck.demoResult(parse).checks.map((c) => c.level));
  assert.ok(levels.has('pass') && levels.has('warn') && levels.has('unknown'));
});
