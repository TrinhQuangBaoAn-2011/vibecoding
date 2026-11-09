# WEBCHECK AI — Wecheck Website Audit

App chấm điểm website đang làm sản phẩm chính của nhóm: nhập một URL công khai, backend tải
HTML thật, bộ máy **60 tiêu chí v2.0** chấm theo trọng số ưu tiên **P0–P3**, chuẩn hoá ra
**điểm tổng /100 minh bạch**, kèm **"Lộ trình cải thiện ưu tiên"**, nhận xét AI (hoặc bộ quy tắc
dự phòng khi chưa có key) và **lịch sử phân tích** lưu cục bộ trên trình duyệt.

- Live: `https://webcheck-eta.vercel.app`
- Chạy local: `node server/index.js` (sau `npm install` trong `server/`) → mở `http://localhost:5000`
- Build client: `npm install && npm run build` trong `client/`
- Test bộ máy: `node server/tests/scoring.test.mjs` (5 test) + `node webcheck/tests/…` (46 test)

## Cấu trúc thư mục (thực tế trong repo)

```
vibecoding/
├── client/                 # frontend React (Vite + Tailwind) — build静态 ra client/dist
│   ├── src/pages/          # HomePage(Dashboard) · Analyze(ResultPage) · History(+Detail) · Settings · About
│   ├── src/components/     # UrlForm · ScoreSummary/ScoreRing · CriteriaList · AiConsultant · NinoChat (hỏi-đáp AI) · AnalysisReport · RoadmapPanel
│   ├── src/lib/            # api.js (auditApi) · storage.js (historyStorage) · report.js (buildReport, tải .txt) · criteriaCatalog.js
│   ├── src/hooks/ · src/context/   # useAnalyze (stream 6 bước) · Health/History/Toast
│   └── dist/               # bản build đã commit (vercel includeFiles nạp trực tiếp)
├── server/                 # backend Express — đóng gói thành 1 lambda @vercel/node (vercel.json ở root)
│   ├── routes/             # analyze (stream) · aiReview · aiChat (Nino) · health · webcheckTool
│   ├── lib/                # urlSecurity · fetcher (websiteFetcher) · analyzer (htmlParser) · scoring.js + webcheckEngine.js (scoringEngine) · aiReview.js (aiReview) · aiChat.js (Nino hỏi-đáp) · analysisStore
│   └── tests/                        # scoring.test.mjs (5 test) · aiChat.test.mjs (7 test Nino offline): 60 tiêu chí · trọng số P0–P3 · chuẩn hoá /100 · gate ≥55 mục · bộ quy tắc hỏi-đáp
├── scripts/sync-criteria.mjs       # sinh criteriaCatalog (client + server) từ webcheck/js/analyze.js — 60 mục, 1 nguồn sự thật
├── webcheck/               # engine/library v2.0: js/analyze.js (60 tiêu chí) · api/fetch.mjs · 46 tests · UI vanilla làm máy chấm QA
├── webcheck/contract.md    # hợp đồng nhóm v3.0 (quyết định v3.0: cho phép hiển thị điểm /100)
└── vercel.json             # 1 lambda: /(.*) → server/index.js; includeFiles client/dist + webcheck engine
```

## Ánh xạ với skeleton "website-audit" (không cần sắp xếp lại)

Skeleton đề xuất `frontend/ – backend/ – shared – tests` chỉ là phân tầng tổng quát của
thứ đã có. Bảng đối chiếu 1–1 (tên cũ ở cột 3):

