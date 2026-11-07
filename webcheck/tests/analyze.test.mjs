import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DOMParser, Event as LdEvent } from 'linkedom';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'js', 'analyze.js'), 'utf8');
// js/analyze.js là plain script (không import/export) để chạy được cả trong
// trình duyệt lẫn qua sandbox ở đây — đây chính là seam công khai của mốc 1.
const WebCheck = new Function(src + '\n;return WebCheck;')();
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');

const GOOD_ROBOTS = 'User-agent: *\nDisallow: /admin/\nSitemap: https://atlas-cafe.vn/sitemap.xml\n';

// Meta mặc định: trang HTTPS chuẩn; robots.txt + sitemap.xml "từng fetch sẵn" (?soft=1).
const BASE_META = () => ({
  inputUrl: 'atlas-cafe.vn',
  finalUrl: 'https://atlas-cafe.vn/',
  statusCode: 200,
  elapsedMs: 900,
  robots: { statusCode: 200, text: GOOD_ROBOTS },
  sitemap: { statusCode: 200, text: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://atlas-cafe.vn/</loc></url>\n  <url><loc>https://atlas-cafe.vn/thuc-don</loc></url>\n</urlset>' },
});

const run = (html, metaOver = {}) => {
  const meta = { ...BASE_META(), ...metaOver };
  if (metaOver.robots === null) delete meta.robots;
  if (metaOver.sitemap === null) delete meta.sitemap;
  return WebCheck.runChecks(html, meta, parse);
};
const one = (result, id) => result.checks.find((c) => c.id === id);

// Trang gốc tối thiểu (không bias các check phụ).
const BASE_PAGE = '<!DOCTYPE html><html lang="vi"><head><title>Atlas — Cà phê rang xay Đà Lạt</title></head><body><p></p></body></html>';
const LONG_TEXT = 'sản phẩm cà phê mùa xuân tại bản làng trước cổng phố, gần gũi dạng ẩm thực quê nhà hằng ngày luôn mở cửa đón khách thường trực. '.repeat(12);

// ─── 0. Ràng buộc v2.0: hệ thống trạng thái, không còn điểm ─────────────────

test('runChecks ngoài trình duyệt bắt buộc buildDoc', () => {
  assert.throws(() => WebCheck.runChecks(BASE_PAGE, {}), /buildDoc/);
});

test('API điểm đã gỡ sạch: không tinhDiem, không fmt, version 2.0', () => {
  assert.equal(WebCheck.tinhDiem, undefined);
  assert.equal(WebCheck.fmt, undefined);
  assert.equal(WebCheck.VERSION, '2.0');
  assert.equal('weight' in WebCheck.PRIORITY_MAP.title, false);
});

// ─── 1. 60 DEFS + PRIORITY_MAP + bảng từ (hợp đồng mục 2/3 v2.0) ─────────────

test('DEFS: đúng 60 hạng mục, ID duy nhất, đủ trường cần thiết', () => {
  assert.equal(WebCheck.DEFS.length, 60);
  const ids = WebCheck.DEFS.map((d) => d.id);
  assert.equal(new Set(ids).size, 60);
  for (const d of WebCheck.DEFS) {
    assert.equal(typeof d.id, 'string');
    assert.equal(typeof d.group, 'string');
    assert.equal(typeof d.label, 'string');
    assert.ok(d.label.length > 2, `label quá ngắn: ${d.id}`);
    assert.ok(['html', 'network', 'html+network'].includes(d.method), `method lạ: ${d.method}`);
    assert.ok(typeof d.impact === 'string' && d.impact.length > 10, `thiếu impact: ${d.id}`);
    assert.equal('weight' in d, false, `còn weight trong ${d.id}`);
    assert.equal('passed' in d, false);
  }
});

test('GROUPS: đúng 7 nhóm theo thứ tự chốt và đủ 60 mục phân bổ', () => {
  assert.deepEqual(WebCheck.GROUPS, [
    'SEO & hiển thị',
    'Chuẩn kỹ thuật',
    'Di động & hình ảnh',
    'Tốc độ tải nội dung',
    'Marketing & chuyển đổi',
    'Tin cậy & minh bạch',
    'Trải nghiệm & truy cập',
  ]);
  const counts = {};
  for (const d of WebCheck.DEFS) counts[d.group] = (counts[d.group] || 0) + 1;
  assert.deepEqual(counts, {
    'SEO & hiển thị': 12,
    'Chuẩn kỹ thuật': 13,
    'Di động & hình ảnh': 8,
    'Tốc độ tải nội dung': 4,
    'Marketing & chuyển đổi': 8,
    'Tin cậy & minh bạch': 4,
    'Trải nghiệm & truy cập': 11,
  });
});

test('PRIORITY_MAP: đủ 60 ID, cả fail lẫn warn đều là P0–P3', () => {
  const ids = WebCheck.DEFS.map((d) => d.id).sort();
  assert.deepEqual(Object.keys(WebCheck.PRIORITY_MAP).sort(), ids);
  for (const [id, levels] of Object.entries(WebCheck.PRIORITY_MAP)) {
    assert.deepEqual(Object.keys(levels).sort(), ['fail', 'warn'], `map thiếu nhánh ở ${id}`);
    for (const p of Object.values(levels)) {
      assert.ok(['P0', 'P1', 'P2', 'P3'].includes(p), `mức P lạ ở ${id}: ${p}`);
    }
  }
});

test('Bảng từ hiển thị v2.0: nhãn 4 trạng thái mới + P0–P3 + method', () => {
  assert.deepEqual(WebCheck.STATUS_WORDS, {
    pass: 'Đạt', warn: 'Cần cải thiện', fail: 'Chưa đạt', unknown: 'Không xác định',
  });
  assert.deepEqual(WebCheck.PRIORITY_WORDS, {
    P0: 'Khẩn', P1: 'Cao', P2: 'Trung bình', P3: 'Khuyến nghị',
  });
  assert.deepEqual(WebCheck.METHOD_WORDS,
    { html: 'HTML tĩnh', network: 'Tài nguyên mạng', 'html+network': 'HTML + mạng' });
});

test('34 ID hạng mục cũ giữ nguyên không đổi', () => {
  const ids = new Set(WebCheck.DEFS.map((d) => d.id));
  const old34 = ['title', 'meta_description', 'open_graph', 'canonical', 'robots_meta', 'robots_txt', 'sitemap',
    'structured_data', 'https', 'lang', 'charset', 'h1', 'heading_system', 'links', 'analytics', 'viewport',
    'img_alt', 'img_wh', 'favicon', 'theme_color', 'lazy_load', 'resources', 'page_weight', 'cta', 'contact_info',
    'contact_form', 'social_links', 'policy_links', 'semantic_html', 'form_labels', 'accessible_names',
    'blank_links', 'duplicate_ids', 'mixed_content'];
  for (const id of old34) assert.ok(ids.has(id), `mất hạng mục cũ: ${id}`);
  assert.equal(old34.length, 34);
});

// ─── 2. runChecks: shape Result v2.0 + số demo chốt ──────────────────────────

test('Result v2.0: version 2.0, 60 check, trường check chuẩn (không weight/level/passed)', () => {
  const r = WebCheck.demoResult(parse);
  assert.equal(r.version, '2.0');
  assert.equal(r.checks.length, 60);
  assert.ok(r.fetchedAt);
  for (const c of r.checks) {
    assert.deepEqual(Object.keys(c).sort(),
      ['detail', 'group', 'id', 'impact', 'label', 'method', 'priority', 'status', 'suggestion']);
    assert.ok(['pass', 'warn', 'fail', 'unknown'].includes(c.status), `trạng thái lạ ở ${c.id}`);
    if (c.priority) {
      assert.ok(['P0', 'P1', 'P2', 'P3'].includes(c.priority), `P lạ ở ${c.id}`);
      assert.ok(['warn', 'fail'].includes(c.status), `${c.id} có P dù trạng thái ${c.status}`);
    } else {
      assert.ok(['pass', 'unknown'].includes(c.status), `${c.id} warn/fail mà không có P`);
    }
    assert.equal(typeof c.detail, 'string');
    assert.equal(typeof c.impact, 'string');
    assert.equal(typeof c.suggestion, 'string');
  }
});

test('Kết quả demo (?demo=1) chốt đúng: 42 Đạt / 14 Cần cải thiện / 3 Chưa đạt / 1 Không xác định', () => {
  const r = WebCheck.demoResult(parse);
  const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
  for (const c of r.checks) counts[c.status] += 1;
  assert.deepEqual(counts, { pass: 42, warn: 14, fail: 3, unknown: 1 });
  const fails = r.checks.filter((c) => c.status === 'fail').map((c) => c.id).sort();
  assert.deepEqual(fails, ['meta_description', 'robots_meta', 'trust_signals']);
  const unknownIds = r.checks.filter((c) => c.status === 'unknown').map((c) => c.id);
  assert.deepEqual(unknownIds, ['robots_txt']);
  // Ưu tiên: đúng 1 P0 và 1 P1 trong demo — đủ cho mốc 2 dựng bảng "Việc cần làm trước".
  const byP = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const c of r.checks) if (c.priority) byP[c.priority] += 1;
  assert.deepEqual(byP, { P0: 1, P1: 1, P2: 3, P3: 12 });
  assert.equal(one(r, 'robots_meta').priority, 'P0');
  assert.equal(one(r, 'meta_description').priority, 'P1');
});

