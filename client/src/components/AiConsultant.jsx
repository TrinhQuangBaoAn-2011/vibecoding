import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Printer, Tag } from 'lucide-react';
import { buildReport, copyTextToClipboard } from '../lib/report.js';
import { useToast } from '../context/ToastContext.jsx';

export function AiConsultant({
  review = null,
  status = 'done',
  error = null,
  onRetryAi,
  analysis = null,
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const eReview = review || analysis?.aiReview || null;
  const record = analysis ? { ...analysis, aiReview: eReview } : { aiReview: eReview };

  const handleCopy = async () => {
    const text = buildReport(record);
    const result = await copyTextToClipboard(text);
    if (result.ok) {
      setCopied(true);
      toast.success('Đã sao chép báo cáo đầy đủ vào bộ nhớ tạm.', {
        title: 'Sao chép thành công',
      });
    } else {
      toast.error(result.error || 'Không thể sao chép báo cáo.', {
        title: 'Sao chép thất bại',
      });
    }
  };

  // Determine AI status display
  let aiStatusDisplay = 'idle';
  if (status === 'pending') aiStatusDisplay = 'pending';
  else if (error) aiStatusDisplay = 'error';
  else if (eReview) aiStatusDisplay = 'done';
  else if (status === 'skipped') aiStatusDisplay = 'skipped';

  // AI status badge styles
  const statusStyles = {
    idle: { dot: 'bg-ink-400', badge: 'bg-ink-100 text-ink-600 ring-ink-200' },
    pending: { dot: 'bg-brand-500', badge: 'bg-brand-100 text-brand-700 ring-brand-200', pulse: 'animate-pulse' },
    done: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
    error: { dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700 ring-rose-200' },
    skipped: { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 ring-amber-200' },
  };

  const style = statusStyles[aiStatusDisplay] || statusStyles.idle;

  return (
    <section>
      {/* AI Consultant Section */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {/* Status indicator */}
            <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${style.dot} ${style.pulse || ''}`} />

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {aiStatusDisplay === 'pending'
                  ? 'Đang xử lý AI...'
                  : aiStatusDisplay === 'done'
                    ? 'AI đã hoàn thành'
                    : aiStatusDisplay === 'skipped'
                      ? 'Nhận xét do bộ quy tắc WEBCHECK tạo'
                      : aiStatusDisplay === 'error'
                        ? 'AI tạm thời không phản hồi'
                        : 'AI chưa chạy'}
              </p>
              {aiStatusDisplay === 'skipped' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Nhận xét do bộ quy tắc WEBCHECK tạo (AI dự phòng hoặc chưa cấu hình).
                </p>
              )}
            </div>
          </div>

          {onRetryAi && (
            <button
              type="button"
              onClick={onRetryAi}
              className="btn-ghost btn-sm shrink-0"
            >
              Thử lại AI
            </button>
          )}
        </div>

        {/* Review Content */}
        {eReview && eReview.summary ? (
          <div className="mt-3 rounded-xl bg-neutral-50/60 p-3 text-sm text-ink-700">
            <p className="font-medium">{eReview.summary}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa có nhận xét AI. Phân tích 10 tiêu chí đã hoàn tất.
          </p>
        )}

        {/* Strengths & Improvements */}
        {eReview && eReview.strengths && eReview.strengths.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-brand-600">
              Điểm sáng
            </p>
            <ul className="space-y-2">
              {eReview.strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-600" />
                  <span className="flex-1 text-sm text-ink-700">{s.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {eReview && eReview.improvements && eReview.improvements.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-600">
              Cần cải thiện
            </p>
            <ul className="space-y-2">
              {eReview.improvements.slice(0, 3).map((i, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Tag className="h-3 w-3 flex-shrink-0 text-amber-600" />
                  <span className="flex-1 text-sm text-ink-700">{i.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Action buttons */}
        {eReview && (
          <div className="mt-4 border-t border-ink-200/80 pt-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-200"
              >
                <Copy className="h-3.5 w-3.5" />
                Sao chép báo cáo
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-200"
              >
                <Printer className="h-3.5 w-3.5" />
                In báo cáo
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
