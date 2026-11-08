import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Globe2,
  AlignLeft,
  Search,
  Heading1,
  Image as ImageIcon,
  Languages,
  Link2,
  Lock,
  Share2,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Type,
  Zap,
} from 'lucide-react';
import { UrlForm } from '../components/UrlForm.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { RecordCard } from '../components/RecordCard.jsx';
import { ProgressSteps } from '../components/ProgressSteps.jsx';
import { AnalysisReport } from '../components/AnalysisReport.jsx';
import { useAnalyze } from '../hooks/useAnalyze.js';
import { useHistory } from '../context/HistoryContext.jsx';
import { useHealth } from '../context/HealthContext.jsx';
import { CRITERIA_META } from '../lib/constants.js';
import { formatDateTime, formatDuration, formatBytes } from '../lib/format.js';

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

const CRITERION_DESCRIPTIONS = {
  title: 'Tiêu đề hiển thị trên tab và kết quả tìm kiếm.',
  'meta-description': 'Đoạn mô tả giúp người dùng quyết định nhấp.',
  viewport: 'Bố cục hiển thị đúng trên thiết bị di động.',
  favicon: 'Biểu tượng nhận diện thương hiệu trên tab.',
  h1: 'Xác định rõ chủ đề chính của trang.',
  https: 'Mã hóa kết nối giữa người dùng và máy chủ.',
  'image-alt': 'Mô tả thay thế cho hình ảnh, hỗ trợ tiếp cận.',
  language: 'Khai báo ngôn ngữ cho trình duyệt và công cụ tìm kiếm.',
  canonical: 'Chỉ rõ phiên bản chính khi có nhiều URL.',
  'open-graph': 'Hiển thị đẹp khi chia sẻ lên mạng xã hội.',
};