// ─── 3. docKetQua: gate phiên bản 2.0 — chặn Result cũ v1.2/v1.3 ──────────────

test('docKetQua: chỉ nhận Result version 2.0; v1.3/JSON hỏng → null', () => {
  const g = globalThis;
  const saved = g.sessionStorage;
  const box = {};
  g.sessionStorage = {
    getItem: (k) => (k in box ? box[k] : null),
    setItem: (k, v) => { box[k] = v; },
  };
  try {
    box['webcheck:result'] = JSON.stringify({ version: '1.3', checks: [{ id: 'title', level: 'pass', weight: 6 }] });
    assert.equal(WebCheck.docKetQua(), null);
    box['webcheck:result'] = 'không phải json';
    assert.equal(WebCheck.docKetQua(), null);
    box['webcheck:result'] = null;
    assert.equal(WebCheck.docKetQua(), null);
    const demo = WebCheck.demoResult(parse);
    box['webcheck:result'] = JSON.stringify(demo);
    const got = WebCheck.docKetQua();
    assert.ok(got && got.version === '2.0' && got.checks.length === 60);
  } finally {
    if (saved === undefined) delete g.sessionStorage; else g.sessionStorage = saved;
  }
});

// ─── 4. Check cũ giữ logic (chấm quanh ranh giới đã chốt) ────────────────────

