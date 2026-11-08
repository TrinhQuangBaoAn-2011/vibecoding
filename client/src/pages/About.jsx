import { Link } from 'react-router-dom';
import {
  AlignLeft,
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  Globe2,
  Heading1,
  Image as ImageIcon,
  Languages,
  Layers,
  Link2,
  Lock,
  Server,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Type,
  Zap,
} from 'lucide-react';
import { CRITERIA_META } from '../lib/constants.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

const CRITERION_ICONS = {
  title: Type,
  'meta-description': AlignLeft,
  viewport: Smartphone,
  favicon: Star,
  h1: Heading1,
  https: Lock,
  'image-alt': ImageIcon,
  language: Languages,
  canonical: Link2,
  'open-graph': Share2,
};

const CRITERIA_DETAILS = {
  title: {
    description: 'Thẻ tiêu đề xuất hiện trên tab trình duyệt và thường là dòng tiêu đề trong kết quả tìm kiếm.',
    why: 'Độ dài khuyến nghị 30–60 ký tự, mô tả đúng nội dung trang.',
  },
  'meta-description': {
    description: 'Đoạn mô tả ngắn tóm tắt nội dung trang bên dưới tiêu đề tìm kiếm.',
    why: 'Độ dài khuyến nghị 50–160 ký tự, giúp người dùng quyết định có nhấp hay không.',
  },
  viewport: {
    description: 'Khai báo cách trình duyệt di động hiển thị và thu phóng trang.',
    why: 'Cần có width=device-width để giao diện responsive hiển thị đúng tỷ lệ.',
  },
  favicon: {
    description: 'Biểu tượng nhỏ hiển thị trên tab trình duyệt, dấu trang và lịch sử.',
    why: 'Giúp nhận diện thương hiệu, đặc biệt khi người dùng mở nhiều tab.',
  },
  h1: {
    description: 'Tiêu đề cấp cao nhất, xác định chủ đề chính của nội dung trang.',
    why: 'Nên có duy nhất một H1 rõ ràng; các mục con dùng H2, H3.',
  },
  https: {
    description: 'Giao thức mã hóa kết nối giữa trình duyệt và máy chủ.',
    why: 'Bảo vệ dữ liệu trao đổi và là nền tảng cho sự tin cậy của website.',
  },
  'image-alt': {
    description: 'Thuộc tính mô tả thay thế cho hình ảnh khi không thể hiển thị.',
    why: 'Hỗ trợ trình đọc màn hình và cải thiện khả năng truy cập.',
  },
  language: {
    description: 'Thuộc tính lang trên thẻ html khai báo ngôn ngữ của nội dung.',
    why: 'Giúp trình duyệt, công cụ tìm kiếm và công nghệ hỗ trợ xử lý đúng ngôn ngữ.',
  },
  canonical: {
    description: 'Thẻ liên kết chỉ rõ phiên bản chính của trang khi có nhiều URL tương tự.',
    why: 'Hạn chế nhầm lẫn về nội dung trùng lặp giữa các biến thể URL.',
  },
  'open-graph': {
    description: 'Bộ thẻ mô tả tiêu đề, mô tả và hình ảnh khi chia sẻ lên mạng xã hội.',
    why: 'Cần og:title, og:description và og:image để liên kết hiển thị đầy đủ.',
  },
};

const STATUS_GUIDE = [
  {
    status: 'pass',
    description: 'Tiêu chí được đáp ứng đầy đủ theo điều kiện kiểm tra; nhận toàn bộ điểm.',
  },
  {
    status: 'warning',
    description: 'Có yếu tố nhưng chưa tối ưu; vẫn được tính điểm một phần hoặc không đạt tối đa.',
  },
  {
    status: 'fail',
    description: 'Không tìm thấy hoặc không đáp ứng yêu cầu cơ bản; nhận 0 điểm.',
  },
  {
    status: 'na',
    description: 'Không áp dụng cho trang, ví dụ trang không có hình ảnh. Loại khỏi mẫu số.',
  },
  {
    status: 'untestable',
    description: 'Không thể xác minh do giới hạn kỹ thuật. Không bị coi là lỗi, loại khỏi mẫu số.',
  },
];

const LIMITATIONS = [
  'Phiên bản hiện tại phân tích HTML tĩnh do backend tải về. Nội dung chỉ xuất hiện sau khi chạy JavaScript có thể chưa được nhìn thấy.',
  'Không đo tốc độ tải thực tế, Core Web Vitals, hành vi người dùng hay chất lượng nội dung chuyên sâu.',
  'Không thay thế kiểm toán SEO, bảo mật hoặc khả năng truy cập toàn diện.',
  'Điểm số không phải điểm xếp hạng chính thức của Google và không đảm bảo thứ hạng tìm kiếm.',
];

