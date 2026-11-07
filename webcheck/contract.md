# WebCheck — hợp đồng ghép code (v1.3)

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

## 2. Shape Result v1.3

```js
{
  version: '1.3',
  url: 'quan-moc-da-lat.vn',           // người dùng nhập
  finalUrl: 'https://quan-moc-da-lat.vn/', // sau redirects
  statusCode: 200,
  elapsedMs: 1240,                      // thời gian tải HTML
  fetchedAt: '2026-11-07T02:15:30.000Z',
  title: 'Quán cà phê Mộc — Đà Lạt',   // chuỗi title (nếu có)
  checks: [
    {
      id: 'title',                       // 1 trong 34 id ở mục 3
      label: 'Tiêu đề trang (<title>)',  // tiếng Việt, sẵn để hiển thị
      group: 'SEO & hiển thị',           // 1 trong 6 nhóm ở mục 3
      weight: 6,                         // bảng CHỐT ở mục 3 (tổng = 100)
      level: 'pass',                     // 'pass' | 'warn' | 'fail' | 'unknown'
      passed: true,                      // true chỉ khi level==='pass'; warn/fail=false; unknown=null
      detail: 'Thẻ <title> chỉ 24 ký tự — ngắn hơn khuyến nghị (30–60).',
      suggestion: 'Viết lại tiêu đề 30–60 ký tự: nêu mặt hàng chính…',
    }
    // … 34 mục
  ],
}
```

Nghĩa của từng mức (không đổi so với v1.2):
- `pass` — đạt chuẩn.
- `warn` — **có nhưng chưa chuẩn** (ví dụ title 24 ký tự). Tính điểm = nửa weight (mục 3.1).
- `fail` — thiếu hoặc sai rõ ràng. Điểm = 0.
- `unknown` — không xác định được (înm không fetch được, HTTP 403/5xx, hoặc loại check không áp dụng).
  **v1.3: unknown được loại khỏi CẢ tử lẫn mẫu số** — không điểm, không bị coi là lỗi (mục 3.1).

## 3. 34 hạng mục (v1.3 — bảng trọng số chốt, tổng = 100)

**SEO & hiển thị** (26)
| id | Mục | Weight |
|---|---|---|
| title | Tiêu đề trang (`<title>`) | 6 |
| meta_description | Mô tả tìm kiếm (meta description) | 6 |
| open_graph | Chia sẻ mạng xã hội (Open Graph) | 2 |
| canonical | Địa chỉ chuẩn (canonical) | 3 |
| robots_meta | Chỉ dẫn công cụ tìm kiếm (robots) | 3 |
| robots_txt | Tệp robots.txt (chỉ dẫn quét toàn site) | 2 |
| sitemap | Sơ đồ trang (sitemap.xml) | 2 |
| structured_data | Dữ liệu có cấu trúc (JSON-LD) | 2 |

**Chuẩn kỹ thuật** (23)
| id | Mục | Weight |
|---|---|---|
| https | Kết nối bảo mật (HTTPS) | 6 |
| lang | Định nghĩa ngôn ngữ (lang) | 3 |
| charset | Bảng mã ký tự (charset) | 2 |
| h1 | Tiêu đề chính (h1) | 4 |
| heading_system | Hệ thống đề mục (h2–h6) | 2 |
| links | Liên kết (link) | 2 |
| analytics | Đo lường truy cập (Analytics) | 2 |
| duplicate_ids | ID HTML không trùng | 1 |
| mixed_content | Không trộn nội dung HTTP trên HTTPS | 1 |

**Di động & hình ảnh** (17)
| id | Mục | Weight |
|---|---|---|
| viewport | Hiển thị trên di động (viewport) | 6 |
| img_alt | Mô tả ảnh (alt) | 4 |
| img_wh | Ảnh khai báo kích thước (width/height) | 2 |
| favicon | Biểu tượng tab (favicon) | 2 |
| theme_color | Màu giao diện (theme-color) | 1 |
| lazy_load | Tải ảnh trễ (lazy loading) | 2 |

**Tốc độ tải nội dung** (3)
| id | Mục | Weight |
|---|---|---|
| resources | Số lượng tài nguyên (JS/CSS) | 1 |
| page_weight | Dung lượng HTML | 2 |

**Marketing & chuyển đổi** (18)
| id | Mục | Weight |
|---|---|---|
| cta | Nút kêu gọi hành động (CTA) | 5 |
| contact_info | Thông tin liên hệ | 5 |
| contact_form | Biểu mẫu liên hệ | 4 |
| social_links | Liên kết mạng xã hội | 2 |
| policy_links | Trang chính sách / quy định | 2 |

