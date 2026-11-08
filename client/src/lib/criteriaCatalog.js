/* ĐỒNG BỘ TỰ ĐỘNG — lệnh node scripts/sync-criteria.mjs từ webcheck/js/analyze.js (v2.0).
 * KHÔNG sửa tay: file này chạy lại từ bộ máy gốc. 60 tiêu chí, tổng 136 điểm thô.
 * Trọng số: P0=6, P1=4, P2=2, P3=1 (theo mức ưu tiên khi Chưa đạt). Cần cải thiện giữ 60%.
 */
export const ENGINE_VERSION = "2.0";
export const WEIGHT_BY_PRIORITY = {"P0":6,"P1":4,"P2":2,"P3":1};
export const WARN_KEEP_RATIO = 0.6;
export const CRITERIA_GROUPS = [
  "SEO & hiển thị",
  "Chuẩn kỹ thuật",
  "Di động & hình ảnh",
  "Tốc độ tải nội dung",
  "Marketing & chuyển đổi",
  "Tin cậy & minh bạch",
  "Trải nghiệm & truy cập"
];
export const STATUS_WORDS = {
  "pass": "Đạt",
  "warn": "Cần cải thiện",
  "fail": "Chưa đạt",
  "unknown": "Không xác định"
};
export const PRIORITY_WORDS = {
  "P0": "Khẩn",
  "P1": "Cao",
  "P2": "Trung bình",
  "P3": "Khuyến nghị"
};
export const METHOD_WORDS = {
  "html": "HTML tĩnh",
  "network": "Tài nguyên mạng",
  "html+network": "HTML + mạng"
};
export const CRITERIA_COUNTS_BY_PRIORITY = {
  "P1": 10,
  "P2": 26,
  "P0": 4,
  "P3": 20
};
export const TOTAL_WEIGHT = 136;