test('title: 24 ký tự → warn; 45 → pass; 61 → warn; thiếu → fail', () => {
  let r = run('<html lang="vi"><head><title>' + 'a'.repeat(24) + '</title></head><body><p></p></body></html>');
  assert.equal(one(r, 'title').status, 'warn');
  r = run('<html lang="vi"><head><title>' + 'a'.repeat(45) + '</title></head><body><p></p></body></html>');
  assert.equal(one(r, 'title').status, 'pass');
  r = run('<html lang="vi"><head><title>' + 'a'.repeat(61) + '</title></head><body><p></p></body></html>');
  assert.equal(one(r, 'title').status, 'warn');
  r = run('<html lang="vi"><head></head><body><p></p></body></html>');
  assert.equal(one(r, 'title').status, 'fail');
});

test('robots_txt: 403 → unknown (không dối là fail); chặn toàn bộ → fail; 404 → warn; chuẩn → pass', () => {
  let r = run(BASE_PAGE, { robots: { statusCode: 403, text: '' } });
  assert.equal(one(r, 'robots_txt').status, 'unknown');
  r = run(BASE_PAGE, { robots: { statusCode: 200, text: 'User-agent: *\nDisallow: /\n' } });
  assert.equal(one(r, 'robots_txt').status, 'fail');
  assert.equal(one(r, 'robots_txt').priority, 'P2');
  r = run(BASE_PAGE, { robots: { statusCode: 404, text: '' } });
  assert.equal(one(r, 'robots_txt').status, 'warn');
  r = run(BASE_PAGE);
  assert.equal(one(r, 'robots_txt').status, 'pass');
});

test('sitemap: 404 → warn; urlset đúng dạng → pass; sitemapindex vẫn pass', () => {
  let r = run(BASE_PAGE, { sitemap: { statusCode: 404, text: '' } });
  assert.equal(one(r, 'sitemap').status, 'warn');
  r = run(BASE_PAGE, { sitemap: { statusCode: 200, text: '<sitemapindex><sitemap><loc>x</loc></sitemap></sitemapindex>' } });
  assert.equal(one(r, 'sitemap').status, 'pass');
});

