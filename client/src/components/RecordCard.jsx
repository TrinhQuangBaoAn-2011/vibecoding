import { Link } from 'react-router-dom';
import { Bot, ChevronRight, Clock3, Trash2, Wand2 } from 'lucide-react';
import { classificationFromScore, getClassificationMeta } from '../lib/constants.js';
import { displayUrl, formatRelativeTime } from '../lib/format.js';

function ReviewTag({ record }) {
  if (!record.aiReview) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-400">
        <Clock3 className="h-3 w-3" />
        Chưa có nhận xét
      </span>
    );
  }
  if (record.aiReview.source === 'ai') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
        <Bot className="h-3 w-3" />
        Có nhận xét AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
      <Wand2 className="h-3 w-3" />
      Nhận xét quy tắc
    </span>
  );
}

export function RecordCard({ record, onDelete, compact = false }) {
  if (!record) return null;
  const classification = getClassificationMeta(
    record.classification?.key || classificationFromScore(record.score),
  );
  const criteriaCount = record.criteria?.length || 10;
  const passCount = record.counts?.pass ?? 0;

  return (
    <div className="card card-hover group flex items-stretch overflow-hidden">
      <Link
        to={`/history/${encodeURIComponent(record.id)}`}
        className="flex min-w-0 flex-1 items-center gap-3 p-4 sm:gap-4"
      >
        <span
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-base font-extrabold tabular ${classification.soft} ${classification.text}`}
        >
          {record.score}
          <span className="text-[8px] font-bold uppercase tracking-wider opacity-70">điểm</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-bold text-ink-900">{record.hostname || 'website'}</span>
            <span className={`badge ${classification.soft} ${classification.text} !px-2 !py-0.5 !text-[10px]`}>
              {classification.label}
            </span>
          </span>

          {!compact && (
            <span className="mt-0.5 block truncate text-xs text-ink-500">
              {displayUrl(record.finalUrl || record.url, 68)}
            </span>
          )}

          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {formatRelativeTime(record.analyzedAt)}
            </span>
            <span className="text-ink-300">·</span>
            <span className="tabular">
              {passCount}/{criteriaCount} tiêu chí đạt
            </span>
            <span className="text-ink-300">·</span>
            <ReviewTag record={record} />
          </span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1 pr-3">
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(record)}
            className="rounded-lg p-2 text-ink-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
            aria-label={`Xóa lịch sử ${record.hostname}`}
            title="Xóa bản ghi"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <Link
          to={`/history/${encodeURIComponent(record.id)}`}
          className="rounded-lg p-1.5 text-ink-300 transition hover:bg-ink-100 hover:text-ink-600"
          aria-label={`Xem chi tiết ${record.hostname}`}
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