const STACK = [
  { label: 'React 18', icon: Code2 },
  { label: 'Vite', icon: Zap },
  { label: 'Tailwind CSS', icon: Layers },
  { label: 'Express', icon: Server },
  { label: 'Cheerio', icon: FileText },
  { label: 'Recharts', icon: Calculator },
  { label: 'localStorage', icon: Database },
];

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
              WEBCHECK AI được xây dựng để giúp chủ doanh nghiệp nhỏ và đội marketing hiểu nhanh chất
              lượng nền tảng website của mình. Mọi điểm số đều xuất phát từ HTML thực tế, mỗi nhận định
              đều có bằng chứng và giới hạn được nói rõ.
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
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-cyan-400 text-white shadow-glow">
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
                'Không chấm điểm tiêu chí không thể kiểm tra.',
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

      <section>
        <div className="mb-4">
          <p className="eyebrow">Bộ tiêu chí</p>
          <h2 className="mt-1 text-xl font-bold text-ink-900 sm:text-2xl">10 tiêu chí, tổng 100 điểm</h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-500">
            Trọng số phản ánh mức ảnh hưởng tương đối tới hiển thị, khả năng truy cập và hiệu quả chia
            sẻ. Đây là bộ tiêu chí nền tảng, không phải toàn bộ yếu tố SEO.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CRITERIA_META.map((criterion) => {
            const Icon = CRITERION_ICONS[criterion.id] || FileText;
            const detail = CRITERIA_DETAILS[criterion.id];
            return (
              <article key={criterion.id} className="card flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-ink-900">{criterion.name}</h3>
                    <span className="badge bg-ink-900 text-white !px-2 !py-0.5 !text-[10px]">
                      {criterion.maxPoints} điểm
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{detail.description}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">
                    <span className="font-semibold text-ink-500">Vì sao: </span>
                    {detail.why}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Cách tính điểm</h2>
              <p className="mt-0.5 text-xs text-ink-500">Chuẩn hóa để không phạt website vì tiêu chí không áp dụng.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Công thức</p>
            <p className="mt-2 font-mono text-sm font-bold text-ink-900">
              (điểm đạt được / điểm tối đa khả dụng) × 100
            </p>
          </div>

          <div className="mt-4 space-y-2 text-sm leading-relaxed text-ink-600">
            <p>
              Điểm tối đa khả dụng chỉ gồm các tiêu chí có trạng thái Đạt, Cần xem xét hoặc Chưa đạt.
              Tiêu chí Không áp dụng và Không thể kiểm tra bị loại khỏi cả tử số và mẫu số.
            </p>
            <p>
              Nhờ vậy, một trang không có hình ảnh sẽ không bị trừ 10 điểm oan. Điểm cuối cùng được làm
              tròn và phân loại theo bốn mức: Tốt, Khá, Trung bình, Cần cải thiện.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
            {[
              ['Tốt', '85–100', 'bg-emerald-50 text-emerald-700'],
              ['Khá', '70–84', 'bg-blue-50 text-blue-700'],
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
                <StatusBadge status={item.status} showIcon={false} className="w-[104px] shrink-0 justify-center !px-2 !py-0.5 !text-[10px]" />
                <p className="text-xs leading-relaxed text-ink-600">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

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
              dữ liệu 10 tiêu chí đã lọc được gửi tới mô hình OpenAI-compatible. Prompt yêu cầu chỉ dùng
              dữ liệu thật, không khen tiêu chí chưa đạt và không hứa hẹn thứ hạng.
            </p>
            <p>
              Khi chưa cấu hình hoặc nhà cung cấp AI gặp lỗi, backend tạo nhận xét bằng bộ quy tắc dựa
              trên chính kết quả kiểm tra. Giao diện luôn ghi rõ nguồn là “AI trực tiếp” hay “Bộ quy tắc
              dự phòng”. Fallback không được trình bày như AI trực tiếp.
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

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-ink-900 via-ink-900 to-brand-900 px-6 py-8 text-center text-white sm:px-10">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative">
          <h2 className="text-xl font-bold text-white sm:text-2xl">Sẵn sàng kiểm tra website của bạn?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-brand-100/80">
            Nhập URL, nhận báo cáo 10 tiêu chí và lộ trình cải thiện trong vài giây. Không cần đăng ký.
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