test('https/mixed_content: HTTP → fail P0; script http trên https → fail P0; ảnh http → warn P2', () => {
  const r = run('<html lang="vi"><head><title>T</title></head><body><p></p></body></html>',
    { finalUrl: 'http://atlas-cafe.vn/' });
  assert.equal(one(r, 'https').status, 'fail');
  assert.equal(one(r, 'https').priority, 'P0');
  // Trang chưa https → mixed_content là unknown, không oan.
  assert.equal(one(r, 'mixed_content').status, 'unknown');
  let r2 = run('<html lang="vi"><head><title>T</title><script src="http://cdn.example.com/x.js"></script></head><body><p></p></body></html>');
  assert.equal(one(r2, 'mixed_content').status, 'fail');
  assert.equal(one(r2, 'mixed_content').priority, 'P0');
  r2 = run('<html lang="vi"><head><title>T</title></head><body><img src="http://cdn.example.com/a.jpg" alt="x"><p></p></body></html>');
  assert.equal(one(r2, 'mixed_content').status, 'warn');
  assert.equal(one(r2, 'mixed_content').priority, 'P2');
});

test('social_links: "Chưa đạt ≠ P0" — fail của social_links là P3', () => {
  const r = run(BASE_PAGE);
  assert.equal(one(r, 'social_links').status, 'fail');
  assert.equal(one(r, 'social_links').priority, 'P3');
});

test('blank_links: 1–2 thiếu rel là warn, từ 3 là fail, đủ rel là pass', () => {
  const mk = (n) => '<html lang="vi"><head><title>T</title></head><body>'
    + Array.from({ length: n }, (_, i) => `<a target="_blank" href="/p${i}">Link ${i}</a>`).join('')
    + '<p></p></body></html>';
  let r = run(mk(1));
  assert.equal(one(r, 'blank_links').status, 'warn');
  r = run(mk(3));
  assert.equal(one(r, 'blank_links').status, 'fail');
  r = run(mk(2).replace(/target="_blank"/g, 'target="_blank" rel="noopener"'));
  assert.equal(one(r, 'blank_links').status, 'pass');
});

test('links: href="#" + anchor thiếu id được đếm lỗi; trang sạch → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><a href="#">Liên kết trống</a><a href="#khong-ton-tai">Mục ẩn</a><p></p></body></html>');
  assert.equal(one(r, 'links').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><a href="/thuc-don">Thực đơn</a><p></p></body></html>');
  assert.equal(one(r, 'links').status, 'pass');
});

// ─── 5. 26 hạng mục mới: từng nhánh chính ────────────────────────────────────

test('twitter_card: pass (twitter:card) / warn (chỉ og) / fail (trống trơn)', () => {
  let r = run('<html lang="vi"><head><title>T</title><meta name="twitter:card" content="summary"></head><body><p></p></body></html>');
  assert.equal(one(r, 'twitter_card').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title><meta property="og:title" content="x"></head><body><p></p></body></html>');
  assert.equal(one(r, 'twitter_card').status, 'warn');
  assert.equal(one(r, 'twitter_card').priority, 'P3');
  r = run('<html lang="vi"><head><title>T</title></head><body><p></p></body></html>');
  assert.equal(one(r, 'twitter_card').status, 'fail');
});

test('breadcrumb: JSON-LD BreadcrumbList → pass; nav mà không breadcrumb → warn; trang ngắn → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}</script></head><body><p></p></body></html>');
  assert.equal(one(r, 'breadcrumb').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><nav><a href="/a">A</a><a href="/b">B</a></nav><p></p></body></html>');
  assert.equal(one(r, 'breadcrumb').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>ngắn</p></body></html>');
  assert.equal(one(r, 'breadcrumb').status, 'unknown');
});

test('sitemap_lastmod: đủ lastmod → pass; thiếu hết → warn; sitemapindex/404 → unknown', () => {
  let r = run(BASE_PAGE, { sitemap: { statusCode: 200, text: '<urlset><url><loc>a</loc><lastmod>2026-01-01</lastmod></url></urlset>' } });
  assert.equal(one(r, 'sitemap_lastmod').status, 'pass');
  r = run(BASE_PAGE, { sitemap: { statusCode: 200, text: '<urlset><url><loc>a</loc></url></urlset>' } });
  assert.equal(one(r, 'sitemap_lastmod').status, 'warn');
  assert.equal(one(r, 'sitemap_lastmod').priority, 'P3');
  r = run(BASE_PAGE, { sitemap: { statusCode: 200, text: '<sitemapindex><sitemap><loc>x</loc></sitemap></sitemapindex>' } });
  assert.equal(one(r, 'sitemap_lastmod').status, 'unknown');
  r = run(BASE_PAGE, { sitemap: { statusCode: 404, text: '' } });
  assert.equal(one(r, 'sitemap_lastmod').status, 'unknown');
});

test('meta_keywords: có → warn; không → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title><meta name="keywords" content="a, b"></head><body><p></p></body></html>');
  assert.equal(one(r, 'meta_keywords').status, 'warn');
  r = run(BASE_PAGE);
  assert.equal(one(r, 'meta_keywords').status, 'pass');
});