**Trải nghiệm & truy cập** (13)
| id | Mục | Weight |
|---|---|---|
| semantic_html | Cấu trúc HTML ngữ nghĩa | 4 |
| form_labels | Trường nhập có nhãn (label) | 4 |
| accessible_names | Liên kết/nút có tên truy cập | 3 |
| blank_links | Liên kết mở tab mới có rel bảo mật | 2 |

Tổng weight = **100**. ID của 22 mục v1.2 **giữ nguyên tên** (chỉ gán lại weight); 12 mục mới
thêm: `duplicate_ids`, `mixed_content`, `img_wh`, `cta`, `contact_info`, `contact_form`,
`social_links`, `policy_links`, `semantic_html`, `form_labels`, `accessible_names`, `blank_links`.

### 3.1 Công thức chấm điểm (v1.3 — nêu rõ trên cả giao diện)

- `pass` = đủ weight · `warn` = weight/2 (giữ số lẻ, hiển thị "3,5") · `fail` = 0.
- `unknown` = không điểm **và không vào mẫu số** ("thực chấm được X/100 trọng số").
- `tổng = round(min(earned / maxChấmĐược, 1) × 100, 1)`; xếp loại:
  ≥90 Tốt · ≥75 Khá · ≥60 Trung bình · ≥40 Yếu · <40 Rất yếu.
- Hàm chấm là `WebCheck.tinhDiem(result)` (thuần, trong `js/analyze.js`) —
  trả `{ total, capDo, earned, max, mauSo, groups[], counts{pass,warn,fail,unknown} }`.
  `groups[i] = { name, earned, max, weight }` (`weight` = thang đủ, `max` = phần chấm được).

## 4. Vị trí cắm trên results.html (trạng thái v1.3)

| Mốc | Slot id | Trạng thái v1.3 |
|---|---|---|
| 2 | `#score-slot` | **Đã cắm** — `js/moc2-diem.js`: điểm /100 + xếp loại + thanh nhóm + thống kê (đọc `WebCheck.tinhDiem`) |
| 3 | `#ai-slot` | **Tạm tháo** — slot giữ nguyên, tự ẩn (`:empty`); script `js/moc3-ai.js` đã gỡ khỏi trang (mục 8 nói cách dựng lại) |
| 4 | `#export-slot` | **Đã cắm** — `js/moc4-xuat.js`: nút sao chép / tải .txt báo cáo (không AI) |
| 5 | `#history-slot` | Trống, chờ mốc 5 (lịch sử localStorage tự quản) |

Slot trống tự ẩn (CSS `:empty { display:none }`). `renderChecklist` v1.3 đã dựng sẵn
checklist trong `#checklist`: 6 khối `<details>` thu gọn/mở được theo nhóm, mỗi mục có
glyph trạng thái + chip điểm "x/w" (`—/w` cho unknown, `0/w` cho fail) + giải thích + gợi ý.

## 5. Cái người khác có sẵn

- `window.WebCheck` (từ `js/analyze.js`):
  - `runChecks(html, meta, buildDoc)` — chạy lại bộ phân tích (hiếm khi cần; main.js đã làm).
  - `renderChecklist(result, mount)` — checklist v1.3: 6 khối `<details>` theo nhóm, chip điểm từng mục.
  - `tinhDiem(result)` — **mới v1.3**: chấm điểm /100 theo công thức mục 3.1 (thuần, không cần DOM).
  - `demoResult(buildDoc)` — Result mẫu.
  - `docKetQua()` — nạp Result giúp bạn: `?demo=1` → Result mẫu, ngược lại đọc `sessionStorage["webcheck:result"]`; trả `null` khi hỏng/shape sai. **Mốc 2–5 nên dùng hàm này thay tự đọc sessionStorage.**
- `js/moc2-diem.js`, `js/moc4-xuat.js` — cắm sẵn vào `#score-slot` / `#export-slot` (mốc 2/4 được phép thay file tương ứng nhưng phải nói trước trong nhóm).
- `styles.css` có sẵn biến màu 4 mức: `--pass/--warn/--fail/--unknown` + nền `*-bg`, bộ CSS khối điểm `.score/.gbar/.counts` và chip `.check-pts` — dùng trùng để cả trang một giọng.

## 6. Quy tắc giữ cho ghép không đau

1. Mốc 1 độc quyền: `js/analyze.js`, `js/main.js`, `js/results.js`, `api/fetch.mjs`, `tests/`.
   Mốc 3 độc quyền: `js/moc3-ai.js` (+ `api/ai.mjs` nếu tự tạo proxy).
   Cần thêm hàm gì thì trao đổi — đừng sửa trực tiếp file của người khác.
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

