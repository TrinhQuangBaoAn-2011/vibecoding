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
  Link2,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
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
import {
  CRITERIA_COUNTS_BY_PRIORITY,
  CRITERIA_GROUPS,
  CRITERIA_META,
  GROUP_ICONS,
  TOTAL_WEIGHT,
  WEIGHT_BY_PRIORITY,
} from '../lib/constants.js';

const CRITERION_PREVIEW = ['https', 'title', 'viewport', 'img_alt'];

const PRIORITY_BARS = [
  { level: 'P0', solid: 'bg-rose-500' },
  { level: 'P1', solid: 'bg-orange-500' },
  { level: 'P2', solid: 'bg-amber-500' },
  { level: 'P3', solid: 'bg-sky-500' },
];

const STEPS = [
  {
    icon: Link2,
    title: 'Nhập URL công khai',
    description: 'Hệ thống kiểm tra định dạng, giao thức và chặn địa chỉ nội bộ trước khi kết nối.',
  },
  {
    icon: Server,
    title: 'Backend tải HTML thật',
    description: 'Express tải HTML và bộ máy WebCheck v2.0 đọc trực tiếp nội dung website, kèm probes robots.txt / sitemap.xml.',
  },
  {
    icon: Sparkles,
    title: 'Chấm điểm và nhận xét',
    description: '60 tiêu chí được chấm theo trọng số P0–P3, chuẩn hóa về 100 và AI tổng hợp nhận xét tiếng Việt.',
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
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-brand-50/80 px-3 py-1 text-[11px] font-semibold text-brand-600">
              <Zap className="h-3.5 w-3.5" />
              Website intelligence cho doanh nghiệp Việt
            </p>

            <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl lg:text-[42px]">
              Hiểu website của bạn.
              <br />
              <span className="gradient-text">Cải thiện marketing.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              WEBCHECK AI phân tích HTML thực tế của bất kỳ website công khai nào, chấm theo bộ máy
              v2.0 đủ 60 tiêu chí — quan trọng bậc nào chấm điểm cao bậc đó — và gợi ý lộ trình cải
              thiện bằng tiếng Việt: minh bạch, có bằng chứng, trong vài giây.
            </p>

            <div className="mt-6">
              <UrlForm onSubmit={handleAnalyze} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                60 tiêu chí trọng số, thang 100
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
                <p className="mt-1 text-sm font-bold text-foreground">60 tiêu chí · trọng số P0–P3</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Globe2 className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {PRIORITY_BARS.map(({ level, solid }) => {
                const count = CRITERIA_COUNTS_BY_PRIORITY[level] || 0;
                const weight = WEIGHT_BY_PRIORITY[level];
                return (
                  <div key={level} className="flex items-center gap-2">
                    <span className={`inline-flex h-5 w-8 items-center justify-center rounded text-[10px] font-extrabold text-white ${solid}`}>
                      {level}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-full rounded-full ${solid}`}
                        style={{ width: `${Math.max(4, (count / CRITERIA_META.length) * 100)}%` }}
                      />
                    </div>
                    <span className="w-24 text-right text-[11px] font-semibold text-muted-foreground tabular">
                      {count} mục ×{weight}đ
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {CRITERIA_META.filter((criterion) => CRITERION_PREVIEW.includes(criterion.id)).map(
                (criterion) => (
                  <div
                    key={criterion.id}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50/60 px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">
                      {criterion.name}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular">
                      ×{criterion.weight}
                    </span>
                  </div>
                ),
              )}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-lg bg-neutral-900 px-3 py-2 text-white">
              <span className="text-[11px] font-semibold">
                {CRITERIA_META.length - CRITERION_PREVIEW.length} tiêu chí còn lại · 7 nhóm
              </span>
              <span className="text-[11px] font-bold tabular">
                Ba-rem {TOTAL_WEIGHT} điểm thô → /100
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
            <h2 className="text-lg font-bold text-foreground">Website được đánh giá trên 60 tiêu chí</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Trọng số theo mức ưu tiên P0–P3. Tiêu chí không xác định được loại khỏi mẫu số và
              chuẩn hóa lại về thang 100.
            </p>

            <Link to="/about" className="text-xs font-bold text-brand-600 hover:text-brand-700">
              Chi tiết phương thức
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CRITERIA_GROUPS.map((groupName) => {
            const Icon = GROUP_ICONS[groupName] || FileText;
            const items = CRITERIA_META.filter((criterion) => criterion.group === groupName);
            const weight = items.reduce((total, item) => total + item.weight, 0);
            return (
              <div key={groupName} className="card p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{groupName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {items.length} tiêu chí ·{' '}
                      <span className="font-bold text-ink-800 tabular">{weight} điểm thô</span>
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {PRIORITY_BARS.filter(({ level }) =>
                    items.some((item) => item.criticality === level),
                  ).map(({ level, solid }) => (
                    <span
                      key={level}
                      className={`inline-flex h-4 items-center justify-center rounded px-1.5 text-[9px] font-extrabold text-white ${solid}`}
                    >
                      {level} ×{items.filter((item) => item.criticality === level).length}
                    </span>
                  ))}
                </div>
                <p className="mt-2 truncate text-[11px] text-muted-foreground">
                  {items.map((item) => item.name).slice(0, 3).join(' · ')}
                  {items.length > 3 ? ` +${items.length - 3}` : ''}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="text-center text-xs text-muted-foreground">
            Báo cáo được tạo bởi WEBCHECK AI từ dữ liệu HTML thực tế. Điểm số theo bộ 60 tiêu chí
            v2.0 có trọng số, không phải điểm xếp hạng chính thức của Google và không thay thế
            kiểm toán SEO chuyên sâu.
          </p>
        </div>
      </section>
    </div>
  );
}