test('http_links: link http:// → warn; site HTTP → unknown; không có → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><a href="http://partner.vn">Partner</a><p></p></body></html>');
  assert.equal(one(r, 'http_links').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><p></p></body></html>', { finalUrl: 'http://atlas-cafe.vn/' });
  assert.equal(one(r, 'http_links').status, 'unknown');
  r = run('<html lang="vi"><head><title>T</title></head><body><a href="https://partner.vn">P</a><p></p></body></html>');
  assert.equal(one(r, 'http_links').status, 'pass');
});

test('meta_refresh: có → fail P1; không → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title><meta http-equiv="refresh" content="5; url=/"></head><body><p></p></body></html>');
  assert.equal(one(r, 'meta_refresh').status, 'fail');
  assert.equal(one(r, 'meta_refresh').priority, 'P1');
  r = run(BASE_PAGE);
  assert.equal(one(r, 'meta_refresh').status, 'pass');
});

test('form_https_action: action http:// → fail P1; đúng → pass; không có form → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><form action="http://atlas-cafe.vn/gui"><input type="text" name="a"><button>ok</button></form><p></p></body></html>');
  assert.equal(one(r, 'form_https_action').status, 'fail');
  assert.equal(one(r, 'form_https_action').priority, 'P1');
  r = run('<html lang="vi"><head><title>T</title></head><body><form action="/gui"><button>ok</button></form><p></p></body></html>');
  assert.equal(one(r, 'form_https_action').status, 'pass');
  r = run(BASE_PAGE);
  assert.equal(one(r, 'form_https_action').status, 'pass');
});

test('inline_styles: quá nhiều style trực tiếp → warn; ít → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body>'
    + Array.from({ length: 14 }, (_, i) => `<p style="color:#333">dòng ${i}</p>`).join('')
    + '</body></html>');
  assert.equal(one(r, 'inline_styles').status, 'warn');
  r = run(BASE_PAGE);
  assert.equal(one(r, 'inline_styles').status, 'pass');
});

test('render_blocking: script head không defer → warn; có defer → pass; script body không tính', () => {
  let r = run('<html lang="vi"><head><title>T</title><script src="/a.js"></script></head><body><p></p></body></html>');
  assert.equal(one(r, 'render_blocking').status, 'warn');
  assert.equal(one(r, 'render_blocking').priority, 'P3');
  r = run('<html lang="vi"><head><title>T</title><script defer src="/a.js"></script></head><body><p></p></body></html>');
  assert.equal(one(r, 'render_blocking').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><script src="/a.js"></script><p></p></body></html>');
  assert.equal(one(r, 'render_blocking').status, 'pass');
});

test('image_format: webp chiếm quá nửa → pass; toàn JPG → warn; không đọc được đuôi → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><img src="/a.webp" alt="a"><img src="/b.jpg" alt="b"><p></p></body></html>');
  assert.equal(one(r, 'image_format').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><img src="/a.jpg" alt="a"><img src="/b.png" alt="b"><p></p></body></html>');
  assert.equal(one(r, 'image_format').status, 'warn');
  assert.equal(one(r, 'image_format').priority, 'P3');
  r = run('<html lang="vi"><head><title>T</title></head><body><img src="/api/raster?id=2" alt="a"><p></p></body></html>');
  assert.equal(one(r, 'image_format').status, 'unknown');
});

test('manifest + apple_icon: thiếu → warn; có bằng chứng → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title><link rel="manifest" href="/m.json"><link rel="apple-touch-icon" href="/i.png"></head><body><p></p></body></html>');
  assert.equal(one(r, 'manifest').status, 'pass');
  assert.equal(one(r, 'apple_icon').status, 'pass');
  r = run(BASE_PAGE);
  assert.equal(one(r, 'manifest').status, 'warn');
  assert.equal(one(r, 'apple_icon').status, 'warn');
});

