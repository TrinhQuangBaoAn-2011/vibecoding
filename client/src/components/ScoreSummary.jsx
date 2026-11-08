import { Star } from 'lucide-react';
import { STATUS_META, CLASSIFICATION_META, PRIORITY_META } from '../lib/constants.js';

export function ScoreSummary({ analysis, comparison }) {
  const classification =
    analysis.classification?.label ||
    CLASSIFICATION_META[analysis.classification?.key || 'average'].label;

  const criteriaLines = (analysis.criteria || []).map((criterion) => {
    const label = criterion.statusLabel || STATUS_META[criterion.status].label;
    const excluded = criterion.status === 'na' || criterion.status === 'untestable';
    const points = excluded
      ? 'không tính vào điểm'
      : `${criterion.points}/${criterion.maxPoints} điểm`;
    return `- ${criterion.name}: ${label} (${points})`;
  });

  const overall =
    analysis.score !== undefined
      ? `Website đạt ${analysis.score}/100, xếp loại ${classification}. Kết quả ghi nhận ${
          analysis.counts?.pass ?? 0
        } tiêu chí đạt, ${analysis.counts?.warning ?? 0} tiêu chí cần xem xét và ${
          analysis.counts?.fail ?? 0
        } tiêu chí chưa đạt.`
      : '';

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Điểm tổng kết</p>
          <p className="text-2xl font-bold text-foreground">{analysis.score}/100</p>
          <p className="text-muted-foreground">{classification}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50/80 px-2.5 py-1 text-[10px] font-bold text-brand-600 ring-1 ring-inset ring-brand-100">
            <Star className="h-3.5 w-3.5" />
            {analysis.score}/100
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kết quả kiểm tra</p>
        <p className="mt-1">{overall}</p>
      </div>
    </div>
  );
}