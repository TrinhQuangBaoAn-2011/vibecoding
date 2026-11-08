# Hướng dẫn nhận việc Mốc 2–5 — WebCheck (Đề 5)

> **CẬP NHẬT 08/11/2026 — đọc trước khi làm:** sản phẩm chính của nhóm giờ là **app WEBCHECK AI
> (React + Express ở gốc repo)**, không còn là giao diện vanilla trong `webcheck/`. Phần việc của
> mốc 2–5 bên dưới **đã có bản thay thế trong app React** (tổng quan = `ScoreSummary`, nhận xét AI =
> `AiConsultant` + `server/lib/aiReview.js`, xuất báo cáo = `lib/report.js`, lịch sử =
> `History` + `HistoryContext`). Giao diện vanilla `webcheck/` còn lại là **máy chấm QA bằng cột
> riêng** (`/webcheck/…` + demo `?demo=1`). Luật điểm đã đổi: app **được hiển thị điểm tổng /100**
> (xem `contract.md` v3.0, mục 9). Nội dung chi tiết dưới đây giữ nguyên vì chúng là **tiêu chuẩn
> chất lượng + shape dữ liệu** mà phần React mới cũng phải theo.

> Ai nhận mốc 2–5 chỉ cần đọc 3 thứ: `webcheck/contract.md` (chuyên sâu),
> file này (định hướng + checklist nghiệm), và chơi thử demo `?demo=1`.
> Mọi shape JSON, slot cắm, quy tắc ghép đều chốt trong contract — đừng tự suy đoán.

---

## 1. Bối cảnh trong 5 dòng

1. Mốc 1 đã xong v2.0 và đang live: **https://webcheck-eta.vercel.app**
2. Người dùng nhập URL → công cụ soi HTML tĩnh → chấm **60 hạng mục** theo
   **4 trạng thái** (Đạt / Cần cải thiện / Chưa đạt / Không xác định) + **mức ưu tiên
   P0–P3**; mỗi mục có **bằng chứng, tác động, hướng khắc phục** bằng tiếng Việt.
3. ~~**Không có điểm /100, không xếp loại** — cấm hiển thị điểm dưới mọi hình thức
   (bắt buộc theo đề + hợp đồng v2.0).~~ → **Đã thay từ 08/11/2026:** app WEBCHECK AI
   chấm điểm chuẩn hóa /100 minh bạch (tham khảo `server/lib/scoring.js` — total 136 điểm thô).
4. Kết quả (Result v2.0) nằm trong `sessionStorage["webcheck:result"]` — mọi mốc
   **đọc duy nhất qua `WebCheck.docKetQua()`** (hàm có sẵn trong `js/analyze.js`);
   không parse tay, không gọi lại `/api/fetch`.
5. **Dữ liệu mẫu không cần mạng:** mở `results.html?demo=1` — 60 hạng mục của quán
   cà phê Mộc, chốt 42 Đạt / 14 Cần cải thiện / 3 Chưa đạt / 1 Không xác định;
   P0=1, P1=1, P2=3, P3=12.

## 2. Chuẩn chất lượng cốt lõi — "thân thiện, dễ đọc, dễ hiểu"

Phần của các bạn là **lớp trình bày**: biến dữ liệu thô 60 mục thành thứ chủ
doanh nghiệp đọc hiểu ngay. **KHÔNG lặp lại dạng phân tích thô** (bảng
Đạt/Chưa đạt trơ trụng). Tiêu chuẩn cụ thể:

1. Người đọc là chủ doanh nghiệp nhỏ (quán cà phê, tiệm nail, cửa hàng…), không
   rành kỹ thuật. Chữ hiển thị: câu ngắn, đời thường, như người tư vấn nói chuyện.
2. Trả lời bằng **câu hỏi họ quan tâm** ("Khách tìm tôi trên Google được không?",
   "Mở bằng điện thoại có ổn không?") rồi mới dẫn mục cụ thể làm bằng chứng.
3. **Chỉ ra việc, không chỉ lỗi**: mỗi cảnh báo phải kèm "cần làm gì" — field
   `suggestion` từng mục đã viết sẵn lời khuyên tiếng Việt, trưng dụng thoải mái.