test('site_search: input type="search" → pass; trang không có bất kỳ tín hiệu nào → warn', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><input type="search" placeholder="Tìm sản phẩm"><p></p></body></html>');
  assert.equal(one(r, 'site_search').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>quán bán cà phê hôm nay</p></body></html>');
  assert.equal(one(r, 'site_search').status, 'warn');
});

test('map_embed: iframe Google Maps → pass; link Maps → pass; chỉ có địa chỉ → warn; trống trơn → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><iframe title="Bản đồ" src="https://www.google.com/maps?q=atlas&output=embed"></iframe><p></p></body></html>');
  assert.equal(one(r, 'map_embed').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><a href="https://maps.app.goo.gl/xyz">Xem bản đồ</a><p></p></body></html>');
  assert.equal(one(r, 'map_embed').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><address>Số 1 Đường A</address><p></p></body></html>');
  assert.equal(one(r, 'map_embed').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><p></p></body></html>');
  assert.equal(one(r, 'map_embed').status, 'unknown');
});

test('product_service: JSON-LD Product → pass; không bằng chứng + nội dung dài → fail P1; nội dung quá ngắn → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"P"}</script></head><body><p></p></body></html>');
  assert.equal(one(r, 'product_service').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>' + LONG_TEXT + '</p></body></html>');
  assert.equal(one(r, 'product_service').status, 'fail');
  assert.equal(one(r, 'product_service').priority, 'P1');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>ngắn</p></body></html>');
  assert.equal(one(r, 'product_service').status, 'unknown');
});

test('trust_signals: JSON-LD Review → pass; 2 blockquote → pass; sạch bóng → fail P2; quá ngắn → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"Review","reviewBody":"x"}</script></head><body><p></p></body></html>');
  assert.equal(one(r, 'trust_signals').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><blockquote>Cà phê ngon lắm</blockquote><blockquote>Quán ấm áp</blockquote><p></p></body></html>');
  assert.equal(one(r, 'trust_signals').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>' + LONG_TEXT + '</p></body></html>');
  assert.equal(one(r, 'trust_signals').status, 'fail');
  assert.equal(one(r, 'trust_signals').priority, 'P2');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>ngắn</p></body></html>');
  assert.equal(one(r, 'trust_signals').status, 'unknown');
});

test('business_identity: LocalBusiness → pass; <address> → pass; nhắc MST rời rạc → warn; trống → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"A"}</script></head><body><p></p></body></html>');
  assert.equal(one(r, 'business_identity').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><address>Số 7</address></body></html>');
  assert.equal(one(r, 'business_identity').status, 'pass');
  const mst = 'khởi điểm trước cổng phố chúng tôi nhận đơn hàng tỉnh lẻ. Số đăng ký doanh nghiệp: 0312345678. '.repeat(8);
  r = run('<html lang="vi"><head><title>T</title></head><body><p>' + mst + '</p></body></html>');
  assert.equal(one(r, 'business_identity').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>ngắn</p></body></html>');
  assert.equal(one(r, 'business_identity').status, 'unknown');
});

test('support_info: link Hỏi đáp → pass; từ 8 link mà không có hỗ trợ → fail P2; ít link → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><a href="/hoi-dap">Hỏi đáp</a><p></p></body></html>');
  assert.equal(one(r, 'support_info').status, 'pass');
  const links = Array.from({ length: 8 }, (_, i) => `<a href="/trang-${i}">Trang ${i}</a>`).join('');
  r = run('<html lang="vi"><head><title>T</title></head><body>' + links + '<p></p></body></html>');
  assert.equal(one(r, 'support_info').status, 'fail');
  assert.equal(one(r, 'support_info').priority, 'P2');
  r = run('<html lang="vi"><head><title>T</title></head><body><a href="/a">A</a><a href="/b">B</a><p></p></body></html>');
  assert.equal(one(r, 'support_info').status, 'unknown');
});