export const CRITERIA = [
  {
    "id": "title",
    "name": "Tiêu đề trang (<title>)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Tiêu đề là dòng đầu tiên khách đọc trên Google — cùng thẻ mô tả, nó quyết định người tìm kiếm bấm vào bạn hay vào đối thủ.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "meta_description",
    "name": "Mô tả tìm kiếm (meta description)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Dòng mô tả dưới tiêu đề trên Google. Thiếu là để thuật toán tự chụp câu bất kỳ trên trang — mất cơ hội thuyết phục đúng ý khách.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "open_graph",
    "name": "Chia sẻ mạng xã hội (Open Graph)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Link bán hàng chủ yếu lan qua Facebook/Zalo. Không có ảnh/tiêu đề chia sẻ, link dán vào nhóm chỉ hiện một dòng trơ trọi — giảm mạnh lượt bấm.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "canonical",
    "name": "Địa chỉ chuẩn (canonical)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Thiếu canonical, Google có thể coi (www/không www, ?utm…) là nhiều trang trùng nội dung — sức mạnh tìm kiếm bị chia nhỏ.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "robots_meta",
    "name": "Chỉ dẫn công cụ tìm kiếm (robots)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Một dòng noindex sai sót là cả trang biến mất khỏi Google — khách tìm đúng dịch vụ cũng không thấy bạn.",
    "criticality": "P0",
    "warnPriority": "P3",
    "weight": 6
  },
  {
    "id": "robots_txt",
    "name": "Tệp robots.txt (chỉ dẫn quét toàn site)",
    "group": "SEO & hiển thị",
    "method": "network",
    "impact": "robots.txt quyết định máy tìm kiếm được quét đâu. Sai một dòng \"Disallow: /\" là toàn website bị chặn khỏi Google.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "sitemap",
    "name": "Sơ đồ trang (sitemap.xml)",
    "group": "SEO & hiển thị",
    "method": "network",
    "impact": "Sitemap giúp Google tìm đủ các trang mới sớm hơn — thiếu thì trang sản phẩm mới có thể mãi chưa được Google lập chỉ mục.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "structured_data",
    "name": "Dữ liệu có cấu trúc (JSON-LD)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "JSON-LD là cách khai thẳng cho máy: địa chỉ, giờ mở cửa, sản phẩm. Chuẩn thì kết quả tìm kiếm nổi bật hơn, sai cú pháp thì máy đọc không được gì cả.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "twitter_card",
    "name": "Thẻ chia sẻ X/Twitter (Twitter Card)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Khách chia sẻ link lên X/Twitter: có thẻ riêng thì hiện kèm ảnh — không thì chỉ một dòng chữ, kém thu hút rõ.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "breadcrumb",
    "name": "Dải đường dẫn (breadcrumb)",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Breadcrumb cho Google hiểu cấu trúc site và giúp khách biết mình đang ở mục nào — thiếu thì trang sâu dễ thành \"ngõ cụt\".",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "sitemap_lastmod",
    "name": "Sitemap khai báo ngày cập nhật (lastmod)",
    "group": "SEO & hiển thị",
    "method": "network",
    "impact": "Có lastmod, Google biết trang nào vừa thay đổi để ưu tiên quét lại — thiếu thì cập nhật sản phẩm giá chậm lên tìm kiếm.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "meta_keywords",
    "name": "Không còn thẻ meta keywords lỗi thời",
    "group": "SEO & hiển thị",
    "method": "html",
    "impact": "Meta keywords bị Google bỏ qua từ 2009 — giữ lại chỉ cho thấy website dựng bằng kỹ thuật cũ, không ảnh hưởng thứ hạng.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "https",
    "name": "Kết nối bảo mật (HTTPS)",
    "group": "Chuẩn kỹ thuật",
    "method": "html+network",
    "impact": "Trang HTTP bị Chrome gắn nhãn \"Không an toàn\" — khách bán hàng/dịch vụ thấy dòng đó là rời đi ngay, nhất là ở bước điền thông tin.",
    "criticality": "P0",
    "warnPriority": "P1",
    "weight": 6
  },
  {
    "id": "lang",
    "name": "Định nghĩa ngôn ngữ (lang)",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Khai sai ngôn ngữ khiến phần mềm đọc màn hình đọc lệch giọng và công cụ dịch nhầm nội dung — nhóm khách cần trợ năng bị thiệt thòi.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "charset",
    "name": "Bảng mã ký tự (charset)",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Sai bảng mã là chữ tiếng Việt ra \"Ã´ Ã¹\" — lỗi hiển thị khiến khách nghi ngờ cả sự chuyên nghiệp của shop.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "h1",
    "name": "Tiêu đề chính (h1)",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "h1 là chủ đề của trang cho cả máy lẫn người. Không có, khách lướt 3 giây không hiểu trang bán gì.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "heading_system",
    "name": "Hệ thống đề mục (h1–h6)",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Đề mục nhảy bậc làm khách lướt nhanh mất mạch và máy chấm cấu trúc trang sai chủ đề chính.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "links",
    "name": "Chất lượng liên kết (link)",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Mỗi link chết/không chữ là một khách bấm không thấy gì và một lối đi máy tìm kiếm bị chặn — toàn bộ điều hướng sút giá trị.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "analytics",
    "name": "Đo lường truy cập (Analytics)",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Không đo lường là chạy marketing mà không biết kênh nào ra khách, bao nhiêu — không biết kênh nào hiệu quả để dồn tiền quảng cáo.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "duplicate_ids",
    "name": "ID HTML không trùng",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "ID trùng làm nút bấm/anchor cuộn sai chỗ, form chặn nhầm — lỗi bug kiểu âm thầm, khách mắc ở bước cuối cùng.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "mixed_content",
    "name": "Không trộn nội dung HTTP trên HTTPS",
    "group": "Chuẩn kỹ thuật",
    "method": "html+network",
    "impact": "Tài nguyên http:// trên trang https:// khiến trình duyệt chặn hoặc gắn cảnh báo — giá trị của HTTPS mất đi một phần.",
    "criticality": "P0",
    "warnPriority": "P2",
    "weight": 6
  },
  {
    "id": "http_links",
    "name": "Liên kết trỏ tới http://",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Khách bấm link http:// thấy trình duyệt cảnh báo \"Không an toàn\" — niềm tin tuột ngay tại đúng bước họ định hành động.",
    "criticality": "P2",
    "warnPriority": "P2",
    "weight": 2
  },
  {
    "id": "meta_refresh",
    "name": "Không tự chuyển trang bằng meta refresh",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Chuyển hướng chờ vài giây là trải nghiệm khó chịu, và Google không coi đây là đường dẫn chuẩn giữa hai trang.",
    "criticality": "P1",
    "warnPriority": "P3",
    "weight": 4
  },
  {
    "id": "form_https_action",
    "name": "Biểu mẫu không gửi qua http://",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Form gửi dữ liệu qua http:// là tên/SĐT khách truyền đi dạng \"chữ trần\" — đúng nơi khách trao cho mình thông tin quý nhất.",
    "criticality": "P1",
    "warnPriority": "P3",
    "weight": 4
  },
  {
    "id": "inline_styles",
    "name": "Style được gom vào file CSS",
    "group": "Chuẩn kỹ thuật",
    "method": "html",
    "impact": "Style rải rác trong HTML làm phình dung lượng trang và khiến sửa giao diện chậm, dễ lệch từng chỗ.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "viewport",
    "name": "Hiển thị trên di động (viewport)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "Đa số khách doanh nghiệp nhỏ đến từ điện thoại. Thiếu viewport là trang hiện như bản thu nhỏ — khách phải phóng to từng khối mới đọc nổi.",
    "criticality": "P0",
    "warnPriority": "P1",
    "weight": 6
  },
  {
    "id": "img_alt",
    "name": "Mô tả ảnh (alt)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "alt là chỗ ghi tên sản phẩm/dịch vụ trong ảnh: thiếu thì Google \"mù\" ảnh, khách công cụ đọc màn hình cũng không biết ảnh nói gì.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "img_wh",
    "name": "Ảnh khai báo kích thước (width/height)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "Ảnh chưa khai báo kích thước khiến bố cục nhảy loạn khi trang tải — khách đang đọc bị trượt nội dung, bực rồi đi.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "favicon",
    "name": "Biểu tượng tab (favicon)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "Giữa đống tab của khách, logo favicon là dấu mốc nhận diện — thiếu là ô vuông xám dễ bị đóng nhầm tab.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "theme_color",
    "name": "Màu giao diện (theme-color)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "Trên điện thoại, theme-color khiến thanh trình duyệt hoà cùng màu thương hiệu — chi tiết nhỏ làm trang \"thật\" hơn là web chép.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "lazy_load",
    "name": "Tải ảnh trễ (lazy loading)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "Bật lazy, trang mở được ngay phần đầu — nơi quyết định khách ở lại; không bật là chờ cả dàn ảnh dưới màn hình.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "manifest",
    "name": "Khai báo manifest (PWA)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "Có manifest thì khi khách lưu trang vào màn hình chính, trang mở như một ứng dụng có tên/icon riêng — tăng lượt quay lại.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "apple_icon",
    "name": "Biểu tượng iOS (apple-touch-icon)",
    "group": "Di động & hình ảnh",
    "method": "html",
    "impact": "Khách iPhone lưu trang về màn hình chính: không có icon riêng là một ảnh chụp màn hình mờ mờ thay cho logo cửa hàng.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "resources",
    "name": "Số lượng tài nguyên (JS/CSS)",
    "group": "Tốc độ tải nội dung",
    "method": "html",
    "impact": "Càng nhiều file JS/CSS, trang càng chậm và dễ xung đột script — khách đợi vượt quá giới hạn nhẫn nại vài giây là đi ngay.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "page_weight",
    "name": "Dung lượng HTML",
    "group": "Tốc độ tải nội dung",
    "method": "html+network",
    "impact": "HTML quá nặng là khách mạng 4G yếu bỏ đi trước khi trang kịp hiện — mất đúng nhóm khách vốn đang cần mua gấp.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "render_blocking",
    "name": "Script không chặn hiển thị (defer/async)",
    "group": "Tốc độ tải nội dung",
    "method": "html",
    "impact": "Script ở đầu trang không có defer/async làm trình duyệt dừng vẽ chữ để chờ tải — khách thấy màn hình chớp trắng thay vì nội dung.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "image_format",
    "name": "Ảnh dùng dạng nhẹ (WebP/AVIF)",
    "group": "Tốc độ tải nội dung",
    "method": "html",
    "impact": "Ảnh JPG/PNG cũ có thể gấp 2–3 lần WebP cùng chất lượng — mỗi ảnh nặng là thêm một giây khách chờ trên 4G.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "cta",
    "name": "Nút kêu gọi hành động (CTA)",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Khách xem xong luôn có cảm giác \"thích nhưng chưa làm\" — không có nút hành động rõ ràng là để họ lướt sang đối thủ.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "contact_info",
    "name": "Thông tin liên hệ",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Ai muốn mua là muốn hỏi trước. Liên hệ kén kênh thì khách nào ngại kênh đó là mất đơn — nên có sẵn hotline, email và Zalo cho khách chọn.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "contact_form",
    "name": "Biểu mẫu liên hệ",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Form ngắn gọn giữ lại được khách muốn hỏi ngoài giờ làm việc — bỏ form là mất toàn bộ nhóm khách không thích gọi điện.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "social_links",
    "name": "Liên kết mạng xã hội",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Fanpage/Zalo/OA là kênh giữ chân khách rẻ nhất — từng khách theo dõi hôm nay là người nhận tin khuyến mãi mai.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "policy_links",
    "name": "Trang chính sách / quy định",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Khách mua online tìm chính sách đổi trả trước khi bấm nút — không thấy là họ tự cộng phần rủi ro vào giá trong đầu, rồi rút lui.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "product_service",
    "name": "Sản phẩm / dịch vụ được giới thiệu rõ",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Trang chủ không cho thấy bán gì cụ thể là bắt khách tự đoán — và người ta không đặt hàng thứ họ phải đoán.",
    "criticality": "P1",
    "warnPriority": "P2",
    "weight": 4
  },
  {
    "id": "site_search",
    "name": "Ô tìm kiếm trên trang",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Với shop đa mặt hàng, tìm kiếm giúp khách tới sản phẩm trong 5 giây — thiếu là họ lướt dần trang rồi thôi.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "map_embed",
    "name": "Bản đồ / đường đi tới cửa hàng",
    "group": "Marketing & chuyển đổi",
    "method": "html",
    "impact": "Nhúng bản đồ giảm được cú điện thoại \"shop ở đâu\" — và người đi qua khu vực còn ghé luôn vì thấy gần đường mình hay đi.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "trust_signals",
    "name": "Dấu hiệu tạo niềm tin (đánh giá khách hàng)",
    "group": "Tin cậy & minh bạch",
    "method": "html",
    "impact": "Đánh giá của người mua trước là bằng chứng bán hàng mạnh nhất — trang sạch bóng phản hồi khiến khách nghi ngờ chất lượng.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "business_identity",
    "name": "Thông tin nhận diện doanh nghiệp",
    "group": "Tin cậy & minh bạch",
    "method": "html",
    "impact": "Khách cần thấy \"có cửa hàng thật\": tên, địa chỉ, mã số thuế — rõ ràng họ mới dám chuyển tiền cho một cửa hàng mình chưa từng ghé.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "support_info",
    "name": "Trang hỗ trợ / FAQ",
    "group": "Tin cậy & minh bạch",
    "method": "html",
    "impact": "Trả lời sẵn FAQ giúp khách tự giải đáp — họ không phải chờ hồi âm và không bỏ đi trong lúc chờ.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "working_hours",
    "name": "Giờ mở cửa / làm việc",
    "group": "Tin cậy & minh bạch",
    "method": "html",
    "impact": "Khách cần đến cửa hàng nhưng không biết giờ — nhiều người sẽ qua đối thủ mở gần hơn. Nêu giờ rõ là khách ghé được thôi.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "semantic_html",
    "name": "Cấu trúc HTML ngữ nghĩa",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Khung ngữ nghĩa (main/nav/footer) giúp phần mềm đọc màn hình và Google vẽ đúng bản đồ trang — trang DIV tràn lan là bản đồ mù.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "form_labels",
    "name": "Trường nhập có nhãn (label)",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Ô nhập không nhãn là khách lúng túng không biết điền gì — đúng lúc họ định để lại thông tin.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "accessible_names",
    "name": "Liên kết/nút có tên truy cập",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Nút chỉ có hình thì phần mềm đọc màn hình đọc thành \"nút\" vô danh — khách dùng trợ năng không biết nút làm gì và bỏ đi.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "blank_links",
    "name": "Liên kết mở tab mới có rel bảo mật",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Thiếu rel=\"noopener\", tab mới của trang lạ có thể thao túng tab của bạn — chỉ cần một dòng rel cho mỗi link để vá.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "skip_link",
    "name": "Liên kết nhảy tới nội dung chính",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Khách dặn bàn phím/phần mềm đọc màn hình phải đi qua từng mục menu mới tới nội dung — skip link tiết kiệm cả chục lần bấm Tab mỗi trang.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "iframe_title",
    "name": "Khung nhúng (iframe) có tiêu đề",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Không có title, phần mềm đọc màn hình đọc iframe thành \"khung\" — khách không biết bên trong là bản đồ hay video quảng cáo.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "table_headers",
    "name": "Bảng dữ liệu có hàng tiêu đề (<th>)",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Bảng thiếu th là khách đọc rời rạc không biết cột nào nói về gì — bảng giá dễ bị hiểu sai.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
  {
    "id": "table_caption",
    "name": "Bảng dữ liệu có tiêu đề (<caption>)",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Caption cho biết bảng này về bảng giá hay lịch phát — thiếu là người dùng trình đọc màn hình lướt tới bảng vẫn \"vô chủ\".",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "input_autocomplete",
    "name": "Trường thông tin cá nhân có autocomplete",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Có autocomplete, trình duyệt tự điền tên/SĐT/email có sẵn của khách — bớt cả chuỗi gõ phím trước khi họ đổi ý vì mất thời gian.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "form_fieldset",
    "name": "Nhóm lựa chọn có fieldset/legend",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Nhóm ô chọn bọc fieldset đúng thì phần mềm đọc màn hình đọc rõ \"nhóm hình thức thanh toán, 3 lựa chọn\" — không bọc là đọc từng ô rời rạc.",
    "criticality": "P3",
    "warnPriority": "P3",
    "weight": 1
  },
  {
    "id": "media_autoplay",
    "name": "Video/âm thanh không tự phát tiếng",
    "group": "Trải nghiệm & truy cập",
    "method": "html",
    "impact": "Âm thực thanh phái tự phát là khách giật mình vung tay tắt cả tab — nhất là khách đang họp hoặc trông trẻ.",
    "criticality": "P2",
    "warnPriority": "P3",
    "weight": 2
  },
];