4. **"Không xác định" không phải lỗi** — không hù, không gộp vào "việc cần sửa";
   nêu minh bạch là "chưa đủ bằng chứng, nên kiểm tra thêm bằng tay".
5. **"Chưa đạt ≠ P0"** — trạng thái nói có vấn đề hay không, ưu tiên nói việc nào
   đáng làm trước. Thiếu link fanpage là Chưa đạt nhưng chỉ P3; chặn Google quét
   (robots) mới là P0 Khẩn.
6. Bảng từ dùng sẵn đừng tự viết lại: `WebCheck.STATUS_WORDS`, `PRIORITY_WORDS`,
   `METHOD_WORDS`, `GLYPHS` (giữ ngôn ngữ thống nhất toàn site).

## 3. Địa bàn 4 mốc

| Mốc | Slot | File | Hiện trạng |
|---|---|---|---|
| 2 — Tổng quan thân thiện | `#summary-slot` | `js/moc2-tongquan.js` | Bản cắm mẫu — được phép viết lại |
| 3 — Nhận xét AI | `#ai-slot` | `js/moc3-ai.js` | Tạm tháo theo đề; dựng lại phải cả nhóm đồng ý |
| 4 — Xuất báo cáo text | `#export-slot` | `js/moc4-xuat.js` | Bản cắm mẫu — được phép viết lại |
| 5 — Lịch sử kiểm tra | `#history-slot` | `js/moc5-*.js` (tự tạo) | Trống hoàn toàn — tự dựng từ đầu |

> Bản cắm mẫu do mốc 1 dựng tạm để demo không trống + làm chuẩn đối chiếu. Bạn được
> quyền thay file mốc của mình (đó là file của bạn) — chỉ cần báo nhóm trước khi
> merge. Không đụng file của người khác.

### Mốc 2 — gợi ý cụ thể
- Trả lời 4–6 câu hỏi doanh nghiệp thật; mỗi câu dẫn bằng chứng cụ thể + một việc
  nên làm trước. Bản mẫu có 6 câu hỏi + thống kê 4 trạng thái + "Việc cần làm
  trước" (P0/P1) — bạn cách tân giọng văn, cấu trúc, thứ tự theo ý.
- Đừng nhồi cả 60 mục vào ô này — checklist chi tiết mốc 1 đã dựng sẵn bên dưới.

### Mốc 3 — lưu ý riêng
- AI hiện tắt (slot tự ẩn khi trống). File khung `js/moc3-ai.js` giữ nguyên sườn.
- Muốn bật lại: đọc `contract.md` mục 8 — đủ 4 bước dựng lại + **output shape
  bắt buộc** (1 câu tóm tắt + đúng 3 điểm mạnh + đúng 3 việc cần làm, mỗi câu
  160 ký tự trở xuống, tiếng Việt). Không nhận xét dựa trên "điểm".
- Ba lựa chọn kết nối (key trình duyệt / proxy serverless / bản dự phóng fallback)
  đã liệt kê trong file khung; chọn phương án nào phải nói cho nhóm biết.

### Mốc 4 — gợi ý cụ thể
- Báo cáo .txt phải đọc được ngay trong Notepad (không ký tự lạ, xuống dòng chuẩn).
  Nâng cấp theo hướng "thư gửi khách hàng": đoạn dẫn, đoạn ngắn, mục "5 việc đáng
  làm đầu tiên" rồi mới chi tiết theo nhóm.
- Giữ 3 nút (sao chép / tải .txt / xem trước) + fallback khi clipboard bị chặn.
- Giữ mục "GIỚI HẠN CỦA BÁO CÁO" — khai thật với người đọc là công cụ chỉ soi HTML tĩnh.

### Mốc 5 — đầu việc từ đầu
- Tự lưu vào localStorage bằng key riêng (ví dụ `webcheck:history`) — không đụng
  key `webcheck:result` của mốc 1. Mỗi bản ghi gọn: URL, thời điểm, đếm 4 trạng
  thái, danh sách P0/P1.