test('working_hours: openingHours JSON-LD → pass; footer nêu khung giờ → pass; chữ có mà giờ thiếu → warn; không footer → unknown', () => {
  let r = run('<html lang="vi"><head><title>T</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","openingHours":"Mo-Su 08:00-22:00"}</script></head><body><p></p></body></html>');
  assert.equal(one(r, 'working_hours').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><footer><p>Giờ mở cửa 07:30–21:30</p></footer></body></html>');
  assert.equal(one(r, 'working_hours').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><footer><p>Giờ mở cửa sẽ cập nhật sau</p></footer></body></html>');
  assert.equal(one(r, 'working_hours').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><p>ngắn</p></body></html>');
  assert.equal(one(r, 'working_hours').status, 'unknown');
});

test('skip_link: link nhảy #noi-dung → pass; menu từ 5 mục mà không có → warn; menu ngắn → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><a href="#noi-dung">Tới nội dung chính</a><div id="noi-dung"></div><p></p></body></html>');
  assert.equal(one(r, 'skip_link').status, 'pass');
  const nav = Array.from({ length: 5 }, (_, i) => `<a href="/m${i}">M${i}</a>`).join('');
  r = run('<html lang="vi"><head><title>T</title></head><body><nav>' + nav + '</nav><p></p></body></html>');
  assert.equal(one(r, 'skip_link').status, 'warn');
  assert.equal(one(r, 'skip_link').priority, 'P3');
  r = run('<html lang="vi"><head><title>T</title></head><body><nav><a href="/a">A</a></nav><p></p></body></html>');
  assert.equal(one(r, 'skip_link').status, 'pass');
});

test('iframe_title: đủ title → pass; 1 thiếu → warn; từ 3 thiếu → fail', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><iframe title="Bản đồ" src="https://x"></iframe><p></p></body></html>');
  assert.equal(one(r, 'iframe_title').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><iframe src="https://x"></iframe><p></p></body></html>');
  assert.equal(one(r, 'iframe_title').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><iframe src="https://x"></iframe><iframe src="https://y"></iframe><iframe src="https://z"></iframe><p></p><iframe title="Bản đồ" src="https://ok"></iframe></body></html>');
  assert.equal(one(r, 'iframe_title').status, 'fail');
});

test('table_headers/caption: bảng ≥2 hàng có th + caption → pass; không th → fail; thiếu caption → warn', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><table><tr><th>Bàn</th><th>Giá</th></tr><tr><td>1</td><td>2</td></tr></table><p></p></body></html>');
  assert.equal(one(r, 'table_headers').status, 'pass');
  assert.equal(one(r, 'table_caption').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table><p></p></body></html>');
  assert.equal(one(r, 'table_headers').status, 'fail');
  r = run('<html lang="vi"><head><title>T</title></head><body><table><caption>Bảng giá</caption><tr><th>A</th></tr><tr><td>1</td></tr></table><p></p></body></html>');
  assert.equal(one(r, 'table_caption').status, 'pass');
});

test('input_autocomplete: đủ autocomplete → pass; trường cá nhân thiếu → warn; không cá nhân → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><input type="email" name="email" autocomplete="email"><p></p></body></html>');
  assert.equal(one(r, 'input_autocomplete').status, 'pass');
  r = run('<html lang="vi"><head><title>T</title></head><body><input type="text" name="ho-ten"><p></p></body></html>');
  assert.equal(one(r, 'input_autocomplete').status, 'warn');
  assert.equal(one(r, 'input_autocomplete').priority, 'P3');
  r = run(BASE_PAGE);
  assert.equal(one(r, 'input_autocomplete').status, 'pass');
});

test('form_fieldset: nhóm radio không fieldset → warn; bọc fieldset → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body>'
    + Array.from({ length: 4 }, (_, i) => `<input type="radio" name="payment" value="${i}">`).join('')
    + '<p></p></body></html>');
  assert.equal(one(r, 'form_fieldset').status, 'warn');
  r = run('<html lang="vi"><head><title>T</title></head><body><fieldset>'
    + Array.from({ length: 4 }, (_, i) => `<input type="radio" name="payment" value="${i}">`).join('')
    + '</fieldset><p></p></body></html>');
  assert.equal(one(r, 'form_fieldset').status, 'pass');
});

test('media_autoplay: autoplay không muted → fail P2; muted → pass', () => {
  let r = run('<html lang="vi"><head><title>T</title></head><body><video src="/v.mp4" autoplay></video><p></p></body></html>');
  assert.equal(one(r, 'media_autoplay').status, 'fail');
  assert.equal(one(r, 'media_autoplay').priority, 'P2');
  r = run('<html lang="vi"><head><title>T</title></head><body><video src="/v.mp4" autoplay muted></video><p></p></body></html>');
  assert.equal(one(r, 'media_autoplay').status, 'pass');
});

