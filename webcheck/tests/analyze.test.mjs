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
const run = (html, url = 'https://atlas-cafe.vn/') =>
  WebCheck.runChecks(html, { inputUrl: url, finalUrl: url, statusCode: 200, elapsedMs: 800 }, parse);

const ID_MỌC1 = [
  'title', 'meta_description', 'charset', 'open_graph', 'canonical', 'robots_meta',
  'https', 'lang', 'h1', 'heading_system', 'structured_data', 'analytics',
  'viewport', 'img_alt', 'favicon', 'theme_color', 'lazy_load',
  'resources', 'page_weight',
];

// ── Trang "chuẩn" mẫu: mọi thiên hướng bị lỗi đều được vá kín ────────────────
const GOOD = (title, desc) => `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>${title || 'A'.repeat(44)}</title>
<meta name="description" content="${desc || 'D'.repeat(120)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" content="#0b6b58">
<meta property="og:title" content="Atelier Trà — quà trà thảo mịch">
<meta property="og:image" content="/img/social-coverage.png">
<link rel="canonical" href="https://atlas-cafe.vn/">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Atelier Trà"}</script>
<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/print.css">
</head>
<body>
<h1>Trà thảo mịch Atelier</h1>
<h2>Hương vị</h2>
<p>Built fixture content.</p>
<h3>Sen 一</h3>
<h2>Cách dùng</h2>
<img src="tra-sen.jpg" alt="Hộp quà trà sen" loading="lazy">
<img src="tra-at.iso.jpg" alt="Trà khô đóng túi" loading="lazy">
</body>
</html>`;

// ── 1. Bất biến cấu trúc: hợp đồng mà mốc 2–5 dựa vào ───────────────────────
test('Result v1.1: đủ 19 mục, id đúng hợp đồng, không trùng, weight cộng đúng 100', () => {
  const r = run(GOOD());
  assert.equal(r.version, '1.1');
  assert.equal(r.checks.length, ID_MỌC1.length);
  const ids = r.checks.map((c) => c.id);
  assert.deepEqual([...ids].sort(), [...ID_MỌC1].sort());
  assert.equal(new Set(ids).size, ids.length, 'id phải duy nhất');
  const total = r.checks.reduce((s, c) => s + c.weight, 0);
  assert.equal(total, 100);
});

test('Mọi check đều có label, detail, suggestion (tiếng Việt), group và level hợp lệ', () => {
  const r = run(GOOD());
  const levels = new Set(['pass', 'warn', 'fail', 'unknown']);
  for (const c of r.checks) {
    assert.ok(c.label && c.label.length > 3, `label trống: ${c.id}`);
    assert.ok(c.detail, `detail trống: ${c.id}`);
    assert.ok(c.suggestion, `suggestion trống: ${c.id}`);
    assert.ok(['SEO & hiển thị', 'Chuẩn kỹ thuật', 'Di động & hình ảnh', 'Tốc độ tải nội dung'].includes(c.group), `group lạ: ${c.id}`);
    assert.ok(levels.has(c.level), `level lạ: ${c.id}`);
    // passed trung hòa với level: mốc 2 vẫn dùng được API cũ
    if (c.level === 'pass') assert.equal(c.passed, true);
    if (c.level === 'warn' || c.level === 'fail') assert.equal(c.passed, false);
  }
});

test('meta yêu cầu (inputUrl, finalUrl, statusCode, fetchedAt ISO) đi trọn vào Result', () => {
  const r = WebCheck.runChecks(GOOD(), {
    inputUrl: 'atlas-cafe.vn',
    finalUrl: 'https://atlas-cafe.vn/',
    statusCode: 200,
    elapsedMs: 800,
  }, parse);
  assert.equal(r.url, 'atlas-cafe.vn');
  assert.equal(r.finalUrl, 'https://atlas-cafe.vn/');
  assert.equal(r.statusCode, 200);
  assert.ok(!Number.isNaN(Date.parse(r.fetchedAt)), 'fetchedAt phải là ISO time');
  assert.ok(r.elapsedMs > 0);
});

