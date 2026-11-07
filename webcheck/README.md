# WebCheck

Công cụ **kiểm tra nhanh nền móng website** dành cho chủ doanh nghiệp nhỏ — Đề 5.
Mốc này phụ trách **chức năng số 1**: nhập URL → kiểm tra tự động **34 hạng mục** (SEO, chuẩn
kỹ thuật, di động & hình ảnh, tốc độ, marketing & chuyển đổi, truy cập) **phía client** →
chấm điểm /100 minh bạch (điểm tổng, xếp loại, điểm theo nhóm, thống kê) → hiện checklist
kèm giải thích và gợi ý sửa bằng tiếng Việt → xuất báo cáo text.

Các phần còn lại của dự án (thống nhất phân công):
mốc 2 — điểm /100 (v1.3 đã cắm sẵn, file `js/moc2-diem.js`) · mốc 3 — nhận xét AI (**tạm tháo
ở v1.3**, file khung `js/moc3-ai.js` giữ nguyên — hợp đồng mục 8 ghi cách dựng lại) ·
mốc 4 — xuất báo cáo text (v1.3 đã cắm sẵn, file `js/moc4-xuat.js`) · mốc 5 — lịch sử (localStorage).
Cách ghép: đọc **`contract.md`** (cùng thư mục) — mọi shape JSON, vị trí cắm, quy tắc đều chốt trong đó.

## Chạy trên máy

Cần Node.js 20+.

```bash
npm install          # 1 lần, chỉ cho dev-test (linkedom)
npm test             # 25 test của bộ phân tích v1.3
npx vercel dev       # chạy toàn app + API ở localhost
```

**Lưu ý:** mở thẳng `index.html` bằng double-click sẽ KHÔNG chạy được vì phần API không có —
phải qua `npx vercel dev`. Muốn xem trang kết quả không cần mạng: mở `results.html?demo=1`.

## Deploy online

1. Push repo lên GitHub.
2. Vercel → Add New… → Project → Import repo (không cần cấu hình gì — thư mục `api/` tự nhận là serverless).
3. **Tắt chặn người xem** (bước dễ quên nhất): Settings → Deployment Protection →
   "Vercel Authentication" → **Disabled** → Save. Không tắt thì mọi link live
   sẽ ép khách đăng nhập Vercel trước khi thấy trang.
4. Lấy link live. Mỗi lần push nhánh chính là Vercel tự cập nhật (nếu đã kết nối GitHub
   qua dashboard: vercel.link/git).

## Giới hạn công cụ (khai thật khi demo)

- Công cụ đọc **HTML tĩnh** của trang. Website xây kiểu SPA (nội dung dệt bằng JavaScript)
  sẽ chỉ được soi phần khai báo trong HTML ban đầu — các thẻ meta vẫn đo đúng.
- Một số website chặn truy cập tự động (tường lửa, chống bot) → hiện thông báo lỗi rõ ràng,
  không treo. Cung cách của chủ web, không phải lỗi công cụ.
- Kiểm tra diễn ra **phía client** như yêu cầu đề: file `api/fetch.mjs` chỉ lo kéo HTML về
  (vượt CORS), toàn bộ logic chấm nằm ở `js/analyze.js` trong trình duyệt.

## Cấu trúc

```
├─ index.html        Trang nhập (mốc 1)
├─ results.html      Trang kết quả: điểm + checklist + slot mốc 3/5
├─ styles.css        Giao diện (biến màu 4 mức Đạt/Cảnh báo/Chưa đạt/Không rõ)
├─ js/
│  ├─ analyze.js     TRÁI TIM: 34 mục kiểm tra + tinhDiem() + renderChecklist + demoResult
│  ├─ main.js        Flow trang nhập → gọi API → lưu Result → nhảy trang
│  ├─ results.js     Trang kết quả: đọc Result, dựng tóm tắt + checklist
│  ├─ moc2-diem.js   (mốc 2, cắm v1.3) khối điểm /100 vào #score-slot
│  ├─ moc3-ai.js     (mốc 3) khung nhận xét AI — TẠM THÁO khỏi trang v1.3
│  └─ moc4-xuat.js   (mốc 4, cắm v1.3) xuất báo cáo text vào #export-slot
├─ api/
│  └─ fetch.mjs      Serverless proxy: ?url=… → trả HTML thô (Vercel)
├─ tests/
│  └─ analyze.test.mjs  25 test đặc tả bộ phân tích v1.3 (node --test)
├─ contract.md       Hợp đồng ghép code cho mốc 2–5
└─ package.json
```

## Checklist nộp bài (Mốc 1)

- [ ] `npm test` xanh 25/25
- [ ] Link live: nhập được 3 kiểu địa chỉ (1 site tốt, 1 site http, 1 domain không tồn tại)
- [ ] `results.html?demo=1` chạy được (dụng để mốc 2–5 dựng phần của mình khi chưa có mạng)
- [ ] `contract.md` gửi đủ cho 3 bạn; ai cũng biết slot cắm của mình
- [ ] Mỗi người push lên GitHub theo commit nhỏ, message rõ
