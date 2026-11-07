# WebCheck — hợp đồng ghép code (bản cho mốc 2, 3, 4, 5)

Tài liệu này chốt cách các mốc cắm vào phần Mốc 1. Quy ước của nhóm là **làm riêng rồi ghép**,
nên mọi thứ các bạn cần đều nằm ở đây — đọc kỹ trước khi viết code để không phải chỉnh sau.

---

## 1. Cách lấy kết quả (con đường duy nhất)

Mốc 1 chạy kiểm tra xong sẽ **lưu object Result vào `sessionStorage["webcheck:result"]`** rồi
tự chuyển sang trang `results.html`. Các mốc **chỉ cần đọc key này**, không gọi lại API, không
parse lại HTML:

```js
const result = JSON.parse(sessionStorage.getItem('webcheck:result'));
```

Lưu ý: sessionStorage sống theo tab/phien — đóng tab là mất (đúng ý chuyền trang; lịch sử lâu dài là việc của mốc 5, tự lưu vào localStorage riêng).

**Muốn có Result ngay không cần mạng?** Mở `results.html?demo=1` — một Result hoàn chỉnh cho
one quán cà phê Đà Lạt mẫu (có cả warn/fail đủ điều) sẽ dựng sẵn trên trang.

## 2. Shape Result v1.2

```js
{
  version: '1.2',
  url: 'quan-moc-da-lat.vn',           // người dùng nhập
  finalUrl: 'https://quan-moc-da-lat.vn/', // sau redirects
  statusCode: 200,
  elapsedMs: 1240,                      // thời gian tải HTML
  fetchedAt: '2026-11-07T02:15:30.000Z',
  title: 'Quán cà phê Mộc — Đà Lạt',   // chuỗi title (nếu có) — tiện cho nhận xét
  checks: [
    {
      id: 'title',                       // 1 trong 22 id ở mục 3
      label: 'Tiêu đề trang (<title>)',  // tiếng Việt, sẵn để hiển thị
      group: 'SEO & hiển thị',
      weight: 10,                        // GỢI Ý; mốc 2 được tự định lại trọng số
      level: 'pass',                     // 'pass' | 'warn' | 'fail' | 'unknown'
      passed: true,                      // true chỉ khi level==='pass'; warn/fail=false; unknown=null
      detail: 'Thẻ <title> chỉ 24 ký tự — ngắn hơn khuyến nghị (30–60).',
      suggestion: 'Viết lại tiêu đề 30–60 ký tự: nêu mặt hàng chính…',
    }
    // … 22 mục
  ],
}
```

Nghĩa của từng mức (mốc 3 (AI) nên phản chiếu đúng sắc thái này):
- `pass` — đạt chuẩn.
- `warn` — **có nhưng chưa chuẩn** (ví dụ title 24 ký tự). Đây là sự tinh tế quan trọng: coi như đạt một phần khi tính điểm, nhắc riêng khi nhận xét.
- `fail` — thiếu hoặc sai rõ ràng.
- `unknown` — không xác định được (trang trả lỗi). Với `robots_txt`/`sitemap`, unknown = không fetch được
  tệp (lỗi mạng / site chặn), không phải lỗi cấu hình của website. Mốc 2 cân nhắc: xử lý như 0
  điểm hoặc loại khỏi tổng.

## 3. 22 hạng mục

**SEO & hiển thị** (37)
| id | Mục | Weight |
|---|---|---|
| title | Tiêu đề trang (`<title>`) | 8 |
| meta_description | Mô tả tìm kiếm (meta description) | 8 |
| open_graph | Chia sẻ mạng xã hội (Open Graph) | 3 |
| canonical | Địa chỉ chuẩn (canonical) | 4 |
| robots_meta | Chỉ dẫn công cụ tìm kiếm (robots) | 4 |
| robots_txt | Tệp robots.txt (chỉ dẫn quét toàn site) | 3 |
| sitemap | Sơ đồ trang (sitemap.xml) | 3 |
| structured_data | Dữ liệu có cấu trúc (JSON-LD) | 4 |

**Chuẩn kỹ thuật** (33)
| id | Mục | Weight |
|---|---|---|
| https | Kết nối bảo mật (HTTPS) | 7 |
| lang | Định nghĩa ngôn ngữ (lang) | 4 |
| charset | Bảng mã ký tự (charset) | 4 |
| h1 | Tiêu đề chính (h1) | 7 |
| heading_system | Hệ thống đề mục (h2–h6) | 4 |
| links | Liên kết (link) | 3 |
| analytics | Đo lường truy cập (Analytics) | 4 |

**Di động & hình ảnh** (26)
| id | Mục | Weight |
|---|---|---|
| viewport | Hiển thị trên di động (viewport) | 9 |
| img_alt | Mô tả ảnh (alt) | 7 |
| favicon | Biểu tượng tab (favicon) | 4 |
| theme_color | Màu giao diện (theme-color) | 2 |
| lazy_load | Tải ảnh trễ (lazy loading) | 4 |

