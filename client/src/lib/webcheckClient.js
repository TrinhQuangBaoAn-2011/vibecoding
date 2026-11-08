// WebCheck Client Module - Client-side website analysis
// Integrates with WEBCheck AI backend

const WEBCHECK = {
  // Run checks on HTML content
  runChecks(html, meta = {}) {
    const parseDoc = typeof DOMParser !== 'undefined'
      ? (h) => new DOMParser().parseFromString(h, 'text/html')
      : null;

    if (!parseDoc) throw new Error('DOMParser not available');

    const doc = parseDoc(html);
    const titleEl = doc.querySelector('title');
    const h1Count = doc.querySelectorAll('h1').length;

    // Define all 22 checklist items (from WebCheck part 1)
    const DEFS = [
      { id: 'title', group: 'SEO & hiển thị', weight: 8, label: 'Tiêu đề trang (<title>)' },
      { id: 'meta_description', group: 'SEO & hiển thị', weight: 8, label: 'Mô tả tìm kiếm (meta description)' },
      { id: 'open_graph', group: 'SEO & hiển thị', weight: 3, label: 'Chia sẻ mạng xã hội (Open Graph)' },
      { id: 'canonical', group: 'SEO & hiển thị', weight: 4, label: 'Địa chỉ chuẩn (canonical)' },
      { id: 'robots_meta', group: 'SEO & hiển thị', weight: 4, label: 'Chỉ dẫn công cụ tìm kiếm (robots)' },
      { id: 'robots_txt', group: 'SEO & hiển thị', weight: 3, label: 'Tệp robots.txt (chỉ dẫn quét toàn site)' },
      { id: 'sitemap', group: 'SEO & hiển thị', weight: 3, label: 'Sơ đồ trang (sitemap.xml)' },
      { id: 'structured_data', group: 'SEO & hiển thị', weight: 4, label: 'Dữ liệu có cấu trúc (JSON-LD)' },
      { id: 'https', group: 'Chuẩn kỹ thuật', weight: 7, label: 'Kết nối bảo mật (HTTPS)' },
      { id: 'lang', group: 'Chuẩn kỹ thuật', weight: 4, label: 'Định nghĩa ngôn ngữ (lang)' },
      { id: 'charset', group: 'Chuẩn kỹ thuật', weight: 4, label: 'Bảng mã ký tự (charset)' },
      { id: 'h1', group: 'Chuẩn kỹ thuật', weight: 7, label: 'Tiêu đề chính (h1)' },
      { id: 'heading_system', group: 'Chuẩn kỹ thuật', weight: 4, label: 'Hệ thống đề mục (h2–h6)' },
      { id: 'links', group: 'Chuẩn kỹ thuật', weight: 3, label: 'Liên kết (link)' },
      { id: 'analytics', group: 'Chuẩn kỹ thuật', weight: 4, label: 'Đo lường truy cập (Analytics)' },
      { id: 'viewport', group: 'Di động & hình ảnh', weight: 9, label: 'Hiển thị trên di động (viewport)' },
      { id: 'img_alt', group: 'Di động & hình ảnh', weight: 7, label: 'Mô tả ảnh (alt)' },
      { id: 'favicon', group: 'Di động & hình ảnh', weight: 4, label: 'Biểu tượng tab (favicon)' },
      { id: 'theme_color', group: 'Di động & hình ảnh', weight: 2, label: 'Màu giao diện (theme-color)' },
      { id: 'lazy_load', group: 'Di động & hình ảnh', weight: 4, label: 'Tải ảnh trễ (lazy loading)' },
      { id: 'resources', group: 'Tốc độ tải nội dung', weight: 2, label: 'Số lượng tài nguyên (JS/CSS)' },
      { id: 'page_weight', group: 'Tốc độ tải nội dung', weight: 2, label: 'Dung lượng HTML' },
    ];

    // Group order
    const GROUPS = [...new Set(DEFS.map((d) => d.group))];

    const def = (id) => DEFS.find((d) => d.id === id);

    // Pass/fail/unknown levels
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

    // Individual check functions
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

    function checkLang(doc) {
      const l = doc.documentElement.getAttribute('lang');
      if (l && l.trim()) {
        return out('lang', 'pass',
          `Đã khai báo ngôn ngữ trang: "${l.trim()}".`,
          'Giữ thống nhất: các trang con cũng gán lang="vi" (hoặc ngôn ngữ tương ứng của trang đó).');
      }
      return out('lang', 'fail',
        'Thẻ <html> không khai báo ngôn ngữ — phần mềm đọc màn hình và công cụ dịch dễ xử lý sai tiếng Việt.',
        'Thêm lang="vi" vào thẻ <html> phía đầu file.');
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

    // Main run function
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
      viewport: checkViewport(doc),
      img_alt: checkImages(doc),
      favicon: checkFavicon(doc),
      theme_color: checkThemeColor(doc),
      lazy_load: checkLazyLoad(doc),
      resources: checkResources(doc),
      page_weight: checkPageWeight(html),
    };

    const checks = DEFS.map((d) => byId[d.id]);

    return {
      version: '1.2',
      url: meta.inputUrl || '',
      finalUrl: meta.finalUrl || meta.inputUrl || '',
      statusCode: meta.statusCode == null ? null : meta.statusCode,
      elapsedMs: meta.elapsedMs == null ? null : meta.elapsedMs,
      fetchedAt: new Date().toISOString(),
      title: titleEl ? titleEl.textContent.trim() : '',
      checks,
    };
  },

  // Render checklist to DOM
  renderChecklist(result, mount) {
    const mountEl = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (!mountEl) return;

    mountEl.textContent = '';
    const buckets = Object.fromEntries(GROUPS.map((g) => [g, []]));
    for (const c of result.checks) if (buckets[c.group]) buckets[c.group].push(c);

    // Helper to create a check row
    const createCheckRow = (c) => {
      const row = document.createElement('div');
      row.className = `check-row level-${c.level}`;

      const glyph = document.createElement('span');
      glyph.className = 'glyph';
      glyph.setAttribute('role', 'img');
      glyph.setAttribute('aria-label', LEVEL_WORDS[c.level]);
      glyph.textContent = GLYPHS[c.level];
      row.appendChild(glyph);

      const body = document.createElement('div');
      body.className = 'check-body';

      const label = document.createElement('p');
      label.className = 'check-label';
      label.textContent = c.label;

      const detail = document.createElement('p');
      detail.className = 'check-detail';
      detail.textContent = c.detail;

      if (c.suggestion) {
        const sug = document.createElement('p');
        sug.className = 'check-suggestion';
        sug.textContent = 'Gợi ý: ' + c.suggestion;
        body.appendChild(sug);
      }
      body.appendChild(label);
      body.appendChild(detail);
      row.appendChild(body);
      return row;
    };

    for (const g of GROUPS) {
      const list = buckets[g];
      if (!list.length) continue;

      const section = document.createElement('section');
      section.className = 'check-group';

      const h = document.createElement('h2');
      h.textContent = g;

      const achieved = list.filter((c) => c.level === 'pass').length;
      const sum = document.createElement('span');
      sum.className = 'group-sum';
      sum.textContent = `${achieved}/${list.length} đạt`;
      h.appendChild(sum);

      const rows = document.createElement('div');
      rows.className = 'check-rows';
      for (const c of list) {
        const row = createCheckRow(c);
        rows.appendChild(row);
      }
      section.appendChild(h);
      section.appendChild(rows);
      mountEl.appendChild(section);
    }
  },

  // Get summary stats
  getSummary(result) {
    const checks = result.checks || [];
    const total = checks.length;
    const passed = checks.filter(c => c.level === 'pass').length;
    const warns = checks.filter(c => c.level === 'warn').length;
    const fails = checks.filter(c => c.level === 'fail').length;
    const unknown = checks.filter(c => c.level === 'unknown').length;

    const groups = Object.fromEntries(
      Object.keys(result.checks?.reduce((acc, c) => {
        acc[c.group] = (acc[c.group] || 0) + 1;
        return acc;
      }, {}))
    );

    return {
      total,
      passed,
      warns,
      fails,
      unknown,
      groups,
    };
  },
};

// Export for global use
if (typeof window !== 'undefined') window.WebCheck = WEBCHECK;
window.WebCheckRunChecks = WEBCHECK.runChecks;
window.WebCheckRenderChecklist = WEBCHECK.renderChecklist;
window.WebCheckGetSummary = WEBCHECK.getSummary;

export { WEBCHECK };