| Skeleton đề xuất | Trong repo | |
|---|---|---|
| `frontend/pages` | `client/src/pages/` | HomePage, ResultPage, HistoryPage |
| `frontend/components` | `client/src/components/` | URLInput→UrlForm, ScoreCard→ScoreSummary/ScoreRing, Checklist→CriteriaList, AIReview→AiConsultant, ReportButton→AnalysisReport (in/sao chép/tải) |
| `frontend/services` | `client/src/lib/` | auditApi→api.js, historyStorage→storage.js |
| `backend/routes/auditRoute` | `server/routes/` | analyze + aiReview + aiChat (Nino) + health + webcheckTool |
| `backend/services/urlValidator` | `server/lib/urlSecurity.js` + routes/analyze (SSRF: chặn IP nội bộ) | |
| `backend/services/websiteFetcher` | `server/lib/fetcher.js` (+ `webcheck/api/fetch.mjs`) | giới hạn 3MB · 15s · ≤5 redirect |
| `backend/services/htmlParser` | `server/lib/analyzer.js` | engine 60 tiêu chí + probes robots/sitemap |
| `backend/services/scoringEngine` | `server/lib/scoring.js` + `server/lib/webcheckEngine.js` | P0=6/P1=4/P2=2/P3=1, tổng 136 điểm thô → /100 |
| `backend/services/aiReview` | `server/lib/aiReview.js` (rule-based fallback + AI thực qua `AI_API_KEY`) | |
| `backend/controllers` | routes + `lib/asyncHandler.js`/`errors.js` | |
| `shared/auditTypes` | `webcheck/js/analyze.js` + `client/src/lib/criteriaCatalog.js` (sinh từ `scripts/sync-criteria.mjs`) | |
| `tests` | `server/tests/` + `webcheck/tests/` + `client/test_run.mjs` | |

Việc đổi tên toàn bộ chỉ để khớp skeleton sẽ phá `vercel.json`, `sync-criteria.mjs`,
`contract.md` và thói quen làm việc của nhóm — kết quả thì chức năng không đổi. Do đó
nhóm chốt: **giữ cấu trúc hiện tại, bảng trên là bằng chứng tương đương.**

## Kiến trúc hệ thống (tổng hợp kết quả sao gồm từ thiết kế MVP)

backend (Express, Vercel 1 lambda) — mỗi "module" là một file đã có thật, kèm test:

| Module thiết kế MVP | Hiện thực trong code | Bằng chứng kiểm tra |
|---|---|---|
| Frontend: trang nhập URL | `client/src/pages/Dashboard.jsx` + `components/UrlForm.jsx` (hero "Phân tích URL mới") | chạy live |
| Frontend: giao diện trạng thái quét | `components/ProgressSteps.jsx` + `hooks/useAnalyze.js` — 6 bước stream | tiến độ trong lúc chạy thật |
| Frontend: trang kết quả | `pages/Analyze.jsx` / `pages/HistoryDetail.jsx` + `components/AnalysisReport.jsx` | viết demo cho vnexpress/example.com: 75/100, 71/100 |
| Frontend: điểm + checklist | `ScoreSummary.jsx` (vòng điểm /100 + thanh P0–P3) + `CriteriaList.jsx` (60 mục, tab Đạt/Cần cải thiện/Chưa đạt/Không tính điểm, mở chi tiết từng mục) | "Chi tiết 60 tiêu chí — 33/60 tiêu chí đạt" |
| Frontend: nhận xét AI | `components/AiConsultant.jsx` (+ panel Phần 3 `part3Review.js`) | rules-fallback minh bạch khi chưa có key |
| Frontend: xuất báo cáo | `AnalysisReport.jsx` (sao chép / tải .txt / xem trước / In · `lib/report.js` dựng text + tên tệp `webcheck-<host>.txt`) | nút trên live |
| Frontend: lịch sử localStorage | `context/HistoryContext.jsx` + `lib/storage.js` (badge số bản ghi ở sidebar, xem lại tại History) | bản ghi lưu cục bộ, sống sau reload |
| API — JSON | `POST /api/analyze` (JSON 1 lần) · `POST /api/analyze/stream` (NDJSON — JSON từng dòng, đơn ứng như loại stream thôi) · `POST /api/ai-review` · `POST /api/ai-chat` (Nino hỏi-đáp) · `GET /api/fetch` · `GET /api/health` | curl health trả `"service":"WEBCHECK AI API"` |
| Module 1: API & URL Validator | `server/routes/analyze.js` + `server/lib/urlSecurity.js` (SSRF: chặn IP nội bộ/private, hostname giả danh) + `lib/rateLimit.js` | 30 phân tích/10 phút mỗi IP; chặn ip6-localhost… |
| Module 2: Website Scanner | `server/lib/fetcher.js` (+ `webcheck/api/fetch.mjs`) — UA chuẩn, timeout 15s, ≤5 redirect, giới hạn 3MB, probes robots.txt/sitemap.xml | fetch maxBytes 3145728 trong /api/health |
| Module 3: Scoring Engine | `webcheckEngine.js` (engine v2.0 — 60 tiêu chí) + `lib/scoring.js` (P0=6 P1=4 P2=2 P3=1, tổng 136 điểm thô, chuẩn hoá /100, mục Không xác định loại khỏi tử và mẫu) + `coerceAnalysisPayload` (gate ≥55 mục) | **5/5 test** `server/tests/scoring.test.mjs` |
| Module 4: AI Service | `server/lib/aiReview.js` (nhận xét) + `server/lib/aiChat.js` (Nino hỏi-đáp, v3.1) — gửi shape gọn cho AI, prompt tiếng Việt; không có key thì tự quay về bộ quy tắc (minh bạch, không gạt lỗi) | `/api/health` báo chế độ `"rules-fallback"` khi chưa có key |
| Module 5: Response Formatter | `analyzer.js` (map 60 item + page meta) + `routes/analyze.js` trả JSON thống nhất | 1 phân tích → JSON có đủ criteria[]/score/counts |
| Storage: không DB, localStorage MVP | đúng như vậy — server không database (chỉ cache ẩn RAM TTL 30'), lịch sử = localStorage phía client | lịch sử được lưu cục bộ khi mặc sức chờ trong session |

## Mục 2 của bạn nhóm (KhanhThy — module kiểm tra web): đánh giá + những gì đã ghép

Repo: `github.com/KhanhThy249/module-nh-gi-ki-m-tra-web` — module chấm điểm website hoàn chỉnh
(Node 20, không cần thư viện): fetch trang (chặn địa chỉ nội bộ, ≤5 redirect, 10s, 2MB,
robots.txt + sitemap) → parse HTML → chấm **60 tiêu chí / 7 nhóm / 100 điểm** → API
`POST /api/analyze` + server + giao diện riêng, 37 test, có bằng chứng từng mục.

**Kết luận: nội dung ổn, đóng gói cần sửa 1 chút phía bạn ấy** (nhắc bằng tốt ý):

- ✅ Logic chấm sống tốt: `score.mjs` tách bạch status → điểm, `pointsFor`, `gradeOf` (Xuất sắc/Khá/
  Trung bình/Cần cải thiện gấp); tiêu chí 1 điểm chỉ Đạt/Chưa đạt — tất cả khớp cùng hướng với
  engine 60 mục v2.0 của nhóm; cùng 7 nhóm tiêu chí.
- ✅ fetchPage có đủ an toàn cơ bản: block IP nội bộ, giới hạn thời gian/dung lượng — đúng tinh
  thần Server của nhóm.
- ⚠️ Trên GitHub, repo để file **phẳng ở root** nhưng file test import `../lib/…` (kiểu cấu trúc
  `lib/` + `tests/`) → `npm test` nổ `ERR_MODULE_NOT_FOUND` ngay khi chạy. Sửa nhanh nhất phía
  bạn ấy: tạo `lib/` + `tests/` đúng như README mô tả rồi `git mv` code vào `lib/` (hoặc đổi
  import trong test thành `./fetchPage.mjs`).

**Cách ghép vào web này (đúng 7 quy tắc chống trùng — không cắm API thứ hai):** có cùng engine
60 mục ở Backend nên cắm thêm server/API riêng của bạn cụ sẽ sinh 2 đường quét + 2 shape trường
(vi phạm quy tắc). Vì vậy chỉ ghép những phần **không trùng** của bạn cụ:

| Đóng góp từ mục 2 | Đã ghép vào | Ở đâu |
|---|---|---|
| 7 câu hỏi "thân thiện" cho từng nhóm tiêu chí | header từng nhóm trong bảng 60 tiêu chí | `client/src/lib/constants.js` → `GROUP_QUESTIONS`; hiển thị trong `CriteriaList.jsx` |
| Ý tưởng **xếp loại** điểm /100 (Xuất sắc→Cần gấp) | App đã có sẵn tương đương: `classification` (Tốt/Khá/Trung bình/Cần cải thiện) tính ở `server/lib/scoring.js`, hiển thị chip "Xếp loại" trong `ScoreSummary` | giữ bản của nhóm (một API chung) |

Sản phẩm "mục 1" (checklist 22 mục `webcheckClient.js`) và khung "Part 3" (`part3Review.js`) của
bạn cụ vẫn giữ trong repo làm tài sản nhóm, nhưng **không cắm** vào luồng app sau audit dưới đây.

## Đối chiếu 7 quy tắc "không nên làm trùng" (audit 09/11/2026)

| Quy tắc | Kết luận | Kiểm chứng + đã xử lý |
|---|---|---|
| Frontend + Backend cùng quét → **Chỉ Backend quét** | 🔴 đã vi phạm → Đã sửa | trang Analyze tự gọi `/api/fetch` + chạy engine 22 mục ngay trong trình duyệt — gỡ sạch khối này; client `grep '/api/fetch'` = 0, chỉ Backend quét (`server/lib/fetcher.js`) |
| AI + Backend cùng tính điểm → **Chỉ Backend tính điểm** | 🟢 tuân thủ | điểm chỉ sinh ở `server/lib/scoring.js` (+ `webcheckEngine.js`); UI chỉ đọc `analysis.score` (ScoreSummary/RoadmapPanel chỉ sắp xếp để hiển thị) |
| AI tự tạo checklist mới → **AI chỉ nhận xét trên checklist có sẵn** | 🟢 tuân thủ | `aiReview.js` chỉ nhận `criteria[]` có sẵn → strengths/improvements; không tự sinh mục (legacy panel có prompt khác cũng đã gỡ khỏi app) |
| Frontend + Backend cùng lưu lịch sử → **MVP chỉ localStorage** | 🟢 tuân thủ | lịch sử = `HistoryContext` + `storage.js`; server chỉ có RAM-cache TTL 30' để đỡ quét lại, không ghi đĩa/database |
| AI tạo báo cáo + Frontend tạo báo cáo riêng → **AI trả nhận xét, Frontend ghép báo cáo** | 🔴 trùng panel → Đã sửa | trang Analyze từng có 2 đường AI (panel Part 3 legacy + `AiConsultant`) — gỡ panel legacy khỏi app; giờ "một luồng: useAnalyze → AnalysisReport" |
| Nhiều thành viên tạo API riêng → **Một API thống nhất** | 🟢 tuân thủ | app chỉ gọi `/api/analyze(+/stream)` · `/api/ai-review` · `/api/health`; `/api/fetch` chỉ còn phục vụ máy chấm QA `/webcheck/…` theo hợp đồng riêng |
| Nhiều người tự đặt tên trường → **Một API contract chung** | 🟢 tuân thủ | shape JSON chốt ở contract v3.0; client không rename trường server trả về (catalog sinh từ engine qua `scripts/sync-criteria.mjs`) |

Sau audit, trình duyệt QA: example.com **71/100**, 60 mục, không lỗi console, **0** call `/api/fetch`,
`#webcheck-checklist-container` + `#part3-review-container` không còn trong DOM; server tests 5/5.