- Mốc 5 phải **chủ động đọc Result mỗi lần trang kết quả mở** rồi tự append vào
  lịch sử — mốc 1 không lưu thay.
- Giao diện thân thiện: dòng thời gian, mới nhất lên đầu, giữ tối đa 20 bản ghi,
  có nút xoá từng bản ghi và xoá toàn bộ (hỏi xác nhận trước khi xoá).

## 4. Chạy thử trên máy

```bash
git pull                     # nhánh main mới nhất (v2.0 + fix review)
cd webcheck
npm install                  # 1 lần, chỉ cho dev-test (linkedom)
npx vercel dev               # chạy app + API localhost (Node 20+)
```

- Test UI nhanh nhất: mở `http://localhost:3000/results.html?demo=1` (hoặc mở
  luôn link live ở trên) — đủ dữ liệu 60 mục không cần mạng.
- `npm test` — 46 test của mốc 1; không được làm đỏ. Nếu đỏ mà bạn chưa đụng
  file mốc 1 thì báo nhóm, đừng tự sửa `tests/`.
- Muốn thử một lượt kiểm tra thật (mạng): từ trang chính nhập `example.com`.

## 5. Quy tắc ghép không đau

1. Khu độc quyền của mốc 1: `js/analyze.js`, `js/main.js`, `js/results.js`,
   `api/fetch.mjs`, `tests/` — không sửa trực tiếp; cần hàm gì thêm thì nhắn nhóm.
2. Mỗi mốc chỉ đụng 1 file `js/mocX-*.js` riêng + slot DOM của mình trong
   `results.html` (đã có comment đánh dấu sẵn vị trí cắm).
3. Đọc kết quả duy nhất qua `WebCheck.docKetQua()`.
4. Không thêm thư viện khi chưa cả nhóm đồng ý (frontend hiện 0 dependency).
5. Nội dung hiển thị phải tiếng Việt đời thường; phần kỹ thuật nằm lại ở data.
6. Commit nhỏ, message rõ, mỗi bạn push phần của mình; nếu cùng dùng main thì
   pull trước khi đọc tiến trình gộp của người khác.

## 6. Checklist nghiệm của mỗi phần

- [ ] `?demo=1` chạy được, console không lỗi — kể cả khi mở qua link live
- [ ] Một người bạn (không viết code) đọc 1 phút xong biết: trang đang ở đâu,
      việc đầu tiên là gì — chỗ nào họ hiểu sai là lỗi UX, sửa ngay khâu đó
- [ ] Không hiện điểm bất kỳ hình thức; "Không xác định" không bị coi là lỗi
- [ ] Mỗi khối hiển thị đều có "bước tiếp theo" rõ (nút, hành động, gợi ý)
- [ ] Không đụng file ai khác; không thêm thư viện; commit nhỏ message rõ
- [ ] Khoe vào nhóm kèm 1 ảnh chụp màn hình demo để ghép nhanh

---

## 7. Phiếu bàn giao theo từng người (4 khối — copy/paste riêng cho mỗi bạn)

> Cú pháp nền chung (đã có ở lời nhắn nhóm): không điểm, unknown ≠ lỗi, Chưa đạt ≠ P0,
> chỉ đọc Result qua `WebCheck.docKetQua()`, không đụng file người khác. Phiếu dưới đây
> chỉ viết phần ĐẶC THÙ của từng mốc. Điền tên + hạn vào chỗ trống khi gửi.
> Khi gửi riêng cho từng người, kèm 1 dòng link hợp đồng:
> https://github.com/TrinhQuangBaoAn-2011/vibecoding/blob/main/webcheck/contract.md

### PHIẾU MỐC 2 — Tổng quan thân thiện (giao: ___ · hạn: ___)

**Việc của bạn:** biến Result 60 mục (đếm kết quả bằng demo `?demo=1` là 42/14/3/1;
P0=1, P1=1, P2=3, P3=12) thành màn hình tổng quan mà chủ doanh nghiệp đọc 1 phút
hiểu được: trang của mình đang ở đâu, việc đầu tiên làm gì.

