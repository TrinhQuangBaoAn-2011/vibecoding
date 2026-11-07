'use strict';
/*
 * WebCheck — bộ phân tích phía client (Mốc 1, Đề 5)
 * ---------------------------------------------------------------
 * File này là "hợp đồng sống" của dự án:
 *   - runChecks(html, meta, buildDoc) → Object Result v1.2 (chạy thuần, không gọi mạng)
 *   - renderChecklist(result, mount) → dựng checklist tối giản lên DOM
 *   - demoResult() → Result mẫu; docKetQua() → nạp Result (demo?/sessionStorage) cho mốc 2–5
 * Mốc 2–5 đọc kết quả qua sessionStorage key "webcheck:result" (main.js ghi).
 * KHÔNG sửa file này ở các mốc sau (độc quyền của mốc 1).
 */
/* global DOMParser */

const WebCheck = (function () {
  const VERSION = '1.3';

  // Định nghĩa 34 hạng mục — v1.3: tổng trọng số = 100 (bảng chốt: contract.md mục 3).
  // ID 22 mục cũ GIỮ NGUYÊN (chỉ gán lại weight); 12 mục mới thêm dưới đây.
  const DEFS = [
    { id: 'title', group: 'SEO & hiển thị', weight: 6, label: 'Tiêu đề trang (<title>)' },
    { id: 'meta_description', group: 'SEO & hiển thị', weight: 6, label: 'Mô tả tìm kiếm (meta description)' },
    { id: 'open_graph', group: 'SEO & hiển thị', weight: 2, label: 'Chia sẻ mạng xã hội (Open Graph)' },
    { id: 'canonical', group: 'SEO & hiển thị', weight: 3, label: 'Địa chỉ chuẩn (canonical)' },
    { id: 'robots_meta', group: 'SEO & hiển thị', weight: 3, label: 'Chỉ dẫn công cụ tìm kiếm (robots)' },
    { id: 'robots_txt', group: 'SEO & hiển thị', weight: 2, label: 'Tệp robots.txt (chỉ dẫn quét toàn site)' },
    { id: 'sitemap', group: 'SEO & hiển thị', weight: 2, label: 'Sơ đồ trang (sitemap.xml)' },
    { id: 'structured_data', group: 'SEO & hiển thị', weight: 2, label: 'Dữ liệu có cấu trúc (JSON-LD)' },
    { id: 'https', group: 'Chuẩn kỹ thuật', weight: 6, label: 'Kết nối bảo mật (HTTPS)' },
    { id: 'lang', group: 'Chuẩn kỹ thuật', weight: 3, label: 'Định nghĩa ngôn ngữ (lang)' },
    { id: 'charset', group: 'Chuẩn kỹ thuật', weight: 2, label: 'Bảng mã ký tự (charset)' },
    { id: 'h1', group: 'Chuẩn kỹ thuật', weight: 4, label: 'Tiêu đề chính (h1)' },
    { id: 'heading_system', group: 'Chuẩn kỹ thuật', weight: 2, label: 'Hệ thống đề mục (h2–h6)' },
    { id: 'links', group: 'Chuẩn kỹ thuật', weight: 2, label: 'Liên kết (link)' },
    { id: 'analytics', group: 'Chuẩn kỹ thuật', weight: 2, label: 'Đo lường truy cập (Analytics)' },
    { id: 'duplicate_ids', group: 'Chuẩn kỹ thuật', weight: 1, label: 'ID HTML không trùng' },
    { id: 'mixed_content', group: 'Chuẩn kỹ thuật', weight: 1, label: 'Không trộn nội dung HTTP trên HTTPS' },
    { id: 'viewport', group: 'Di động & hình ảnh', weight: 6, label: 'Hiển thị trên di động (viewport)' },
    { id: 'img_alt', group: 'Di động & hình ảnh', weight: 4, label: 'Mô tả ảnh (alt)' },
    { id: 'img_wh', group: 'Di động & hình ảnh', weight: 2, label: 'Ảnh khai báo kích thước (width/height)' },
    { id: 'favicon', group: 'Di động & hình ảnh', weight: 2, label: 'Biểu tượng tab (favicon)' },
    { id: 'theme_color', group: 'Di động & hình ảnh', weight: 1, label: 'Màu giao diện (theme-color)' },
    { id: 'lazy_load', group: 'Di động & hình ảnh', weight: 2, label: 'Tải ảnh trễ (lazy loading)' },
    { id: 'resources', group: 'Tốc độ tải nội dung', weight: 1, label: 'Số lượng tài nguyên (JS/CSS)' },
    { id: 'page_weight', group: 'Tốc độ tải nội dung', weight: 2, label: 'Dung lượng HTML' },
    { id: 'cta', group: 'Marketing & chuyển đổi', weight: 5, label: 'Nút kêu gọi hành động (CTA)' },
    { id: 'contact_info', group: 'Marketing & chuyển đổi', weight: 5, label: 'Thông tin liên hệ' },
    { id: 'contact_form', group: 'Marketing & chuyển đổi', weight: 4, label: 'Biểu mẫu liên hệ' },
    { id: 'social_links', group: 'Marketing & chuyển đổi', weight: 2, label: 'Liên kết mạng xã hội' },
    { id: 'policy_links', group: 'Marketing & chuyển đổi', weight: 2, label: 'Trang chính sách / quy định' },
    { id: 'semantic_html', group: 'Trải nghiệm & truy cập', weight: 4, label: 'Cấu trúc HTML ngữ nghĩa' },
    { id: 'form_labels', group: 'Trải nghiệm & truy cập', weight: 4, label: 'Trường nhập có nhãn (label)' },
    { id: 'accessible_names', group: 'Trải nghiệm & truy cập', weight: 3, label: 'Liên kết/nút có tên truy cập' },
    { id: 'blank_links', group: 'Trải nghiệm & truy cập', weight: 2, label: 'Liên kết mở tab mới có rel bảo mật' },
  ];

  // Thứ tự nhóm lấy đúng thứ tự xuất hiện lần đầu trong DEFS — thiết kế chỉ sửa 1 chỗ (DEFS).
  const GROUPS = [...new Set(DEFS.map((d) => d.group))];

  const def = (id) => DEFS.find((d) => d.id === id);
  // level → passed: giữ API cũ mà mốc 2 có thể đã đợi ("pass" mới là đạt).
  const LEVEL_PASSED = { pass: true, warn: false, fail: false, unknown: null };
  const GLYPHS = { pass: '✓', warn: '!', fail: '✕', unknown: '?' };
  const LEVEL_WORDS = { pass: 'Đạt', warn: 'Cảnh báo', fail: 'Chưa đạt', unknown: 'Không rõ' };

  function out(id, level, detail, suggestion) {
    const d = def(id);
    return {
      id,
      label: d.label,
      group: d.group,
      weight: d.weight,
      level,
      passed: LEVEL_PASSED[level],
      detail,
      suggestion,
    };
  }

  const ellip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const kb = (bytes) => Math.round(bytes / 1024).toLocaleString('vi-VN');

  /* ── Các phần kiểm tra riêng ─────────────────────────────────────────────── */

  function checkTitle(doc) {
    const t = doc.querySelector('title');
    if (!t) {
      return out('title', 'fail',
        'Trang chưa có thẻ <title> — kết quả tìm kiếm hiện dòng tiêu đề trống.',
        'Thêm thẻ <title> trong <head>, 30–60 ký tự: tóm gọn dịch vụ chính + tên thương hiệu (ví dụ: "Sửa điện thoại Quận 2 | Quý Phát").');
    }
    const len = t.textContent.trim().length;
    if (len < 30) {
      return out('title', 'warn',
        `Thẻ <title> chỉ ${len} ký tự — ngắn hơn khuyến nghị (30–60).`,
        'Viết lại tiêu đề 30–60 ký tự: nêu mặt hàng/dịch vụ chính, kèm khu vực và tên thương hiệu.');
    }
    if (len > 60) {
      return out('title', 'warn',
        `Thẻ <title> dài ${len} ký tự — phần cuối thường bị cắt trong kết quả tìm kiếm.`,
        'Rút gọn còn 30–60 ký tự, đưa từ khóa quan trọng nhất lên đầu.');
    }
    return out('title', 'pass',
      `Thẻ <title> hợp lệ (${len} ký tự): "${ellip(t.textContent.trim(), 60)}"`,
      'Duy trì chuẩn 30–60 ký tự cho các trang con; mỗi trang một tiêu đề riêng.');
  }

  function checkDescription(doc) {
    const m = doc.querySelector('meta[name="description" i]');
    if (!m) {
      return out('meta_description', 'fail',
        'Chưa có thẻ mô tả (meta description) — Google tự chọn câu bất kỳ trên trang để hiển thị.',
        'Thêm 1 thẻ mô tả 70–160 ký tự: làm gì, phục vụ ai, điểm khác biệt chính + lời mời gọi.');
    }
    const len = m.getAttribute('content').trim().length;
    if (len < 70) {
      return out('meta_description', 'warn',
        `Thẻ mô tả chỉ ${len} ký tự — dưới mức 70 nên dòng kết quả tìm kiếm bị ngắn.`,
        'Bổ sung ý còn thiếu: đối tượng khách, khu vực phục vụ, ưu đãi hoặc lời mời gọi cụ thể.');
    }
    if (len > 160) {
      return out('meta_description', 'warn',
        `Thẻ mô tả dài ${len} ký tự — vượt 160 nên phần cuối bị cắt trong kết quả tìm kiếm.`,
        'Rút còn 70–160 ký tự, thông tin quan trọng đặt trước.');
    }
    return out('meta_description', 'pass',
      `Thẻ mô tả hợp lệ (${len} ký tự): "${ellip(m.getAttribute('content').trim(), 70)}"`,
      'Cập nhật mô tả mỗi khi thay đổi sản phẩm chính để dòng tìm kiếm luôn đúng thông tin.');
  }

  function checkCharset(html) {
    const mc = html.match(/<meta[^>]*charset\s*=\s*["']?\s*([\w-]+)/i);
    const declared = mc ? mc[1] : null;
    if (declared && /^utf-?8$/i.test(declared)) {
      return out('charset', 'pass',
        'Trang khai báo UTF-8 — tiếng Việt hiển thị đúng.',
        'Giữ nguyên: UTF-8 là bảng mã chuẩn chung, đừng đổi sang bảng mã khác.');
    }
    if (declared) {
      return out('charset', 'warn',
        `Trang dùng bảng mã "${declared}" — thường gây lỗi hiển thị chữ tiếng Việt trên trình duyệt/máy khác.`,
        'Chuyển sang UTF-8: đặt <meta charset="utf-8"> ngay dòng đầu của <head>.');
    }
    return out('charset', 'fail',
      'Không khai báo bảng mã — trình duyệt phải tự đoán, dễ ra chữ lỗi kiểu "Ã´ Ã¹".',
      'Đặt <meta charset="utf-8"> làm dòng đầu tiên trong <head>.');
  }

  function checkOpenGraph(doc) {
    const metas = doc.querySelectorAll('meta[property^="og:" i]');
    const has = {};
    for (const m of metas) has[m.getAttribute('property').toLowerCase()] = true;
    if (has['og:title'] && has['og:image']) {
      return out('open_graph', 'pass',
        'Đủ og:title và og:image — dán link lên Facebook/Zalo sẽ hiện kèm ảnh và tiêu đề.',
        'Chuẩn bị sẵn ảnh cover 1200×630 px và cập nhật khi có chiến dịch mới.');
    }
    if (has['og:title']) {
      return out('open_graph', 'warn',
        'Có og:title nhưng thiếu og:image — link chia sẻ sẽ hiện không có ảnh, kém thu hút.',
        'Thêm <meta property="og:image"> trỏ tới ảnh 1200×630 px (không quá 1 MB).');
    }
    return out('open_graph', 'fail',
      'Thiếu toàn bộ thẻ chia sẻ mạng xã hội (Open Graph) — dán link lên Facebook/Zalo chỉ hiện một dòng chữ không có ảnh.',
      'Thêm og:title, og:description và og:image (1200×630 px) vào <head>.');
  }

  function checkCanonical(doc) {
    const l = doc.querySelector('link[rel="canonical" i]');
    if (l && (l.getAttribute('href') || '').trim()) {
      return out('canonical', 'pass',
        `Đã khai báo địa chỉ chuẩn: ${l.getAttribute('href').trim()}`,
        'Gắn thẻ canonical cho mọi trang để tránh trùng lặp khi cùng nội dung có nhiều địa chỉ (có/không www, ?utm…).');
    }
    return out('canonical', 'warn',
      'Thiếu thẻ địa chỉ chuẩn (canonical) — Google có thể coi hai địa chỉ (có/không www, có/không dấu /) là hai trang trùng nội dung.',
      'Thêm <link rel="canonical" href="địa-chỉ-gốc"> vào <head>, mỗi trang trỏ đúng địa chỉ của nó.');
  }

  function checkRobots(doc) {
    const m = doc.querySelector('meta[name="robots" i]');
    if (m && /noindex/i.test(m.getAttribute('content') || '')) {
      return out('robots_meta', 'fail',
        `Thẻ robots đang chặn lập chỉ mục ("${m.getAttribute('content')}") — Google sẽ không đưa trang này lên kết quả tìm kiếm.`,
        'Xoá noindex khỏi thẻ robots (hoặc nhờ nơi làm web kiểm tra lại) rồi yêu cầu Google quét lại trong Search Console.');
    }
    return out('robots_meta', 'pass',
      'Không có lệnh chặn chỉ mục — công cụ tìm kiếm được phép đưa trang lên kết quả.',
      'Kiểm tra lại chỉ dẫn robots sau khi đưa trang lên hosting chính thức (đôi khi môi trường dựng thử để noindex mà quên gỡ).');
  }

  function checkHttps(meta) {
    const u = meta.finalUrl || meta.inputUrl || '';
    if (/^https:\/\//i.test(u)) {
      return out('https', 'pass',
        'Trang chạy HTTPS — kết nối giữa khách và website được mã hoá.',
        'Đảm bảo mọi địa chỉ http:// được tự chuyển về https:// để không có hai bản của cùng trang.');
    }
    return out('https', 'fail',
      'Trang chạy HTTP (không có khoá bảo mật) — Chrome gắn nhãn "Không an toàn", khách dễ thoát ngay.',
      'Kích hoạt HTTPS bằng chứng chỉ SSL miễn phí (Let\'s Encrypt — hầu hết nhà cung cấp hosting đều có nút bật sẵn).');
  }

  // Mã ngôn ngữ chuẩn (ISO 639-1) — chỉ để cảnh báo "vn"/"vietnamese" kiểu khai báo sai,
  // không chấm fail trang dùng ngôn ngữ hợp lệ khác.
  const LANG_CODES = new Set(('aa ab ae af ak am ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ku kv kw ky la lb lg li ln lo lt lu lv mg mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ug uk ur uz ve vi vo wa wo xh yi yo za zh zu').split(' '));

  function checkLang(doc) {
    const l = (doc.documentElement.getAttribute('lang') || '').trim();
    if (!l) {
      return out('lang', 'fail',
        'Thẻ <html> không khai báo ngôn ngữ — phần mềm đọc màn hình và công cụ dịch dễ xử lý sai tiếng Việt.',
        'Thêm lang="vi" vào thẻ <html> phía đầu file.');
    }
    const head = l.split('-')[0].toLowerCase();
    // v1.3 (hợp nhất mục "ngôn ngữ trang chính xác"): mã 2 chữ phải là mã ngôn ngữ
    // chuẩn — "vn" (mã quốc gia) thay cho "vi" là lỗi người dùng gặp nhiều nhất.
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(l) || (head.length === 2 && !LANG_CODES.has(head))) {
      return out('lang', 'warn',
        `Ngôn ngữ khai báo là "${l}" — không phải mã ngôn ngữ chuẩn (tiếng Việt phải là "vi", không phải "vn"). Phần mềm đọc màn hình và công cụ dịch có thể bỏ qua.`,
        'Sửa thành mã chuẩn: lang="vi" cho tiếng Việt (hoặc "en", "en-US"… nếu trang dùng ngôn ngữ khác).');
    }
    return out('lang', 'pass',
      `Đã khai báo ngôn ngữ trang: "${l}".`,
      'Giữ thống nhất: các trang con cũng gán lang="vi" (hoặc ngôn ngữ tương ứng của trang đó).');
  }

  function checkH1(doc) {
    const hs = doc.querySelectorAll('h1');
    if (hs.length === 0) {
      return out('h1', 'fail',
        'Không có tiêu đề chính (h1) — trang giống một trang chữ không có chủ đề.',
        'Đặt đúng 1 thẻ h1: câu chính mô tả trang này cung cấp gì, ví dụ "Trà thảo mịch quà tặng — giao toàn quốc".');
    }
    if (hs.length === 1) {
      return out('h1', 'pass',
        `Đủ 1 tiêu đề chính (h1): "${ellip(hs[0].textContent.trim(), 50)}"`,
        'Chỉ dùng 1 h1 mỗi trang; các đề mục phụ xếp vào h2, h3.');
    }
    return out('h1', 'warn',
      `Trang có ${hs.length} thẻ h1 — máy tìm kiếm sẽ rối khi xác định chủ đề chính.`,
      'Giữ lại h1 quan trọng nhất, đổi các h1 còn lại thành h2.');
  }

  function checkHeadingSystem(doc, h1Count) {
    const heads = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    if (heads.length === 0) {
      return out('heading_system', 'pass',
        'Trang chưa dùng đề mục nào (h1–h6).',
        'Khi nội dung dài, chia đề mục theo bậc để khách lướt nhanh tới ý cần.');
    }
    if (h1Count === 0) {
      return out('heading_system', 'warn',
        `Có ${heads.length} đề mục nhưng thiếu h1 làm gốc — hệ đề mục chưa rõ trục chính.`,
        'Thêm h1 chủ đề trang trước, sau đó xếp h2/h3 theo đúng bậc.');
    }
    let skip = null;
    let prev = heads[0].tagName.charCodeAt(1);
    for (let i = 1; i < heads.length && !skip; i++) {
      const lvl = heads[i].tagName.charCodeAt(1);
      if (lvl > prev + 1) skip = { from: prev, to: lvl };
      prev = lvl;
    }
    if (skip) {
      return out('heading_system', 'warn',
        `Có đề mục nhảy bậc h${skip.from} → h${skip.to} — cấu trúc nội dung khó theo dõi, phần mềm đọc màn hình dễ lạc ý.`,
        `Thay đề mục h${skip.to} bằng h${skip.from + 1}, xếp lại cây đề mục tuần tự.`);
    }
    return out('heading_system', 'pass',
      `Không phát hiện nhảy bậc trong ${heads.length} đề mục.`,
      'Giữ nguyên cách xếp theo bậc khi viết thêm mục mới (h3 phải nằm dưới một h2).');
  }

  function checkStructuredData(doc) {
    const blocks = doc.querySelectorAll('script[type="application/ld+json"]');
    if (blocks.length === 0) {
      return out('structured_data', 'warn',
        'Chưa có dữ liệu có cấu trúc (JSON-LD) — Google thiếu thông tin về cửa hàng: địa chỉ, giờ mở cửa, hotline.',
        'Thêm khối JSON-LD kiểu LocalBusiness khai báo tên, địa chỉ, giờ mở cửa, số điện thoại, đường dẫn mạng xã hội.');
    }
    let valid = 0;
    let broken = false;
    for (const b of blocks) {
      try { JSON.parse(b.textContent); valid++; } catch { broken = true; }
    }
    if (broken) {
      return out('structured_data', 'warn',
        'Có khối JSON-LD nhưng cú pháp sai — công cụ tìm kiếm đọc không được.',
        'Sửa lỗi cú pháp JSON: dán nội dung khối vào validator.schema.org để soi từng dòng.');
    }
    return out('structured_data', 'pass',
      `Có dữ liệu có cấu trúc (JSON-LD) hợp lệ: ${valid} khối.`,
      'Khai đủ trường LocalBusiness; nếu bán online, bổ sung khối Product kèm giá và đánh giá.');
  }

  const ANALYTICS_SIGNATURES = [
    { re: /googletagmanager\.com\/(gtm\.js|gtag\/js)/i, name: 'Google Tag Manager / GA4' },
    { re: /google-analytics\.com|gtag\(/i, name: 'Google Analytics' },
    { re: /connect\.facebook\.net|fbevents\.js/i, name: 'Facebook Pixel' },
    { re: /plausible\.io/i, name: 'Plausible' },
    { re: /matomo/i, name: 'Matomo' },
    { re: /static\.cloudflareinsights\.com/i, name: 'Cloudflare Web Analytics' },
    { re: /mc\.yandex\.ru/i, name: 'Yandex Metrica' },
  ];

  function checkAnalytics(html) {
    for (const s of ANALYTICS_SIGNATURES) {
      if (s.re.test(html)) {
        return out('analytics', 'pass',
          `Đang đo lường truy cập — phát hiện ${s.name}.`,
          'Kiểm tra chắc rằng báo cáo cho thấy khách đến từ đâu và họ xem trang nào rồi mới thoát.');
      }
    }
    return out('analytics', 'warn',
      'Chưa phát hiện công cụ đo lường truy cập — bạn không biết khách vào từ kênh nào, xem gì và đi đâu.',
      'Cài Google Tag Manager hoặc GA4 (miễn phí), dán đoạn mã vào trước thẻ </head>.');
  }

  function checkViewport(doc) {
    const m = doc.querySelector('meta[name="viewport" i]');
    if (!m) {
      return out('viewport', 'fail',
        'Thiếu thẻ viewport — trên điện thoại, trang hiện như bản thu nhỏ của màn hình máy tính, khách phải sờ liên tục để đọc.',
        'Thêm <meta name="viewport" content="width=device-width, initial-scale=1"> vào <head>.');
    }
    const v = (m.getAttribute('content') || '').toLowerCase();
    if (!v.includes('width=device-width')) {
      return out('viewport', 'warn',
        `Thẻ viewport thiếu width=device-width (hiện là: "${ellip(v, 40)}") — trình duyệt không biết co giãn theo bề rộng màn hình.`,
        'Sửa content thành width=device-width, initial-scale=1.');
    }
    return out('viewport', 'pass',
      'Viewport khai báo đúng cho thiết bị di động.',
      'Mở thử trang trên điện thoại thật: lỗi bố cục chi tiết nằm ngoài phạm vi đọc HTML tĩnh của công cụ này.');
  }

  function checkImages(doc) {
    const imgs = Array.from(doc.querySelectorAll('img'));
    if (imgs.length === 0) {
      return out('img_alt', 'pass',
        'Trang không dùng ảnh nào — không có ảnh để kiểm tra.',
        'Doanh nghiệp cần ảnh thật của sản phẩm/cửa hàng: chèn ít nhất vài tấm, nhớ điền alt.');
    }
    const missing = imgs.filter((im) => !(im.getAttribute('alt') || '').trim()).length;
    if (missing === imgs.length) {
      return out('img_alt', 'fail',
        `Tất cả ${imgs.length} ảnh đều chưa có mô tả (alt) — người dùng phần mềm đọc màn hình và Google đều "mù" với ảnh của bạn.`,
        'Điền alt 5–12 từ mô tả nội dung/tên sản phẩm; ảnh thuần trang trí thì dùng alt="" (cố ý bỏ trống).');
    }
    if (missing > 0) {
      return out('img_alt', 'warn',
        `${missing}/${imgs.length} ảnh chưa có alt.`,
        'Điền alt ngắn gọn mô tả rõ ảnh; ảnh chỉ để trang trí dùng alt="".');
    }
    return out('img_alt', 'pass',
      `${imgs.length} ảnh đều có mô tả (alt).`,
      'Giữ thói quen điền alt cho mọi ảnh mới đăng.');
  }

  function checkFavicon(doc) {
    const links = doc.querySelectorAll('link[rel]');
    for (const l of links) {
      const rel = (l.getAttribute('rel') || '').toLowerCase();
      if (/(^|\s)(icon|shortcut icon|apple-touch-icon|mask-icon)(\s|$)/.test(rel)) {
        return out('favicon', 'pass',
          `Đã khai báo biểu tượng trang (rel="${l.getAttribute('rel')}").`,
          'Bổ sung thêm apple-touch-icon 180×180 để logo hiện đẹp khi khách lưu trang vào màn hình chính điện thoại.');
      }
    }
    return out('favicon', 'warn',
      'HTML không khai báo favicon — tab trình duyệt của bạn hiện ô vuông xám, kém nhận diện trong đống tab của khách.',
      'Thêm <link rel="icon" href="/favicon.svg"> (SVG khoảng 32×32) vào <head>.');
  }

  function checkThemeColor(doc) {
    const m = doc.querySelector('meta[name="theme-color" i]');
    if (m) {
      return out('theme_color', 'pass',
        `Đã khai báo màu giao diện: ${m.getAttribute('content')}`,
        'Giữ màu này trùng với màu header trang để thanh trình duyệt trên điện thoại hoà cùng giao diện.');
    }
    return out('theme_color', 'warn',
      'Chưa khai báo màu giao diện (theme-color) — thanh trình duyệt trên điện thoại màu mặc định, thiếu liền mạch.',
      'Thêm <meta name="theme-color" content="màu-của-trang"> vào <head>.');
  }

  function checkLazyLoad(doc) {
    const imgs = Array.from(doc.querySelectorAll('img'));
    if (imgs.length === 0) {
      return out('lazy_load', 'pass',
        'Trang không dùng ảnh nào.',
        'Khi chèn nhiều ảnh, bật loading="lazy" để máy khách không tải sớm phần dưới màn hình.');
    }
    const lazy = imgs.filter((im) => (im.getAttribute('loading') || '').toLowerCase() === 'lazy').length;
    if (imgs.length >= 5 && lazy === 0) {
      return out('lazy_load', 'warn',
        `Có ${imgs.length} ảnh nhưng không ảnh nào bật tải trễ (loading="lazy") — ảnh dưới màn hình đầu sẽ làm chậm lần mở trang.`,
        'Thêm loading="lazy" cho các ảnh nằm dưới màn hình đầu tiên.');
    }
    if (imgs.length < 5 && lazy === 0) {
      return out('lazy_load', 'pass',
        `Trang chỉ có ${imgs.length} ảnh — không cần tải trễ.`,
        'Khi số ảnh tăng lên (thư viện ảnh sản phẩm), bật loading="lazy".');
    }
    return out('lazy_load', 'pass',
      `${lazy}/${imgs.length} ảnh đã bật tải trễ.`,
      'Áp dụng cho cả các ảnh chèn thêm sau này nằm dưới màn hình đầu.');
  }

  function checkResources(doc) {
    const ext = doc.querySelectorAll('script[src], link[rel="stylesheet" i]').length;
    if (ext > 8) {
      return out('resources', 'warn',
        `Trang nạp ${ext} file JS/CSS từ ngoài — nhiều plugin/script chồng lớp dễ khiến trang chậm và xung đột.`,
        'Rà lại từng script: tắt những cái không dùng, gộp file cùng loại; ưu tiên defer cho script không chặn hiển thị.');
    }
    return out('resources', 'pass',
      `Trang nạp ${ext} file JS/CSS — số lượng vừa phải.`,
      'Giữ dưới ~8 file; script mới thêm nhớ gắn defer để không chặn hiện chữ.');
  }

  function checkPageWeight(html) {
    const bytes = new TextEncoder().encode(html).length;
    if (bytes > 400 * 1024) {
      return out('page_weight', 'fail',
        `HTML nặng ${kb(bytes)} KB — vượt xa mức khuyến nghị; khách dùng mạng yếu sẽ bỏ đi trước khi trang kịp hiện.`,
        'Giảm khung DOM: bỏ nội dung ẩn dư thừa, các khối lặp dài; bật nén gzip/brotli trên hosting.');
    }
    if (bytes > 100 * 1024) {
      return out('page_weight', 'warn',
        `HTML nặng ${kb(bytes)} KB — hơi nặng, sẽ chậm dần khi nội dung tăng.`,
        'Cắt bớt khối HTML lặp (menu dài, danh sách đã gấp gọn) hoặc nhờ người làm web tách phần tải sau.');
    }
    return out('page_weight', 'pass',
      `HTML chỉ nặng ${kb(bytes)} KB — gọn và tải nhanh.`,
      'Giữ gọn: đừng nhồi cả thư viện CSS nguyên khối khi chỉ dùng vài class.');
  }

  /* ── Kiểm tra mới v1.3: marketing & chuyển đổi ──────────────────────────── */

  // CTA nhận bằng tín hiệu cấu trúc (class/id/href) — không chấm theo chữ hiển thị
  // để tránh是说 nhầm với mọi nút thông thường.
  const CTA_RE = /(^|[^a-z])(btn|cta|button)([^a-z]|-|$)|dat-(hen|ban|mon|hang|lich)|dang-ky|mua-ngay|tu-van|bao-gia|goi-ngay|thu-mien-phi|book-(now|table)|checkout|add-to-cart|order-now/i;
  const CONTACT_ROUTE_RE = /lien-he|contact/i;

  function checkCTA(doc) {
    const els = Array.from(doc.querySelectorAll('a[href], button'));
    let cta = null;
    for (const el of els) {
      const sig = [el.getAttribute('class'), el.getAttribute('id'),
        el.getAttribute('href'), el.getAttribute('data-cta')]
        .filter(Boolean).join(' ');
      if (sig && CTA_RE.test(sig)) { cta = el; break; }
    }
    if (cta) {
      return out('cta', 'pass',
        'Trang có nút kêu gọi hành động rõ ràng (dấu hiệu: nút được đánh dấu riêng hoặc đường dẫn tới bước hành động như đặt bàn/đăng ký/mua ngay).',
        'Giữ CTA nổi bật (màu khác nền, gần nội dung chính); một trang nên có ít nhất 1 CTA chính + 1 phụ.');
    }
    const soft = els.some((el) => {
      const href = el.getAttribute('href') || '';
      return CONTACT_ROUTE_RE.test(href) || CONTACT_ROUTE_RE.test(el.getAttribute('class') || '');
    });
    if (soft) {
      return out('cta', 'warn',
        'Trang chỉ có đường dẫn tới trang liên hệ, chưa có nút hành động nổi bật (mua/đặt/đăng ký dùng ngay) — khách xem xong dễ lướt đi.',
        'Thêm nút hành động chính nổi bật: "Đặt bàn ngay", "Nhận báo giá", "Dùng thử miễn phí"… đặt ngay sau phần giới thiệu chính.');
    }
    return out('cta', 'fail',
      'Trang chưa có nút kêu gọi hành động nào — khách không có bước tiếp theo rõ ràng để liên hệ hay mua hàng.',
      'Thêm nút hành động chính nổi bật: "Đặt bàn ngay", "Nhận báo giá", "Dùng thử miễn phí"… đặt ngay sau phần giới thiệu chính.');
  }

  function checkContactInfo(doc) {
    const chan = new Set();
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = (a.getAttribute('href') || '').trim().toLowerCase();
      if (href.startsWith('tel:')) chan.add('hotline (tel:)');
      if (href.startsWith('mailto:')) chan.add('email (mailto:)');
    }
    const text = doc.body ? (doc.body.textContent || '') : (doc.documentElement.textContent || '');
    const flat = text.replace(/[\s.\-–()]/g, '');
    if (/(^|\D)0(3|5|7|8|9)\d{8}(\D|$)/.test(flat) || /\+?84(3|5|7|8|9)\d{8}/.test(flat)) {
      chan.add('số điện thoại trên trang');
    }
    const list = [...chan];
    if (list.length >= 2) {
      return out('contact_info', 'pass',
        `Có nhiều kênh liên hệ: ${list.join(', ')} — khách chọn cách tiện nhất (bấm gọi trên di động, gửi email, nhắn tin).`,
        'Đặt khối liên hệ cố định ở footer + trên phần nhìn đầu tiên; check số còn dùng thì đừng chết máy.');
    }
    if (list.length === 1) {
      return out('contact_info', 'warn',
        `Chỉ phát hiện 1 kênh liên hệ (${list[0]}) — thiếu phương án dự phòng nếu khách ngại kênh đó.`,
        'Bổ sung tel: cho điện thoại và email thực; với bán hàng thì thêm Zalo/hotline hỗ trợ.');
    }
    return out('contact_info', 'fail',
      'Không thấy thông tin liên hệ nào trên trang — khách muốn hỏi giá/đặt hàng không biết liên lac với ai.',
      'Để rõ: số điện thoại (kèm link tel:), email, địa chỉ cửa hàng — tối thiểu 2 kênh ở footer.');
  }

  function checkContactForm(doc) {
    const forms = Array.from(doc.querySelectorAll('form'));
    if (!forms.length) {
      return out('contact_form', 'fail',
        'Không tìm thấy biểu mẫu (đặt bàn/hỏi giá/nhận tư vấn) trong HTML trang — khách phải gọi hoặc pm riêng, dễ bỏ dở.',
        'Thêm form ngắn: tên, SĐT/email, yêu cầu — 3 trường thôi, đặt gần nội dung chính và ở footer.');
    }
    for (const f of forms) {
      const typed = Array.from(f.querySelectorAll('input, textarea, select'));
      const fillable = typed.filter((el) => {
        const t = (el.getAttribute('type') || '').toLowerCase();
        return t !== 'hidden' && t !== 'submit' && t !== 'button' && t !== 'reset' && t !== 'image';
      });
      const hasSend = f.querySelector('button') || f.querySelector('input[type="submit" i]');
      if (fillable.length && hasSend) {
        return out('contact_form', 'pass',
          `Có biểu mẫu tương tác (${fillable.length} trường lập + nút gửi) — khách để lại thông tin ngay trên trang.`,
          'Kiểm tra form đúng khi gtesthửi: khách gửi có tới hòm thư/hệ thống quản lý không; thêm thông báo đặt cược đã gửi owe thành công.');
      }
    }
    return out('contact_form', 'warn',
      'Có thẻ form nhưng còn thiếu (trường nhập trống hoặc chưa có nút gửi) — nếu form chưa hoàn thiện, khách gửi không được.',
      'Hoàn thiện form: >=1 trường người dùng điền + nút submit thật (button type="submit" hoặc input type="submit"), gắn action/method đúng.');
  }

  const SOCIAL_DOMAIN_RE = /(^|\/\/|\.)(facebook\.com|fb\.com|instagram\.com|zalo\.me|youtube\.com|tiktok\.com|linkedin\.com|twitter\.com|x\.com|threads\.net|pinterest\.com|wa\.me|whatsapp\.com)\//i;
  const SHARE_ONLY_RE = /\/(sharer|share\.php|intent\/tweet|dialog\/share|send\?)/i;

  function checkSocialLinks(doc) {
    let profile = 0;
    let share = 0;
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') || '';
      if (!SOCIAL_DOMAIN_RE.test(href)) continue;
      if (SHARE_ONLY_RE.test(href)) { share++; continue; }
      profile++;
    }
    if (profile > 0) {
      return out('social_links', 'pass',
        `Trang dẫn tới ${profile} kênh mạng xã hội riêng (fanpage, Zalo, TikTok…) — khách theo dõi được tin tức, khuyến mãi.`,
        'Đặt icon mạng xã hội ở footer; giữ nội dung các kênh đó còn hoạt động (fanpage "cũng" là điểm trừ lớn).');
    }
    if (share > 0) {
      return out('social_links', 'warn',
        'Chỉ có nút "chia sẻ" tới mạng xã hội, chưa có link kênh riêng của doanh nghiệp — khách không theo dõi được bạn.',
        'Thêm link fanpage/Zalo/TikTok riêng của cửa hàng vào footer.');
    }
    return out('social_links', 'fail',
      'Không có liên kết mạng xã hội nào trên trang — mất kênh giữ chân khách giá rẻ nhất.',
      'Tạo fanpage/Zalo Official, đặt link (kèm icon) ở footer và trang liên hệ.');
  }

  const POLICY_RE = /chinh-sach|chính-sách|dieu-khoan|điều-khoản|quy-dinh|bao-mat|bảo-mật|doi-tra|hoan-tien|privacy|terms|policies?|refund|returns?/i;

  function checkPolicyLinks(doc) {
    const seen = new Set();
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = (a.getAttribute('href') || '');
      const text = a.textContent || '';
      if (POLICY_RE.test(href) || POLICY_RE.test(text)) seen.add(href || text.trim());
    }
    if (seen.size >= 2) {
      return out('policy_links', 'pass',
        `Có ${seen.size} trang chính sách/quy định (bảo mật, điều khoản, đổi trả…) — khách yên tâm hơn khi đặt hàng.`,
        'Bảo đảm nội dung thật, dễ hiểu, có ngày cập nhật; đừng chỉ để trang chính sách trống.');
    }
    if (seen.size === 1) {
      return out('policy_links', 'warn',
        'Chỉ thấy 1 trang chính sách/quy định — còn thiếu các nội dung như điều khoản, đổi trả/hoàn tiền.',
        'Bổ sung các trang quy định còn thiếu (điều khoản sử dụng, chính sách đổi trả) và link vào footer.');
    }
    return out('policy_links', 'fail',
      'Chưa thấy trang chính sách hay quy định nào — với khách mua online, đây là rào cản lớn khi quyết định.',
      'Soạn tối thiểu: chính sách bảo mật + chính sách đổi trả/hoàn tiền; để link ở footer.');
  }

  /* ── Kiểm tra mới v1.3: chuẩn kỹ thuật (mổ trong trang) ─────────────────── */

  function checkDuplicateIds(doc) {
    const seen = new Map();
    for (const el of doc.querySelectorAll('[id]')) {
      const id = el.getAttribute('id');
      if (id) seen.set(id, (seen.get(id) || 0) + 1);
    }
    const dup = [...seen.entries()].filter(([, n]) => n > 1);
    if (dup.length) {
      return out('duplicate_ids', 'fail',
        `ID HTML bị trùng: ${dup.slice(0, 3).map(([id, n]) => `id "${id}" xuất hiện ${n} lần`).join('; ')}` +
        `${dup.length > 3 ? ` và ${dup.length - 3} id khác` : ''} — id phải duy nhất; JS/anchor định tuyến nhầm chỗ.`,
        'Đổi các id trùng thành tên riêng (ví dụ slide-1, slide-2) hoặc xoá bản thừa; sau đó thử lại từng nút bấm/lần cuộn anchor.');
    }
    return out('duplicate_ids', 'pass',
      `Không phát hiện id trùng trong ${seen.size} phần tử có id.`,
      'Giữ thói quen đặt id duy nhất; id trùng là lỗi dễ sinh bug khi thêm code mới.');
  }

  function checkMixedContent(meta, doc) {
    const base = (meta.finalUrl || meta.inputUrl || '').trim();
    if (!/^https:\/\//i.test(base)) {
      return out('mixed_content', 'unknown',
        'Trang chưa chạy HTTPS nên mục "trộn nội dung không bảo mật" không áp dụng (cần chuyển HTTPS trước).',
        'Bật HTTPS trước — sau đó mục này sẽ chấm được trên chính trang đó.');
    }
    let baseOrigin = '';
    try { baseOrigin = new URL(base).origin; } catch { /* base không hợp lệ */ }
    if (!baseOrigin) {
      return out('mixed_content', 'unknown',
        'Không xác định được địa chỉ gốc của trang — không kết luận được tài nguyên nào của trang không bảo mật.',
        'Kiểm tra tay: DevTools tab Console — trình duyệt báo "Mixed Content" nếu còn tài nguyên http://.');
    }
    // Cách chấm: đi từng phần tử — script/link/iframe/embed tải qua HTTP sẽ bị
    // trình duyệt chặn hẳn (fail); ảnh/nhạc/khung tài liệu trình duyệt tự nâng
    // cấp hoặc cho phép → chỉ cảnh báo (warn) — đúng hướng "không chấm oan".
    let riskyScript = 0;
    let riskyImg = 0;
    for (const el of doc.querySelectorAll('script[src], link[href], iframe[src], embed[src], object[data]')) {
      const v = (el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data') || '').trim();
      let u;
      try { u = new URL(v, baseOrigin); } catch { continue; }
      if (u.protocol === 'http:' && u.origin !== baseOrigin) riskyScript++;
    }
    for (const el of doc.querySelectorAll('img[src], source[src], video[src], audio[src]')) {
      const v = (el.getAttribute('src') || '').trim();
      let u;
      try { u = new URL(v, baseOrigin); } catch { continue; }
      if (u.protocol === 'http:' && u.origin !== baseOrigin) riskyImg++;
    }
    if (riskyScript > 0) {
      return out('mixed_content', 'fail',
        `Trang chạy HTTPS nhưng đang tải ${riskyScript} tài nguyên bảo mật qua HTTP (script/CSS/khung nhúng) — trình duyệt sẽ chặn bớt hoặc gắn cảnh báo "Không an toàn".`,
        'Đổi hết về https:// (hầu hết CDN đều hỗ trợ SSL) hoặc dùng đường dẫn tương đối (/js/app.js); rà lại plugin/khung cũ.');
    }
    if (riskyImg > 0) {
      return out('mixed_content', 'warn',
        `Trang chạy HTTPS nhưng có ${riskyImg} ảnh/nhạc gọi qua HTTP — trình duyệt sẽ gắn nhãn "Không an toàn" trên thanh địa chỉ, mất niềm tin khách.`,
        'Đổi src ảnh về https:// hoặc đường dẫn tương đối (/anh/pho.jpg); ảnh http chỉ là cảnh báo nhưng đủ khiến khách hoài nghi.');
    }
    return out('mixed_content', 'pass',
      'Trang chạy HTTPS và không tải tài nguyên nào qua HTTP — thanh địa chỉ sạch, không bị trình duyệt cảnh báo.',
      'Giữ nguyên: chèn tài nguyên mới nhớ dùng https://; rà lại sau khi thêm plugin/khung nhúng mới.');
  }

  function checkImgWh(doc) {
    const imgs = Array.from(doc.querySelectorAll('img'));
    if (!imgs.length) {
      return out('img_wh', 'pass',
        'Trang không dùng ảnh nào — không có ảnh để kiểm tra.',
        'Khi chèn ảnh, khai báo cả width/height để trình duyệt giữ chỗ trước khi ảnh tải về.');
    }
    const missing = imgs.filter((im) => {
      const w = im.getAttribute('width');
      const h = im.getAttribute('height');
      return !(w && h && /^\d+$/.test(w.trim()) && /^\d+$/.test(h.trim()));
    }).length;
    if (missing > 0) {
      // v1.3: chấm tối đa warn — thiếu width/height không chắc gây CLS nếu CSS đã
      // giữ chỗ (aspect-ratio, max-width); HTML tĩnh không đọc được CSS nên không kết luận fail.
      return out('img_wh', 'warn',
        `${missing}/${imgs.length} ảnh chưa khai báo width/height — trình duyệt không biết trước kích thước; nếu CSS chưa giữ chỗ thì bố cục sẽ nhảy khi ảnh tải về (CLS).`,
        'Thêm width="…" height="…" theo kích thước gốc của ảnh vào thẻ <img>; với ảnh dùng CSS co giãn, giữ thuộc tính kèm max-width:100% trong CSS.');
    }
    return out('img_wh', 'pass',
      `${imgs.length} ảnh đều khai báo width/height — trình duyệt giữ chỗ đúng, bố cục không nhảy khi ảnh tải về.`,
      'Nhớ giữ cả với ảnh mới; đổi kích thước ảnh thật thì cập nhật lại hai số này.');
  }

  /* ── Kiểm tra mới v1.3: trải nghiệm & truy cập ─────────────────────────── */

  const LANDMARK_TAGS = ['header', 'footer', 'main', 'nav', 'aside', 'article', 'section'];

  function checkSemanticHtml(doc) {
    const counts = {};
    for (const t of LANDMARK_TAGS) {
      const n = doc.querySelectorAll(t).length;
      if (n) counts[t] = n;
    }
    const hasMain = !!counts.main;
    const hasTop = counts.header || counts.nav || counts.footer;
    if (hasMain && hasTop) {
      return out('semantic_html', 'pass',
        `Cấu trúc ngữ nghĩa tốt: có <main> cùng các thẻ ${Object.keys(counts).map((t) => `<${t}>`).join(', ')} — trình duyệt, công cụ quét và phần mềm đọc màn hình đều hiểu bố cục.`,
        'Giữ lệ khi viết trang mới: mỗi trang 1 <main>, menu dùng <nav>, phần lặp dùng <article>/<section>.');
    }
    const n = Object.values(counts).reduce((s, x) => s + x, 0);
    if (n > 0) {
      return out('semantic_html', 'warn',
        `Có một số thẻ ngữ nghĩa (${Object.keys(counts).map((t) => `<${t}>`).join(', ')}) nhưng thiếu cấu trúc chủ chốt` +
        (hasMain ? '' : ' — chưa có <main> chốt vùng nội dung chính') +
        (hasTop ? '' : ' — chưa có <header>/<nav>/<footer>') + '.',
        'Gói lại: toàn bộ menu vào <nav>, nội dung chính vào <main>, logo/giới thiệu đầu trang vào <header>, thông tin liên hệ chân trang vào <footer>.');
    }
    return out('semantic_html', 'fail',
      'Toàn trang dựng bằng thẻ trung tính (div/span) không có thẻ ngữ nghĩa nào — máy tìm kiếm và người dùng phần mềm đọc màn hình khó hiểu cấu trúc.',
      'Dựng lại khung sườn: <header> (logo + menu <nav>), <main> chứa <h1> và nội dung chính, <footer> (địa chỉ + link chính sách).');
  }

  function isLabelled(el, doc) {
    // label bọc ngoài (ancestor label) — linkedom không có closest nên đi tay
    let p = el.parentElement;
    for (let i = 0; i < 4 && p; i++) {
      if ((p.tagName || '').toLowerCase() === 'label') return true;
      p = p.parentElement;
    }
    if (el.getAttribute('aria-label')) return true;
    const byL = el.getAttribute('aria-labelledby');
    if (byL && byL.split(/\s+/).some((r) => doc.getElementById(r))) return true;
    // label[for]
    return false;
  }

  function checkFormLabels(doc) {
    const mapFor = new Map();
    for (const l of doc.querySelectorAll('label[for]')) {
      const f = l.getAttribute('for');
      if (f) mapFor.set(f.trim(), true);
    }
    const fields = Array.from(doc.querySelectorAll('input, textarea, select')).filter((el) => {
      const t = (el.getAttribute('type') || '').toLowerCase();
      return t !== 'hidden' && t !== 'submit' && t !== 'button' && t !== 'reset' && t !== 'image';
    });
    if (!fields.length) {
      return out('form_labels', 'pass',
        'Trang không có trường nhập liệu (trong HTML tĩnh) — không có gì để chấm.',
        'Khi thêm form, mỗi trường đều gắn <label for>: khách không biết điền chỗ nào nếu thiếu nhãn.');
    }
    let missing = 0;
    for (const el of fields) {
      const id = el.getAttribute('id');
      const ok = (id && mapFor.has(id)) || isLabelled(el, doc);
      if (!ok) missing++;
    }
    if (missing === 0) {
      return out('form_labels', 'pass',
        `${fields.length} trường nhập đều có nhãn rõ ràng — khách biết từng ô điền gì, phần mềm đọc màn hình đọc đúng.`,
        'Nhãn nên nằm ngoài ô (không dùng nhãn placeholder): khách điền xong vẫn còn thấy nhờ toad.');
    }
    const ratio = missing / fields.length;
    if (ratio > 0.5) {
      return out('form_labels', 'fail',
        `${missing}/${fields.length} trường nhập không có nhãn (label/aria-label) — khách không biết ô nào điền cái gì, phần mềm đọc màn hình đọc lang bạt.`,
        'Thêm <label for="id"> tương ứng từng trường; trường đặc biệt dùng aria-label; không nhờ placeholder thay nhãn — chữ này mất ngay khi gõ.');
    }
    return out('form_labels', 'warn',
      `${missing}/${fields.length} trường nhập chưa có nhãn — một phần học khách (nhất là phần mềm đọc màn hình) sẽ bí khi điền.`,
      'Kiểm tra từng ô thiếu: thêm <label for>, hoặc ít nhất aria-label mô tả đúng nội dung cần điền.');
  }

  function accessibleName(el, doc) {
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    const by = el.getAttribute('aria-labelledby');
    if (by && by.split(/\s+/).some((r) => {
      const t = doc.getElementById(r);
      return t && t.textContent.trim();
    })) return '(từ aria-labelledby)';
    const title = el.getAttribute('title');
    if ((el.tagName || '').toLowerCase() === 'input') {
      const v = el.getAttribute('value');
      if (v && v.trim()) return v.trim();
    }
    const img = el.querySelector && el.querySelector('img[alt]');
    if (img && (img.getAttribute('alt') || '').trim()) return `[ảnh: ${img.getAttribute('alt').trim()}]`;
    if (title && title.trim()) return title.trim();
    const txt = (el.textContent || '').trim();
    if (txt) return txt;
    return null; // không có tên truy cập
  }

  function checkAccessibleNames(doc) {
    const controls = [
      ...Array.from(doc.querySelectorAll('a[href]')),
      ...Array.from(doc.querySelectorAll('button')),
      ...Array.from(doc.querySelectorAll('[role="button"]')),
      ...Array.from(doc.querySelectorAll('input[type="submit" i], input[type="button" i]')),
    ];
    let missing = 0;
    for (const el of controls) {
      if (!accessibleName(el, doc)) missing++;
    }
    if (missing === 0) {
      return out('accessible_names', 'pass',
        `${controls.length} liên kết/nút bấm đều có tên truy cập (chữ hiển thị hoặc aria-label) — phần mềm đọc màn hình đọc đúng chức năng từng cái.`,
        'Nút mới (chủ yếu là icon) nhớ aria-label: không có tên sẽ đóng vai trò rối cho khách dùng trợ năng.');
    }
    const level = missing > 2 ? 'fail' : 'warn';
    const nĐọc = controls.length - missing;
    return out('accessible_names', level,
      `${missing}/${controls.length} nút bấm & liên kết không có tên truy cập (không chữ, không aria-label/title/ảnh alt)` +
      (missing > 2 ? ' — số lượng lớn, khách dùng phần mềm đọc màn hình không thể dùng trang.' :
        ' — số ít nhưng vẫn khiến một số nút "vô danh" với trợ năng.'),
      'Với nút icon (chỉ hình ảnh), thêm aria-label ngắn gọn ("Tìm kiếm", "Giỏ hàng"); kiểm tra lại tab qua bàn phím thấy tên từng nút.');
  }

  function checkBlankLinks(doc) {
    // Quét mọi <a> (cả thiếu href) — liên kết không href mà mở tab mới cũng cần rel.
    const anchors = Array.from(doc.querySelectorAll('a'));
    const blanks = anchors.filter((a) => (a.getAttribute('target') || '').toLowerCase() === '_blank');
    if (!blanks.length) {
      return out('blank_links', 'pass',
        'Trang không mở link nào bằng tab mới (target="_blank") — không có rủi ro này.',
        'Khi cần mở tab mới (link ngoài), nhớ thêm rel="noopener noreferrer".');
    }
    const bad = blanks.filter((a) => !/noopener|noreferrer/i.test(a.getAttribute('rel') || ''));
    if (bad.length === 0) {
      return out('blank_links', 'pass',
        `Cả ${blanks.length} liên kết mở tab mới đều có rel bảo mật (noopener/noreferrer) — trang của bạn không bị tram vì trang bên kia.`,
        'Giữ nguyên: rel="noopener noreferrer" là chuẩn với mọi target="_blank".');
    }
    const level = bad.length > 2 ? 'fail' : 'warn';
    return out('blank_links', level,
      `${bad.length}/${blanks.length} liên kết mở tab mới thiếu rel="noopener noreferrer" — tab mới có thể can thiệp vào tab cũ (đánh cắp phiên/ngoài trang lạ).`,
      'Thêm rel="noopener noreferrer" vào từng <a target="_blank"> — sửa 1 dòng mỗi link, không rủi ro gì.');
  }

  /* ── Kiểm tra cấp site (robots.txt, sitemap.xml) + liên kết ────────────── */

  // robots/sitemap là dữ liệu ngoài HTML trang: main.js fetch sẵn (qua chế độ ?soft=1)
  // rồi truyền vào meta dạng { statusCode, text } — không có thì mục này là unknown.
  function checkRobotsTxt(robots) {
    if (!robots) {
      return out('robots_txt', 'unknown',
        'Không kiểm tra được robots.txt (lỗi mạng hoặc trang chặn truy cập tự động).',
        'Kiểm tra tay: mở ten-mien.vn/robots.txt trong trình duyệt.');
    }
    const text = String(robots.text || '');
    if (/^\s*<!doctype\s+html|<html/i.test(text)) {
      return out('robots_txt', 'warn',
        'Địa chỉ robots.txt trả về trang HTML thay vì tệp chỉ dẫn — tệp robots.txt chưa được đặt ở thư mục gốc.',
        'Tạo tệp robots.txt dạng text thuần, đặt tại ten-mien.vn/robots.txt (thư mục gốc, không phải trong thư mục con).');
    }
    const code = robots.statusCode || 0;
    if (code >= 400) {
      if (code !== 404) {
        // 403 (site chặn bot), 5xx (sự cố server): KHÔNG kết luận được tệp có hay không
        // — đúng định nghĩa `unknown` trong hợp đồng (mục 2), đừng nhầm thành "chưa có tệp".
        return out('robots_txt', 'unknown',
          `Máy chủ trả về HTTP ${code} khi lấy robots.txt — không xác định được website có tệp này hay không (site chặn bot tự động, hoặc máy chủ đang sự cố).`,
          'Kiểm tra tay: mở ten-mien.vn/robots.txt trong trình duyệt. Nếu tệp tồn tại và hợp lệ thì không cần sửa gì.');
      }
      return out('robots_txt', 'warn',
        'Website chưa có tệp robots.txt — không sai, nhưng đang bỏ lỡ quyền khai báo sitemap và không chặn được các trang không cần máy quét ghé vào.',
        'Tạo tệp robots.txt đơn giản xếp ở thư mục gốc:\nUser-agent: *\nDisallow: /admin/\nSitemap: ten-mien.vn/sitemap.xml');
    }
    // robots.txt cần đọc theo nhóm User-agent (theo chuẩn): "Disallow: /" chỉ là
    // chặn toàn bộ khi thuộc nhóm '*' (nhóm chung) — các site hay chặn riêng
    // từng bot xấu (AhrefsBot, Scrapy…) bằng cách này, đó là hợp lệ.
    let agents = [];
    let seenAnyAgent = false;
    let wildBlocked = false;   // nhóm '*' bị chặn toàn bộ
    let strayBlock = false;    // "Disallow: /" đứng ngoài mọi nhóm user-agent
    let rules = 0;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.split('#')[0].trim();
      if (!line) { agents = []; continue; } // dòng trống kết thúc 1 nhóm
      let m = line.match(/^user-agent:\s*(.+)$/i);
      if (m) { seenAnyAgent = true; agents.push(m[1].trim().toLowerCase()); continue; }
      m = line.match(/^disallow:\s*(.*)$/i);
      if (m) {
        rules++;
        if (/^\/\*?\s*$/.test(m[1])) { // chỉ "/" hoặc "/*" → chặn tất cả
          if (!agents.length) strayBlock = true;
          else if (agents.includes('*')) wildBlocked = true;
        }
      }
    }
    if (wildBlocked || (strayBlock && !seenAnyAgent)) {
      return out('robots_txt', 'fail',
        'robots.txt đang chặn toàn bộ website cho nhóm công cụ chung (User-agent: * — dòng "Disallow: /") — Google không thể quét bất kỳ trang nào.',
        'Xoá dòng "Disallow: /" trong nhóm "User-agent: *" hoặc thay bằng các thư mục cụ thể thật sự cần chặn (ví dụ /admin/). Các dòng chặn riêng bot khác (AhrefsBot…) có thể giữ nguyên.');
    }
    const hasSitemap = /sitemap:\s*\S/i.test(text);
    return out('robots_txt', 'pass',
      `robots.txt hoạt động — nhóm công cụ chung (User-agent: *) được cho phép quét${rules ? `, ${rules} dòng chặn riêng các bot không cần` : ''}${hasSitemap ? ', đã khai báo sơ đồ trang (sitemap)' : ''}.`,
      hasSitemap
        ? 'Giữ nguyên; cập nhật thêm quy tắc khi có khu vực mới cần chặn.'
        : 'Bổ sung dòng "Sitemap: ten-mien.vn/sitemap.xml" để máy tìm kiếm tìm sơ đồ trang nhanh hơn.');
  }

  function checkSitemap(sitemap) {
    if (!sitemap) {
      return out('sitemap', 'unknown',
        'Không kiểm tra được sitemap.xml (lỗi mạng hoặc trang chặn truy cập tự động).',
        'Kiểm tra tay: mở ten-mien.vn/sitemap.xml trong trình duyệt.');
    }
    const text = String(sitemap.text || '');
    const code = sitemap.statusCode || 0;
    if (code >= 400) {
      if (code !== 404) {
        // 403/5xx: không kết luận được — phân biệt rõ với 404 (thật sự chưa có tệp).
        return out('sitemap', 'unknown',
          `Máy chủ trả về HTTP ${code} khi lấy sitemap.xml — không xác định được website có sơ đồ trang hay không (site chặn bot tự động, hoặc máy chủ đang sự cố).`,
          'Kiểm tra tay: mở ten-mien.vn/sitemap.xml trong trình duyệt (site chặn bot thường trả 403).');
      }
      return out('sitemap', 'warn',
        'Chưa có sơ đồ trang (sitemap.xml) — Google vẫn tìm được từng trang, nhưng chậm hơn và bỏ sót trang mới.',
        'Tạo sitemap.xml (plugin SEO hoặc trình tạo tự động), khai báo trong robots.txt rồi submit trong Google Search Console.');
    }
    if (!/<urlset|<sitemapindex/i.test(text)) {
      return out('sitemap', 'warn',
        'Địa chỉ sitemap.xml phản hồi nhưng nội dung không đúng định dạng XML sơ đồ trang — máy tìm kiếm đọc không được.',
        'Xuất lại sitemap đúng chuẩn (thẻ gốc <urlset> hoặc <sitemapindex>) và đặt tại ten-mien.vn/sitemap.xml.');
    }
    const soDonVi = (text.match(/<loc>/gi) || []).length;
    const laNhom = /<sitemapindex/i.test(text);
    return out('sitemap', 'pass',
      laNhom
        ? `Sitemap.xml đọc được — dạng nhóm (sitemapindex) dẫn tới ${soDonVi} sơ đồ trang con (mỗi con chứa địa chỉ trang).`
        : `Sitemap.xml đọc được — khai báo ${soDonVi} địa chỉ trang.`,
      'Cập nhật lại sitemap mỗi khi thêm trang/sản phẩm mới; submit trong Google Search Console.');
  }

  function checkLinks(doc, meta) {
    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    if (anchors.length === 0) {
      return out('links', 'pass',
        'Trang không dùng liên kết nào (trong HTML tĩnh) — không có gì để chấm.',
        'Khi thêm menu, dùng thẻ <a href> thật với chữ mô tả rõ từng đường dẫn.');
    }
    let internal = 0;
    let external = 0;
    let dead = 0;         // href="#" / javascript: / href hỏng
    let deadFragment = 0; // href="#tên-anchor" mà id "tên-anchor" không tồn tại trên trang
    let emptyText = 0;    // <a> trống chữ (kể cả khi bọc ảnh không alt)
    let baseOrigin = '';
    try { baseOrigin = new URL(meta.finalUrl || meta.inputUrl || '').origin; } catch { /* giữ '' */ }
    for (const a of anchors) {
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href === '#' || /^javascript:/i.test(href)) {
        dead++;
      } else {
        try {
          const u = new URL(href, baseOrigin || undefined);
          // Fragment nội bộ ("#ten-anchor") chỉ hợp lệ khi trang có id đó —
          // bấm tới sẽ không cuộn đi đâu cả, coi như liên kết lỗi (phần v1.3 của mục 22.12/22.14).
          const hash = u.hash; // dạng "#ten-anchor" hoặc ""
          if (hash.length > 1 && baseOrigin && u.origin === baseOrigin
              && !doc.getElementById(decodeURIComponent(hash.slice(1)))) {
            deadFragment++;
          } else if (baseOrigin && u.origin === baseOrigin) {
            internal++;
          } else {
            external++;
          }
        } catch { dead++; }
      }
      // Icon-link không chữ hiển thị nhưng có chữ cho trợ năng (aria-label/title)
      // hay bọc ảnh thì đếm là "có chữ" — đừng oan site làm chuẩn a11y.
      if (!a.textContent.trim() && !a.querySelector('img')
          && !a.getAttribute('aria-label') && !a.getAttribute('title')) emptyText++;
    }
    const flawed = dead + deadFragment + emptyText;
    const count = `Trang có ${anchors.length} liên kết: ${internal} nội bộ, ${external} ngoài.`;
    const issues = [];
    if (dead) issues.push(`${dead} liên kết chết (href="#")`);
    if (deadFragment) issues.push(`${deadFragment} anchor trỏ tới vị trí không tồn tại`);
    if (emptyText) issues.push(`${emptyText} liên kết không có chữ`);
    if (flawed === 0) {
      return out('links', 'pass',
        `${count} Không phát hiện liên kết lỗi.`,
        'Giữ chữ mô tả rõ ràng cho mỗi liên kết khi bổ sung mục mới.');
    }
    if (flawed <= 5) {
      return out('links', 'warn',
        `${count} Cần sửa: ${issues.join(' và ')} — khách bấm không thấy gì, máy quét đi vào ngõ cụt (liên kết anchor cần id khớp trên trang).`,
        'Trỏ mỗi link chết sang trang thật hoặc xoá đi; liên kết anchor "#ten" cần đủ id="ten" đúng vị trí; liên kết bọc hình cần thêm chữ hoặc aria-label.');
    }
    return out('links', 'fail',
      `${count} Và ${flawed} liên kết lỗi (${issues.join(' và ')}) — số lượng quá lớn, có khả năng trang dính chữ nhúng/khung rác cần dọn.`,
      'Kiểm tra lại khối inject/plugin chèn link: gỡ phần chèn lạ, làm sạch hệ thống liên kết toàn trang.');
  }

  /* ── Điểm vào chính ─────────────────────────────────────────────────────── */

  function runChecks(html, meta = {}, buildDoc) {
    const parseDoc = buildDoc ||
      (typeof DOMParser !== 'undefined'
        ? (h) => new DOMParser().parseFromString(h, 'text/html')
        : null);
    if (!parseDoc) throw new Error('runChecks cần hàm buildDoc khi chạy ngoài trình duyệt.');

    const doc = parseDoc(html);
    const titleEl = doc.querySelector('title');
    const h1Count = doc.querySelectorAll('h1').length;

    const byId = {
      title: checkTitle(doc),
      meta_description: checkDescription(doc),
      open_graph: checkOpenGraph(doc),
      canonical: checkCanonical(doc),
      robots_meta: checkRobots(doc),
      robots_txt: checkRobotsTxt(meta.robots),
      sitemap: checkSitemap(meta.sitemap),
      structured_data: checkStructuredData(doc),
      https: checkHttps(meta),
      lang: checkLang(doc),
      charset: checkCharset(html),
      h1: checkH1(doc),
      heading_system: checkHeadingSystem(doc, h1Count),
      links: checkLinks(doc, meta),
      analytics: checkAnalytics(html),
      duplicate_ids: checkDuplicateIds(doc),
      mixed_content: checkMixedContent(meta, doc),
      viewport: checkViewport(doc),
      img_alt: checkImages(doc),
      img_wh: checkImgWh(doc),
      favicon: checkFavicon(doc),
      theme_color: checkThemeColor(doc),
      lazy_load: checkLazyLoad(doc),
      resources: checkResources(doc),
      page_weight: checkPageWeight(html),
      cta: checkCTA(doc),
      contact_info: checkContactInfo(doc),
      contact_form: checkContactForm(doc),
      social_links: checkSocialLinks(doc),
      policy_links: checkPolicyLinks(doc),
      semantic_html: checkSemanticHtml(doc),
      form_labels: checkFormLabels(doc),
      accessible_names: checkAccessibleNames(doc),
      blank_links: checkBlankLinks(doc),
    };

    const checks = DEFS.map((d) => byId[d.id]);

    return {
      version: VERSION,
      url: meta.inputUrl || '',
      finalUrl: meta.finalUrl || meta.inputUrl || '',
      statusCode: meta.statusCode == null ? null : meta.statusCode,
      elapsedMs: meta.elapsedMs == null ? null : meta.elapsedMs,
      fetchedAt: new Date().toISOString(),
      title: titleEl ? titleEl.textContent.trim() : '',
      checks,
    };
  }

  /* ── Chấm điểm v1.3 (mốc 2) — hàm thuần, test được độc lập DOM ─────────── */

  // Công thức chốt (contract.md mục 3, v1.3):
  //   pass = đủ weight · warn = weight/2 · fail = 0
  //   unknown: loại khỏi CẢ tử lẫn mẫu số (chính nghĩa "không xác định" — không chấm oan).
  //   tổng = round(earned / maxChấmĐược × 100, 1); điểm nhóm là quy mô con của cùng công thức.
  function tinhDiem(result) {
    const checks = (result && Array.isArray(result.checks)) ? result.checks : [];
    const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
    let earned = 0;
    let max = 0;                       // tổng weight của những mục CHẤM được (unknown bị loại)
    const byGroup = new Map();         // group → { earned, max, weight (đầy đủ) }
    for (const d of DEFS) {
      if (!byGroup.has(d.group)) byGroup.set(d.group, { earned: 0, max: 0, weight: 0 });
    }
    for (const c of checks) {
      const w = Number(c.weight) || 0;
      const g = byGroup.get(c.group) || { earned: 0, max: 0, weight: 0 };
      counts[c.level] = (counts[c.level] || 0) + 1;
      g.weight += w;
      if (c.level === 'unknown') {
        byGroup.set(c.group, g);
        continue;                      // unknown: không điểm, không vào mẫu số
      }
      const diem = c.level === 'pass' ? w : (c.level === 'warn' ? w / 2 : 0);
      earned += diem;
      max += w;
      g.earned += diem;
      g.max += w;
      byGroup.set(c.group, g);
    }
    const gList = [...byGroup.entries()].map(([name, v]) => ({ name, earned: v.earned, max: v.max, weight: v.weight }));
    const mauSo = max;
    const total = max > 0 ? Math.round(Math.min(earned / max, 1) * 1000) / 10 : 0;
    const capDo = total >= 90 ? 'Tốt' : total >= 75 ? 'Khá' : total >= 60 ? 'Trung bình' : total >= 40 ? 'Yếu' : 'Rất yếu';
    return { total, capDo, earned, max, mauSo, groups: gList, counts };
  }

  // "3,5" — đồng nhất tiếng Việt: dấu phẩy thập phân; unknown → "—"
  function fmt(n) {
    if (n == null) return '—';
    return (Math.round(n * 10) / 10).toString().replace('.', ',');
  }

  /* ── Hiển thị checklist v1.3: nhóm dạng <details> thu gọn/mở được ───────── */

  function renderChecklist(result, mount) {
    mount.textContent = '';
    const buckets = Object.fromEntries(GROUPS.map((g) => [g, []]));
    for (const c of result.checks) if (buckets[c.group]) buckets[c.group].push(c);
    const sc = tinhDiem(result);

    for (const g of GROUPS) {
      const list = buckets[g];
      if (!list.length) continue;
      const owner = mount.ownerDocument || document;
      const details = owner.createElement('details');
      details.className = 'check-group';

      const summary = owner.createElement('summary');
      const h = owner.createElement('h2');
      h.textContent = g;
      const grp = sc.groups.find((x) => x.name === g);
      const achieved = list.filter((c) => c.level === 'pass').length;
      const sum = owner.createElement('span');
      sum.className = 'group-sum';
      // V1.3: nhóm có unknown trả "0/n đạt (chưa chấm được)" — minh bạch thay vì ẩn.
      sum.textContent = grp && grp.max > 0
        ? `${fmt(grp.earned)}/${fmt(grp.max)} điểm · ${achieved}/${list.length} đạt`
        : `0/${list.length} đạt (chưa chấm được)`;
      h.appendChild(sum);
      summary.appendChild(h);
      details.appendChild(summary);

      const rows = owner.createElement('div');
      rows.className = 'check-rows';
      for (const c of list) {
        const row = owner.createElement('div');
        row.className = `check-row level-${c.level}`;

        const glyph = owner.createElement('span');
        glyph.className = 'glyph';
        glyph.setAttribute('role', 'img');
        glyph.setAttribute('aria-label', LEVEL_WORDS[c.level]);
        glyph.textContent = GLYPHS[c.level];
        row.appendChild(glyph);

        const body = owner.createElement('div');
        body.className = 'check-body';
        const label = owner.createElement('p');
        label.className = 'check-label';
        label.textContent = c.label;
        const detail = owner.createElement('p');
        detail.className = 'check-detail';
        detail.textContent = c.detail;
        body.appendChild(label);
        body.appendChild(detail);
        if (c.suggestion) {
          const sug = owner.createElement('p');
          sug.className = 'check-suggestion';
          sug.textContent = 'Gợi ý: ' + c.suggestion;
          body.appendChild(sug);
        }
        row.appendChild(body);

        // Chip điểm từng mục "đạt được/tối đa": fail = "0/w", riêng unknown không chấm → "—/w".
        const diem = c.level === 'pass' ? c.weight : c.level === 'warn' ? c.weight / 2 : c.level === 'fail' ? 0 : null;
        const pts = owner.createElement('span');
        pts.className = 'check-pts mono';
        pts.setAttribute('data-level', c.level);
        pts.textContent = `${fmt(diem)}/${c.weight}`;
        row.appendChild(pts);

        rows.appendChild(row);
      }
      details.appendChild(rows);
      mount.appendChild(details);
    }
  }

  /* ── Result mẫu (không cần mạng) cho mốc 2–5 dựng phần của mình ─────────── */

  const DEMO_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Quán cà phê Mộc — Đà Lạt</title>
