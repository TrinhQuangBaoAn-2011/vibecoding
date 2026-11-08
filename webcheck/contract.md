# WebCheck — hợp đồng ghép code (v3.0)

Tài liệu này chốt cách các mốc cắm vào phần Mốc 1. Quy ước của nhóm là **làm riêng rồi ghép**,
nên mọi thứ các bạn cần đều nằm ở đây — đọc kỹ trước khi viết code để không phải chỉnh sau.

**v3.0 (08/11/2026) thay đổi lớn nhất:** **sản phẩm chính của nhóm là app WEBCHECK AI** (React +
Express, thư mục `client/` + `server/` ở gốc repo) — trang chủ `/` chạy app này, **chấm đủ 60 tiêu
chí v2.0 theo trọng số P0–P3 và CHO PHÉP HIỂN THỊ ĐIỂM TỔNG CHUẨN HÓA /100** (vòng điểm + thanh
nhóm trong `ScoreSummary`). Đây là quyết định nhóm chốt lần 2 ngày 08/11/2026 — **bãi bỏ luật
"cấm hiển thị điểm" của v2.0** (xem mục 9).

Thư mục `webcheck/` từ v3.0 là **khu engine/library của bộ máy v2.0** (`js/analyze.js` + 46 tests +
`api/fetch.mjs`): server app nạp engine qua `server/lib/webcheckEngine.js`; UI vanilla
`index.html`/`results.html` (kèm bản đóng gói ở `client/dist/webcheck/`) chỉ còn vai trò **máy chấm
QA riêng lẻ** — không phải sản phẩm trình bày; phần việc của mốc 2–5 đã có bản thay thế trong app
React (ScoreSummary / AiConsultant / report.js / History).

**v2.0 vẫn là nền tảng dữ liệu:** kết quả là **trạng thái 4 mức (Đạt / Cần cải thiện / Chưa đạt /
Không xác định) + mức ưu tiên P0–P3 có bằng chứng** cho **60 hạng mục** (34 mục cũ giữ nguyên ID +
ý nghĩa, thêm 26 mục mới). Điểm /100 chỉ là **chuẩn hóa minh bạch phía server** (tử số = điểm đã
đạt, mẫu số bỏ mục Không xác định) — không phải điểm xếp hạng chính thức của Google.

---

## 1. Cách lấy kết quả (con đường duy nhất)

Mốc 1 chạy kiểm tra xong sẽ **lưu object Result vào `sessionStorage["webcheck:result"]`** rồi
tự chuyển sang trang `results.html`. Các mốc **chỉ cần đọc key này**, không gọi lại API, không
parse lại HTML. Dùng hàm có sẵn thay vì tự parse:

```js
const result = WebCheck.docKetQua(); // ?demo=1 → Result mẫu; ngược lại đọc sessionStorage
```

`docKetQua()` v2.0 có **gate phiên bản**: chỉ nhận Result khi `version === '2.0'`. Kết quả cũ
v1.2/v1.3 (shape `level/weight`) hoặc JSON hỏng → trả `null`; trang `results.html` đã có sẵn
thông báo "kết quả phiên bản cũ, hãy kiểm tra lại". Đừng tự nghiên cứu shape cũ.

Lưu ý: sessionStorage sống theo tab/phiên — đóng tab là mất (đúng ý chuyền trang; lịch sử lâu
dài là việc của mốc 5, tự lưu vào localStorage riêng).

**Muốn có Result ngay không cần mạng?** Mở `results.html?demo=1` — một Result hoàn chỉnh cho
một quán cà phê Đà Lạt mẫu sẽ dựng sẵn trên trang (số liệu chốt: 42 Đạt / 14 Cần cải thiện /
3 Chưa đạt / 1 Không xác định; P0 = 1, P1 = 1, P2 = 3, P3 = 12).

## 2. Shape Result v2.0

