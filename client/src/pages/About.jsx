import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  Code2,
  Database,
  Globe2,
  Layers,
  Lock,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CRITERIA_COUNTS_BY_PRIORITY,
  CRITERIA_GROUPS,
  CRITERIA_META,
  GROUP_ICONS,
  TOTAL_WEIGHT,
  WARN_KEEP_RATIO,
  WEIGHT_BY_PRIORITY,
} from '../lib/constants.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

/* Nguồn hiển thị duy nhất của bộ tiêu chí: CRITERIA_META (60 mục) sinh tự động
 * từ bộ máy v2.0 qua node scripts/sync-criteria.mjs — không liệt kê tay. */

const PRIORITY_LEVELS = ['P0', 'P1', 'P2', 'P3'];

const PRIORITY_LABELS = {
  P0: 'Khẩn',
  P1: 'Cao',
  P2: 'Trung bình',
  P3: 'Khuyến nghị',
};

const STATUS_GUIDE = [
  {
    status: 'pass',
    description: 'Tiêu chí được đáp ứng đầy đủ theo điều kiện kiểm tra; nhận trọn trọng số.',
  },
  {
    status: 'warning',
    description: 'Có yếu tố nhưng chưa tối ưu; giữ 60% trọng số của tiêu chí.',
  },
  {
    status: 'fail',
    description: 'Không tìm thấy hoặc không đáp ứng yêu cầu cơ bản; mất nguyên trọng số.',
  },
  {
    status: 'na',
    description: 'Không áp dụng cho trang, ví dụ trang không có hình ảnh. Loại khỏi mẫu số.',
  },
  {
    status: 'untestable',
    description: 'Không xác định được từ dữ liệu lần tải. Không bị coi là lỗi, loại khỏi mẫu số.',
  },
];

const LIMITATIONS = [
  'Phân tích HTML tĩnh do backend tải về. Nội dung chỉ xuất hiện sau khi chạy JavaScript có thể chưa được nhìn thấy.',
  'Không đo tốc độ tải thực tế, Core Web Vitals, hành vi người dùng hay chất lượng nội dung chuyên sâu.',
  'Không thay thế kiểm toán SEO, bảo mật hoặc khả năng truy cập toàn diện.',
  'Điểm số không phải điểm xếp hạng chính thức của Google và không đảm bảo thứ hạng tìm kiếm.',
];

const STACK = [
  { label: 'React 18', icon: Code2 },
  { label: 'Vite', icon: Zap },
  { label: 'Tailwind CSS', icon: Layers },
  { label: 'Express', icon: Server },
  { label: 'linkedom', icon: Code2 },
  { label: 'WebCheck v2.0', icon: CheckCircle2 },
  { label: 'localStorage', icon: Database },
];

function totalWeightOfGroup(groupName) {
  return CRITERIA_META.reduce(
    (total, criterion) => (criterion.group === groupName ? total + criterion.weight : total),
    0,
  );
}