<meta name="description" content="Quán cà phê rang xay tại Đà Lạt với view đồi thông. Giỏ quà cà phê phin, cà phê muối, bột hòa tan — ship toàn quốc từ 2 hộp, miễn phí gói quà biếu. Gọi 0917 000 111 để đặt trước hôm nay, được tư vấn chọn mức rang theo gu người nhận. Phục vụ cả đơn quà Tết cho doanh nghiệp.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg">
<meta name="theme-color" content="#3d2b1f">
<meta property="og:title" content="Quán cà phê Mộc">
<script src="https://www.googletagmanager.com/gtag/js?id=G-DEMO"></script>
</head>
<body>
<h1>Cà phê rang xay Mộc — nơi đồi thông Đà Lạt</h1>
<h2>Sản phẩm</h2>
<p>Cà phê phin, cà phê muối, bột hòa tan theo tỷ lệ riêng của quán.</p>
<h4>Dòng đặc biệt</h4>
<p>Rang mộc theo mùa, thay đổi theo vựa hạt.</p>
<h2>Cửa hàng</h2>
<img src="ca-phe-phin.jpg" alt="Phin cà phê nhôm cổ">
<img src="qua-tang.jpg">
<img src="doi-thong.jpg" alt="Đồi thông phía sau quán" loading="lazy">
<img src="noi-that.jpg" alt="Nội thất gỗ trong quán" loading="lazy">
<form action="/gui-lien-he" method="post">
  <input type="email" name="email" aria-label="Email nhận khuyến mãi" placeholder="Email">
  <input type="text" name="ho-ten" placeholder="Họ tên">
  <button type="submit">Gửi thông tin</button>