```js
{
  version: '2.0',
  url: 'quan-moc-da-lat.vn',               // người dùng nhập
  finalUrl: 'https://quan-moc-da-lat.vn/', // sau redirects
  statusCode: 200,
  elapsedMs: 1240,                         // thời gian tải HTML
  fetchedAt: '2026-11-07T02:15:30.000Z',
  title: 'Quán cà phê Mộc — Đà Lạt',       // chuỗi title (nếu có)
  checks: [
    {
      id: 'title',                          // 1 trong 60 id ở mục 3
      label: 'Tiêu đề trang (<title>)',     // tiếng Việt, sẵn để hiển thị
      group: 'SEO & hiển thị',              // 1 trong 7 nhóm ở mục 3
      method: 'html',                       // loại bằng chứng: 'html' | 'network' | 'html+network'
      status: 'pass',                       // 'pass' | 'warn' | 'fail' | 'unknown'
      priority: 'P3',                       // 'P0'–'P3' CHỈ khi status là 'warn'/'fail'; pass/unknown là null
      detail: 'Thẻ <title> chỉ 24 ký tự — ngắn hơn khuyến nghị (30–60).',  // bằng chứng
      impact: 'Tiêu đề là dòng đầu tiên khách đọc trên Google…',          // chỉ meaning khi warn/fail
      suggestion: 'Viết lại tiêu đề 30–60 ký tự…',
    }
    // … 60 mục, đúng thứ tự DEFS
  ],
}
```

**Không còn** `weight`, `level`, `passed`, `tinhDiem()` — đã gỡ khỏi `analyze.js`. Bảng từ hiển
thị dùng hằng số có sẵn (mục 5), đừng tự viết lại:

- `STATUS_WORDS`: pass='Đạt', warn='Cần cải thiện', fail='Chưa đạt', unknown='Không xác định'
- `PRIORITY_WORDS`: P0='Khẩn', P1='Cao', P2='Trung bình', P3='Khuyến nghị'
- `METHOD_WORDS`: html='HTML tĩnh', network='Tài nguyên mạng', 'html+network'='HTML + mạng'

### 3.1 Nguyên tắc ưu tiên & unknown (v2.0 — phải hiểu đúng trước khi dựng UI)

- **`unknown` KHÔNG phải là lỗi.** Mục "Không xác định" = chưa đủ bằng chứng để kết luận
  (ví dụ site chặn bot quét robots.txt → HTTP 403; trang không có cửa hàng thực). Không
  cộng vào số mục sai, không đưa vào "Việc cần làm", không nhét vào nhóm cảnh báo.
- **"Chưa đạt ≠ P0"** — hai trục độc lập: trạng thái nói *có vấn đề hay không*, ưu tiên nói
  *quan trọng thế nào với doanh nghiệp*. Ví dụ thiếu liên kết mạng xã hội là Chưa đạt nhưng P3;
  chặn robots toàn site là Chưa đạt P2 — mức P0 (khẩn) chỉ dành cho thứ bóp nghẹt khả năng có
  khách (HTTPS hỏng, chặn Google quét không cần thiết…).
- `priority` chỉ gắn khi `status` là warn/fail; pass/unknown bắt buộc `priority === null`.
- sắp xếp mọi list cần ưu tiên theo thứ tự: P0 → P1 → P2 → P3; trong cùng P, fail đứng
  trước warn.

## 3. 60 hạng mục (v2.0 — bảng trạng thái/ưu tiên chốt)

7 nhóm, tổng **60 mục**. **34 ID từ v1.3 giữ nguyên tên + ý nghĩa** (title, meta_description,
open_graph, canonical, robots_meta, robots_txt, sitemap, structured_data, https, lang, charset,
h1, heading_system, links, analytics, duplicate_ids, mixed_content, viewport, img_alt, img_wh,
favicon, theme_color, lazy_load, resources, page_weight, cta, contact_info, contact_form,
social_links, policy_links, semantic_html, form_labels, accessible_names, blank_links).
26 mục mới: `twitter_card`, `breadcrumb`, `sitemap_lastmod`, `meta_keywords`, `http_links`,
`meta_refresh`, `form_https_action`, `inline_styles`, `manifest`, `apple_icon`,
`render_blocking`, `image_format`, `product_service`, `site_search`, `map_embed`,
`trust_signals`, `business_identity`, `support_info`, `working_hours`, `skip_link`,
`iframe_title`, `table_headers`, `table_caption`, `input_autocomplete`, `form_fieldset`,
`media_autoplay`. Mục kế tiếp theo nhóm:

**SEO & hiển thị** (12 mục)

| id | Mục | Bằng chứng | P nếu fail | P nếu warn |
|---|---|---|---|---|
| title | Tiêu đề trang (<title>) | HTML tĩnh | P1 | P2 |
| meta_description | Mô tả tìm kiếm (meta description) | HTML tĩnh | P1 | P2 |
| open_graph | Chia sẻ mạng xã hội (Open Graph) | HTML tĩnh | P2 | P3 |
| canonical | Địa chỉ chuẩn (canonical) | HTML tĩnh | P2 | P3 |
| robots_meta | Chỉ dẫn công cụ tìm kiếm (robots) | HTML tĩnh | P0 | P3 |
| robots_txt | Tệp robots.txt (chỉ dẫn quét toàn site) | Tài nguyên mạng | P2 | P3 |
| sitemap | Sơ đồ trang (sitemap.xml) | Tài nguyên mạng | P2 | P3 |
| structured_data | Dữ liệu có cấu trúc (JSON-LD) | HTML tĩnh | P2 | P3 |
| twitter_card | Thẻ chia sẻ X/Twitter (Twitter Card) | HTML tĩnh | P3 | P3 |
| breadcrumb | Dải đường dẫn (breadcrumb) | HTML tĩnh | P3 | P3 |
| sitemap_lastmod | Sitemap khai báo ngày cập nhật (lastmod) | Tài nguyên mạng | P3 | P3 |
| meta_keywords | Không còn thẻ meta keywords lỗi thời | HTML tĩnh | P3 | P3 |

**Chuẩn kỹ thuật** (13 mục)

| id | Mục | Bằng chứng | P nếu fail | P nếu warn |
|---|---|---|---|---|
| https | Kết nối bảo mật (HTTPS) | HTML + mạng | P0 | P1 |
| lang | Định nghĩa ngôn ngữ (lang) | HTML tĩnh | P2 | P3 |
| charset | Bảng mã ký tự (charset) | HTML tĩnh | P1 | P2 |
| h1 | Tiêu đề chính (h1) | HTML tĩnh | P1 | P2 |
| heading_system | Hệ thống đề mục (h1–h6) | HTML tĩnh | P2 | P3 |
| links | Chất lượng liên kết (link) | HTML tĩnh | P2 | P3 |
| analytics | Đo lường truy cập (Analytics) | HTML tĩnh | P2 | P3 |
| duplicate_ids | ID HTML không trùng | HTML tĩnh | P2 | P3 |
| mixed_content | Không trộn nội dung HTTP trên HTTPS | HTML + mạng | P0 | P2 |
| http_links | Liên kết trỏ tới http:// | HTML tĩnh | P2 | P2 |
| meta_refresh | Không tự chuyển trang bằng meta refresh | HTML tĩnh | P1 | P3 |
| form_https_action | Biểu mẫu không gửi qua http:// | HTML tĩnh | P1 | P3 |
| inline_styles | Style được gom vào file CSS | HTML tĩnh | P3 | P3 |

**Di động & hình ảnh** (8 mục)