const STEPS = [
  {
    icon: Link2,
    title: 'Nhập URL công khai',
    description: 'Hệ thống kiểm tra định dạng, giao thức và chặn địa chỉ nội bộ trước khi kết nối.',
  },
  {
    icon: Server,
    title: 'Backend tải HTML thật',
    description: 'Express và Cheerio đọc trực tiếp nội dung website, không dùng dữ liệu mẫu hay CORS.',
  },
  {
    icon: Sparkles,
    title: 'Chấm điểm và nhận xét',
    description: '10 tiêu chí được chấm, chuẩn hóa về 100 và AI tổng hợp nhận xét tiếng Việt.',
  },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { records } = useHistory();
  const { aiConfigured } = useHealth();

  const stats = useMemo(() => {
    if (records.length === 0) {
      return { total: 0, best: null, average: null, week: 0 };
    }
    const scores = records.map((record) => Number(record.score) || 0);
    const best = Math.max(...scores);
    const average = Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const week = records.filter((record) => new Date(record.analyzedAt).getTime() >= weekAgo).length;
    return { total: records.length, best, average, week };
  }, [records]);

  const handleAnalyze = (url) => {
    navigate(`/analyze?url=${encodeURIComponent(url)}`);
  };

  const statCards = [
    { label: 'Lần kiểm tra', value: stats.total || '—', update: stats.total ? 'Trong lịch sử cục bộ' : 'Chưa có dữ liệu', icon: Search },
    { label: 'Điểm cao nhất', value: stats.best ?? '—', update: stats.best !== null ? 'Trên thang 100' : 'Chưa có dữ liệu', icon: Award },
    { label: 'Điểm trung bình', value: stats.average ?? '—', update: stats.average !== null ? 'Tất cả lần kiểm tra' : 'Chưa có dữ liệu', icon: BarChart3 },
    { label: '7 ngày qua', value: stats.week, update: 'Lần kiểm tra gần đây', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card text-card-foreground">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Home className="h-5 w-5" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hiểu website của bạn.
              <br />
              <span className="gradient-text">Cải thiện marketing.</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Chặn SSRF nội bộ
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50/60 px-2.5 py-1 ring-1 ring-inset ring-brand-100">
              <Sparkles className="h-3.5 w-3.5" />
              {aiConfigured ? 'AI trực tiếp đã cấu hình' : 'Nhận xét AI dự phòng minh bạch'}
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 lg:p-10 md:pt-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative grid items-start gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border-border brand-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
              <Zap className="h-3.5 w-3.5" />
              Website intelligence cho doanh nghiệp Việt
            </p>

            <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl lg:text-[42px]">
              Hiểu website của bạn.
              <br />
              <span className="gradient-text">Cải thiện marketing.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              WEBCHECK AI phân tích HTML thực tế của bất kỳ website công khai nào, chấm điểm 10 tiêu chí cơ bản và gợi ý lộ trình cải thiện bằng tiếng Việt — minh bạch, có bằng chứng, trong vài giây.
            </p>

            <div className="mt-6">
              <UrlForm onSubmit={handleAnalyze} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                10 tiêu chí, thang 100
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                Chặn địa chỉ nội bộ
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-cyan-500" />
                {aiConfigured ? 'AI trực tiếp đã cấu hình' : 'Nhận xét AI dự phòng minh bạch'}
              </span>
            </div>
          </div>

          <div className="card p-5 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Bộ tiêu chí</p>
                <p className="mt-1 text-sm font-bold text-foreground">10 điểm chạm chất lượng</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Globe2 className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {CRITERIA_META.slice(0, 8).map((criterion) => {
                const Icon = CRITERION_ICONS[criterion.id] || FileText;
                return (
                  <div
                    key={criterion.id}
                    className="flex items-center gap-2 rounded-lg border-border border-brand-100 bg-brand-50/60 px-2 py-1.5"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                      {criterion.name}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular">{criterion.maxPoints}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-lg bg-neutral-900 px-3 py-2 text-white">
              <span className="text-[11px] font-semibold">2 tiêu chí còn lại</span>
              <span className="text-[11px] font-bold tabular">
                +{CRITERIA_META.slice(8).reduce((total, item) => total + item.maxPoints, 0)} điểm
              </span>
            </div>

            <Link
              to="/about"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700"
            >
              Xem cách chấm điểm
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {stat.label}
              </span>
              <stat.icon className="h-4 w-4 text-muted-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.update}</p>
          </div>
        ))}
      </section>

      {/* Responsive Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Phân tích gần đây</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Các kết quả được lưu trên trình duyệt của bạn.</p>
            </div>

            {records.length > 0 && (
              <Link to="/history" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                Xem tất cả ({records.length})
              </Link>
            )}
          </div>

          {records.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Chưa có lần phân tích nào"
              description="Nhập URL ở phía trên để bắt đầu. Kết quả, điểm số và nhận xét sẽ được lưu tự động vào lịch sử cục bộ."
              action={
                <Link to="/analyze" className="btn-primary btn-sm">
                  <Sparkles className="h-4 w-4" />
                  Bắt đầu phân tích
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {records.slice(0, 4).map((record) => (
                <RecordCard key={record.id} record={record} compact />
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-base font-bold text-foreground">Cách hoạt động</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Toàn bộ dữ liệu được tải và phân tích ở backend, không dùng kết quả mô phỏng.
          </p>
          <ol className="mt-4 space-y-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex gap-3">
                {index < STEPS.length - 1 && (
                  <span className="absolute left-[17px] top-9 h-[calc(100%-0.5rem)] w-px bg-border" />
                )}
                <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-brand-500 ring-1 ring-inset ring-brand-100">
                  <step.icon className="h-4 w-4" />
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-bold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Analysis Section */}
      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Website được đánh giá trên 10 tiêu chí</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tổng điểm tối đa 100. Tiêu chí không áp dụng được loại khỏi mẫu số và chuẩn hóa lại.
            </p>

            <Link to="/about" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              Chi tiết phương thức
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CRITERIA_META.map((criterion) => {
              const Icon = CRITERION_ICONS[criterion.id] || FileText;
              return (
                <div key={criterion.id} className="card flex items-start gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-muted-500 ring-1 ring-inset ring-border-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">{criterion.name}</p>
                      <span className="badge bg-brand-50 text-brand-600 !px-2 !py-0.5 !text-[10px]">
                        {criterion.maxPoints} điểm
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {CRITERION_DESCRIPTIONS[criterion.id]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-center text-xs text-muted-foreground">
            Báo cáo được tạo bởi WEBCHECK AI từ dữ liệu HTML thực tế. Điểm số theo bộ tiêu chí cơ bản,
            không phải điểm xếp hạng chính thức của Google và không thay thế kiểm toán SEO chuyên sâu.
          </p>
        </div>
      </section>
    </div>
  );
}