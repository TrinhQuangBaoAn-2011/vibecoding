import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  History,
  Minus,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getStatusMeta } from '../lib/constants.js';
import { formatDateTime } from '../lib/format.js';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-ink-200 bg-white px-3 py-2 shadow-lift">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-ink-900 tabular">{payload[0].value}/100 điểm</p>
    </div>
  );
}

function DeltaPill({ delta }) {
  if (delta > 0) {
    return (
      <span className="badge bg-emerald-50 text-emerald-700">
        <ArrowUpRight className="h-3.5 w-3.5" />+{delta} điểm
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="badge bg-rose-50 text-rose-700">
        <ArrowDownRight className="h-3.5 w-3.5" />
        {delta} điểm
      </span>
    );
  }
  return (
    <span className="badge bg-ink-100 text-ink-600">
      <Minus className="h-3.5 w-3.5" />
      Không đổi
    </span>
  );
}

export function ComparisonCard({ comparison, className = '' }) {
  if (!comparison) return null;

  const { hasComparison, previous, delta, series = [], improved = [], declined = [] } = comparison;

  if (!hasComparison) {
    return (
      <section className={`card p-5 sm:p-6 ${className}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <History className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">So sánh với lần kiểm tra trước</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">
                Đây là lần đầu WEBCHECK AI ghi nhận website này trong lịch sử. Khi bạn phân tích lại
                cùng tên miền, biểu đồ điểm và danh sách tiêu chí thay đổi sẽ xuất hiện tại đây.
              </p>
            </div>
          </div>
          <span className="badge shrink-0 bg-ink-100 text-ink-600">
            <BarChart3 className="h-3.5 w-3.5" />
            Chưa đủ dữ liệu so sánh
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink-900">So sánh với lần kiểm tra trước</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Lần trước: {formatDateTime(previous.analyzedAt)} · {previous.score}/100
            </p>
          </div>
        </div>
        <DeltaPill delta={delta} />
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-400">
              Diễn biến điểm số
            </p>
            <span className="text-xs font-semibold text-ink-400">{series.length} lần kiểm tra</span>
          </div>
          {series.length >= 2 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#bfdbfe', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#scoreTrend)"
                    dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-ink-200 bg-ink-50/50 text-sm text-ink-500">
              Cần ít nhất 2 lần kiểm tra để vẽ biểu đồ.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Tiêu chí được cải thiện ({improved.length})
            </p>
            {improved.length === 0 ? (
              <p className="mt-1.5 text-xs text-ink-500">Chưa có tiêu chí chuyển sang trạng thái Đạt.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {improved.map((item) => (
                  <li key={item.id} className="flex items-center gap-1.5 text-xs text-ink-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="shrink-0 font-semibold text-emerald-700">Đạt</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-rose-100 bg-rose-50/50 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-rose-700">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Tiêu chí bị giảm ({declined.length})
            </p>
            {declined.length === 0 ? (
              <p className="mt-1.5 text-xs text-ink-500">Không có tiêu chí nào bị giảm so với lần trước.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {declined.map((item) => (
                  <li key={item.id} className="flex items-center gap-1.5 text-xs text-ink-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className={`shrink-0 font-semibold ${getStatusMeta(item.to).text}`}>
                      {getStatusMeta(item.to).label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <a
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition hover:text-brand-800"
          >
            Xem toàn bộ lịch sử
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