| id | Mục | Bằng chứng | P nếu fail | P nếu warn |
|---|---|---|---|---|
| viewport | Hiển thị trên di động (viewport) | HTML tĩnh | P0 | P1 |
| img_alt | Mô tả ảnh (alt) | HTML tĩnh | P2 | P3 |
| img_wh | Ảnh khai báo kích thước (width/height) | HTML tĩnh | P3 | P3 |
| favicon | Biểu tượng tab (favicon) | HTML tĩnh | P3 | P3 |
| theme_color | Màu giao diện (theme-color) | HTML tĩnh | P3 | P3 |
| lazy_load | Tải ảnh trễ (lazy loading) | HTML tĩnh | P3 | P3 |
| manifest | Khai báo manifest (PWA) | HTML tĩnh | P3 | P3 |
| apple_icon | Biểu tượng iOS (apple-touch-icon) | HTML tĩnh | P3 | P3 |

**Tốc độ tải nội dung** (4 mục)

| id | Mục | Bằng chứng | P nếu fail | P nếu warn |
|---|---|---|---|---|
| resources | Số lượng tài nguyên (JS/CSS) | HTML tĩnh | P3 | P3 |
| page_weight | Dung lượng HTML | HTML + mạng | P2 | P3 |
| render_blocking | Script không chặn hiển thị (defer/async) | HTML tĩnh | P2 | P3 |
| image_format | Ảnh dùng dạng nhẹ (WebP/AVIF) | HTML tĩnh | P3 | P3 |

**Marketing & chuyển đổi** (8 mục)

| id | Mục | Bằng chứng | P nếu fail | P nếu warn |
|---|---|---|---|---|
| cta | Nút kêu gọi hành động (CTA) | HTML tĩnh | P1 | P2 |
| contact_info | Thông tin liên hệ (tel:/mailto:/Zalo) | HTML tĩnh | P1 | P2 |
| contact_form | Biểu mẫu liên hệ | HTML tĩnh | P1 | P2 |
| social_links | Liên kết mạng xã hội | HTML tĩnh | P3 | P3 |
| policy_links | Trang chính sách / quy định | HTML tĩnh | P2 | P3 |
| product_service | Sản phẩm / dịch vụ được giới thiệu rõ | HTML tĩnh | P1 | P2 |
| site_search | Ô tìm kiếm trên trang | HTML tĩnh | P3 | P3 |
| map_embed | Bản đồ / đường đi tới cửa hàng | HTML tĩnh | P3 | P3 |

**Tin cậy & minh bạch** (4 mục — nhóm mới v2.0 tách từ các mục rời)

| id | Mục | Bằng chứng | P nếu fail | P nếu warn |
|---|---|---|---|---|
| trust_signals | Dấu hiệu tạo niềm tin (đánh giá khách hàng) | HTML tĩnh | P2 | P3 |
| business_identity | Thông tin nhận diện doanh nghiệp | HTML tĩnh | P2 | P3 |
| support_info | Trang hỗ trợ / FAQ | HTML tĩnh | P2 | P3 |
| working_hours | Giờ mở cửa / làm việc | HTML tĩnh | P3 | P3 |

**Trải nghiệm & truy cập** (11 mục)

| id | Mục | Bằng chứng | P nếu fail | P nếu warn |
|---|---|---|---|---|
| semantic_html | Cấu trúc HTML ngữ nghĩa | HTML tĩnh | P2 | P3 |
| form_labels | Trường nhập có nhãn (label) | HTML tĩnh | P2 | P3 |
| accessible_names | Liên kết/nút có tên truy cập | HTML tĩnh | P2 | P3 |
| blank_links | Liên kết mở tab mới có rel bảo mật | HTML tĩnh | P2 | P3 |
| skip_link | Liên kết nhảy tới nội dung chính | HTML tĩnh | P2 | P3 |
| iframe_title | Khung nhúng (iframe) có tiêu đề | HTML tĩnh | P2 | P3 |
| table_headers | Bảng dữ liệu có hàng tiêu đề (<th>) | HTML tĩnh | P2 | P3 |
| table_caption | Bảng dữ liệu có tiêu đề (<caption>) | HTML tĩnh | P3 | P3 |
| input_autocomplete | Trường thông tin cá nhân có autocomplete | HTML tĩnh | P3 | P3 |
| form_fieldset | Nhóm lựa chọn có fieldset/legend | HTML tĩnh | P3 | P3 |
| media_autoplay | Video/âm thanh không tự phát tiếng | HTML tĩnh | P2 | P3 |

