import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Globe,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { formatDateTime, formatDuration, formatBytes } from '../lib/format.js';
import { buildReport, copyTextToClipboard } from '../lib/report.js';
import { useToast } from '../context/ToastContext.jsx';
import { ScoreSummary } from './ScoreSummary.jsx';
import { CriteriaList } from './CriteriaList.jsx';
import { RoadmapPanel } from './RoadmapPanel.jsx';
import { ComparisonCard } from './ComparisonCard.jsx';
import { AiConsultant } from './AiConsultant.jsx';

export function AnalysisReport({
  analysis,
  review = null,
  aiStatus = 'done',
  aiError = null,
  onRetryAi,
  comparison = null,
  onDelete,
  onReanalyze,
  saved = false,
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!analysis) return null;

  const effectiveReview = review || analysis.aiReview || null;
  const record = { ...analysis, aiReview: effectiveReview };
  const finalUrl = analysis.finalUrl || analysis.url;

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

  return (
    <div className="space-y-5">
      <section className="space-y-5">
        {/* Report Header */}
        <section className="card overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-r from-brand-50 via-brand-100 to-cyan-50 px-5 py-4 sm:px-6">
            <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600 ring-1 ring-inset ring-brand-100">
                    Báo cáo phân tích
                  </span>
                  {saved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-500 ring-1 ring-inset ring-emerald-200/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Đã lưu lịch sử
                    </span>
                  )}
                </div>
                <h1 className="mt-2 break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {analysis.hostname || 'Website'}
                </h1>
                <a
                  href={finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-brand-600 transition hover:text-white"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{finalUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>

              <div className="no-print flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-brand-700 shadow-sm transition hover:bg-neutral-50 active:scale-[0.98]"
                >
                  {copied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Đã sao chép' : 'Sao chép báo cáo'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-50/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20"
                >
                  <Printer className="h-4 w-4" />
                  In
                </button>
                {onReanalyze && (
                  <button
                    type="button"
                    onClick={onReanalyze}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-50/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Phân tích lại
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-semibold text-white ring-1 ring-inset ring-rose-200/30 transition hover:bg-rose-200/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Report Content */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-white px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
            <span>
              <span className="font-semibold text-foreground">Thời điểm: </span>
              {formatDateTime(analysis.analyzedAt)}
            </span>
            <span>
              <span className="font-semibold text-foreground">Thời gian: </span>
              {formatDuration(analysis.durationMs)}
            </span>
            <span>
              <span className="font-semibold text-foreground">HTML: </span>
              {formatBytes(analysis.source?.htmlBytes ?? analysis.page?.htmlBytes)}
            </span>
            <span>
              <span className="font-semibold text-foreground">Nguồn: </span>
              Dữ liệu HTML tải trực tiếp
            </span>
          </div>
        </div>
      </section>

      <ScoreSummary analysis={analysis} comparison={comparison} />

      <RoadmapPanel criteria={analysis.criteria || []} />

      <CriteriaList criteria={analysis.criteria || []} />

      {comparison && <ComparisonCard comparison={comparison} />}

      <AiConsultant
        review={effectiveReview}
        status={aiStatus}
        error={aiError}
        onRetryAi={onRetryAi}
        analysis={analysis}
      />

      <p className="text-center text-xs text-muted-foreground">
        Báo cáo được tạo bởi WEBCHECK AI từ dữ liệu HTML thực tế. Điểm số theo bộ tiêu chí cơ bản,
        không phải điểm xếp hạng chính thức của Google và không thay thế kiểm toán SEO chuyên sâu.
      </p>
    </div>
  );
}