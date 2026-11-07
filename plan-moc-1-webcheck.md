# Kế hoạch Mốc 1 — WebCheck (Đề 5) — hoàn thành + đã deploy v2.0
**Chức năng số 1: nhập URL → kiểm tra tự động các yếu tố cơ bản phía client**

| Hạng mục | Giá trị |
|---|---|
| **Link live** | https://webcheck-eta.vercel.app (v2.0 đã chạy — deploy CLI từ thư mục `webcheck/`) |
| Repo | https://github.com/TrinhQuangBaoAn-2011/vibecoding — `webcheck/` là thư mục con; mốc 2–5 đặt thư mục kế bên |
| Scope | Đúng chức năng số 1. Mốc 2 (tổng quan trạng thái) · 3 (AI) · 4 (xuất báo cáo) · 5 (lịch sử) — bạn bè |
| Stack | Vanilla HTML/CSS/JS + Vercel serverless Node (`api/fetch.mjs`, 0 dependency) |
| Đã kiểm tra | `npm test` 46/46 (v2.0) · E2E Chrome thật trên live: demo `?demo=1`, bộ lọc, xuất báo cáo, gate kết quả cũ, kiểm tra thật `example.com` (60/60 mục) |

---

## 1. Đã chốt thiết kế (v2.0)

| Quyết định | Bản v1.x | v2.0 (hiện tại) |
|---|---|---|
| Số mục check | 22 → 34 (v1.2 → v1.3) | **60** (34 ID cũ giữ nguyên + 26 mới) |
| Cách đánh giá | 4 trạng thái + chấm điểm /100 (v1.3) | **4 trạng thái + ưu tiên P0–P3 có bằng chứng — bỏ hoàn toàn điểm /100** |
| Nhóm | 4 → 6 nhóm | **7 nhóm** (thêm "Tin cậy & minh bạch") |
| Bằng chứng | `detail` (kết quả) | `detail` (bằng chứng) + `impact` (tác động doanh nghiệp) + `method` (HTML tĩnh / Tài nguyên mạng / HTML + mạng) |
| Gợi ý sửa | Trách mốc AI | **Field `suggestion` riêng** — warn/fail: "Hướng khắc phục: ", pass/unknown: "Giữ hướng: " |
| Backend | Express+Render | **Vercel serverless** (bạn chọn A — không cold start) |

## 2. Kiến trúc đã dựng

```
Trình duyệt
  index.html (nhập URL, tự thêm https://, spinner, thông báo lỗi tiếng Việt)
    → GET /api/fetch?url=… (serverless, chỉ kéo HTML thô: UA trình duyệt, redirect, timeout 8s,
      cap 2 MB, không nhận non-HTML, đều trả {error,detail} tiếng Việt;
      cờ ?soft=1 riêng để lấy robots.txt/sitemap.xml — 404 trả về như dữ liệu)
  js/analyze.js — TRÁI TIM, chạy phía client (đúng chữ "phía client" trong đề):
    runChecks(html, meta, buildDoc) → Result v2.0:
      checks[] = { id, label, group, method, status, priority, detail, impact, suggestion }
      status ∈ pass/warn/fail/unknown · priority ∈ P0–P3 (chỉ khi warn/fail)
      nguyên tắc: unknown ≠ lỗi · Chưa đạt ≠ P0 · cấm hiển thị điểm
  results.html — tóm tắt (title site, URL mono, thời điểm, thời gian tải, HTTP code)
    + thống kê 4 trạng thái + "Việc cần làm trước" P0/P1 + 6 câu hỏi doanh nghiệp (mốc 2)
    + checklist 60 mục / 7 nhóm với chip lọc trạng thái + ưu tiên
    + xuất báo cáo text P0→P3 (mốc 4) + các slot chờ mốc 3 (AI) / 5 (lịch sử)
Result lưu: sessionStorage["webcheck:result"] → mốc 2,3,4 đọc qua WebCheck.docKetQua()
  (gate: chỉ nhận version '2.0' — kết quả v1.2/v1.3 bị từ chối khéo léo)
Result mẫu không cần mạng: results.html?demo=1 (quán cà phê Mộc — Đà Lạt, chốt 42/14/3/1)
```

## 3. Bộ 60 mục (7 nhóm — bảng đầy đủ + PRIORITY_MAP trong `contract.md` mục 3)

- **SEO & hiển thị (12)** · **Chuẩn kỹ thuật (13)** · **Di động & hình ảnh (8)** ·
  **Tốc độ tải nội dung (4)** · **Marketing & chuyển đổi (8)** · **Tin cậy & minh bạch (4)** ·
  **Trải nghiệm & truy cập (11)**
- P0 (Khẩn) dành cho thứ bóp nghẹt khả năng có khách: HTTPS hỏng, robots chặn Google quét,
  viewport thiếu, trộn nội dung HTTP trên HTTPS. P3 (Khuyến nghị) cho các mục nice-to-have.

## 4. Việc còn lại — bên lề (không thuộc code)

1. **Vercel dashboard:** đặt Root Directory = `webcheck` cho project `webcheck` — vì deploy qua
   Git hiện lấy cả repo làm gốc (gây 404 tại `/`); deploy CLI từ `webcheck/` là cách lấp mép tạm
   thời. Sau khi đặt, mọi git push sẽ deploy đúng thư mục.
2. Gửi lại `contract.md` v2.0 cho nhóm (mốc 2–5 cần shape mới).

## 5. Hợp đồng cho mốc 2–5 (chi tiết đầy đủ trong `webcheck/contract.md`)

- Đọc kết quả qua `WebCheck.docKetQua()` (đọc hộ sessionStorage + gate phiên bản) — không tự parse.
- Slot cắm trên results.html: `#summary-slot` (mốc 2 — đã cắm `moc2-tongquan.js`) ·
  `#ai-slot` (mốc 3 — tạm tháo từ v1.3, file khung giữ nguyên) ·
  `#export-slot` (mốc 4 — đã cắm `moc4-xuat.js`) · `#history-slot` (mốc 5 — trống).
- Mỗi mốc thêm file `js/<moc>.js` + 1 thẻ script defer; không đụng `analyze.js`/`main.js`/
  `api/fetch.mjs` (độc quyền mốc 1).
- Không thêm thư viện khi chưa cả nhóm đồng ý (frontend hiện 0 dependency).

## 6. Giới hạn khai thật khi demo (chép vào slide)

1. Chỉ soi **HTML tĩnh** — site SPA (nội dung dệt bằng JS) chỉ đo được phần khai báo meta ban đầu.
2. Site chặn bot (tường lửa) → thông báo lỗi rõ ràng, không treo.
3. Mục **"Không xác định" không phải lỗi** — bộ kiểm chỉ kết luận khi đủ bằng chứng.
4. **Không chấm điểm, không xếp loại** — mỗi mục nêu Trạng thái + Mức ưu tiên + Bằng chứng;
   bạn tự quyết việc nào làm trước (P0 → P1 → P2 → P3).