Bảng `PRIORITY_MAP[id].{fail,warn}` trên cũng chốt trong `js/analyze.js` (export
`WebCheck.PRIORITY_MAP`) — code là nguồn sự thật, bảng này chỉ để tra nhanh.

## 4. Vị trí cắm trên results.html (trạng thái v2.0)

| Mốc | Slot id | Trạng thái v2.0 |
|---|---|---|
| 2 | `#summary-slot` | **Đã cắm** — `js/moc2-tongquan.js`: thống kê 4 trạng thái + "Việc cần làm trước" (P0→P1) + 6 câu hỏi doanh nghiệp (không điểm, không AI) |
| 3 | `#ai-slot` | **Tạm tháo** — slot giữ nguyên, tự ẩn (CSS `:empty`); script `js/moc3-ai.js` không dùng (mục 8 nói cách dựng lại) |
| 4 | `#export-slot` | **Đã cắm (viết lại v2.0)** — `js/moc4-xuat.js`: báo cáo text CẦN LÀM TRƯỚC + chi tiết P0→P3; nút sao chép / tải .txt / xem trước |
| 5 | `#history-slot` | **Đã cắm** — `js/moc5-lich-su.js`: tự ghi lịch sử kiểm tra vào localStorage, xem lại khi chưa có Result, xoá từng bản có hỏi xác nhận (không điểm, không gọi API) |

Slot trống tự ẩn (CSS `:empty { display:none }`). `renderChecklist` v2.0 đã dựng sẵn checklist
trong `#checklist`: **7 khối `<details>`** (id `grp-0`…`grp-6`) theo nhóm, đầu trang có **bộ lọc
chip theo trạng thái + ưu tiên** (`.chip` với `data-kind`/`data-value`), mỗi mục gồm glyph
trạng thái (✓/!/✕/?) + badge loại bằng chứng + badge `P0…P3` (chỉ khi có ưu tiên) + bằng chứng
+ tác động (warn/fail) + hướng khắc phục. Note số mục: "Hiện X/60 mục".

## 5. Cái người khác có sẵn

- `window.WebCheck` (từ `js/analyze.js`):
  - `runChecks(html, meta, buildDoc)` — chạy lại bộ phân tích (hiếm khi cần; `main.js` đã làm).
  - `renderChecklist(result, mount)` — checklist v2.0 với bộ lọc (như mục 4).
  - `demoResult(buildDoc)` — Result mẫu (đảm bảo gán `buildDoc` khi chạy ngoài trình duyệt).
  - `docKetQua()` — nạp Result (gate `version === '2.0'`); mốc 2–5 nên dùng hàm này thay tự
    đọc sessionStorage.
  - Dữ liệu/bảng từ: `DEFS` (60 mục), `GROUPS` (7 nhóm), `PRIORITY_MAP`,
    `STATUS_WORDS`, `PRIORITY_WORDS`, `METHOD_WORDS`, `VERSION` ('2.0').
  - ~~`tinhDiem()`~~ **đã gỡ v2.0** — không gọi được, đừng tham chiếu.
- `js/moc2-tongquan.js`, `js/moc4-xuat.js` — cắm sẵn vào `#summary-slot` / `#export-slot`
  (mốc 2/4 được phép thay file tương ứng nhưng phải nói trước trong nhóm).
- `styles.css` có sẵn biến màu 4 mức `--pass/--warn/--fail/--unknown` + nền `*-bg`; CSS v2.0:
  khối tổng quan `.ov-*`, bộ lọc `.chk-filters/.chip`, badge `.badge/.pr-P0…P3`.

## 6. Quy tắc giữ cho ghép không đau

1. Mốc 1 độc quyền: `js/analyze.js`, `js/main.js`, `js/results.js`, `api/fetch.mjs`, `tests/`.
   Mốc 3 độc quyền: `js/moc3-ai.js` (+ `api/ai.mjs` nếu tự tạo proxy).
   Cần thêm hàm gì thì trao đổi — đừng sửa trực tiếp file của người khác.