</form>
<script src="/jquery.min.js"></script><script src="/slider.js"></script><script src="/ban-do.js"></script>
<script src="/chat.js"></script><script src="/form.js"></script>
<link rel="stylesheet" href="/main.css"><link rel="stylesheet" href="/slider.css"><link rel="stylesheet" href="/shop.css">
<footer>
<a href="#" class="menu-link">Xem menu</a>
<a href="/dat-ban" class="btn-main">Đặt bàn ngay</a>
<a href="tel:0917000111">Gọi quán: 0917 000 111</a>
<a href="mailto:info@quan-moc-da-lat.vn">Email quán</a>
<a href="https://facebook.com/quanmoc">Fanpage Facebook của quán</a>
<a href="/chinh-sach-bao-mat">Chính sách bảo mật</a>
</footer>
</body>
</html>`;

  const DEMO_META = {
    inputUrl: 'quan-moc-da-lat.vn',
    finalUrl: 'https://quan-moc-da-lat.vn/',
    statusCode: 200,
    elapsedMs: 1240,
    robots: {
      // 403: site chặn bot quét — đúng theo hợp đồng phải chấm unknown (không dối là fail).
      statusCode: 403,
      text: '',
    },
    sitemap: {
      statusCode: 200,
      text: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://quan-moc-da-lat.vn/</loc></url>\n  <url><loc>https://quan-moc-da-lat.vn/san-pham</loc></url>\n  <url><loc>https://quan-moc-da-lat.vn/dat-ban</loc></url>\n</urlset>',
    },
  };

  function demoResult(buildDoc) {
    return runChecks(DEMO_HTML, DEMO_META, buildDoc);
  }

  // Nạp Result cho mốc 2–5 (và trang results.js): ?demo=1 → Result mẫu, ngược lại
  // đọc sessionStorage["webcheck:result"]. Trả null khi hỏng hoặc shape sai — nơi
  // gọi tự quyết định hiện "trống" hay ẩn slot của mình. Dùng thay tự đọc tay:
  // mọi trang cùng 1 nguồn sự thật.
  function docKetQua() {
    try {
      if (new URLSearchParams(location.search).has('demo')) {
        const d = demoResult();
        if (d && Array.isArray(d.checks) && d.checks.length) return d;
      }
    } catch { /* không có location/demo → thử nạp sessionStorage */ }
    try {
      const r = JSON.parse(sessionStorage.getItem('webcheck:result'));
      if (r && Array.isArray(r.checks) && r.checks.length) return r;
    } catch { /* chưa có kết quả trong session */ }
    return null;
  }

  return { runChecks, renderChecklist, demoResult, docKetQua, tinhDiem, DEFS, VERSION };
})();

if (typeof window !== 'undefined') window.WebCheck = WebCheck;