## 8. Mốc 3 — Nhận xét AI (TẠM THÁO trong v1.3 — cách dựng lại)

Yêu cầu phiên bản v1.3: **không hiển thị AI nhận xét, không gọi API AI, không hiện bản dự
phóng**. Đã làm: thẻ `<script src="js/moc3-ai.js">` được gỡ khỏi `results.html`; slot
`#ai-slot` giữ nguyên trong HTML (tự ẩn nhờ CSS `:empty`); **file `js/moc3-ai.js` giữ nguyên
không đụng** — đây vẫn là bệ đứng của mốc 3.

**Cách dựng lại khi được phép (3 bước, không phá hợp đồng):**

1. Thêm lại vào `results.html`, sau `js/moc4-xuat.js`:
   `<script src="js/moc3-ai.js" defer></script>` (kèm comment như cũ).
2. Mở `js/moc3-ai.js` — file đọc Result qua `WebCheck.docKetQua()` và render vào `#ai-slot`
   theo shape góc dưới đây. Chỉ đụng 2 chổ đánh dấu `VIỆC CỦA MỘC 3`: `layNhanXet()` và
   dòng chú thích trong `render()`.
3. Cập nhật mục 4 + mục 9 của hợp đồng.

**Input** (khung đã lấy sẵn): object Result v1.3 — hữu dụng nhất là `result.title`,
`WebCheck.tinhDiem(result).total` và `result.checks[]` (mỗi mục: `label` tiếng Việt,
`level` pass/warn/fail/unknown, `detail`, `suggestion`). Feed gọn cho AI: chỉ gửi mảng
`{ label, level, suggestion }` của 34 mục (~2,6 KB).

**Output bắt buộc** (render khung chờ đúng shape này):

```js
{
  summary: '1 câu tóm tắt tình trạng trang',
  strengths: ['điểm mạnh 1', 'điểm mạnh 2', 'điểm mạnh 3'],
  improvements: ['việc cần làm 1', 'việc cần làm 2', 'việc cần làm 3'],
}
// đúng 3 phần tử mỗi mảng, mỗi câu ≤ 160 ký tự, tiếng Việt
// (lưu ý: ràn buộc "đúng 3 phần tử" áp cho lời gọi AI thật; bản dự phóng fallback
// được phép trả ít hơn — render đã đón cả mảng <3)
```

**Ba cách làm AI — chọn 1 làm đường chính:**

| Cách | Cụ thể | Khi nào dùng |
|---|---|---|
| A. Key nằm trong trình duyệt | `fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=API_KEY', …)` gọi thẳng từ `layNhanXet()` | Nhanh nhất, không cần thêm file. Key bị lộ trong code public → chỉ hợp demo nội bộ |
| B. Proxy serverless (khuyên dùng) | Tạo `api/ai.mjs` kiểu giống `api/fetch.mjs`: nhận POST từ `layNhanXet()` → gọi Gemini/Groq bằng key lấy từ biến môi trường → trả lại JSON đã rút gọn | Key nằm trong Vercel Environment Variables → không lộ, link live dùng được cho mọi người |
| C. Không gọi AI | Bản "dự phóng" đang có sẵn trong khung (sinh lời nhận xét từ rule trên các mục) | Mặc định fallback khi A/B hỏng — **giữ nguyên, đừng xoá**. Lưu ý v1.3: bản dự phóng đang bị chặn hiển thị ở mức trang (slot ẩn + script tháo); đụng lại file thì nhớ logic này |

**Key miễn phí + model:** Google AI Studio (aistudio.google.com) — tạo key Gemini không phí;
Groq cũng có free tier. Quán: `gemini-2.5-flash` (nhanh, hiểu tiếng Việt tốt, đủ cho việc này).
Key vào Vercel: Settings → Environment Variables (hoặc `vercel env add GEMINI_API_KEY`); chạy local
bằng `vercel dev` đọc `.env.local`.

**Prompt mẫu dán cho model** (soạn trong `layNhanXet()`):

```
Bạn là cố vấn SEO bằng tiếng Việt cho chủ doanh nghiệp nhỏ. Trả về DUY NHẤT một JSON hợp lệ,
không giải thích, theo dạng {"summary": "…", "strengths": ["…","…","…"], "improvements": ["…","…","…"]}.
Mỗi chuỗi ≤ 160 ký tự, giọng thân thiện, dựa CHỈ vào dữ liệu bên dưới, không bịa con số.
Dữ liệu 34 hạng mục: <JSON checks[]>
```

**Chống lỗi format:** dùng responseMimeType JSON của Gemini (hoặc thêm "chỉ trả JSON" vào prompt),
`JSON.parse` trong try/catch — hỏng thì ném lỗi để khung rơi về bản dự phóng (C).