**Có sẵn:** slot `#summary-slot` + file `js/moc2-tongquan.js` (bản mẫu được quyền
viết lại hoàn toàn). Hợp đồng đọc: `contract.md` mục 1, 3.1, 4, 5.

**Chuẩn đầu ra:**
1. Thống kê 4 trạng thái bằng bảng từ tiếng Việt — không bất kỳ con điểm nào.
2. Khối "Việc cần làm trước" nêu đúng thứ tự P0 rồi P1 (mỗi việc kèm hướng khắc
   phục lấy từ `suggestion` của mục đó).
3. 4–6 câu hỏi doanh nghiệp thật — mỗi câu phải có bằng chứng cụ thể
   của các mục liên quan (bản mẫu có 6 câu; bạn được đổi câu hỏi/cách trả lời).
4. Mỗi khối phải có "bước tiếp theo" rõ (liên kết cuộn xuống checklist chi tiết,
   hoặc dẫn hướng ra tab khác).

**Cấm:** hiện điểm bất kỳ hình thức; coi "Không xác định" là lỗi; nhồi cả 60 mục
vào slot này; đụng file/script của mốc khác.

**Nghiệm thu:** mở `?demo=1` không lỗi console; một bạn ngoài nhóm đọc 1 phút
kể được trang đang ở đâu + việc đầu tiên; còn lại "không xác định" được nêu tự
nhiên, không gây sợ.

### PHIẾU MỐC 3 — Nhận xét AI (giao: ___ · hạn: ___)

**Tình huống của bạn khác mọi người:** AI đang TẮT theo đề. Nếu chưa được cả nhóm
(hoặc thầy) đồng ý bật lại, nhiệm vụ của bạn chỉ là: đọc file khung
`js/moc3-ai.js` + trình bày trong nhóm 3 phương án kết nối (key trong trình duyệt /
proxy serverless / bản dự phóng fallback) để nhóm chọn — CHƯA code.

**Khi được phép bật:** làm theo `contract.md` mục 8 đủ 4 bước (thêm lại 1 thẻ
script vào `results.html`, render vào `#ai-slot` theo shape v2.0).

**Chuẩn đầu ra (output shape bắt buộc — đọc kỹ mục 8):**
1. `summary`: đúng 1 câu tóm tắt tình trạng trang.
2. `strengths`: đúng 3 điểm mạnh.
3. `improvements`: đúng 3 việc cần làm.
Mỗi câu ≤ 160 ký tự, tiếng Việt đời thường; lập luận chỉ dựa trạng thái + ưu
tiên + bằng chứng có trong Result — KHÔNG được dùng từ "điểm".

**Cẩn trọng:** có fallback khi chưa có key AI (khung chờ đẹp + dẫn xem checklist);
không để key thật lọt vào repo/commit; gọn feed gửi đi (mảng đủ {label, status,
priority, suggestion} của 60 mục).

**Nghiệm thu:** khung chờ đúng shape, bản fallback chạy được khi thiếu key; văn bản
không máy móc; bật/tắt AI không làm hỏng các slot khác.

### PHIẾU MỐC 4 — Xuất báo cáo text (giao: ___ · hạn: ___)

**Việc của bạn:** báo cáo .txt dễ đọc như thư gửi cho chủ doanh nghiệp — không
phải dump phân tích. Ba nút giữ nguyên: Sao chép / Tải tệp .txt / Xem trước.

**Có sẵn:** slot `#export-slot` + file `js/moc4-xuat.js` (bản mẫu được quyền viết
lại). Hợp đồng đọc: `contract.md` mục 2 (shape), 5 (bảng từ dùng sẵn).

**Chuẩn nội dung:**
1. Phần mở đầu: 4–6 dòng "trang của bạn đang ở đâu" + danh sách "5 việc đáng làm
   đầu tiên" đúng thứ tự P0 → P1 → P2 (mỗi dòng 1 việc + hướng khắc phục ngắn).
2. Chi tiết: theo từng nhóm (7 nhóm đúng thứ tự DEFS — bản hiện tại đã sửa lỗi
   header lặp; đừng quay lại sort toàn phần), mỗi mục 1 dòng trạng thái + bằng
   chứng + việc cần làm.