export function About() {
  return (
    <div className="space-y-7">
      <section className="surface-grid relative overflow-hidden rounded-3xl border border-ink-200 bg-white p-6 shadow-soft sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
              <Globe2 className="h-3.5 w-3.5" />
              Về WEBCHECK AI
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
              Minh bạch từ dữ liệu
              <br />
              <span className="gradient-text">đến điểm số.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">
              WEBCHECK AI chấm website bắt đầu theo đúng bộ máy kiểm tra v2.0 với
              {' '}60 tiêu chí thực tế, mỗi tiêu chí mang trọng số theo mức quan trọng. Mọi điểm số
              đều xuất phát từ HTML thực tế, mỗi nhận định đều có bằng chứng và giới hạn được nói rõ.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/analyze" className="btn-primary">
                <Sparkles className="h-4 w-4" />
                Phân tích website
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/history" className="btn-secondary">
                Xem lịch sử
              </Link>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-900">Nguyên tắc thiết kế</p>
                <p className="text-xs text-ink-500">Không dữ liệu mẫu · Không hứa hẹn thứ hạng</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {[
                'Chỉ hiển thị kết quả từ lần tải HTML thật.',
                'Chấm đủ 60 tiêu chí; tiêu chí quan trọng chấm nhiều hơn.',
                'Không trừ điểm oan cho tiêu chí không xác định được.',
                'Nói rõ khi nhận xét đến từ bộ quy tắc thay vì AI.',
                'Không lưu API key trên trình duyệt.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-ink-600">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Bộ 60 tiêu chí ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <p className="eyebrow">Bộ tiêu chí</p>
          <h2 className="mt-1 text-xl font-bold text-ink-900 sm:text-2xl">
            60 tiêu chí · ba-rem có trọng số P0–P3
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-500">
            Trọng số lấy theo mức ưu tiên khi Chưa đạt của chính bộ máy v2.0: tiêu chí quan trọng
            chấm nhiều, tiêu chí phụ chấm ít. Điểm thô tổng {TOTAL_WEIGHT} điểm được chuẩn hóa về
            thang 100 sau khi loại các mục không xác định được.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRIORITY_LEVELS.map((level) => (
            <div key={level} className="card flex flex-col gap-1 p-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-6 items-center justify-center rounded px-1.5 text-[11px] font-extrabold text-white ${level === 'P0' ? 'bg-rose-500' : level === 'P1' ? 'bg-orange-500' : level === 'P2' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                  {level}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-ink-600">
                  {PRIORITY_LABELS[level]}
                </span>
              </div>
              <p className="text-[11px] leading-tight text-ink-500">
                {CRITERIA_COUNTS_BY_PRIORITY[level] ?? 0} tiêu chí · chấm{' '}
                <span className="font-bold tabular text-ink-800">{WEIGHT_BY_PRIORITY[level]}</span> điểm thô/mục
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {CRITERIA_GROUPS.map((groupName) => {
            const GroupIcon = GROUP_ICONS[groupName] || Layers;
            const items = CRITERIA_META.filter((criterion) => criterion.group === groupName);
            return (
              <section key={groupName} className="card overflow-hidden">
                <header className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                    <GroupIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-ink-900">{groupName}</h3>
                    <p className="text-[11px] text-ink-400">
                      {items.length} tiêu chí ·{' '}
                      <span className="font-bold text-ink-500 tabular">
                        {totalWeightOfGroup(groupName)} điểm thô
                      </span>
                    </p>
                  </div>
                </header>
                <ul className="divide-y divide-ink-100">
                  {items.map((criterion) => (
                    <li key={criterion.id} className="flex items-start gap-2 px-4 py-2">
                      <span
                        className={`mt-0.5 inline-flex h-4 shrink-0 items-center justify-center rounded px-1 text-[9px] font-extrabold text-white ${criterion.criticality === 'P0' ? 'bg-rose-500' : criterion.criticality === 'P1' ? 'bg-orange-500' : criterion.criticality === 'P2' ? 'bg-amber-500' : 'bg-sky-500'}`}
                      >
                        {criterion.criticality}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-ink-800">{criterion.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-500">
                          {criterion.impact}
                        </p>
                      </div>
                      <span className="shrink-0 badge bg-ink-900 !px-1.5 !py-0.5 !text-[10px] text-white">
                        ×{criterion.weight}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      {/* ── Cách tính điểm + trạng thái ─────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Cách tính điểm</h2>
              <p className="mt-0.5 text-xs text-ink-500">Chuẩn hóa để không phạt website vì tiêu chí không xác định được.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Công thức</p>
            <p className="mt-2 font-mono text-sm font-bold text-ink-900">
              (Σ điểm đạt / Σ điểm tối đa khả dụng) × 100
            </p>
            <p className="mt-2 text-[11px] text-ink-500">
              điểm tối đa khả dụng = trọng số của các tiêu chí chấm được · mục Không xác định /
              Không áp dụng bị loại khỏi cả tử số và mẫu số
            </p>
          </div>

          <div className="mt-4 space-y-2 text-sm leading-relaxed text-ink-600">
            <p>
              Trạng thái <span className="font-semibold text-amber-600">Cần cải thiện</span> giữ{' '}
              <span className="font-bold tabular">{Math.round(WARN_KEEP_RATIO * 100)}%</span> trọng số
              của tiêu chí. <span className="font-semibold text-rose-600">Chưa đạt</span> mất nguyên trọng số, nên
              sửa tiêu chí P0 làm điểm nhảy nhiều hơn hẳn sửa tiêu chí P3.
            </p>
            <p>
              Điểm cuối cùng được làm tròn và phân loại theo bốn mức: Tốt, Khá, Trung bình, Cần cải thiện.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
            {[
              ['Tốt', '85–100', 'bg-emerald-50 text-emerald-700'],
              ['Khá', '70–84', 'bg-sky-50 text-sky-700'],
              ['Trung bình', '50–69', 'bg-amber-50 text-amber-700'],
              ['Cần cải thiện', '0–49', 'bg-rose-50 text-rose-700'],
            ].map(([label, range, tone]) => (
              <div key={label} className={`rounded-lg px-2 py-2 font-semibold ${tone}`}>
                {label}
                <span className="ml-1 opacity-70">{range}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Năm trạng thái kiểm tra</h2>
              <p className="mt-0.5 text-xs text-ink-500">Không coi tiêu chí chưa kiểm tra được là lỗi.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {STATUS_GUIDE.map((item) => (
              <li key={item.status} className="flex items-start gap-3">
                <StatusBadge status={item.status} showIcon={false} className="w-[112px] shrink-0 justify-center !px-2 !py-0.5 !text-[10px]" />
                <p className="text-xs leading-relaxed text-ink-600">{item.description}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-ink-50 px-3.5 py-3 text-[11px] leading-relaxed text-ink-500">
            Nhãn "Không xác định" thay cho "Không thể kiểm tra" của bản cũ: các mục chỉ chấm được
            khi dữ liệu (HTML tĩnh, robots.txt, sitemap.xml) đủ — thiếu dữ liệu thì loại khỏi điểm,
            không bịa kết quả.
          </p>
        </section>
      </div>

      {/* ── AI + bảo mật ──────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">AI minh bạch, không tô vẽ</h2>
              <p className="mt-0.5 text-xs text-ink-500">Nhận xét dựa trên dữ liệu, không bịa số liệu.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-600">
            <p>
              Khi backend có <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-xs">AI_API_KEY</code>,
              kết quả của toàn bộ 60 tiêu chí (kèm trạng thái, trọng số) được gửi tới mô hình
              OpenAI-compatible. Prompt yêu cầu chỉ dùng dữ liệu thật, ưu tiên chỉ ra tiêu chí trọng số
              cao chưa đạt và không hứa hẹn thứ hạng.
            </p>
            <p>
              Khi chưa cấu hình hoặc nhà cung cấp AI gặp lỗi, backend tạo nhận xét bằng bộ quy tắc dựa
              trên chính kết quả kiểm tra. Giao diện luôn ghi rõ nguồn là "AI trực tiếp" hay "Bộ quy tắc
              dự phòng". Fallback không được trình bày như AI trực tiếp.
            </p>
          </div>
          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-3 text-xs leading-relaxed text-violet-800">
            AI không tự thay đổi điểm số. Điểm luôn do bộ chấm xác định từ dữ liệu HTML.
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">An toàn khi tải website</h2>
              <p className="mt-0.5 text-xs text-ink-500">Backend chặn truy cập vào tài nguyên nội bộ.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-ink-600">
            {[
              'Chỉ chấp nhận giao thức HTTP/HTTPS và cổng 80/443.',
              'Chặn localhost, loopback, private, link-local và dải địa chỉ dành riêng.',
              'Xác minh lại DNS sau mỗi lần chuyển hướng; tối đa 5 redirect.',
              'Giới hạn 15 giây, 3 MB HTML và chỉ nhận nội dung HTML.',
              'Thêm 2 tài liệu phụ trợ robots.txt và sitemap.xml cho các tiêu chí mạng.',
              'Rate limit 30 lượt phân tích và 40 lượt AI mỗi 10 phút cho mỗi IP.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-base font-bold text-ink-900">Giới hạn cần biết</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-600">
              {LIMITATIONS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Công nghệ</p>
            <div className="mt-2 flex max-w-xs flex-wrap gap-1.5">
              {STACK.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-600"
                >
                  <item.icon className="h-3 w-3 text-brand-500" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-8 text-center text-white sm:px-10">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative">
          <h2 className="text-xl font-bold text-white sm:text-2xl">Sẵn sàng kiểm tra website của bạn?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-brand-100/80">
            Nhập URL, nhận điểm theo 60 tiêu chí có trọng số và lộ trình cải thiện trong vài giây.
            Không cần đăng ký.
          </p>
          <Link to="/analyze" className="btn mt-5 bg-white px-5 py-2.5 text-brand-700 hover:bg-brand-50">
            <Sparkles className="h-4 w-4" />
            Bắt đầu phân tích
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