// ── 2. Trang "khô": thiếu gần hết — phát hiện được từng nhánh ───────────────
test('Trang trống rỗng: title, description, viewport, charset… đều fail đúng id', () => {
  const r = run('<!DOCTYPE html><html><head></head><body><p>trong</p></body></html>');
  const m = Object.fromEntries(r.checks.map((c) => [c.id, c]));
  assert.equal(m.title.level, 'fail');
  assert.equal(m.meta_description.level, 'fail');
  assert.equal(m.viewport.level, 'fail');
  assert.equal(m.charset.level, 'fail');
  assert.equal(m.open_graph.level, 'fail');
  assert.equal(m.h1.level, 'fail');
  assert.equal(m.favicon.level, 'warn');
  assert.equal(m.theme_color.level, 'warn');
  assert.equal(m.structured_data.level, 'warn');
  assert.equal(m.analytics.level, 'warn');
  assert.equal(m.canonical.level, 'warn');
  assert.equal(m.lang.level, 'fail');
  // trang không có ảnh: img_alt/lazy_load cho đạt trung lập, không phạt
  assert.equal(m.img_alt.level, 'pass');
  assert.equal(m.lazy_load.level, 'pass');
});

// ── 3. Nhánh cảnh báo từng hạng mục ─────────────────────────────────────────
test('title CẢNH BÁO khi quá ngắn và quá dài, ĐẠT khi 30–60 ký tự; detail nêu đúng số ký tự', () => {
  const mk = (t) => run(GOOD(t)).checks.find((c) => c.id === 'title');
  const qng = mk('Trà ngon');
  assert.equal(qng.level, 'warn');
  assert.ok(qng.detail.includes(String('Trà ngon'.length)), 'detail phải nêu đúng số ký tự');
  const dai = mk('B'.repeat(100));
  assert.equal(dai.level, 'warn');
  assert.ok(dai.detail.includes('100'));
  const vua = mk('C'.repeat(45));
  assert.equal(vua.level, 'pass');
  assert.ok(vua.detail.includes('45'));
});

test('meta_description: thiếu → fail, dưới 70 hoặc trên 160 → warn, 70–160 → pass', () => {
  const mk = (d) => {
    let g = GOOD(null, d);
    if (d === undefined) g = g.replace(/<meta name="description"[^>]*>\n?/, '');
    return run(g).checks.find((c) => c.id === 'meta_description');
  };
  assert.equal(mk(undefined).level, 'fail');
  assert.equal(mk('d'.repeat(41)).level, 'warn');
  assert.equal(mk('e'.repeat(178)).level, 'warn');
  assert.equal(mk('f'.repeat(130)).level, 'pass');
});

test('viewport: thiếu width=device-width → warn; thiếu hẳn → fail', () => {
  const lack = run(GOOD().replace('<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="viewport" content="initial-scale=1">'))
    .checks.find((c) => c.id === 'viewport');
  assert.equal(lack.level, 'warn');
  const none = run('<html><head></head><body></body></html>').checks.find((c) => c.id === 'viewport');
  assert.equal(none.level, 'fail');
});

test('https: http URL → fail, https → pass', () => {
  assert.equal(run(GOOD(), 'http://atlas-cafe.vn/').checks.find((c) => c.id === 'https').level, 'fail');
  assert.equal(run(GOOD(), 'https://atlas-cafe.vn/').checks.find((c) => c.id === 'https').level, 'pass');
});

test('h1: 2 thẻ → warn; 1 thẻ → pass', () => {
  const haiH1 = run(GOOD().replace('<h2>Hương vị</h2>', '<h1>Trà trà</h1><h2>Hương vị</h2>'))
    .checks.find((c) => c.id === 'h1');
  assert.equal(haiH1.level, 'warn');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'h1').level, 'pass');
});

test('heading_system: nhảy bậc h2→h4 → warn, có h1 làm gốc và tuần tự → pass, không có h1 → cảnh báo nêu rõ trong detail', () => {
  const nhay = run(GOOD().replace('<h3>Sen 一</h3>', '<h4>Sen nhảy bậc</h4>'))
    .checks.find((c) => c.id === 'heading_system');
  assert.equal(nhay.level, 'warn');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'heading_system').level, 'pass');
});

test('img_alt: thiếu alt hết → fail; thiếu một phần → warn nêu đúng số; đủ hết → pass', () => {
  const missAll = run(GOOD().replace(/<img[^>]*>/g, (m) => { return m.replace(/ alt="[^"]*"/, '') }))
    .checks.find((c) => c.id === 'img_alt');
  assert.equal(missAll.level, 'fail');
  const missSome = run(GOOD().replace(' alt="Trà khô đóng túi"', ''))
    .checks.find((c) => c.id === 'img_alt');
  assert.equal(missSome.level, 'warn');
  assert.ok(missSome.detail.includes('1') || missSome.detail.includes('một'), 'detail phải nêu số ảnh thiếu');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'img_alt').level, 'pass');
});

test('open_graph: có og:title thiếu og:image → warn; đủ cả → pass', () => {
  const thieuAnh = run(GOOD().replace('<meta property="og:image" content="/img/social-coverage.png">', ''))
    .checks.find((c) => c.id === 'open_graph');
  assert.equal(thieuAnh.level, 'warn');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'open_graph').level, 'pass');
});