**Tốc độ tải nội dung**
| id | Mục | Weight |
|---|---|---|
| resources | Số lượng tài nguyên (JS/CSS) | 2 |
| page_weight | Dung lượng HTML | 2 |

Tổng weight = 100.

## 4. Vị trí cắm trên results.html

| Mốc | Slot id | Nhiệm vụ |
|---|---|---|
| 2 | `#score-slot` | Điểm /100 + tổng hợp theo nhóm |
| 3 | `#ai-slot` | Nhận xét AI: 3 điểm mạnh, 3 điểm cần cải thiện (feed bằng `title` + `checks[]` tiếng Việt sẵn có) |
| 4 | `#export-slot` | Nút xuất báo cáo text (copy gửi khách) — nên dựng từ Result để không phụ thuộc mốc 3; nếu muốn lồng phần AI thì đọc DOM `#ai-slot` khi có |
| 5 | `#history-slot` | Lịch sử các lần kiểm tra (localStorage do mốc 5 tự quản, key riêng) |

Slot trống tự ẩn (CSS `:empty { display:none }`). Mỗi mốc thêm file `js/<ten-moc>.js` của mình
và **1 dòng** `<script defer src="js/&lt;ten-moc&gt;.js">` cuối `results.html`.

## 5. Cái người khác có sẵn

- `window.WebCheck` (từ `js/analyze.js`):
  - `runChecks(html, meta, buildDoc)` — chạy lại bộ phân tích (hiếm khi cần; main.js đã làm).
  - `renderChecklist(result, mount)` — checklist tạm của mốc 1; mốc 2 thay phần này bằng giám điểm đẹp (chỉ cần đổi nội dung bên dưới `#score-slot`, có thể dùng `#checklist` lại hoặc dựng riêng DOM của mình).
  - `demoResult(buildDoc)` — Result mẫu.
- `styles.css` có sẵn biến màu 4 mức: `--pass/--warn/--fail/--unknown` + nền `*-bg` — dùng trùng để cả trang một giọng.

## 6. Quy tắc giữ cho ghép không đau

1. Mốc 1 độc quyền: `js/analyze.js`, `js/main.js`, `js/results.js`, `api/fetch.mjs`, `tests/`.
   Cần thêm hàm gì thì trao đổi — đừng sửa trực tiếp.
2. Các mốc **chỉ đụng slot của mình** (đặt trong `results.html`, comment đánh dấu sẵn) và file JS riêng.
3. Đọc kết quả duy nhất từ `sessionStorage["webcheck:result"]` — không tự gọi lại `/api/fetch`.
4. Không thêm thư viện mới mà không thống nhất cả nhóm (hiện frontend không có dependency — cây thư mục nhẹ, deploy nhanh).
5. Đặt tên biến/hàm tiếng Việt hoặc tiếng Anh đều được, nhưng **nội dung hiển thị người dùng phải tiếng Việt**.

## 7. Chi tiết API (khi cần hiểu sâu — không dùng)

`GET /api/fetch?url=<encoded>` chỉ kéo HTML thô về cho trình duyệt (tránh CORS và bị chặn):
- 200 → `{ html, statusCode, finalUrl, elapsedMs }`
- lỗi → `{ error, detail }` (thông báo tiếng Việt thân thiện: hết giờ, 404, bị chặn, không phải HTML, quá lớn…)

Có thêm chế độ phụ `&soft=1` — riêng mốc 1 dùng để lấy robots.txt/sitemap.xml (lỗi 404 của
trang gốc trả về 200 kèm `statusCode` thay vì báo lỗi). Các mốc 2–5 không cần biết flag này.

## 8. Lịch sử hợp đồng

- **v1.1** (mốc 1 ban đầu) — 19 mục.
- **v1.2** (hiện tại) — thêm 3 mục: `robots_txt`, `sitemap` (nhóm SEO & hiển thị) và `links`
  (nhóm Chuẩn kỹ thuật). Cân chỉnh lại weight để tổng vẫn = 100: title 10→8, meta_description
  10→8, open_graph 4→3, https 8→7, h1 8→7, viewport 10→9, img_alt 8→7; 3 mục mới mỗi mục 3.
  Nếu mốc 2 đã tự định trọng số riêng thì cứ dùng — weight chỉ là gợi ý; nhưng **danh sách 22 id
  ở mục 3 là bắt buộc** (rendering và xử lý `unknown` phải đúng cho cả 3 mục mới).
  Dữ liệu robots/sitemap do mốc 1 fetch sẵn vào `meta` — mốc 2–5 chỉ đọc `checks[]` như cũ.
