'use strict';
/*
 * WebCheck — bộ phân tích phía client (Mốc 1, Đề 5)
 * ---------------------------------------------------------------
 * v2.0 — HỆ THỐNG TRẠNG THÁI + ƯU TIÊN (loại bỏ hoàn toàn chấm điểm /100):
 *   - runChecks(html, meta, buildDoc) → Object Result v2.0 (thuần, không gọi mạng)
 *   - renderChecklist(result, mount) → checklist 60 mục theo nhóm + bộ lọc trạng thái/ưu tiên
 *   - demoResult() → Result mẫu; docKetQua() → nạp Result (?demo=1 / sessionStorage, chặn Result cũ)
 * KHÔNG còn: weight, tinhDiem(), xếp loại điểm, trường passed.
 * Trạng thái: pass/warn/fail/unknown (không bao giờ biến unknown thành fail);
 * ưu tiên P0–P3 nằm tập trung trong PRIORITY_MAP — không đồng nhất trạng thái với ưu tiên.
 * Chỉ mốc 1 sửa file này. Mốc 3 dựng lại AI phải đọc shape mới (contract.md mục 8).
 */
/* global DOMParser */

const WebCheck = (function () {
  const VERSION = '2.0';

  /* ── Định nghĩa 60 hạng mục ────────────────────────────────────────────────
   * 34 ID cũ GIỮ NGUYÊN tên lẫn ý nghĩa; 26 mục mới thêm ở cuối mỗi nhóm.
   * method khai rõ loại bằng chứng (mục VII yêu cầu):
   *   'html'         — chỉ đối chiếu HTML tĩnh của trang
   *   'network'      — kiểm tra tài nguyên ngoài (robots.txt / sitemap.xml)
   *   'html+network' — cần cả hai (HTTPS, trộn nội dung, dung lượng HTML…)
   * impact = tác động đối với doanh nghiệp (hiển thị trong giao diện + báo cáo).
   */
  const DEFS = [
    /* ── SEO & hiển thị (12) ── */
    { id: 'title', group: 'SEO & hiển thị', method: 'html', label: 'Tiêu đề trang (<title>)',
      impact: 'Tiêu đề là dòng đầu tiên khách đọc trên Google — cùng thẻ mô tả, nó quyết định người tìm kiếm bấm vào bạn hay vào đối thủ.' },
    { id: 'meta_description', group: 'SEO & hiển thị', method: 'html', label: 'Mô tả tìm kiếm (meta description)',
      impact: 'Dòng mô tả dưới tiêu đề trên Google. Thiếu là để thuật toán tự chụp câu bất kỳ trên trang — mất cơ hội thuyết phục đúng ý khách.' },
    { id: 'open_graph', group: 'SEO & hiển thị', method: 'html', label: 'Chia sẻ mạng xã hội (Open Graph)',
      impact: 'Link bán hàng chủ yếu lan qua Facebook/Zalo. Không có ảnh/tiêu đề chia sẻ, link dán vào nhóm chỉ hiện một dòng trơ trọi — giảm mạnh lượt bấm.' },
    { id: 'canonical', group: 'SEO & hiển thị', method: 'html', label: 'Địa chỉ chuẩn (canonical)',
      impact: 'Thiếu canonical, Google có thể coi (www/không www, ?utm…) là nhiều trang trùng nội dung — sức mạnh tìm kiếm bị chia nhỏ.' },
    { id: 'robots_meta', group: 'SEO & hiển thị', method: 'html', label: 'Chỉ dẫn công cụ tìm kiếm (robots)',
      impact: 'Một dòng noindex sai sót là cả trang biến mất khỏi Google — khách tìm đúng dịch vụ cũng không thấy bạn.' },
    { id: 'robots_txt', group: 'SEO & hiển thị', method: 'network', label: 'Tệp robots.txt (chỉ dẫn quét toàn site)',
      impact: 'robots.txt quyết định máy tìm kiếm được quét đâu. Sai một dòng "Disallow: /" là toàn website bị chặn khỏi Google.' },
    { id: 'sitemap', group: 'SEO & hiển thị', method: 'network', label: 'Sơ đồ trang (sitemap.xml)',
      impact: 'Sitemap giúp Google tìm đủ các trang mới sớm hơn — thiếu thì trang sản phẩm mới có thể mãi chưa được Google lập chỉ mục.' },
    { id: 'structured_data', group: 'SEO & hiển thị', method: 'html', label: 'Dữ liệu có cấu trúc (JSON-LD)',
      impact: 'JSON-LD là cách khai thẳng cho máy: địa chỉ, giờ mở cửa, sản phẩm. Chuẩn thì kết quả tìm kiếm nổi bật hơn, sai cú pháp thì máy đọc không được gì cả.' },
    { id: 'twitter_card', group: 'SEO & hiển thị', method: 'html', label: 'Thẻ chia sẻ X/Twitter (Twitter Card)',
      impact: 'Khách chia sẻ link lên X/Twitter: có thẻ riêng thì hiện kèm ảnh — không thì chỉ một dòng chữ, kém thu hút rõ.' },
    { id: 'breadcrumb', group: 'SEO & hiển thị', method: 'html', label: 'Dải đường dẫn (breadcrumb)',
      impact: 'Breadcrumb cho Google hiểu cấu trúc site và giúp khách biết mình đang ở mục nào — thiếu thì trang sâu dễ thành "ngõ cụt".' },
    { id: 'sitemap_lastmod', group: 'SEO & hiển thị', method: 'network', label: 'Sitemap khai báo ngày cập nhật (lastmod)',
      impact: 'Có lastmod, Google biết trang nào vừa thay đổi để ưu tiên quét lại — thiếu thì cập nhật sản phẩm giá chậm lên tìm kiếm.' },
    { id: 'meta_keywords', group: 'SEO & hiển thị', method: 'html', label: 'Không còn thẻ meta keywords lỗi thời',
      impact: 'Meta keywords bị Google bỏ qua từ 2009 — giữ lại chỉ cho thấy website dựng bằng kỹ thuật cũ, không ảnh hưởng thứ hạng.' },

    /* ── Chuẩn kỹ thuật (13) ── */
    { id: 'https', group: 'Chuẩn kỹ thuật', method: 'html+network', label: 'Kết nối bảo mật (HTTPS)',
      impact: 'Trang HTTP bị Chrome gắn nhãn "Không an toàn" — khách bán hàng/dịch vụ thấy dòng đó là rời đi ngay, nhất là ở bước điền thông tin.' },
    { id: 'lang', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Định nghĩa ngôn ngữ (lang)',
      impact: 'Khai sai ngôn ngữ khiến phần mềm đọc màn hình đọc lệch giọng và công cụ dịch nhầm nội dung — nhóm khách cần trợ năng bị thiệt thòi.' },
    { id: 'charset', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Bảng mã ký tự (charset)',
      impact: 'Sai bảng mã là chữ tiếng Việt ra "Ã´ Ã¹" — lỗi hiển thị khiến khách nghi ngờ cả sự chuyên nghiệp của shop.' },
    { id: 'h1', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Tiêu đề chính (h1)',
      impact: 'h1 là chủ đề của trang cho cả máy lẫn người. Không có, khách lướt 3 giây không hiểu trang bán gì.' },
    { id: 'heading_system', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Hệ thống đề mục (h1–h6)',
      impact: 'Đề mục nhảy bậc làm khách lướt nhanh mất mạch và máy chấm cấu trúc trang sai chủ đề chính.' },
    { id: 'links', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Chất lượng liên kết (link)',
      impact: 'Mỗi link chết/không chữ là một khách bấm không thấy gì và một lối đi máy tìm kiếm bị chặn — toàn bộ điều hướng sút giá trị.' },
    { id: 'analytics', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Đo lường truy cập (Analytics)',
      impact: 'Không đo lường là chạy marketing mà không biết kênh nào ra khách, bao nhiêu — không biết kênh nào hiệu quả để dồn tiền quảng cáo.' },
    { id: 'duplicate_ids', group: 'Chuẩn kỹ thuật', method: 'html', label: 'ID HTML không trùng',
      impact: 'ID trùng làm nút bấm/anchor cuộn sai chỗ, form chặn nhầm — lỗi bug kiểu âm thầm, khách mắc ở bước cuối cùng.' },
    { id: 'mixed_content', group: 'Chuẩn kỹ thuật', method: 'html+network', label: 'Không trộn nội dung HTTP trên HTTPS',
      impact: 'Tài nguyên http:// trên trang https:// khiến trình duyệt chặn hoặc gắn cảnh báo — giá trị của HTTPS mất đi một phần.' },
    { id: 'http_links', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Liên kết trỏ tới http://',
      impact: 'Khách bấm link http:// thấy trình duyệt cảnh báo "Không an toàn" — niềm tin tuột ngay tại đúng bước họ định hành động.' },
    { id: 'meta_refresh', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Không tự chuyển trang bằng meta refresh',
      impact: 'Chuyển hướng chờ vài giây là trải nghiệm khó chịu, và Google không coi đây là đường dẫn chuẩn giữa hai trang.' },
    { id: 'form_https_action', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Biểu mẫu không gửi qua http://',
      impact: 'Form gửi dữ liệu qua http:// là tên/SĐT khách truyền đi dạng "chữ trần" — đúng nơi khách trao cho mình thông tin quý nhất.' },
    { id: 'inline_styles', group: 'Chuẩn kỹ thuật', method: 'html', label: 'Style được gom vào file CSS',
      impact: 'Style rải rác trong HTML làm phình dung lượng trang và khiến sửa giao diện chậm, dễ lệch từng chỗ.' },

    /* ── Di động & hình ảnh (8) ── */
    { id: 'viewport', group: 'Di động & hình ảnh', method: 'html', label: 'Hiển thị trên di động (viewport)',
      impact: 'Đa số khách doanh nghiệp nhỏ đến từ điện thoại. Thiếu viewport là trang hiện như bản thu nhỏ — khách phải phóng to từng khối mới đọc nổi.' },
    { id: 'img_alt', group: 'Di động & hình ảnh', method: 'html', label: 'Mô tả ảnh (alt)',
      impact: 'alt là chỗ ghi tên sản phẩm/dịch vụ trong ảnh: thiếu thì Google "mù" ảnh, khách công cụ đọc màn hình cũng không biết ảnh nói gì.' },
    { id: 'img_wh', group: 'Di động & hình ảnh', method: 'html', label: 'Ảnh khai báo kích thước (width/height)',
      impact: 'Ảnh chưa khai báo kích thước khiến bố cục nhảy loạn khi trang tải — khách đang đọc bị trượt nội dung, bực rồi đi.' },
    { id: 'favicon', group: 'Di động & hình ảnh', method: 'html', label: 'Biểu tượng tab (favicon)',
      impact: 'Giữa đống tab của khách, logo favicon là dấu mốc nhận diện — thiếu là ô vuông xám dễ bị đóng nhầm tab.' },
    { id: 'theme_color', group: 'Di động & hình ảnh', method: 'html', label: 'Màu giao diện (theme-color)',
      impact: 'Trên điện thoại, theme-color khiến thanh trình duyệt hoà cùng màu thương hiệu — chi tiết nhỏ làm trang "thật" hơn là web chép.' },
    { id: 'lazy_load', group: 'Di động & hình ảnh', method: 'html', label: 'Tải ảnh trễ (lazy loading)',
      impact: 'Bật lazy, trang mở được ngay phần đầu — nơi quyết định khách ở lại; không bật là chờ cả dàn ảnh dưới màn hình.' },
    { id: 'manifest', group: 'Di động & hình ảnh', method: 'html', label: 'Khai báo manifest (PWA)',
      impact: 'Có manifest thì khi khách lưu trang vào màn hình chính, trang mở như một ứng dụng có tên/icon riêng — tăng lượt quay lại.' },
    { id: 'apple_icon', group: 'Di động & hình ảnh', method: 'html', label: 'Biểu tượng iOS (apple-touch-icon)',
      impact: 'Khách iPhone lưu trang về màn hình chính: không có icon riêng là một ảnh chụp màn hình mờ mờ thay cho logo cửa hàng.' },

    /* ── Tốc độ tải nội dung (4) ── */
    { id: 'resources', group: 'Tốc độ tải nội dung', method: 'html', label: 'Số lượng tài nguyên (JS/CSS)',
      impact: 'Càng nhiều file JS/CSS, trang càng chậm và dễ xung đột script — khách đợi vượt quá giới hạn nhẫn nại vài giây là đi ngay.' },
    { id: 'page_weight', group: 'Tốc độ tải nội dung', method: 'html+network', label: 'Dung lượng HTML',
      impact: 'HTML quá nặng là khách mạng 4G yếu bỏ đi trước khi trang kịp hiện — mất đúng nhóm khách vốn đang cần mua gấp.' },
    { id: 'render_blocking', group: 'Tốc độ tải nội dung', method: 'html', label: 'Script không chặn hiển thị (defer/async)',
      impact: 'Script ở đầu trang không có defer/async làm trình duyệt dừng vẽ chữ để chờ tải — khách thấy màn hình chớp trắng thay vì nội dung.' },
    { id: 'image_format', group: 'Tốc độ tải nội dung', method: 'html', label: 'Ảnh dùng dạng nhẹ (WebP/AVIF)',
      impact: 'Ảnh JPG/PNG cũ có thể gấp 2–3 lần WebP cùng chất lượng — mỗi ảnh nặng là thêm một giây khách chờ trên 4G.' },

    /* ── Marketing & chuyển đổi (8) ── */
    { id: 'cta', group: 'Marketing & chuyển đổi', method: 'html', label: 'Nút kêu gọi hành động (CTA)',
      impact: 'Khách xem xong luôn có cảm giác "thích nhưng chưa làm" — không có nút hành động rõ ràng là để họ lướt sang đối thủ.' },
    { id: 'contact_info', group: 'Marketing & chuyển đổi', method: 'html', label: 'Thông tin liên hệ',
      impact: 'Ai muốn mua là muốn hỏi trước. Liên hệ kén kênh thì khách nào ngại kênh đó là mất đơn — nên có sẵn hotline, email và Zalo cho khách chọn.' },
    { id: 'contact_form', group: 'Marketing & chuyển đổi', method: 'html', label: 'Biểu mẫu liên hệ',
      impact: 'Form ngắn gọn giữ lại được khách muốn hỏi ngoài giờ làm việc — bỏ form là mất toàn bộ nhóm khách không thích gọi điện.' },
    { id: 'social_links', group: 'Marketing & chuyển đổi', method: 'html', label: 'Liên kết mạng xã hội',
      impact: 'Fanpage/Zalo/OA là kênh giữ chân khách rẻ nhất — từng khách theo dõi hôm nay là người nhận tin khuyến mãi mai.' },
    { id: 'policy_links', group: 'Marketing & chuyển đổi', method: 'html', label: 'Trang chính sách / quy định',
      impact: 'Khách mua online tìm chính sách đổi trả trước khi bấm nút — không thấy là họ tự cộng phần rủi ro vào giá trong đầu, rồi rút lui.' },
    { id: 'product_service', group: 'Marketing & chuyển đổi', method: 'html', label: 'Sản phẩm / dịch vụ được giới thiệu rõ',
      impact: 'Trang chủ không cho thấy bán gì cụ thể là bắt khách tự đoán — và người ta không đặt hàng thứ họ phải đoán.' },
    { id: 'site_search', group: 'Marketing & chuyển đổi', method: 'html', label: 'Ô tìm kiếm trên trang',
      impact: 'Với shop đa mặt hàng, tìm kiếm giúp khách tới sản phẩm trong 5 giây — thiếu là họ lướt dần trang rồi thôi.' },
    { id: 'map_embed', group: 'Marketing & chuyển đổi', method: 'html', label: 'Bản đồ / đường đi tới cửa hàng',
      impact: 'Nhúng bản đồ giảm được cú điện thoại "shop ở đâu" — và người đi qua khu vực còn ghé luôn vì thấy gần đường mình hay đi.' },

    /* ── Tin cậy & minh bạch (4) ── */
    { id: 'trust_signals', group: 'Tin cậy & minh bạch', method: 'html', label: 'Dấu hiệu tạo niềm tin (đánh giá khách hàng)',
      impact: 'Đánh giá của người mua trước là bằng chứng bán hàng mạnh nhất — trang sạch bóng phản hồi khiến khách nghi ngờ chất lượng.' },
    { id: 'business_identity', group: 'Tin cậy & minh bạch', method: 'html', label: 'Thông tin nhận diện doanh nghiệp',
      impact: 'Khách cần thấy "có cửa hàng thật": tên, địa chỉ, mã số thuế — rõ ràng họ mới dám chuyển tiền cho một cửa hàng mình chưa từng ghé.' },
    { id: 'support_info', group: 'Tin cậy & minh bạch', method: 'html', label: 'Trang hỗ trợ / FAQ',
      impact: 'Trả lời sẵn FAQ giúp khách tự giải đáp — họ không phải chờ hồi âm và không bỏ đi trong lúc chờ.' },
    { id: 'working_hours', group: 'Tin cậy & minh bạch', method: 'html', label: 'Giờ mở cửa / làm việc',
      impact: 'Khách cần đến cửa hàng nhưng không biết giờ — nhiều người sẽ qua đối thủ mở gần hơn. Nêu giờ rõ là khách ghé được thôi.' },

    /* ── Trải nghiệm & truy cập (11) ── */
    { id: 'semantic_html', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Cấu trúc HTML ngữ nghĩa',
      impact: 'Khung ngữ nghĩa (main/nav/footer) giúp phần mềm đọc màn hình và Google vẽ đúng bản đồ trang — trang DIV tràn lan là bản đồ mù.' },
    { id: 'form_labels', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Trường nhập có nhãn (label)',
      impact: 'Ô nhập không nhãn là khách lúng túng không biết điền gì — đúng lúc họ định để lại thông tin.' },
    { id: 'accessible_names', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Liên kết/nút có tên truy cập',
      impact: 'Nút chỉ có hình thì phần mềm đọc màn hình đọc thành "nút" vô danh — khách dùng trợ năng không biết nút làm gì và bỏ đi.' },
    { id: 'blank_links', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Liên kết mở tab mới có rel bảo mật',
      impact: 'Thiếu rel="noopener", tab mới của trang lạ có thể thao túng tab của bạn — chỉ cần một dòng rel cho mỗi link để vá.' },
    { id: 'skip_link', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Liên kết nhảy tới nội dung chính',
      impact: 'Khách dặn bàn phím/phần mềm đọc màn hình phải đi qua từng mục menu mới tới nội dung — skip link tiết kiệm cả chục lần bấm Tab mỗi trang.' },
    { id: 'iframe_title', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Khung nhúng (iframe) có tiêu đề',
      impact: 'Không có title, phần mềm đọc màn hình đọc iframe thành "khung" — khách không biết bên trong là bản đồ hay video quảng cáo.' },
    { id: 'table_headers', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Bảng dữ liệu có hàng tiêu đề (<th>)',
      impact: 'Bảng thiếu th là khách đọc rời rạc không biết cột nào nói về gì — bảng giá dễ bị hiểu sai.' } ,
    { id: 'table_caption', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Bảng dữ liệu có tiêu đề (<caption>)',
      impact: 'Caption cho biết bảng này về bảng giá hay lịch phát — thiếu là người dùng trình đọc màn hình lướt tới bảng vẫn "vô chủ".' },
    { id: 'input_autocomplete', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Trường thông tin cá nhân có autocomplete',
      impact: 'Có autocomplete, trình duyệt tự điền tên/SĐT/email có sẵn của khách — bớt cả chuỗi gõ phím trước khi họ đổi ý vì mất thời gian.' },
    { id: 'form_fieldset', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Nhóm lựa chọn có fieldset/legend',
      impact: 'Nhóm ô chọn bọc fieldset đúng thì phần mềm đọc màn hình đọc rõ "nhóm hình thức thanh toán, 3 lựa chọn" — không bọc là đọc từng ô rời rạc.' },
    { id: 'media_autoplay', group: 'Trải nghiệm & truy cập', method: 'html', label: 'Video/âm thanh không tự phát tiếng',
      impact: 'Âm thực thanh phái tự phát là khách giật mình vung tay tắt cả tab — nhất là khách đang họp hoặc trông trẻ.' },
  ];

  /* Thứ tự nhóm lấy đúng thứ tự xuất hiện lần đầu trong DEFS (7 nhóm — v2.0 thêm
   * nhóm "Tin cậy & minh bạch" để khớp 6 câu hỏi doanh nghiệp). Sửa 1 chỗ ở DEFS. */
  const GROUPS = [...new Set(DEFS.map((d) => d.group))];

  /* ── Hệ thống trạng thái + ưu tiên ────────────────────────────────────────
   * Trạng thái (mục IV yêu cầu): giữ key code cũ pass/warn/fail/unknown để CSS/test
   * không gãy — chỉ đổi 2 nhãn hiển thị theo đúng nghĩa mới.
   * ưu tiên (mục V): KHÔNG đồng ghĩa với trạng thái — Chưa đạt không nhất thiết P0.
   * Cả 60 ID × 2 tình huống (fail/warn) đều phải có map (test quét đầy đủ).
   */
  const STATUS_WORDS = { pass: 'Đạt', warn: 'Cần cải thiện', fail: 'Chưa đạt', unknown: 'Không xác định' };
  const STATUS_SHORT = { pass: 'Đạt', warn: 'Cần cải thiện', fail: 'Chưa đạt', unknown: 'Không xác định' };
  const GLYPHS = { pass: '✓', warn: '!', fail: '✕', unknown: '?' };
  const METHOD_WORDS = { 'html': 'HTML tĩnh', 'network': 'Tài nguyên mạng', 'html+network': 'HTML + mạng' };
  const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3'];
  const PRIORITY_WORDS = { P0: 'Khẩn', P1: 'Cao', P2: 'Trung bình', P3: 'Khuyến nghị' };

  /* Bản đồ ưu tiên trung tâm — bảng CHỐT v2.0 (mục 3.2 hợp đồng). Đổi mức P của
   * một tiêu chí là sửa đúng một ô này, không phải tìm trong 26 hàm check. */
  const PRIORITY_MAP = {
    title:             { fail: 'P1', warn: 'P2' },
    meta_description:  { fail: 'P1', warn: 'P2' },
    open_graph:        { fail: 'P2', warn: 'P3' },
    canonical:         { fail: 'P2', warn: 'P3' },
    robots_meta:       { fail: 'P0', warn: 'P3' },
    robots_txt:        { fail: 'P2', warn: 'P3' },
    sitemap:           { fail: 'P2', warn: 'P3' },
    structured_data:   { fail: 'P2', warn: 'P3' },
    twitter_card:      { fail: 'P3', warn: 'P3' },
    breadcrumb:        { fail: 'P3', warn: 'P3' },
    sitemap_lastmod:   { fail: 'P3', warn: 'P3' },
    meta_keywords:     { fail: 'P3', warn: 'P3' },

    https:             { fail: 'P0', warn: 'P1' },
    lang:              { fail: 'P2', warn: 'P3' },
    charset:           { fail: 'P1', warn: 'P2' },
    h1:                { fail: 'P1', warn: 'P2' },
    heading_system:    { fail: 'P2', warn: 'P3' },
    links:             { fail: 'P2', warn: 'P3' },
    analytics:         { fail: 'P2', warn: 'P3' },
    duplicate_ids:     { fail: 'P2', warn: 'P3' },
    mixed_content:     { fail: 'P0', warn: 'P2' },   // fail = script/CSS http bị chặn → P0; ảnh chỉ warn
    http_links:        { fail: 'P2', warn: 'P2' },
    meta_refresh:      { fail: 'P1', warn: 'P3' },
    form_https_action: { fail: 'P1', warn: 'P3' },
    inline_styles:     { fail: 'P3', warn: 'P3' },

    viewport:          { fail: 'P0', warn: 'P1' },
    img_alt:           { fail: 'P2', warn: 'P3' },
    img_wh:            { fail: 'P3', warn: 'P3' },
    favicon:           { fail: 'P3', warn: 'P3' },
    theme_color:       { fail: 'P3', warn: 'P3' },
    lazy_load:         { fail: 'P3', warn: 'P3' },
    manifest:          { fail: 'P3', warn: 'P3' },
    apple_icon:        { fail: 'P3', warn: 'P3' },

    resources:         { fail: 'P3', warn: 'P3' },
    page_weight:       { fail: 'P2', warn: 'P3' },
    render_blocking:   { fail: 'P2', warn: 'P3' },
    image_format:      { fail: 'P3', warn: 'P3' },

    cta:               { fail: 'P1', warn: 'P2' },
    contact_info:      { fail: 'P1', warn: 'P2' },
    contact_form:      { fail: 'P1', warn: 'P2' },
    social_links:      { fail: 'P3', warn: 'P3' },   // chứng minh "Chưa đạt ≠ P0"
    policy_links:      { fail: 'P2', warn: 'P3' },
    product_service:   { fail: 'P1', warn: 'P2' },
    site_search:       { fail: 'P3', warn: 'P3' },
    map_embed:         { fail: 'P3', warn: 'P3' },

    trust_signals:     { fail: 'P2', warn: 'P3' },
    business_identity: { fail: 'P2', warn: 'P3' },
    support_info:      { fail: 'P2', warn: 'P3' },
    working_hours:     { fail: 'P3', warn: 'P3' },

    semantic_html:     { fail: 'P2', warn: 'P3' },
    form_labels:       { fail: 'P2', warn: 'P3' },
    accessible_names:  { fail: 'P2', warn: 'P3' },
    blank_links:       { fail: 'P2', warn: 'P3' },
    skip_link:         { fail: 'P2', warn: 'P3' },
    iframe_title:      { fail: 'P2', warn: 'P3' },
    table_headers:     { fail: 'P2', warn: 'P3' },
    table_caption:     { fail: 'P3', warn: 'P3' },
    input_autocomplete:{ fail: 'P3', warn: 'P3' },
    form_fieldset:     { fail: 'P3', warn: 'P3' },
    media_autoplay:    { fail: 'P2', warn: 'P3' },
  };

  const def = (id) => DEFS.find((d) => d.id === id);
  const ellip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const kb = (bytes) => Math.round(bytes / 1024).toLocaleString('vi-VN');

  // Ghép 4 đầu vào thành object check v2.0 — pr là override "đi theo nhánh"
  // (một tiêu chí có thể khác mức P tùy tình huống; hiện chưa dùng, giữ chỗ cho nhóm sửa).
  function out(id, level, detail, suggestion, pr) {
    const d = def(id);
    const map = PRIORITY_MAP[id] || {};
    const priority = pr
      || (level === 'fail' ? map.fail : level === 'warn' ? map.warn : null)
      || null;
    return {
      id,
      label: d.label,
      group: d.group,
      method: d.method,
      status: level,
      priority,
      detail,
      impact: d.impact,
      suggestion,
    };
  }

  /* ── Helper dùng chung cho các check ───────────────────────────────────── */

  function bodyText(doc) {
    return ((doc.body && doc.body.textContent) || doc.documentElement.textContent || '');
  }

  // linkedom không có closest — đi tay theo parentElement (đúng ghi chú v1.3).
  function inHead(el) {
    let p = el.parentElement;
    while (p) {
      if ((p.tagName || '').toLowerCase() === 'head') return true;
      p = p.parentElement;
    }
    return false;
  }

  // Đọc các khối JSON-LD: trả { ok: [mảng object đã parse], broken: n khối sai cú pháp }.
  function jsonLd(doc) {
    const ok = [];
    let broken = 0;
    for (const b of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try { ok.push(JSON.parse(b.textContent || '{}')); } catch { broken++; }
    }
    return { ok, broken };
  }

  // Trích hết @type từ dữ liệu JSON-LD (chấp nhận mảng lẫn @graph lồng nhau).
  function ldTypes(data, acc) {
    acc = acc || [];
    if (Array.isArray(data)) {
      for (const x of data) ldTypes(x, acc);
      return acc;
    }
    if (!data || typeof data !== 'object') return acc;
    const t = data['@type'];
    if (t) {
      const arr = Array.isArray(t) ? t : [t];
      for (const x of arr) acc.push(String(x));
    }
    if (data['@graph']) ldTypes(data['@graph'], acc);
    return acc;
  }

  /* ── Kiểm tra nhóm SEO & hiển thị (34 mục cũ — logic giữ nguyên v2.0) ──── */

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

  // Mã ngôn ngữ chuẩn (ISO 639-1) — chỉ cảnh báo "vn"/"vietnamese" kiểu khai báo sai,
  // không coi là lỗi trang dùng ngôn ngữ hợp lệ khác.
  const LANG_CODES = new Set(('aa ab ae af ak am ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ku kv kw ky la lb lg li ln lo lt lu lv mg mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ug uk ur uz ve vi vo wa wo xh yi yo za zh zu').split(' '));

  function checkLang(doc) {
    const l = (doc.documentElement.getAttribute('lang') || '').trim();
    if (!l) {
      return out('lang', 'fail',
        'Thẻ <html> không khai báo ngôn ngữ — phần mềm đọc màn hình và công cụ dịch dễ xử lý sai tiếng Việt.',
        'Thêm lang="vi" vào thẻ <html> phía đầu file.');
    }
    const head = l.split('-')[0].toLowerCase();
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
    const ld = jsonLd(doc);
    if (ld.ok.length === 0 && ld.broken === 0) {
      return out('structured_data', 'warn',
        'Chưa có dữ liệu có cấu trúc (JSON-LD) — Google thiếu thông tin về cửa hàng: địa chỉ, giờ mở cửa, hotline.',
        'Thêm khối JSON-LD kiểu LocalBusiness khai báo tên, địa chỉ, giờ mở cửa, số điện thoại, đường dẫn mạng xã hội.');
    }
    if (ld.broken > 0) {
      // v2.0: nêu đích danh số khối sai cú pháp (trung thực hơn "có nhưng sai").
      return out('structured_data', 'warn',
        `Có ${ld.ok.length} khối JSON-LD đọc được nhưng ${ld.broken} khối sai cú pháp — công cụ tìm kiếm bỏ qua phần sai đó.`,
        'Sửa lỗi cú pháp JSON: dán nội dung từng khối vào validator.schema.org để soi từng dòng (thiếu dấu phẩy/ngoặc là lỗi hay gặp nhất).');
    }
    return out('structured_data', 'pass',
      `Có dữ liệu có cấu trúc (JSON-LD) hợp lệ: ${ld.ok.length} khối (${ldTypes(ld.ok[0]).slice(0, 3).join(', ')}).`,
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
          'Kiểm tra chắc rằng báo cáo cho thấy khách đến từ kênh nào và họ xem trang nào rồi mới thoát.');
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

  /* ── Kiểm tra marketing & chuyển đổi (mục cũ, logic giữ nguyên v2.0) ───── */

  // CTA nhận bằng tín hiệu cấu trúc (class/id/href) — không chấm theo chữ hiển thị
  // để tránh gán nhầm cho mọi nút thông thường.
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
    const text = bodyText(doc);
    const flat = text.replace(/[\s.\-–()]/g, '');
    if (/(^|\D)0(3|5|7|8|9)\d{8}(\D|$)/.test(flat) || /\+?84(3|5|7|8|9)\d{8}/.test(flat)) {
      chan.add('số điện thoại trên trang');
    }
    const list = [...chan];
    if (list.length >= 2) {
      return out('contact_info', 'pass',
        `Có nhiều kênh liên hệ: ${list.join(', ')} — khách chọn cách tiện nhất (bấm gọi trên di động, gửi email, nhắn tin).`,
        'Đặt khối liên hệ cố định ở footer + trên phần nhìn đầu tiên; số còn dùng thì đừng để chết máy.');
    }
    if (list.length === 1) {
      return out('contact_info', 'warn',
        `Chỉ phát hiện 1 kênh liên hệ (${list[0]}) — thiếu phương án dự phòng nếu khách ngại kênh đó.`,
        'Bổ sung tel: cho điện thoại và email thực; với bán hàng thì thêm Zalo/hotline hỗ trợ.');
    }
    return out('contact_info', 'fail',
      'Không thấy thông tin liên hệ nào trên trang — khách muốn hỏi giá/đặt hàng không biết liên lạc với ai.',
      'Để rõ: số điện thoại (kèm link tel:), email, địa chỉ cửa hàng — tối thiểu 2 kênh ở footer.');
  }

  function checkContactForm(doc) {
    const forms = Array.from(doc.querySelectorAll('form'));
    if (!forms.length) {
      return out('contact_form', 'fail',
        'Không tìm thấy biểu mẫu (đặt bàn/hỏi giá/nhận tư vấn) trong HTML trang — khách phải gọi hoặc nhắn riêng, dễ bỏ dở.',
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
          `Có biểu mẫu tương tác (${fillable.length} trường điền + nút gửi) — khách để lại thông tin ngay trên trang.`,
          'Kiểm tra form bằng cách tự gửi thử: tin nhắn có tới hòm thư/hệ thống không; thêm thông báo gửi thành công rõ ràng.');
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
        'Đặt icon mạng xã hội ở footer; giữ nội dung các kênh đó còn hoạt động — fanpage "chết" làm mất niềm tin nhanh.');
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

  /* ── Kiểm tra chuẩn kỹ thuật (mục cũ, logic giữ nguyên v2.0) ───────────── */

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

  /* ── Kiểm tra trải nghiệm & truy cập (mục cũ, logic giữ nguyên v2.0) ───── */

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
        'Nhãn nên nằm ngoài ô (đừng dùng placeholder thay nhãn): khách điền xong vẫn còn nhìn thấy nhãn để đối chiếu.');
    }
    const ratio = missing / fields.length;
    if (ratio > 0.5) {
      return out('form_labels', 'fail',
        `${missing}/${fields.length} trường nhập không có nhãn (label/aria-label) — khách không biết ô nào điền cái gì, phần mềm đọc màn hình đọc rời rạc.`,
        'Thêm <label for="id"> tương ứng từng trường; trường đặc biệt dùng aria-label; không nhờ placeholder thay nhãn — chữ này mất ngay khi gõ.');
    }
    return out('form_labels', 'warn',
      `${missing}/${fields.length} trường nhập chưa có nhãn — một phần khách (nhất là dùng phần mềm đọc màn hình) sẽ bí khi điền.`,
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
        'Nút mới (chủ yếu là icon) nhớ aria-label: không có tên sẽ gây rối cho khách dùng trợ năng.');
    }
    const level = missing > 2 ? 'fail' : 'warn';
    return out('accessible_names', level,
      `${missing}/${controls.length} nút bấm & liên kết không có tên truy cập (không chữ, không aria-label/title/ảnh alt)` +
      (missing > 2 ? ' — số lượng lớn, khách dùng phần mềm đọc màn hình không thể dùng trang.' :
        ' — số ít nhưng vẫn khiến một số nút "vô danh" với trợ năng.'),
      'Với nút icon (chỉ hình ảnh), thêm aria-label ngắn gọn ("Tìm kiếm", "Giỏ hàng"); kiểm tra lại bằng bàn phím thấy tên từng nút.');
  }

  function checkBlankLinks(doc) {
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
        `Cả ${blanks.length} liên kết mở tab mới đều có rel bảo mật (noopener/noreferrer) — trang của bạn không bị can thiệp vì trang bên kia.`,
        'Giữ nguyên: rel="noopener noreferrer" là chuẩn với mọi target="_blank".');
    }
    const level = bad.length > 2 ? 'fail' : 'warn';
    return out('blank_links', level,
      `${bad.length}/${blanks.length} liên kết mở tab mới thiếu rel="noopener noreferrer" — tab mới của trang lạ có thể can thiệp vào tab của bạn (kỹ thuật tabnabbing, đánh cắp phiên).`,
      'Thêm rel="noopener noreferrer" vào từng <a target="_blank"> — sửa 1 dòng mỗi link, không rủi ro gì.');
  }

  /* ── Kiểm tra mới v2.0 (26 mục) ────────────────────────────────────────────
   * Nguyên tắc: chỉ kết luận trên cấu trúc/đặc tính kiểm chứng được từ HTML tĩnh;
   * không chắc chắn → 'unknown' (không bao giờ biến không biết thành chưa đạt).
   */

  function checkTwitterCard(doc) {
    const card = doc.querySelector('meta[name="twitter:card" i]');
    let extra = 0;
    for (const n of ['twitter:title', 'twitter:description', 'twitter:image', 'twitter:site']) {
      if (doc.querySelector(`meta[name="${n}" i]`)) extra++;
    }
    if (card) {
      return out('twitter_card', 'pass',
        `Đã khai báo Twitter Card (twitter:card="${card.getAttribute('content')}"${extra ? `, kèm ${extra} thẻ twitter:* để điền nội dung` : ''}) — chia sẻ link lên X hiện đầy đủ.`,
        'Chuẩn hóa đủ twitter:title / twitter:image; ảnh 800×418 px hiển thị đẹp nhất trên X.');
    }
    const og = doc.querySelectorAll('meta[property^="og:" i]').length;
    if (og) {
      return out('twitter_card', 'warn',
        'Chưa có thẻ Twitter Card riêng — X/Twitter sẽ mượn nội dung Open Graph; nếu trang thiếu og:* thì phần xem trước trên X trống trơn.',
        'Thêm <meta name="twitter:card" content="summary_large_image"> + twitter:title + twitter:image vào <head> (không đụng các thẻ og:* hiện có).');
    }
    return out('twitter_card', 'fail',
      'Không có thẻ Twitter Card, Open Graph cũng thiếu — dán link lên X chỉ hiện một dòng chữ không có ảnh.',
      'Thêm bộ thẻ chia sẻ tối thiểu: og:title/og:image và twitter:card/twitter:image (nội dung trùng nhau được).');
  }

  function checkBreadcrumb(doc) {
    const ld = jsonLd(doc);
    for (const data of ld.ok) {
      if (ldTypes(data).some((t) => /breadcrumb/i.test(t))) {
        return out('breadcrumb', 'pass',
          'Có dải đường dẫn chuẩn (JSON-LD BreadcrumbList) — Google hiểu được vị trí trang trong hệ thống menu.',
          'Giữ nguyên; thêm breadcrumb cho các trang sản phẩm mới theo cùng khuôn.');
      }
    }
    const el = doc.querySelector('[class*="breadcrumb" i], [id*="breadcrumb" i], nav[aria-label*="breadcrumb" i]');
    if (el) {
      return out('breadcrumb', 'pass',
        'Trang có thanh breadcrumb trong HTML (class/tên nhận diện "breadcrumb") — khách biết đường về mục trên.',
        'Bổ sung JSON-LD BreadcrumbList để Google cũng hiện được dải đường dẫn trong kết quả tìm kiếm.');
    }
    if (doc.querySelector('nav') || doc.querySelectorAll('a[href]').length >= 10) {
      return out('breadcrumb', 'warn',
        'Chưa thấy breadcrumb (dải "Trang chủ → Mục → Trang hiện tại") — trang sâu dễ thành ngõ cụt với cả khách lẫn máy tìm kiếm.',
        'Thêm dải breadcrumb ngay đầu nội dung (ol.breadcrumb) và khai báo JSON-LD BreadcrumbList tương ứng.');
    }
    return out('breadcrumb', 'unknown',
      'Trang quá ngắn/không đủ cấu trúc menu để kết luận breadcrumb cần thiết hay đã đủ.',
      'Kiểm tra tay: nếu site nhiều tầng trang thì nên có breadcrumb cho các trang nằm dưới Trang chủ.');
  }

  function checkSitemapLastmod(sm) {
    if (!sm) {
      return out('sitemap_lastmod', 'unknown',
        'Không kiểm tra được sitemap.xml (lỗi mạng hoặc site chặn bot) nên không đối chiếu được lastmod.',
        'Kiểm tra tay: mở ten-mien.vn/sitemap.xml — mỗi <url> nên có một <lastmod> ngày cập nhật mới nhất.');
    }
    const text = String(sm.text || '');
    const code = sm.statusCode || 0;
    if (code >= 400) {
      return out('sitemap_lastmod', 'unknown',
        `Sitemap.xml trả về HTTP ${code} — không có nội dung để đối chiếu lastmod (mục "Sơ đồ trang" đã chấm riêng).`,
        'Xử lý trước mục sitemap ở trên; khi sitemap sẵn sàng, bổ sung <lastmod> cho từng URL.');
    }
    if (!/<urlset/i.test(text)) {
      return out('sitemap_lastmod', 'unknown',
        'Sitemap là dạng nhóm (sitemapindex) trỏ tới các sơ đồ con — lastmod của từng trang nằm ở file con, không đối chiếu được từ đây.',
        'Kiểm tra tay một file sitemap con: mỗi <url> nên kèm <lastmod>.');
    }
    const total = (text.match(/<url>/gi) || []).length;
    if (!total) {
      return out('sitemap_lastmod', 'unknown',
        'Sitemap không khai báo URL nào nên không đối chiếu được lastmod.',
        'Xuất lại sitemap đúng nội dung (đủ <url>) rồi bổ sung <lastmod>.');
    }
    const withLast = (text.match(/<lastmod/gi) || []).length;
    if (withLast === 0) {
      return out('sitemap_lastmod', 'warn',
        `${total} URL trong sitemap đều thiếu <lastmod> — Google không biết trang nào vừa thay đổi để ưu tiên quét lại.`,
        'Bật lastmod khi xuất sitemap (plugin SEO có sẵn tuỳ chọn); ngày cập nhật phải trùng ngày nội dung thay đổi thật.');
    }
    if (withLast < total) {
      return out('sitemap_lastmod', 'warn',
        `Chỉ ${withLast}/${total} URL trong sitemap có <lastmod> — phần còn lại mất ưu tiên quét lại khi nội dung thay đổi.`,
        'Bổ sung <lastmod> cho các URL còn thiếu hoặc cấu hình plugin xuất đủ cho mọi URL.');
    }
    return out('sitemap_lastmod', 'pass',
      `Cả ${total} URL trong sitemap đều khai báo ngày cập nhật (<lastmod>) — Google ưu tiên quét đúng trang mới thay đổi.`,
      'Đảm bảo lastmod luôn phản ánh ngày thay đổi thật; đừng điền ngày hiển thị chung một khối.');
  }

  function checkMetaKeywords(doc) {
    const m = doc.querySelector('meta[name="keywords" i]');
    if (m) {
      return out('meta_keywords', 'warn',
        `Trang vẫn giữ thẻ meta keywords ("${ellip((m.getAttribute('content') || '').trim(), 40)}") — Google đã bỏ qua thẻ này từ 2009; nó chỉ cho thấy website dùng tay/khung cũ.`,
        'Xoá thẻ meta keywords đi (thời gian nên dồn vào title + meta description); không mất đi chút sức nặng nào.');
    }
    return out('meta_keywords', 'pass',
      'Không dùng meta keywords — chuẩn hiện đại, không có dấu vết kỹ thuật lỗi thời.',
      'Giữ nguyên; tối ưu từ khoá dồn vào title, meta description và nội dung thật trên trang.');
  }

  function checkHttpLinks(meta, doc) {
    const base = (meta.finalUrl || meta.inputUrl || '').trim();
    if (!/^https:\/\//i.test(base)) {
      return out('http_links', 'unknown',
        'Trang đang chạy HTTP — vấn đề đáng xử lý trước là bật HTTPS (mục "Kết nối bảo mật"); chấm riêng từng link http:// sẽ không phản ánh đúng thứ tự việc.',
        'Bật HTTPS xong rồi xem lại mục này; lúc đó mọi link http:// cần đổi sang https://.');
    }
    const hits = [];
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = (a.getAttribute('href') || '').trim();
      if (/^http:\/\//i.test(href)) hits.push(href);
    }
    if (hits.length) {
      return out('http_links', 'warn',
        `${hits.length} liên kết trỏ tới địa chỉ http:// (ví dụ: ${ellip(hits[0], 50)}) — khách bấm qua là trình duyệt cảnh báo "Không an toàn".`,
        'Đổi các link này sang https:// (trang đích nếu hỗ trợ) hoặc bỏ link nếu nguồn đã bỏ bảo trì.');
    }
    return out('http_links', 'pass',
      'Không có liên kết nào trỏ tới http:// — khách bấm link nơi nào cũng ở kết nối mã hoá.',
      'Giữ nguyên; link ngoài mới thêm nhớ kiểm tra trang đích hỗ trợ https://.');
  }

  function checkMetaRefresh(doc) {
    const m = doc.querySelector('meta[http-equiv="refresh" i]');
    if (!m) {
      return out('meta_refresh', 'pass',
        'Trang không tự chuyển hướng bằng meta refresh — trang đứng yên đúng như khách mong đợi.',
        'Giữ nguyên; nếu cần chuyển hướng dùng HTTP 301/302 (server) thay vì meta refresh.');
    }
    const c = (m.getAttribute('content') || '').trim();
    const secs = (c.match(/^\s*(\d+)/) || [])[1];
    return out('meta_refresh', 'fail',
      `Trang đang tự chuyển hướng bằng meta refresh (sau ${secs || '?'} giây${/url=/i.test(c) ? ' tới một địa chỉ khác' : ''}) — chậm, giật và Google không coi đây là đường dẫn chuẩn.`,
      'Chuyển thành HTTP redirect (301/302) ở server/hosting, hoặc bỏ chuyển hướng nếu không cần thiết.');
  }

  function checkFormHttpsAction(doc) {
    const forms = Array.from(doc.querySelectorAll('form'));
    const bad = forms.filter((f) => /^http:\/\//i.test((f.getAttribute('action') || '').trim()));
    if (bad.length) {
      return out('form_https_action', 'fail',
        `${bad.length}/${forms.length} biểu mẫu gửi dữ liệu qua http:// (action không mã hoá) — tên/SĐT khách gõ đi dạng "chữ trần" trên đường truyền.`,
        'Sửa action sang https:// hoặc bỏ action (gửi về chính trang) và bật HTTPS cho site.');
    }
    if (forms.length) {
      return out('form_https_action', 'pass',
        `${forms.length} biểu mẫu không gửi qua http:// (action về https:// hoặc địa chỉ tương đối) — dữ liệu khách đi theo HTTPS của trang.`,
        'Giữ nguyên; form mới thêm nhớ kiểm tra action không trỏ http://.');
    }
    return out('form_https_action', 'pass',
      'Trang không có biểu mẫu nào trong HTML — không có rủi ro gửi dữ liệu qua http://.',
      'Khi thêm form, action dùng https:// hoặc bỏ trống để gửi về chính trang.');
  }

  function checkInlineStyles(doc) {
    const attrStyles = doc.querySelectorAll('[style]').length;
    const tagStyles = doc.querySelectorAll('style').length;
    const n = attrStyles + tagStyles;
    if (n > 12) {
      return out('inline_styles', 'warn',
        `${n} chỗ dùng style trực tiếp trong HTML (${attrStyles} thuộc tính style="" + ${tagStyles} khối <style>) — trang nặng thêm ngay đầu và sửa giao diện chậm, dễ lệch giữa các trang.`,
        'Chuyển style lặp lại vào file CSS dùng chung; chỉ giữ style="" cho chừng mực chỉnh nhỏ từng trang.');
    }
    return out('inline_styles', 'pass',
      `Chỉ ${n} chỗ dùng style trực tiếp — phần lớn hình thức gom trong file CSS, dễ cập nhật đồng bộ.`,
      'Giữ nguyên; khối style mới nên dồn vào file CSS chính (trừ CSS ch.getBlock đầu trang cần ưu tiên tải).');
  }

  function checkRenderBlocking(doc) {
    let n = 0;
    for (const s of doc.querySelectorAll('script[src]')) {
      if (!inHead(s)) continue;
      const type = (s.getAttribute('type') || '').toLowerCase();
      if (type === 'module') continue;
      if (s.getAttribute('defer') != null || s.getAttribute('async') != null) continue;
      n++;
    }
    if (n) {
      return out('render_blocking', 'warn',
        `${n} file JS nạp ngay đầu trang không có defer/async — trình duyệt dừng vẽ trang để chờ tải xong mới hiện chữ.`,
        'Thêm defer vào các script này (nếu không phụ thuộc thứ tự); script phụ thuộc gọi qua GTM thì để async.');
    }
    return out('render_blocking', 'pass',
      'Không có script nào ở đầu trang chặn hiển thị — chữ hiện được ngay khi HTML về tới máy khách.',
      'Giữ nguyên; script mới thêm vào head thường gắn defer là an toàn.');
  }

  function checkImageFormat(doc, html) {
    const imgs = Array.from(doc.querySelectorAll('img'));
    if (imgs.length === 0) {
      return out('image_format', 'pass',
        'Trang không dùng ảnh nào trong HTML tĩnh.',
        'Khi chèn ảnh sản phẩm, ưu tiên WebP/AVIF (rất nhiều công cụ chuyển miễn phí) để trang tải nhanh.');
    }
    let modern = 0;
    let legacy = 0;
    for (const im of imgs) {
      // src ghép với srcset bằng space — nên đuôi file có thể đứng trước dấu cách (\s).
      const src = (im.getAttribute('src') || '') + ' ' + (im.getAttribute('srcset') || '');
      if (/\.(webp|avif)(\?|#|\s|$)/i.test(src)) modern++;
      else if (/\.(jpe?g|png|gif)(\?|#|\s|$)/i.test(src)) legacy++;
    }
    const classified = modern + legacy;
    if (classified === 0) {
      return out('image_format', 'unknown',
        'Không đọc được dạng nén của ảnh từ HTML tĩnh (src không có đuôi file — ảnh nạp qua script/CDN đổi tên) — không kết luận được.',
        'Kiểm tra tay: mở tab Network trong DevTools, xem cột Type của các ảnh là webp/avif hay jpg/png.');
    }
    if (legacy && modern === 0) {
      return out('image_format', 'warn',
        `Cả ${legacy} ảnh đều dạng cũ (JPG/PNG/GIF) — dung lượng có thể gấp 2–3 lần WebP/AVIF cùng chất lượng, chậm trên 4G.`,
        'Chuyển ảnh sang WebP (công cụ chuyển miễn phí) rồi đổi src; giữ đường dẫn cũ bằng redirect nếu cần.');
    }
    if (modern / classified < 0.5) {
      return out('image_format', 'warn',
        `Chỉ ${modern}/${classified} ảnh theo dạng nhẹ (WebP/AVIF) — phần còn lại đang kéo chậm trang không cần thiết.`,
        'Chuyển nốt các ảnh còn lại sang WebP/AVIF; sau khi đổi xong, rà lại để toàn bộ trang dùng ảnh nhẹ.');
    }
    return out('image_format', 'pass',
      `${modern}/${classified} ảnh dùng dạng nén nhẹ (WebP/AVIF) — ảnh tải nhanh, tiết kiệm dữ liệu khách.`,
      'Giữ nguyên; ảnh mới luôn dùng cùng dạng nén đó.');
  }

  function checkManifest(doc) {
    const m = doc.querySelector('link[rel~="manifest" i]');
    if (m) {
      return out('manifest', 'pass',
        `Đã khai báo manifest (${m.getAttribute('href')}) — khi khách lưu trang vào màn hình chính, trang mở như một ứng dụng có tên/icon riêng.`,
        'Kiểm tra manifest qua Lighthouse mỗi lần cập nhật icon hoặc tên.');
    }
    return out('manifest', 'warn',
      'Chưa có file manifest — khi khách lưu trang vào màn hình chính, trang mở trong một tab thường, không có tên/icon riêng.',
      'Tạo /manifest.json (tên, icon 192/512 px, màu chủ đạo) và gắn <link rel="manifest" href="/manifest.json"> vào <head>.');
  }

  function checkAppleIcon(doc) {
    const l = doc.querySelector('link[rel~="apple-touch-icon" i]');
    if (l) {
      return out('apple_icon', 'pass',
        `Đã khai báo apple-touch-icon (${l.getAttribute('href')}) — khách iPhone lưu trang vào màn hình chính thấy logo riêng.`,
        'Dùng ảnh 180×180 px chuẩn PNG; đổi logo thì nhớ cập nhật lại.');
    }
    return out('apple_icon', 'warn',
      'Thiếu apple-touch-icon — khách iPhone lưu trang về màn hình chính sẽ thấy một ảnh chụp màn hình mờ mờ thay vì logo.',
      'Thêm <link rel="apple-touch-icon" href="/icon-180.png"> (PNG 180×180 px) vào <head>.');
  }

  /* ── Check mới: nhóm Tin cậy & minh bạch ───────────────────────────────── */

  function checkProductService(doc) {
    const evid = [];
    const ld = jsonLd(doc);
    for (const data of ld.ok) {
      const t = ldTypes(data).find((x) => /product|service|offer|catalog/i.test(x));
      if (t) evid.push(`JSON-LD kiểu ${t}`);
    }
    const ogType = doc.querySelector('meta[property="og:type" i]');
    if (ogType && /product|service/i.test(ogType.getAttribute('content') || '')) {
      evid.push('og:type = sản phẩm/dịch vụ');
    }
    let menuLinks = 0;
    for (const a of doc.querySelectorAll('a[href]')) {
      if (/san-?pham|dich-?vu|product|service|menu|bang-?gia|catalog|cua-?hang/i.test(a.getAttribute('href') || '')) menuLinks++;
    }
    if (menuLinks >= 2) evid.push(`${menuLinks} đường dẫn danh mục (menu/bảng giá/sản phẩm/dịch vụ)`);
    if (evid.length) {
      return out('product_service', 'pass',
        `Trang giới thiệu sản phẩm/dịch vụ bằng cấu trúc kiểm chứng được: ${evid.slice(0, 2).join('; ')}.`,
        'Từng mặt hàng nên có trang/mục riêng: tên, ảnh thật, mô tả, giá (nếu được) — dẫn link tới từ trang chủ.');
    }
    if (bodyText(doc).trim().length < 600) {
      return out('product_service', 'unknown',
        'Nội dung HTML tĩnh quá ngắn (trang dựng bằng JavaScript hoặc rất ít chữ) — không kết luận được trang có giới thiệu sản phẩm/dịch vụ không.',
        'Kiểm tra tay: chắc rằng mọi dịch vụ/mặt hàng đều có trang riêng nêu tên, ảnh, mô tả và giá.');
    }
    return out('product_service', 'fail',
      'Không thấy cấu trúc nào nói về sản phẩm/dịch vụ (không có JSON-LD, không có đường dẫn danh mục) — khách vào trang không biết doanh nghiệp bán gì cụ thể.',
      'Tạo trang/mục riêng cho từng sản phẩm hoặc dịch vụ (tên, ảnh thật, mô tả, giá nếu được), rồi dẫn link tới từ menu trang chủ.');
  }

  const REVIEW_CLASS_RE = /review|testimonial|danh-?gia|nhan-?xet/i;

  function checkTrustSignals(doc) {
    const kinds = new Set();
    const ld = jsonLd(doc);
    for (const data of ld.ok) {
      for (const t of ldTypes(data)) {
        if (/review|rating/i.test(t)) kinds.add(`JSON-LD kiểu ${t}`);
      }
    }
    let blocks = 0;
    const quotes = doc.querySelectorAll('blockquote').length;
    for (const el of doc.querySelectorAll('[class], [id]')) {
      const sig = [el.getAttribute('class'), el.getAttribute('id')].filter(Boolean).join(' ');
      if (sig && REVIEW_CLASS_RE.test(sig) && ((el.textContent || '').trim().length >= 40)) blocks++;
    }
    if (kinds.size) {
      return out('trust_signals', 'pass',
        `Có dữ liệu đánh giá khách hàng: ${[...kinds].slice(0, 2).join(', ')} — Google có thể hiện số sao đánh giá ngay trong kết quả tìm kiếm.`,
        'Khai đủ aggregateRating (tổng số + trung bình) và cập nhật sau mỗi chiến dịch xin đánh giá.');
    }
    if (quotes >= 2 || blocks >= 1) {
      return out('trust_signals', 'pass',
        `Trang có khối nhận xét/đánh giá có cấu trúc (${quotes >= 2 ? quotes + ' trích dẫn khách (blockquote)' : 'khối đánh giá nhận diện được'}) — khách mua vừa phải có "người dẫn chiếu\" cho quyết định của họ.`,
        'Gắn thêm JSON-LD Review/aggregateRating để Google hiện được tổng sao; ghi rõ nguồn của từng đánh giá (kèm mốc thời gian).');
    }
    if (bodyText(doc).trim().length < 600) {
      return out('trust_signals', 'unknown',
        'Nội dung HTML tĩnh quá ngắn — không kết luận được trang có, hay không có khối đánh giá khách hàng.',
        'Kiểm tra tay: nếu có đánh giá dạng chữ trôi, hãy gói vào khối class "testimonial" hoặc JSON-LD để máy đọc tin được.');
    }
    return out('trust_signals', 'fail',
      'Trong phạm vi HTML tĩnh, không thấy khối đánh giá/nhận xét khách hàng nào có cấu trúc (JSON-LD Review, blockquote, khối class "review/testimonial") — trang trông như chưa từng có người mua.',
      'Gom 3–5 đánh giá thật đặt ngay trang chính (khối class "danh-gia") hoặc dùng widget Google Reviews; thêm JSON-LD kèm theo.');
  }

  const IDENTITY_TEXT_RE = /mã số thuế|mst[:\s]|số đăng ký|đkkd|gpkd|trụ sở|địa chỉ[::]/i;

  function checkBusinessIdentity(doc) {
    const ld = jsonLd(doc);
    for (const data of ld.ok) {
      const t = ldTypes(data).find((x) => /organization|localbusiness|company|business|store|restaurant|shop/i.test(x));
      if (t) {
        const hasAddr = /address/i.test(JSON.stringify(data).slice(0, 4000));
        return out('business_identity', 'pass',
          `Doanh nghiệp được khai báo rõ (JSON-LD ${t}${hasAddr ? ', kèm địa chỉ' : ''}) — máy tìm kiếm và khách đều thấy đây là thương hiệu thật.`,
          'Bộ định danh nên đủ: tên doanh nghiệp, địa chỉ cụ thể, số điện thoại, logo; thông tin nhất quán với Google Business Profile (cùng một địa chỉ).');
      }
    }
    if (doc.querySelector('address')) {
      return out('business_identity', 'pass',
        'Trang có khối <address> — khách thấy rõ cửa hàng thật với địa chỉ, không phải một trang giới thiệu suông.',
        'Bổ sung JSON-LD LocalBusiness để Google cũng nhận diện đủ (hiện khách viết tay thôi).');
    }
    const flat = bodyText(doc);
    if (IDENTITY_TEXT_RE.test(flat)) {
      return out('business_identity', 'warn',
        'Trang có nhắc thông tin nhận diện (địa chỉ / mã số thuế / trụ sở) nhưng chưa gói bằng cấu trúc — máy tìm kiếm khó nhận ra đây là thông tin chính thức của doanh nghiệp.',
        'Đặt khối nhận diện gọn gàng ở footer (thẻ <address> tên + địa chỉ) và khai JSON-LD LocalBusiness trùng khớp.');
    }
    return out('business_identity', 'unknown',
      'Không nhận diện được thông tin doanh nghiệp từ HTML tĩnh (thông tin dạng chữ tự do không đủ tin cậy) — kiểm tra tay footer coi đã đủ tên + địa chỉ/chứng nhận chưa.',
      'Cứ chuẩn bị khối footer gồm: tên đầy đủ, địa chỉ, số điện thoại, mã số thuế (nếu có) — đối chiếu với Google Business Profile.');
  }

  const SUPPORT_RE = /faq|hỏi-?đáp|hoi-?dap|hỗ-?trợ|ho-?tro|support|help|huong-?dan|chăm-?sóc|cham-?soc|cskh|tư-?vấn|tu-?van|câu-?hỏi|cau-?hoi|question|faq\b/i;

  function checkSupportInfo(doc) {
    const hits = [];
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = (a.getAttribute('href') || '').trim();
      const name = (a.textContent || '').trim();
      if (SUPPORT_RE.test(href) || SUPPORT_RE.test(name)) {
        const key = name || href;
        if (!hits.some((h) => h === key)) hits.push(key);
      }
    }
    if (hits.length) {
      return out('support_info', 'pass',
        `Trang có ${hits.length} đường dẫn hỗ trợ/FAQ (ví dụ: "${ellip(hits[0], 36)}") — khách tự giải đáp được câu đơn giản trước khi phải gọi.`,
        'Đặt mục FAQ vào footer cho dễ thấy; với dịch vụ phức tạp, thêm trang "Hướng dẫn" riêng.');
    }
    const anchors = doc.querySelectorAll('a[href]').length;
    if (anchors >= 8) {
      return out('support_info', 'fail',
        `Không thấy đường dẫn nào tới trang hỗ trợ/FAQ/hướng dẫn (trong ${anchors} liên kết trên trang) — khách thắc mắc nhỏ cũng phải nhắn tin/gọi, dễ bỏ đi giữa lúc chờ hồi âm.`,
        'Soạn 5–7 câu hỏi thực tế khách hay dùng (giá, ship, bảo hành, đặt hẹn) rồi để trang/mục FAQ link ở footer.');
    }
    return out('support_info', 'unknown',
      'Trang quá ít liên kết để kết luận thiếu hay đủ mục hỗ trợ (site tuy việc, chờ đầy đủ nội dung mới chấm được).',
      'Khi site hoàn thành: để sẵn link FAQ/hỗ trợ ở footer — khách mới dùng dịch vụ chủ yếu tìm mục đó trước.');
  }

  const HOURS_WORDS_RE = /giờ mở cửa|giờ làm việc|giờ hoạt động|giờ phục vụ|giờ bán hàng|open hours/i;
  const HOURS_RANGE_RE = /\b\d{1,2}[:h:.]\d{0,2}\s*(?:–|-|—|to|đến)\s*\d{1,2}[:h:.]\d{0,2}/i;

  function checkWorkingHours(doc) {
    const ld = jsonLd(doc);
    for (const data of ld.ok) {
      const deep = JSON.stringify(data);
      if (/openingHours|openingHoursSpecification/i.test(deep)) {
        return out('working_hours', 'pass',
          'Giờ mở cửa được khai báo cấu trúc (JSON-LD openingHours) — Google có thể hiện giờ ngay trên tab cửa hàng/kết quả.',
          'Giữ openingHours đồng bộ với giờ thật (nghỉ lễ thì cập nhật hoặc dùng openingHoursSpecification đặc biệt).');
      }
    }
    const footer = doc.querySelector('footer');
    const flat = footer ? (footer.textContent || '') : bodyText(doc);
    if (HOURS_WORDS_RE.test(flat) && HOURS_RANGE_RE.test(flat)) {
      const line = (flat.match(/[^\n\r]*giờ [^\n\r]*/i) || [''])[0].trim();
      return out('working_hours', 'pass',
        `Footer/nội dung nêu rõ giờ hoạt động ("${ellip(line || 'khung giờ', 60)}") — khách biết khi nào ghé được.`,
        'Ghi giờ mở cửa trên Google Business Profile cùng một khung giờ để không lệch nhau.');
    }
    if (HOURS_WORDS_RE.test(flat)) {
      return out('working_hours', 'warn',
        'Trang nhắc "giờ mở cửa" nhưng không thấy khung giờ cụ thể (ví dụ 07:30–21:00) — khách vẫn phải hỏi thêm một vòng.',
        'Sửa thành khung giờ rõ ràng từng ngày: "Mở cửa 07:30–21:30 (tất cả các ngày trong tuần)".');
    }
    if (footer) {
      return out('working_hours', 'warn',
        'Footer chưa nêu giờ mở cửa/làm việc — khách định ghé cửa hàng không biết khi nào đến được.',
        'Thêm một dòng giờ hoạt động vào footer, đặt cạnh địa chỉ + hotline.');
    }
    return out('working_hours', 'unknown',
      'Trang không có footer (hoặc trình bày đơn giản) — không kết luận được giờ hoạt động đã nêu ở chỗ thích hợp chưa.',
      'Đoạn giờ mở cửa nên nằm ở footer (thấy ở mọi trang) và khai thêm JSON-LD openingHours.');
  }

  /* ── Check mới: nhóm Trải nghiệm & truy cập ────────────────────────────── */

  const SKIP_HREF_RE = /^#(skip|main|content|noi-?dung|noi_dung|tru-?c-?tu|ve-dau|top)/i;
  const SKIP_TEXT_RE = /skip to|bỏ qua|tới nội dung|nhảy tới|về đầu trang|đến nội dung chính/i;

  function checkSkipLink(doc) {
    for (const a of doc.querySelectorAll('a[href^="#"]')) {
      const href = (a.getAttribute('href') || '').trim();
      const txt = (a.textContent || '').trim();
      if (SKIP_TEXT_RE.test(txt) ||
          (SKIP_HREF_RE.test(href) && doc.getElementById(decodeURIComponent(href.slice(1))))) {
        return out('skip_link', 'pass',
          `Có liên kết nhảy tới nội dung chính ("${ellip(txt || href, 40)}") — khách dùng bàn phím/phần mềm đọc màn hình không phải Tab qua từng mục menu.`,
          'Giữ nguyên; chắc rằng liên kết này là phần tử nhận focus đầu tiên (đặt ngay đầu mã HTML, trước menu).');
      }
    }
    if (doc.querySelectorAll('nav a, header a').length >= 5) {
      return out('skip_link', 'warn',
        'Menu/header có nhiều mục nhưng thiếu skip link — khách dùng bàn phím phải Tab qua từng mục menu mới tới nội dung chính.',
        'Thêm liên kết đầu tiên của trang: <a class="skip-link" href="#noi-dung">Tới nội dung chính</a> (đích cần có id="noi-dung").');
    }
    return out('skip_link', 'pass',
      'Trang ít mục menu — không bắt buộc skip link, khách dùng bàn phím cũng tới nội dung nhanh.',
      'Khi menu dài ra (thêm mục mới), nhớ bổ sung skip link cho khách dùng bàn phím.');
  }

  function checkIframeTitle(doc) {
    const iframes = Array.from(doc.querySelectorAll('iframe'));
    if (!iframes.length) {
      return out('iframe_title', 'pass',
        'Trang không nhúng khung iframe nào — không có gì để chấm.',
        'Khi nhúng bản đồ/video, nhớ thêm title="Bản đồ cửa hàng" cho khung iframe.');
    }
    const bad = iframes.filter((f) => {
      if ((f.getAttribute('title') || '').trim()) return false;
      if ((f.getAttribute('aria-label') || '').trim()) return false;
      const by = f.getAttribute('aria-labelledby');
      if (by && by.split(/\s+/).some((r) => doc.getElementById(r))) return false;
      return true;
    });
    if (!bad.length) {
      return out('iframe_title', 'pass',
        `${iframes.length} khung iframe đều có tiêu đề (title/aria-label) — phần mềm đọc màn hình nói rõ được khung này là gì.`,
        'Giữ nguyên; khung nhúng mới luôn gắn title ngắn gọn, đúng nội dung.');
    }
    const level = bad.length > 2 ? 'fail' : 'warn';
    return out('iframe_title', level,
      `${bad.length}/${iframes.length} khung iframe thiếu title/aria-label — phần mềm đọc màn hình chỉ đọc "khung", khách không biết bên trong là bản đồ hay video.`,
      'Thêm thuộc tính title hoặc aria-label cho từng iframe (ví dụ: title="Bản đồ chỉ đường tới cửa hàng").');
  }

  function dataTables(doc) {
    return Array.from(doc.querySelectorAll('table')).filter((t) => t.querySelectorAll('tr').length >= 2);
  }

  function checkTableHeaders(doc) {
    const tables = dataTables(doc);
    if (!tables.length) {
      return out('table_headers', 'pass',
        'Trang không dùng bảng dữ liệu nào (hoặc bảng đơn giản hơn 2 hàng) — không có gì để chấm.',
        'Khi dựng bảng giá/lịch, dùng <th> cho hàng tiêu đề để người dùng trình đọc màn hình đọc theo cột đúng.');
    }
    const bad = tables.filter((t) => !t.querySelector('th'));
    if (!bad.length) {
      return out('table_headers', 'pass',
        `${tables.length} bảng dữ liệu đều có ô tiêu đề (<th>) — các công cụ đọc theo cột-hàng đúng ý bảng.`,
        'Giữ thói quen này cho bảng mới; dùng <th> theo nghĩa như tốt hơn là dùng style in đậm giả lập tiêu đề.');
    }
    const level = bad.length === tables.length ? 'fail' : 'warn';
    return out('table_headers', level,
      `${bad.length}/${tables.length} bảng không có ô tiêu đề <th> — phần mềm đọc màn hình đọc từng ô rời rạc, khách không biết cột nào là bảng giá của mình.`,
      'Đổi hàng đầu mỗi bảng thành các ô <th>; đừng chỉ in đậm dòng đầu bằng CSS — <th> mới là dữ liệu có nghĩa.');
  }

  function checkTableCaption(doc) {
    const tables = dataTables(doc);
    if (!tables.length) {
      return out('table_caption', 'pass',
        'Trang không dùng bảng dữ liệu nào — không có gì để chấm.',
        'Khi thêm bảng, gắn <caption> nói rõ bảng nói về dữ liệu gì (bảng giá, lịch chạy…).');
    }
    const bad = tables.filter((t) => !t.querySelector('caption') && !(t.getAttribute('aria-label') || '').trim());
    if (!bad.length) {
      return out('table_caption', 'pass',
        `${tables.length} bảng đều có tiêu đề (<caption> hoặc nhãn) — khách dùng trình đọc màn hình biết bảng đang nói về gì trước khi đọc chi tiết.`,
        'Giữ nguyên; caption nên nêu hai ý: bảng gì + thời điểm dữ liệu.');
    }
    return out('table_caption', 'warn',
      `${bad.length}/${tables.length} bảng thiếu tiêu đề (<caption>/aria-label) — khách lướt tới bảng chỉ thấy một rừng số không biết đó là bảng giá hay lịch.`,
      'Thêm <caption>Bảng giá dịch vụ – cập nhật tháng 11/2026</caption> ngay sau thẻ <table> mở đầu.');
  }

  const NAME_FIELDS_RE = /(^|[\s_\-])(ho.?ten|ten|name|email|mail|sdt|dien.?thoai|tel|phone|di.?chi|address|ngay.?sinh)/i;

  function checkInputAutocomplete(doc) {
    const fields = Array.from(doc.querySelectorAll('input')).filter((el) => {
      const t = (el.getAttribute('type') || '').toLowerCase();
      const hole = ['hidden', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio', 'file'].includes(t);
      return !hole && !t.startsWith('password') // mật khẩu có đặc tả riêng, không chấm autocomplete
        && NAME_FIELDS_RE.test(t === 'email' || t === 'tel' ? t : (el.getAttribute('name') || '') + ' ' + (el.getAttribute('autocomplete') || '') + ' ' + t);
    });
    if (!fields.length) {
      return out('input_autocomplete', 'pass',
        'Không có trường thông tin cá nhân (họ tên/email/SĐT/địa chỉ) cần khai autocomplete.',
        'Khi thêm form thu khách, gắn autocomplete="email"/"tel"/"name" cho từng trường tương ứng.');
    }
    const missing = fields.filter((el) => !(el.getAttribute('autocomplete') || '').trim());
    if (!missing.length) {
      return out('input_autocomplete', 'pass',
        `${fields.length} trường cá nhân đều khai autocomplete — trình duyệt khách tự điền tên/SĐT/email có sẵn giúp họ.`,
        'Giữ nguyên; kiểm tra lại sau khi thêm trường mới.');
    }
    return out('input_autocomplete', 'warn',
      `${missing.length}/${fields.length} trường cá nhân chưa khai autocomplete — trình duyệt không tự điền giúp, khách phải gõ lại từ đầu lần nào cũng vậy.`,
      'Gắn autocomplete="name"/"email"/"tel"/"street-address" vào từng trường tương ứng (thuộc tính chuẩn, miễn phí).');
  }

  function checkFormFieldset(doc) {
    const groups = new Map();
    for (const el of doc.querySelectorAll('input[type="radio"], input[type="checkbox"]')) {
      const name = el.getAttribute('name');
      if (!name) continue;
      groups.set(name, (groups.get(name) || 0) + 1);
    }
    let bad = 0;
    for (const [name, n] of groups) {
      if (n < 3) continue;
      let wrapped = false;
      for (const el of doc.querySelectorAll(`input[name="${name}"]`)) {
        let p = el.parentElement;
        while (p) {
          if ((p.tagName || '').toLowerCase() === 'fieldset') { wrapped = true; break; }
          p = p.parentElement;
        }
        if (wrapped) break;
      }
      if (!wrapped) bad++;
    }
    if (bad) {
      return out('form_fieldset', 'warn',
        `${bad} nhóm lựa chọn (mỗi nhóm ≥ 3 ô) chưa bọc fieldset+legend — phần mềm đọc màn hình đọc từng ô rời rạc, không biết nhóm này hỏi về cái gì.`,
        'Bọc nhóm bằng <fieldset><legend>Phương thức thanh toán</legend>…</fieldset> — không đổi giao diện, chỉ thêm ngữ nghĩa.');
    }
    return out('form_fieldset', 'pass',
      groups.size
        ? 'Các nhóm lựa chọn đều gói trong fieldset (hoặc nhóm nhỏ hơn 3 ô) — trình đọc đọc đúng ngữ cảnh từng ô.'
        : 'Trang không có nhóm ô chọn lớn nào cần fieldset.',
      'Khi thêm nhóm lựa chọn mới (hình thức giao hàng/thanh toán), nhớ bọc fieldset + legend đặt tên nhóm.');
  }

  function checkMediaAutoplay(doc) {
    const media = Array.from(doc.querySelectorAll('video, audio'));
    if (!media.length) {
      return out('media_autoplay', 'pass',
        'Trang không nhúng video/âm thanh nào.',
        'Khi thêm video, để chế độ "bấm để phát"; người dùng có nút điều khiển thì mới nhớ trình bày của bạn.');
    }
    const bad = media.filter((m) =>
      m.getAttribute('autoplay') != null &&
      !(m.getAttribute('muted') != null));
    if (bad.length) {
      return out('media_autoplay', 'fail',
        `${bad.length}/${media.length} video/âm thanh tự phát có tiếng — âm thanh bất ngờ làm khách giật mình, nhất là người đang đi mua sắm vừa mở trang.`,
        'Bỏ autoplay, hoặc giữ autoplay nhưng thêm thuộc tính muted + nút bật tiếng rõ ràng.');
    }
    return out('media_autoplay', 'pass',
      media.length
        ? `${media.length} phần media không tự phát có tiếng — khách tự quyết định khi nào bật âm.`
        : 'Trang không nhúng video/âm thanh nào.',
      'Giữ nguyên; video nền muốn tự chuyển vòng phải muted + không có âm thanh tự phát.');
  }

  /* ── Phần v1.3 còn thiếu (giữ nguyên logic, đã bỏ điểm) ─────────────────── */

  // robots.txt/sitemap.xml được api/fetch.mjs lấy sẵn (?soft=1) trước khi chạy:
  // meta.robots / meta.sitemap dạng { statusCode, text } — không có thì là unknown.
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
        // — đúng nghĩa "Không xác định", tuyệt đối không vội gán "Chưa đạt".
        return out('robots_txt', 'unknown',
          `Máy chủ trả về HTTP ${code} khi lấy robots.txt — không xác định được website có tệp này hay không (site chặn bot tự động, hoặc máy chủ đang sự cố).`,
          'Kiểm tra tay: mở ten-mien.vn/robots.txt trong trình duyệt. Nếu tệp tồn tại và hợp lệ thì không cần sửa gì.');
      }
      return out('robots_txt', 'warn',
        'Website chưa có tệp robots.txt — không sai, nhưng đang bỏ lỡ quyền khai báo sitemap và không chặn được các trang không cần máy quét ghé vào.',
        'Tạo tệp robots.txt đơn giản xếp ở thư mục gốc:\nUser-agent: *\nDisallow: /admin/\nSitemap: ten-mien.vn/sitemap.xml');
    }
    // robots.txt cần đọc theo nhóm User-agent (đúng chuẩn): "Disallow: /" chỉ là
    // chặn toàn bộ khi thuộc nhóm '*' — site hay chặn riêng từng bot xấu
    // (AhrefsBot, Scrapy…) bằng nhóm riêng, đó là hợp lệ, không phải lỗi.
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
        ? `Sitemap.xml đọc được — dạng nhóm (sitemapindex) dẫn tới ${soDonVi} sơ đồ trang con (mỗi con chứa địa chỉ các trang).`
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
    let emptyText = 0;    // liên kết không có chữ hiển thị
    let baseOrigin = '';
    try { baseOrigin = new URL(meta.finalUrl || meta.inputUrl || '').origin; } catch { /* giữ '' */ }
    for (const a of anchors) {
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href === '#' || /^javascript:/i.test(href)) {
        dead++;
      } else {
        try {
          const u = new URL(href, baseOrigin || undefined);
          // Anchor nội bộ ("#ten-anchor") chỉ hợp lệ khi trang có id đó —
          // bấm vào sẽ không cuộn đi đâu cả, coi như liên kết lỗi.
          const hash = u.hash;
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
      // hay bọc ảnh thì đếm là "có chữ" — đừng oan site ở chuẩn truy cập.
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

  /* ── Check mới: nhóm Marketing & chuyển đổi (2 mục còn lại) ─────────────── */

  function checkSiteSearch(doc) {
    const ev = [];
    const inputs = Array.from(doc.querySelectorAll('input[type="search" i], input[name], input[type="text" i]'));
    for (const el of inputs) {
      const name = (el.getAttribute('name') || '') + ' ' + (el.getAttribute('placeholder') || '') + ' ' +
        (el.getAttribute('aria-label') || '') + ' ' + [el.getAttribute('class'), el.getAttribute('id')].filter(Boolean).join(' ');
      if (/(^|[\s_-])(s|q|query|search|tim-?kiem|timkiem)/i.test(name.trim())) {
        ev.push('ô nhập được đánh dấu "tìm kiếm"');
        break;
      }
    }
    for (const f of doc.querySelectorAll('form')) {
      const sig = [f.getAttribute('class'), f.getAttribute('id'), f.getAttribute('action'), f.getAttribute('role')]
        .filter(Boolean).join(' ');
      if (/search|tim-?kiem|timkiem/i.test(sig)) {
        ev.push('form tìm kiếm (đường dẫn/nhận diện "search")');
        break;
      }
    }
    if (ev.length) {
      return out('site_search', 'pass',
        `Trang có ${ev[0]} — khách tới sản phẩm cần trong vài giây thay vì lăn dần trang.`,
        'Đặt ô tìm kiếm trên phần nhìn đầu tiên (khu vực header); dẫn kết quả về trang danh mục có lọc theo giá.');
    }
    const kw = bodyText(doc);
    if (/tìm kiếm|tim kiem/i.test(kw) && kw.indexOf('tìm kiếm') < 3000) {
      return out('site_search', 'unknown',
        'Trang có nhắc đến "tìm kiếm" nhưng không thấy cấu trúc ô tìm kiếm kiểm chứng được (input/form có nhận diện rõ) — cần kiểm tra tay trang đã hoạt động chưa.',
        'Nếu đã có tìm kiếm, đánh dấu input với name="s" hoặc type="search" để công cụ kiểm tra tin được.');
    }
    return out('site_search', 'warn',
      'Trang chưa có ô tìm kiếm riêng — khách mua ở site nhiều mặt hàng phải tự lướt tìm, dễ bỏ đi khi không thấy thứ cần.',
      'Với site có nhiều mặt hàng, thêm ô tìm kiếm (vị trí trang chủ, có nút) dẫn tới trang kết quả có lọc; site vài sản phẩm thì có thể bỏ qua mục này.');
  }

  function checkMapEmbed(doc) {
    const iframe = doc.querySelector('iframe[src]');
    if (iframe) {
      const src = (iframe.getAttribute('src') || '').toLowerCase();
      if (/google\.com\/maps|maps\.googleapis|bing\.com\/maps|openstreetmap|waze/i.test(src)) {
        return out('map_embed', 'pass',
          'Trang nhúng bản đồ (Google Maps/Bing/Waze) — khách thấy vị trí, bấm là có đường đi tới cửa hàng ngay.',
          'Kiểm tra bản đồ trên điện thoại: khung không méo, có lan can (title) cho trình đọc màn hình; nên kèm nút "chỉ đường".');
      }
    }
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (/google\.com\/maps|maps\.app\.goo\.gl|waze\.com\/ul/i.test(href)) {
        return out('map_embed', 'pass',
          `Trang có đường dẫn tới bản đồ chỉ đường ("${((a.textContent || '').trim().slice(0, 36)) || href.slice(0, 36)}") — khách bấm là mở ứng dụng bản đồ.`,
          'Thêm nút "Chỉ đường" gần địa chỉ để khách đi qua khu vực ghé quán dễ hơn; nếu được nhèm thêm bản đồ trực tiếp trên trang.');
      }
    }
    if (doc.querySelector('address') || bodyText(doc).match(/\d+ (?:l dividing|phố|đường|hẻm|ngõ|quận|phường)/i)) {
      return out('map_embed', 'warn',
        'Trang có địa chỉ cửa hàng nhưng chưa có bản đồ/đường dẫn chỉ đường — khách phải tự tìm bạn trên bản đồ, thuận tiện hơn nếu bấm được ngay.',
        'Nhúng khối Google Maps (kèm title cho iframe) hoặc đặt nút "Xem bản đồ" trỏ tới vị trí cửa hàng.');
    }
    return out('map_embed', 'unknown',
      'Không thấy địa chỉ cửa hàng lẫn bản đồ trong HTML tĩnh (trang chủ có thể chỉ bán online) — không kết luận được.',
      'Nếu có cửa hàng trực tiếp, thêm địa chỉ + bản đồ/nút chỉ đường vào footer hoặc trang liên hệ.');
  }

  /* ── Điểm vào chính: chạy đủ 60 mục, trả về Result v2.0 ─────────────────── */

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
      twitter_card: checkTwitterCard(doc),
      breadcrumb: checkBreadcrumb(doc),
      sitemap_lastmod: checkSitemapLastmod(meta.sitemap),
      meta_keywords: checkMetaKeywords(doc),

      https: checkHttps(meta),
      lang: checkLang(doc),
      charset: checkCharset(html),
      h1: checkH1(doc),
      heading_system: checkHeadingSystem(doc, h1Count),
      links: checkLinks(doc, meta),
      analytics: checkAnalytics(html),
      duplicate_ids: checkDuplicateIds(doc),
      mixed_content: checkMixedContent(meta, doc),
      http_links: checkHttpLinks(meta, doc),
      meta_refresh: checkMetaRefresh(doc),
      form_https_action: checkFormHttpsAction(doc),
      inline_styles: checkInlineStyles(doc),

      viewport: checkViewport(doc),
      img_alt: checkImages(doc),
      img_wh: checkImgWh(doc),
      favicon: checkFavicon(doc),
      theme_color: checkThemeColor(doc),
      lazy_load: checkLazyLoad(doc),
      manifest: checkManifest(doc),
      apple_icon: checkAppleIcon(doc),

      resources: checkResources(doc),
      page_weight: checkPageWeight(html),
      render_blocking: checkRenderBlocking(doc),
      image_format: checkImageFormat(doc, html),

      cta: checkCTA(doc),
      contact_info: checkContactInfo(doc),
      contact_form: checkContactForm(doc),
      social_links: checkSocialLinks(doc),
      policy_links: checkPolicyLinks(doc),
      product_service: checkProductService(doc),
      site_search: checkSiteSearch(doc),
      map_embed: checkMapEmbed(doc),

      trust_signals: checkTrustSignals(doc),
      business_identity: checkBusinessIdentity(doc),
      support_info: checkSupportInfo(doc),
      working_hours: checkWorkingHours(doc),

      semantic_html: checkSemanticHtml(doc),
      form_labels: checkFormLabels(doc),
      accessible_names: checkAccessibleNames(doc),
      blank_links: checkBlankLinks(doc),
      skip_link: checkSkipLink(doc),
      iframe_title: checkIframeTitle(doc),
      table_headers: checkTableHeaders(doc),
      table_caption: checkTableCaption(doc),
      input_autocomplete: checkInputAutocomplete(doc),
      form_fieldset: checkFormFieldset(doc),
      media_autoplay: checkMediaAutoplay(doc),
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

  /* ── Hiển thị checklist v2.0: bộ lọc + nhóm <details> ───────────────────── */

  function renderChecklist(result, mount) {
    mount.textContent = '';
    const owner = mount.ownerDocument || document;
    const checks = Array.isArray(result && result.checks) ? result.checks : [];

    const counts = { pass: 0, warn: 0, fail: 0, unknown: 0 };
    for (const c of checks) if (counts[c.status] != null) counts[c.status] += 1;
    const prCounts = { P0: 0, P1: 0, P2: 0, P3: 0 };
    for (const c of checks) if (c.priority && prCounts[c.priority] != null) prCounts[c.priority] += 1;

    const f = { status: 'all', priority: 'all' };

    // Thanh bộ lọc: 2 hàng chip (trạng thái, ưu tiên) + ghi chú số đang hiện.
    const chip = (kind, value, label, n) =>
      `<button type="button" class="chip active" data-kind="${kind}" data-value="${value}" aria-pressed="true">` +
      `${label}${n == null ? '' : ` <span class="chip-n">${n}</span>`}</button>`;

    const toolbar = owner.createElement('div');
    toolbar.className = 'chk-filters';
    toolbar.innerHTML =
      `<div class="filter-row" role="group" aria-label="Lọc theo trạng thái">` +
      `<span class="filter-label">Trạng thái:</span>` +
      chip('status', 'all', 'Tất cả', checks.length) +
      chip('status', 'pass', STATUS_WORDS.pass, counts.pass) +
      chip('status', 'warn', STATUS_WORDS.warn, counts.warn) +
      chip('status', 'fail', STATUS_WORDS.fail, counts.fail) +
      chip('status', 'unknown', STATUS_WORDS.unknown, counts.unknown) +
      `</div>` +
      `<div class="filter-row" role="group" aria-label="Lọc theo mức ưu tiên">` +
      `<span class="filter-label">Ưu tiên:</span>` +
      chip('priority', 'all', 'Tất cả', null) +
      chip('priority', 'P0', `P0 ${PRIORITY_WORDS.P0}`, prCounts.P0) +
      chip('priority', 'P1', `P1 ${PRIORITY_WORDS.P1}`, prCounts.P1) +
      chip('priority', 'P2', `P2 ${PRIORITY_WORDS.P2}`, prCounts.P2) +
      chip('priority', 'P3', `P3 ${PRIORITY_WORDS.P3}`, prCounts.P3) +
      `</div>` +
      `<p class="filter-note"></p>`;
    mount.appendChild(toolbar);

    const note = toolbar.querySelector('.filter-note');

    // Đồng bộ hình thức các chip theo trạng thái lọc hiện tại (gọi lúc dựng + mỗi lần click).
    function syncChips() {
      for (const b of toolbar.querySelectorAll('button.chip')) {
        const mine = f[b.getAttribute('data-kind')] === b.getAttribute('data-value');
        if (mine) { b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); }
        else { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); }
      }
    }
    syncChips();

    // Dựng từng nhóm theo thứ tự GROUPS — chỉ nhóm nào có mục mới hiện.
    const buckets = Object.fromEntries(GROUPS.map((g) => [g, []]));
    for (const c of checks) if (buckets[c.group]) buckets[c.group].push(c);

    const rowsAll = [];
    let gi = 0;
    for (const g of GROUPS) {
      const list = buckets[g];
      if (!list.length) continue;
      const details = owner.createElement('details');
      details.className = 'check-group';
      details.id = 'grp-' + gi;
      gi += 1;

      const summ = owner.createElement('summary');
      const h = owner.createElement('h2');
      h.textContent = g;
      const passN = list.filter((c) => c.status === 'pass').length;
      // Gom đếm theo trạng thái thay vì liệt kê từng mục — dòng nhóm gọn, dễ đọc.
      const tally = {};
      for (const c of list) if (c.status !== 'pass') tally[c.status] = (tally[c.status] || 0) + 1;
      const extras = ['warn', 'fail', 'unknown'].filter((st) => tally[st])
        .map((st) => `${GLYPHS[st]} ${countsWord(st)} ×${tally[st]}`).join(' · ');
      const gsum = owner.createElement('span');
      gsum.className = 'group-sum';
      gsum.textContent = `${passN}/${list.length} đạt` + (extras ? ` · ${extras}` : '');
      h.appendChild(gsum);
      summ.appendChild(h);
      details.appendChild(summ);

      const rows = owner.createElement('div');
      rows.className = 'check-rows';
      for (const c of list) {
        const row = owner.createElement('div');
        row.className = `check-row st-${c.status}`;
        row.setAttribute('data-status', c.status);
        row.setAttribute('data-priority', c.priority || '');

        const head = owner.createElement('p');
        head.className = 'check-head';

        const glyph = owner.createElement('span');
        glyph.className = 'glyph st-' + c.status;
        glyph.setAttribute('role', 'img');
        glyph.setAttribute('aria-label', STATUS_WORDS[c.status] || c.status);
        glyph.textContent = GLYPHS[c.status] || '?';

        const name = owner.createElement('span');
        name.className = 'check-label';
        name.textContent = c.label;

        const method = owner.createElement('span');
        method.className = 'badge method';
        method.setAttribute('title', 'Loại bằng chứng: ' + (METHOD_WORDS[c.method] || c.method));
        method.textContent = METHOD_WORDS[c.method] || c.method;

        head.appendChild(glyph);
        head.appendChild(name);
        head.appendChild(method);

        if (c.priority) {
          const pr = owner.createElement('span');
          pr.className = 'badge pr pr-' + c.priority;
          pr.setAttribute('title', 'Mức ưu tiên: ' + PRIORITY_WORDS[c.priority]);
          pr.textContent = c.priority;
          head.appendChild(pr);
        }
        row.appendChild(head);

        if (c.detail) {
          const ev = owner.createElement('p');
          ev.className = 'check-detail';
          ev.textContent = 'Bằng chứng: ' + c.detail;
          row.appendChild(ev);
        }
        if (c.status === 'warn' || c.status === 'fail') {
          if (c.impact) {
            const imp = owner.createElement('p');
            imp.className = 'check-impact';
            imp.textContent = 'Tác động: ' + c.impact;
            row.appendChild(imp);
          }
          if (c.suggestion) {
            const sug = owner.createElement('p');
            sug.className = 'check-suggestion';
            sug.textContent = 'Hướng khắc phục: ' + c.suggestion;
            row.appendChild(sug);
          }
        } else if (c.suggestion) {
          const sug = owner.createElement('p');
          sug.className = 'check-suggestion';
          sug.textContent = 'Giữ hướng: ' + c.suggestion;
          row.appendChild(sug);
        }
        rows.appendChild(row);
        rowsAll.push(row);
      }
      details.appendChild(rows);
      mount.appendChild(details);
    }

    // Áp bộ lọc: mục nào không khớp 2 điều kiện thì ẩn; nhóm trống ẩn cả; ghi chú cập nhật.
    function applyFilter() {
      let visible = 0;
      for (const row of rowsAll) {
        const okS = f.status === 'all' || row.getAttribute('data-status') === f.status;
        const okP = f.priority === 'all' ||
          row.getAttribute('data-priority').split(/\s+/).includes(f.priority);
        if (okS && okP) {
          row.removeAttribute('hidden');
          visible += 1;
        } else {
          row.setAttribute('hidden', 'hidden');
        }
      }
      for (const g of mount.querySelectorAll('details.check-group')) {
        const any = [...g.querySelectorAll('.check-row')].some((r) => !r.hasAttribute('hidden'));
        if (any) g.removeAttribute('hidden');
        else g.setAttribute('hidden', 'hidden');
      }
      note.textContent = `Hiện ${visible}/${checks.length} mục`;
    }

    function countsWord(st) {
      return st === 'warn' ? 'cần cải thiện' : st === 'fail' ? 'chưa đạt' : 'không xác định';
    }

    toolbar.addEventListener('click', (e) => {
      let t = e.target;
      while (t && t !== toolbar) {
        if ((t.tagName || '').toLowerCase() === 'button' && t.getAttribute('data-kind')) break;
        t = t.parentElement;
      }
      if (!t || t === toolbar) return;
      const kind = t.getAttribute('data-kind');
      const value = t.getAttribute('data-value');
      if (!kind || !value) return;
      f[kind] = value;
      syncChips();
      applyFilter();
    });

    applyFilter();
  }

  /* ── Result mẫu (không cần mạng) cho mốc 2–5 dựng phần của mình ─────────── */
  // Quán cà phê Đà Lạt: đủ 4 trạng thái để demo bộ lọc — fail có robots_meta (P0),
  // meta_description (P1), trust_signals (P2); unknown duy nhất robots_txt (403).
  // Không cố nhồi "fail cho đẹp": mỗi fail đều là vấn đề thật, bằng chứng thật.

  const DEMO_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Quán cà phê rang xay Mộc</title>
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#3d2b1f">
<link rel="icon" href="/favicon.svg">
<link rel="canonical" href="https://quan-moc-da-lat.vn/">
<meta property="og:title" content="Quán cà phê Mộc">
<script type="application/ld+json">
{ "@context": "https://schema.org", "@graph": [
  { "@type": "LocalBusiness", "name": "Quán cà phê Mộc",
    "address": { "@type": "PostalAddress", "streetAddress": "Số 7 Đồi Thông", "addressLocality": "Đà Lạt", "addressRegion": "Lâm Đồng" },
    "telephone": "0917 000 111",
    "openingHours": "Mo-Su 06:30-21:30" },
  { "@type": "Product", "name": "Cà phê rang xay Mộc", "description": "Cà phê rang mộc đóng hộp 250 g và 500 g." }
]}
</script>
<script defer src="/js/app.js"></script>
</head>
<body>
<header>
  <nav aria-label="Menu chính">
    <a href="/thuc-don">Thực đơn</a>
    <a href="/san-pham">Sản phẩm</a>
    <a href="/hoi-dap">Hỏi đáp</a>
    <a href="/lien-he">Liên hệ</a>
    <a href="/dat-ban" class="btn-main">Đặt bàn ngay</a>
  </nav>
</header>
<main id="noi-dung">
<h1>Cà phê rang xay Mộc — nơi đồi thông Đà Lạt</h1>
<h2>Sản phẩm của quán</h2>
<p>Cà phê phin giữ vị đậm của vùng đất cao, cà phê muối ngọt cốt dừa pha ly tại chỗ, bột hòa tan pha nhanh cho khách bận. Chúng tôi chọn hạt mỗi tuần và rang ba mức nhạt, vừa, đậm — gu ai cũng tìm được cốc riêng.</p>
<h3>Dòng đặc biệt</h3>
<p>Hạt mỗi mùa thay đổi theo vựa: rang mộc, nghỉ trước khi đóng túi, ghi ngày rang ngay ở đáy hộp.</p>
<h2>Cửa hàng</h2>
<img src="http://images.example.com/banner.jpg" alt="Mặt tiền quán cà phê Mộc nhìn từ đường chính">
<img src="/anh/goc-lanh-dao-rang.jpg" alt="Góc ngồi cạnh lò rang trong quán">
<iframe title="Bản đồ chỉ đường tới quán Mộc" src="https://maps.google.com/maps?q=quan+moc+da+lat&output=embed" loading="lazy" width="600" height="450"></iframe>
<video src="/media/hat-dang-rang.mp4" autoplay muted loop></video>
<form action="/gui-lien-he" method="post">
  <label for="email">Email nhận khuyến mãi</label>
  <input type="email" id="email" name="email">
  <label for="ho-ten">Họ tên</label>
  <input type="text" id="ho-ten" name="ho-ten">
  <button type="submit">Gửi thông tin</button>
</form>
</main>
<footer>
<p>Quán cà phê Mộc — Số 7 Đồi Thông, Đà Lạt, Lâm Đồng.</p>
<p>Gọi quán: <a href="tel:0917000111">0917 000 111</a> hoặc <a href="mailto:info@quan-moc-da-lat.vn">gửi email cho chúng tôi</a>.</p>
<p>Giờ mở cửa 06:30–21:30 tất cả các ngày trong tuần.</p>
<a href="https://facebook.com/quanmoc">Fanpage Facebook của quán</a>
<a href="https://zalo.me/0917000111">Zalo của quán</a>
<a href="/chinh-sach-bao-mat">Chính sách bảo mật</a>
<a href="/dieu-khoan">Điều khoản sử dụng</a>
</footer>
</body>
</html>`;

  const DEMO_META = {
    inputUrl: 'quan-moc-da-lat.vn',
    finalUrl: 'https://quan-moc-da-lat.vn/',
    statusCode: 200,
    elapsedMs: 1240,
    robots: {
      // 403: site chặn bot quét — đúng theo hợp đồng phải là unknown (không dối là fail).
      statusCode: 403,
      text: '',
    },
    sitemap: {
      // Sitemap đọc được (3 URL) nhưng không có <lastmod> → mục sitemap_lastmod cảnh báo riêng.
      statusCode: 200,
      text: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://quan-moc-da-lat.vn/</loc></url>\n  <url><loc>https://quan-moc-da-lat.vn/thuc-don</loc></url>\n  <url><loc>https://quan-moc-da-lat.vn/dat-ban</loc></url>\n</urlset>',
    },
  };

  function demoResult(buildDoc) {
    return runChecks(DEMO_HTML, DEMO_META, buildDoc);
  }

  // Nạp Result cho mốc 2–5 (và results.js): ?demo=1 → Result mẫu mới; ngược lại
  // đọc sessionStorage["webcheck:result"]. v2.0: CHỈ nhận Result đúng phiên bản —
  // kết quả cũ v1.2/v1.3 (không có status/priority) bị từ chối và trả null, nơi gọi
  // tự hiện trạng thái "kết quả ngôn ngữ cũ, cần kiểm tra lại trang".
  function docKetQua() {
    try {
      if (new URLSearchParams(location.search).has('demo')) {
        const d = demoResult();
        if (d && Array.isArray(d.checks) && d.checks.length) return d;
      }
    } catch { /* không có location/demo → thử nạp sessionStorage */ }
    try {
      const r = JSON.parse(sessionStorage.getItem('webcheck:result'));
      if (r && r.version === VERSION && Array.isArray(r.checks) && r.checks.length) return r;
    } catch { /* chưa có kết quả trong session */ }
    return null;
  }

  return {
    runChecks, renderChecklist, demoResult, docKetQua,
    DEFS, GROUPS, PRIORITY_MAP,
    STATUS_WORDS, PRIORITY_WORDS, METHOD_WORDS,
    VERSION,
  };
})();

if (typeof window !== 'undefined') window.WebCheck = WebCheck;