3. Kết: mục "GIỚI HẠN CỦA BÁO CÁO" khai thật (chỉ soi HTML tĩnh, unknown không
   phải lỗi) — đừng bỏ vì "ngại".

**Cẩn trọng:** file .txt phải đọc ngay trong Notepad, không ký tự lạ; số lượng
dòng kiểm soát (báo cáo dài quá với site lỗi nặng thì chừa dòng "…và N mục nữa
— xem chi tiết đầy đủ trên web"); không AI (khác mốc 3).

**Nghiệm thu:** 3 nút đều hoạt động; bấm sao chép dán vào Notepad không vỡ khung;
tải về tên tệp đúng `webcheck-<host>.txt`; nội dung đọc 3 phút hiểu hết.

### PHIẾU MỐC 5 — Lịch sử kiểm tra (giao: ___ · hạn: ___)

**Việc của bạn:** dựng từ đầu — mỗi lần trang kết quả mở thì tự ghi nhận 1 bản
ghi lịch sử vào localStorage và vẽ dòng thời gian dễ đọc.

**Có sẵn:** chỉ có slot `#history-slot` (trống). Tự tạo `js/moc5-*.js` + tự thêm
1 thẻ script defer ở cuối `results.html` (kèm comment đánh dấu, như các mốc khác).
Hợp đồng đọc: `contract.md` mục 1, 5, 6.

**Chuẩn kỹ thuật:**
1. Key localStorage riêng, ví dụ `webcheck:history` — không đụng
   `webcheck:result`.
2. Đọc Result qua `WebCheck.docKetQua()` mỗi lần trang mở; append bản ghi gồm:
   URL của lượt kiểm, thời điểm, đếm 4 trạng thái + đếm P0/P1 — KHÔNG lưu cả mảng
   checks 60 mục (phình quota; cần chi tiết thì hướng dẫn mở lại lượt kiểm).
3. Tối đa 20 bản ghi mới nhất; mới nhất trên đầu; chạy demo (?demo=1) không ghi
   đè lịch sử thật hoặc đánh dấu rõ "bản demo" để không rối.

**Chuẩn hiển thị (thân thiện mốc 5):**
1. Dòng thời gian viết bằng câu tự nhiên: "Cách đây 2 hôm — quan-moc-da-lat.vn — 1 việc khẩn
   (chặn Google quét) → đã cải thiện 3 mục so với trước!"
2. So sánh giữa 2 lần gần nhất: tự sinh câu "có gì thay đổi" (không bắt người
   đọc lên bảng tính số).
3. Nút xoá từng bản + xoá toàn bộ (hỏi xác nhận trước khi xoá).

**Cấm:** hiện điểm; gọi lại API; lưu điểm/weight (không tồn tại trong data nữa).

**Nghiệm thu:** chạy demo + chạy thật — lượt 1 thấy 1 bản ghi; sang lượt 2 thấy
câu so sánh thay đổi; reload trang không mất; xoá sạch trống lịch sự; không lỗi console.

---

## Lời nhắn gửi nhóm (copy/paste)

Team ơi — phần nền WebCheck Mốc 1 đã xong bản 2.0 và đang live:
https://webcheck-eta.vercel.app
(Kiểm tra 60 hạng mục của website doanh nghiệp: mỗi mục trả về Đạt / Cần cải thiện /
Chưa đạt / Không xác định + mức ưu tiên P0–P3, kèm bằng chứng và lời khuyên tiếng Việt.
Không còn chấm điểm /100.)

Link cần thiết (bấm vào xem luôn — repo công khai, không cần tài khoản):
- Toàn bộ code + tài liệu: https://github.com/TrinhQuangBaoAn-2011/vibecoding (nhánh main)
- Hợp đồng làm việc webcheck/contract.md:
  https://github.com/TrinhQuangBaoAn-2011/vibecoding/blob/main/webcheck/contract.md
- File phân công chi tiết phan-cong-moc-2-5.md (hướng dẫn đầy đủ + phiếu từng người):
  sắp được đẩy lên repo — chưa thấy file thì đợi lời nhắn "đã lên" rồi pull lại:
  https://github.com/TrinhQuangBaoAn-2011/vibecoding/blob/main/phan-cong-moc-2-5.md

Giờ chia phần còn lại — mỗi bạn một mốc, làm riêng rồi ghép:

- Mốc 2 — Tổng quan thân thiện | slot #summary-slot | file js/moc2-tongquan.js
  (bản mẫu cắm sẵn, được phép viết lại theo ý)
- Mốc 3 — Nhận xét AI | slot #ai-slot | khung js/moc3-ai.js
  (tạm tháo theo đề; muốn bật lại phải cả nhóm đồng ý — cách làm nằm contract.md mục 8)
- Mốc 4 — Xuất báo cáo text | slot #export-slot | file js/moc4-xuat.js
  (bản mẫu cắm sẵn, được phép viết lại theo ý)
- Mốc 5 — Lịch sử kiểm tra | slot #history-slot | tự tạo js/moc5-*.js
  (trống hoàn toàn — tự dựng từ đầu, tự lưu vào localStorage)

CHUẨN QUAN TRỌNG NHẤT (áp cả 4 mốc):
Kết quả phải THÂN THIỆN, DỄ ĐỌC, DỄ HIỂU cho chủ doanh nghiệp nhỏ — KHÔNG phải
bảng phân tích thô kiểu Đạt/Chưa đạt. Dữ liệu thô + bằng chứng + tác động + lời
khuyên tiếng Việt đã có sẵn cho từng mục, nên việc của mình là CHUYỂN NÓ THÀNH
CÂU CHUYỆN: trả lời bằng câu hỏi họ quan tâm ("Khách tìm tôi trên Google được
không?", "Muốn mua thì liên hệ thế nào?"), nêu việc cần làm trước theo P0 → P1,
câu ngắn, đời thường, không thuật ngữ. Người đọc xong phải biết ngay: trang của
mình đang ở đâu và việc đầu tiên làm gì.

Ba quy tắc cứng (đề bài + hợp đồng chốt):
- KHÔNG hiện điểm /100 dưới mọi hình thức (không tổng, không nhóm, không weight).
- "Không xác định" KHÔNG phải lỗi — đừng hù, nêu minh bạch là chưa đủ bằng chứng.
- "Chưa đạt" KHÔNG đồng nghĩa P0 — ví dụ thiếu link fanpage là Chưa đạt nhưng chỉ P3.

Khởi động 10 phút cho mỗi bạn:
1) git pull nhánh main mới nhất (v2.0 vừa push).
2) Đọc webcheck/contract.md (link ở trên — mục 1, 3.1, 4, 5, 6; mốc 3 đọc thêm
   mục 8) và file phan-cong-moc-2-5.md ở gốc repo (hướng dẫn đầy đủ + checklist
   nghiệm — đang chờ đẩy lên, thấy lời nhắn "đã lên" thì pull lại).
3) Mở https://webcheck-eta.vercel.app/results.html?demo=1 — dữ liệu mẫu 60 mục +
   bản mẫu mốc 2/4 đang chiếm chỗ để đối chiếu.
4) Khi xong: demo không lỗi console, nhờ một bạn đọc thử hiểu trong 1 phút,
   commit nhỏ, message rõ rồi khoe vào nhóm kèm ảnh demo để ghép khớp.

Quy tắc ghép không đau: mỗi người chỉ đụng file JS của mốc mình + slot DOM của
mình trong results.html (comment đánh dấu sẵn); đọc kết quả duy nhất qua
WebCheck.docKetQua() (không tự parse sessionStorage, không gọi lại /api/fetch);
không thêm thư viện khi chưa cả nhóm đồng ý; không đụng khu độc quyền của mốc 1
(js/analyze.js, js/main.js, js/results.js, api/fetch.mjs, tests/) và file của
người khác. Cần hàm gì thêm thì nhắn vào nhóm, đừng tự sửa file người khác.

Đích là ghép chạy ngon trên link live. Khoe lúc xong, thanks team!