**Chưa có key kiểm thử:** mở `results.html?demo=1` — khung tự chạy bản dự phóng (sau khi dựng lại).

## 9. Lịch sử hợp đồng

- **v1.1** (mốc 1 ban đầu) — 19 mục.
- **v1.2** (hiện tại) — thêm 3 mục: `robots_txt`, `sitemap` (nhóm SEO & hiển thị) và `links`
  (nhóm Chuẩn kỹ thuật). Cân chỉnh lại weight để tổng vẫn = 100: title 10→8, meta_description
  10→8, open_graph 4→3, https 8→7, h1 8→7, viewport 10→9, img_alt 8→7; 3 mục mới mỗi mục 3.
  Nếu mốc 2 đã tự định trọng số riêng thì cứ dùng — weight chỉ là gợi ý; nhưng **danh sách 22 id
  ở mục 3 là bắt buộc** (rendering và xử lý `unknown` phải đúng cho cả 3 mục mới).
  Dữ liệu robots/sitemap do mốc 1 fetch sẵn vào `meta` — mốc 2–5 chỉ đọc `checks[]` như cũ.
- **v1.2 — tinh chỉnh sau review (cùng bản)**: robots.txt/sitemap chỉ trả `warn` ("chưa có tệp")
  khi HTTP **404**; 403/5xx → `unknown` (site chặn bot / server sự cố — đúng định nghĩa mục 2,
  đừng kết luận nhầm). Thêm `WebCheck.docKetQua()` (mục 5) — mốc 2–5 dùng nạp Result; spinner
  trang nhập (plan yêu cầu, giờ CSS thật sự sử dụng).
- **v1.2.1** — hai vá nhỏ phát hiện khi soi độ sâu (số test vẫn 22, shape không đổi):
  `links` không trừ oan link icon có chữ cho trợ năng (`aria-label`/`title`);
  chi tiết sitemap nêu đích danh dạng `sitemapindex` (đếm theo nhóm — VnExpress thật:
  sitemap.xml là nhóm dẫn tới 9455 sơ đồ con, không phải 9455 trang).
- **v1.3** (mốc 1 làm thay mốc 2 & 4 theo yêu cầu chủ; mốc 3 tạm ngừng):
  1. **Tắt AI**: gỡ `<script src="js/moc3-ai.js">` khỏi `results.html`; slot `#ai-slot` giữ
     nguyên và tự ẩn; file `js/moc3-ai.js` không đụng (mục 8 ghi cách dựng lại).
  2. **Chấm điểm /100 minh bạch**: thêm `WebCheck.tinhDiem()` vào `js/analyze.js`
     (công thức mục 3.1 — pass đủ weight, warn một nửa, fail 0, unknown loại khỏi mẫu số);
     `js/moc2-diem.js` mới render khối điểm vào `#score-slot` (điểm tổng + xếp loại + thanh
     nhóm + thống kê + ghi chú unknown).
  3. **Mở rộng 22 → 34 mục**: thêm 12 mục mới (mục 3 liệt kê; bảng weight chốt tổng 100);
     22 ID cũ giữ nguyên, chỉ gán lại weight. Hợp nhất bằng nâng check cũ thay vì thêm trùng:
     `links` chụp thêm fragment `#tên` không tồn tại; `lang` cảnh báo mã không chuẩn
     ("vn" thay "vi"); `accessible_names` gộp accessible-name nút + link; `form_labels`
     gộp trường nhập thiếu nhãn. Loại vì không chấm được đáng tin cậy từ HTML tĩnh:
     giới thiệu SP/DV, giá, ảnh SP/DV, yếu tố niềm tin, nút liên hệ nhanh (nhập vào
     `contact_info`). `img_wh` chấm tối đa warn vì CSS aspect-ratio không thấy được từ HTML.
  4. **Thứ tự kết quả theo yêu cầu**: thông tin site → tổng điểm → xếp loại → thanh
     nhóm → thống kê → checklist `<details>` (chip điểm từng mục) → xuất báo cáo.
  5. **Xuất báo cáo**: `js/moc4-xuat.js` mới vào `#export-slot` — sao chép / tải .txt
     (URL, thời điểm, điểm tổng, điểm nhóm, từng mục kèm trạng thái/điểm/giải thích;
     không AI).
  6. Tests rewrite cho v1.3 (25 test, `tests/analyze.test.mjs`).
  Mốc 2/4 muốn thay `js/moc2-diem.js`, `js/moc4-xuat.js` bằng phần của mình được —
  nói trước trong nhóm và ghi vào đây.
