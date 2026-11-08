import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Loader2,
  MinusCircle,
  X,
} from 'lucide-react';

function StepIcon({ status }) {
  if (status === 'done') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/40" />
        <Loader2 className="relative h-4 w-4 animate-spin" strokeWidth={2.4} />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200">
        <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        <MinusCircle className="h-4 w-4" strokeWidth={2.4} />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-300">
      <CircleDashed className="h-4 w-4" strokeWidth={2.2} />
    </span>
  );
}

export function ProgressSteps({
  steps = [],
  status = 'idle',
  onCancel,
  title,
}) {
  const [elapsed, setElapsed] = useState(0);
  const isRunning = status === 'analyzing' || status === 'ai-pending';

  useEffect(() => {
    if (!isRunning) return undefined;
    setElapsed(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const doneCount = steps.filter((step) => ['done', 'skipped'].includes(step.status)).length;
  const activeCount = steps.some((step) => step.status === 'active') ? 1 : 0;
  const percent = useMemo(() => {
    if (!steps.length) return 0;
    if (status === 'success') return 100;
    const partial = Math.min(100, Math.round(((doneCount + activeCount * 0.45) / steps.length) * 100));
    return Math.max(4, partial);
  }, [steps.length, status, doneCount, activeCount]);

  const heading =
    title ||
    (status === 'success'
      ? 'Phân tích hoàn tất'
      : status === 'error'
        ? 'Phân tích gặp lỗi'
        : status === 'ai-pending'
          ? 'AI đang tổng hợp nhận xét'
          : 'Đang phân tích website');

  return (
    <section className="card overflow-hidden" aria-live="polite" aria-busy={isRunning}>
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              status === 'error'
                ? 'bg-rose-50 text-rose-600'
                : status === 'success'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-brand-50 text-brand-600'
            }`}
          >
            {status === 'success' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : status === 'error' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </span>
          <div>
            <h2 className="text-base font-bold text-ink-900">{heading}</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {isRunning
                ? 'Quá trình chạy trực tiếp trên dữ liệu HTML thật của website.'
                : 'Các bước đã thực hiện trong lần phân tích này.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600 tabular">
              <Clock3 className="h-3.5 w-3.5" />
              {elapsed}s
            </span>
          )}
          {onCancel && isRunning && (
            <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
              <X className="h-3.5 w-3.5" />
              Hủy
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 sm:px-6">
        <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
          <span>Tiến độ</span>
          <span className="tabular">{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              status === 'error'
                ? 'bg-gradient-to-r from-rose-500 to-orange-400'
                : 'bg-gradient-to-r from-brand-600 to-cyan-400'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 space-y-0 px-5 pb-5 sm:px-6">
        {steps.map((step, index) => {
          const active = step.status === 'active';
          return (
            <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
              {index < steps.length - 1 && (
                <span
                  className={`absolute left-4 top-9 h-[calc(100%-1.25rem)] w-px ${
                    ['done', 'skipped'].includes(step.status) ? 'bg-emerald-200' : 'bg-ink-200'
                  }`}
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10 pt-1">
                <StepIcon status={step.status} />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-semibold ${
                      active ? 'text-brand-700' : step.status === 'pending' ? 'text-ink-400' : 'text-ink-800'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.status === 'skipped' && (
                    <span className="badge bg-ink-100 text-ink-500">Bỏ qua</span>
                  )}
                  {step.status === 'error' && (
                    <span className="badge bg-rose-50 text-rose-600">Lỗi</span>
                  )}
                </div>
                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    active ? 'font-medium text-brand-600' : 'text-ink-500'
                  }`}
                >
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