test('60/60 mục luôn có kết quả kể cả trang gần trống', () => {
  const r = run('<html lang="vi"><head><title>T</title></head><body><p></p></body></html>');
  assert.equal(r.checks.length, 60);
  for (const c of r.checks) {
    assert.ok(c && c.id, 'check thiếu id');
    assert.ok(['pass', 'warn', 'fail', 'unknown'].includes(c.status), `${c.id} trạng thái lạ`);
    assert.ok(typeof c.detail === 'string' && c.detail.length > 0, `${c.id} thiếu bằng chứng`);
  }
});

// ─── 6. renderChecklist: mô phỏng DOM runtime (linkedom) ─────────────────────

const mountIn = () => {
  const doc = parse('<div id="mount"></div>');
  const mount = doc.getElementById('mount');
  WebCheck.renderChecklist(WebCheck.demoResult(parse), mount);
  return mount;
};

test('renderChecklist: 7 nhóm details id grp-0…6, đủ 60 hàng, chip đếm đúng', () => {
  const mount = mountIn();
  const groups = Array.from(mount.querySelectorAll('details.check-group'));
  assert.equal(groups.length, 7);
  groups.forEach((g, i) => assert.equal(g.id, 'grp-' + i));
  const rows = Array.from(mount.querySelectorAll('.check-row'));
  assert.equal(rows.length, 60);
  const chipAll = mount.querySelector('button.chip');
  assert.equal(chipAll.getAttribute('data-value'), 'all');
  assert.equal(chipAll.querySelector('.chip-n').textContent, '60');
});

test('renderChecklist: badge ưu tiên chỉ xuất hiện ở warn/fail; badge method đủ chữ', () => {
  const mount = mountIn();
  const rows = Array.from(mount.querySelectorAll('.check-row'));
  const passUnknown = rows.filter((row) => ['pass', 'unknown'].includes(row.getAttribute('data-status')));
  const noPr = rows.filter((row) => !row.querySelector('.badge.pr'));
  assert.deepEqual(noPr.map((r) => r.getAttribute('data-status')).sort(), passUnknown.map((r) => r.getAttribute('data-status')).sort());
  assert.equal(rows.some((row) => row.querySelector('.badge.pr-P0')), true);
  assert.ok(rows.some((row) => row.textContent.includes(WebCheck.METHOD_WORDS['html+network'])));
});

test('renderChecklist: nhãn trạng thái tiếng Việt mới đúng nghĩa ("Cần cải thiện", "Không xác định")', () => {
  const mount = mountIn();
  const sums = Array.from(mount.querySelectorAll('.group-sum'));
  assert.equal(sums.length, 7);
  assert.ok(sums.every((s) => /\d+\/\d+ đạt/.test(s.textContent)));
  const seo = sums[0].textContent;
  assert.ok(/cần cải thiện/.test(seo), 'nhóm SEO phải nêu "cần cải thiện"');
});

test('renderChecklist: click chip lọc theo trạng thái, rồi thêm ưu tiên; note cập nhật', () => {
  const mount = mountIn();
  const chips = () => Array.from(mount.querySelectorAll('button.chip'));
  const findChip = (kind, value) => chips().find((b) => b.getAttribute('data-kind') === kind && b.getAttribute('data-value') === value);
  const click = (el) => el.dispatchEvent(new LdEvent('click', { bubbles: true }));
  const visible = () => Array.from(mount.querySelectorAll('.check-row')).filter((row) => !row.hasAttribute('hidden'));
  const note = mount.querySelector('.filter-note');

  assert.equal(visible().length, 60); // mặc định -> Tất cả

  click(findChip('status', 'fail'));
  assert.equal(visible().length, 3);
  assert.equal(note.textContent, 'Hiện 3/60 mục');
  assert.equal(findChip('status', 'fail').classList.contains('active'), true);

  click(findChip('priority', 'P0'));
  assert.equal(visible().length, 1);
  assert.equal(visible()[0].getAttribute('data-status'), 'fail');
  assert.equal(note.textContent, 'Hiện 1/60 mục');

  const hiddenGroups = Array.from(mount.querySelectorAll('details.check-group')).filter((g) => g.hasAttribute('hidden'));
  assert.equal(hiddenGroups.length, 6); // chỉ nhóm chứa robots_meta còn trông thấy

  click(findChip('status', 'all'));
  click(findChip('priority', 'all'));
  assert.equal(visible().length, 60);
  assert.equal(note.textContent, 'Hiện 60/60 mục');
});