2. Các mốc **chỉ đụng slot của mình** (đặt trong `results.html`, comment đánh dấu sẵn) và file JS riêng.
3. Đọc kết quả duy nhất qua `WebCheck.docKetQua()` — không tự gọi lại `/api/fetch`, không tự
   parse sessionStorage.
4. Không thêm thư viện mới mà không thống nhất cả nhóm (hiện frontend không có dependency — cây thư mục nhẹ, deploy nhanh).
5. Đặt tên biến/hàm tiếng Việt hoặc tiếng Anh đều được, nhưng **nội dung hiển thị người dùng phải tiếng Việt**.
6. **Quy tắc riêng v3.0:** app WEBCHECK AI được hiển thị điểm tổng /100 (ScoreSummary) kèm giải
   thích thang điểm và trọng số — không được trình bày điểm như dữ liệu xếp hạng chính thức của
   Google; `unknown` không được coi là lỗi hay cảnh báo (loại khỏi cả tử và mẫu khi chấm, không
   đưa vào lộ trình); mọi list ưu tiên sắp P0→P3.

## 7. Chi tiết API (khi cần hiểu sâu — không dùng)

`GET /api/fetch?url=<encoded>` chỉ kéo HTML thô về cho trình duyệt (tránh CORS và bị chặn):
- 200 → `{ html, statusCode, finalUrl, elapsedMs }`
- lỗi → `{ error, detail }` (thông báo tiếng Việt thân thiện: hết giờ, 404, bị chặn, không phải HTML, quá lớn…)

Có thêm chế độ phụ `&soft=1` — riêng mốc 1 dùng để lấy robots.txt/sitemap.xml (lỗi 404 của
trang gốc trả về 200 kèm `statusCode` thay vì báo lỗi). `meta` gửi vào `runChecks` gồm
`{ inputUrl, finalUrl, statusCode, elapsedMs, robots:{statusCode,text}, sitemap:{statusCode,text} }`.
Các mốc 2–5 không cần biết flag này.

## 8. Mốc 3 — Nhận xét AI (TẠM THÁO — cách dựng lại cho v2.0)

Giữ nguyên như v1.3: thẻ `<script src="js/moc3-ai.js">` được gỡ khỏi `results.html`; slot
`#ai-slot` giữ nguyên trong HTML (tự ẩn nhờ CSS `:empty`); **file `js/moc3-ai.js` giữ nguyên
không đụng** — đây vẫn là bệ đứng của mốc 3.

**Cách dựng lại khi được phép (4 bước, không phá hợp đồng):**

1. Thêm lại vào `results.html`, sau `js/moc4-xuat.js`:
   `<script src="js/moc3-ai.js" defer></script>` (kèm comment như cũ).
2. Mở `js/moc3-ai.js` — file đọc Result qua `WebCheck.docKetQua()` và render vào `#ai-slot`
   theo shape ở dưới. Dữ liệu v2.0 đã đổi: không còn `level`; dùng `status` + `priority`;
   **không còn `tinhDiem()`** — nếu chỗ của/thanh sắp xếp nào đang dựa trên weight thì
   **đổi sang sort theo `priority` (P0→P3)** như mục 3.1. Feed gọn cho AI: mảng
   `{ label, status, priority, suggestion }` của 60 mục.
3. Cập nhật mục 4 + mục 9 của hợp đồng.
4. Đừng hiện lời nhận xét AI phải dựa trên "điểm" — chỉ dựa trạng thái + ưu tiên + bằng chứng.

**Output bắt buộc** (render khung chờ đúng shape này):

```js
{
  summary: '1 câu tóm tắt tình trạng trang',
  strengths: ['điểm mạnh 1', 'điểm mạnh 2', 'điểm mạnh 3'],
  improvements: ['việc cần làm 1', 'việc cần làm 2', 'việc cần làm 3'],
}
// đúng 3 phần tử mỗi mảng, mỗi câu ≤ 160 ký tự, tiếng Việt
```