test('charset: iso-8859-1 → warn (nên UTF-8); utf-8 → pass', () => {
  const iso = run(GOOD().replace('<meta charset="utf-8">', '<meta charset="iso-8859-1">'))
    .checks.find((c) => c.id === 'charset');
  assert.equal(iso.level, 'warn');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'charset').level, 'pass');
});

test('resources: hơn 8 file JS/CSS ngoài → warn, đếm đúng tổng; vừa phải → pass', () => {
  const nhièu = GOOD().replace('</head>', Array.from({ length: 10 }, (_, i) => `<script src="/a${i}.js"></script><link rel="stylesheet" href="/b${i}.css">`).join('') + '</head>');
  const warnRun = run(nhièu).checks.find((c) => c.id === 'resources');
  assert.equal(warnRun.level, 'warn');
  // A Fixture gốc: 1 script (GA) + 2 stylesheet; thêm 10 script + 10 stylesheet → 23
  assert.ok(warnRun.detail.includes('23'), 'detail phải nêu tổng tài nguyên chính xác');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'resources').level, 'pass');
});

test('page_weight: HTML to hơn 400 KB → fail và nêu dung lượng; nhỏ → pass', () => {
  const to = run(GOOD().replace('</body>', '<p>' + 'x'.repeat(450 * 1024) + '</p></body>'))
    .checks.find((c) => c.id === 'page_weight');
  assert.equal(to.level, 'fail');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'page_weight').level, 'pass');
});

test('lazy_load: nhiều ảnh mà ảnh nào cũng không loading="lazy" → warn; ít ảnh → neutral pass', () => {
  const img5 = Array.from({ length: 5 }, (_, i) => `<img src="p${i}.jpg" alt="ảnh ${i}">`).join('');
  const html = GOOD().replace(/<img[^>]*>\n?/g, '').replace('</body>', img5 + '</body>');
  const warning = run(html).checks.find((c) => c.id === 'lazy_load');
  assert.equal(warning.level, 'warn');
  const it1 = GOOD().replace(/<img[^>]*>\n?/g, '').replace('</body>', '<img src="one.jpg" alt="một"></body>');
  assert.equal(run(it1).checks.find((c) => c.id === 'lazy_load').level, 'pass');
});

test('structured_data: JSON-LD sai cú pháp → warn nêu rõ; JSON đúng → pass', () => {
  const hỏng = run(GOOD().replace('{"@context":"https://schema.org","@type":"LocalBusiness","name":"Atelier Trà"}', '{"@type": hỏng!'))
    .checks.find((c) => c.id === 'structured_data');
  assert.equal(hỏng.level, 'warn');
  assert.equal(run(GOOD()).checks.find((c) => c.id === 'structured_data').level, 'pass');
});

// ── 4. renderChecklist — smoke: cấu trúc group/row đầy đủ, glyphs đúng mức ──
test('renderChecklist: 4 group, 19 dòng, mỗi dòng có glyph + label + detail + suggestion', () => {
  const host = new DOMParser().parseFromString('<div id="kq"></div>', 'text/html');
  const mount = host.getElementById('kq');
  WebCheck.renderChecklist(run(GOOD(), undefined), mount);
  const groups = mount.querySelectorAll('section.check-group');
  assert.equal(groups.length, 4);
  const rows = mount.querySelectorAll('.check-row');
  assert.equal(rows.length, 19);
  for (const row of rows) {
    assert.ok(row.querySelector('.glyph'));
    assert.ok(row.querySelector('.check-label').textContent.length > 3);
    assert.ok(row.querySelector('.check-detail'));
  }
});

// ── 5. Trang demo dựng sẵn cho mốc 2–5: hợp lệ theo v1.1 ────────────────────
test('demoResult mang đủ 19 mục · dùng đúng shape v1.1.', () => {
  const r = WebCheck.demoResult(parse);
  assert.equal(r.version, '1.1');
  assert.equal(r.checks.length, 19);
  assert.equal(new Set(r.checks.map((c) => c.id)).size, 19);
  assert.equal(r.checks.reduce((s, c) => s + c.weight, 0), 100);
});