Các lựa chọn kết nối AI (key trong trình duyệt / proxy serverless / bản dự phóng fallback) và
prompt mẫu vẫn như v1.3 — giữ ở trong file `js/moc3-ai.js`, không lặp lại ở đây.

## 9. Lịch sử hợp đồng

- **v1.1** (mốc 1 ban đầu) — 19 mục.
- **v1.2** — thêm 3 mục `robots_txt`, `sitemap`, `links`; cân weight tổng = 100; robots.txt/
  sitemap 403/5xx → `unknown`; thêm `WebCheck.docKetQua()`.
- **v1.2.1** — vá nhỏ: `links` không trừ oan link icon có aria-label/title; chi tiết sitemap
  nêu đích danh dạng `sitemapindex`.
- **v1.3** — tắt AI (tháo script, giữ slot + file); chấm điểm /100 minh bạch
  `WebCheck.tinhDiem()`; mở rộng 22 → 34 mục; `js/moc2-diem.js` (`#score-slot`) và
  `js/moc4-xuat.js` cắm sẵn; tests rewrite (25 test).
- **v2.0** (hiện tại — mốc 1 làm lại gần như từ đầu):
  1. **Bỏ chấm điểm /100 toàn hệ thống.** Xoá `tinhDiem()`, `js/moc2-diem.js`, `#score-slot`,
     các chip điểm. Cấm hiển thị điểm dưới bất kỳ hình thức nào (tổng, nhóm, weight, xếp loại).
  2. **Hệ thống trạng thái 4 mức + ưu tiên.** `checks[]` đổi `level` → `status`; thêm
     `priority` (P0–P3, chỉ khi warn/fail) và `impact`. Nguyên tắc: unknown không phải lỗi;
     Chưa đạt ≠ P0 (mục 3.1).
  3. **Mở rộng 34 → 60 mục** (mục 3). Tách nhóm thứ 7 "Tin cậy & minh bạch"; nhóm
     "Marketing & chuyển đổi" nhận thêm tel:/mailto: (gộp vào `contact_info`).
     34 ID cũ giữ nguyên ID + ý nghĩa.
  4. **Mốc 2 viết lại** thành `js/moc2-tongquan.js` → `#summary-slot`: thống kê 4 trạng thái
     (kèm ghi chú minh bạch unknown) + "Việc cần làm trước" P0→P1 + 6 câu hỏi doanh nghiệp.
  5. **Mốc 4 viết lại (v2.0)**: báo cáo text sắp CẦN LÀM TRƯỚC (P0/P1) rồi chi tiết từng mục
     theo nhóm P0→P3, có mục GIỚI HẠN CỦA BÁO CÁO; không điểm, không AI.
  6. **renderChecklist v2.0**: 7 nhóm `<details>` + chip lọc theo trạng thái và ưu tiên + badge
     bằng chứng/ưu tiên; docKetQua có gate phiên bản (từ chối Result v1.2/v1.3).
  7. Tests rewrite cho v2.0 (46 test, `tests/analyze.test.mjs` — số demo chốt 42/14/3/1).
- **v3.0** (08/11/2026): **sản phẩm chính = app WEBCHECK AI** (`client/` React + `server/` Express,
  deploy Vercel 1-lambda `server/index.js` theo `vercel.json` ở gốc). Cho phép hiển thị điểm tổng
  /100 — bãi bỏ luật "cấm hiển thị điểm" của v2.0. `webcheck/` giữ vai trò engine/library: bộ máy
  60 mục + tests vẫn là **gate chất lượng** (46 test + tests server `server/tests/scoring.test.mjs`
  5 test), UI vanilla chỉ còn là máy chấm QA. UI "lộ trình cải thiện ưu tiên" của app do mốc bổ
  sung theo thiết kế nhóm (components/RoadmapPanel.jsx).
