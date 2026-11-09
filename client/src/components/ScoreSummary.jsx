import { Info, Scale } from 'lucide-react';
import { ScoreRing } from './ScoreRing.jsx';
import {
  classificationFromScore,
  getClassificationMeta,
  getPriorityMeta,
} from '../lib/constants.js';

/* ⭐ Điểm tổng kết — vòng điểm + bảng "trọng số bị mất" theo mức ưu tiên P0–P3.
 * Mỗi tiêu chí mang trọng số (P0 đắt nhất); số bị mất của mỗi mức cộng lại từ
 * chính kết quả chấm của server (analysis.priorities) nên luôn khớp bảng điểm.
 */

function formatPoints(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace('.', ',');
}

function countRow(value, style, label) {
  return (
    <span
      key={label}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      <span className="tabular">{value}</span>
      {label}
    </span>
  );
}

export function ScoreSummary({ analysis, comparison }) {
  const score = Number(analysis?.score);
  const classification =
    analysis?.classification?.label ||
    getClassificationMeta(classificationFromScore(score)).label;
  const counts = analysis?.counts || {};
  const weights = analysis?.weights || {};
  const priorities = Array.isArray(analysis?.priorities) ? analysis.priorities : [];

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex items-center gap-3.5">
          <ScoreRing score={Number.isNaN(score) ? 0 : score} size={124} showLabel={false} />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Điểm tổng kết
            </p>
            <p className="mt-1 flex items-baseline gap-1 text-2xl font-extrabold tracking-tight text-ink-900 tabular">
              {Number.isNaN(score) ? '—' : score}
              <span className="text-base font-bold text-ink-400">/100</span>
            </p>
            <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-inset ring-brand-100">
              Xếp loại {classification || '—'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {countRow(counts.pass ?? 0, 'bg-emerald-50 text-emerald-700 ring-emerald-200', 'đạt')}
          {countRow(counts.warning ?? 0, 'bg-amber-50 text-amber-700 ring-amber-200', 'cần cải thiện')}
          {countRow(counts.fail ?? 0, 'bg-rose-50 text-rose-700 ring-rose-200', 'chưa đạt')}
          {countRow(counts.untestable ?? 0, 'bg-violet-50 text-violet-700 ring-violet-200', 'không xác định')}
        </div>
      </div>

      {priorities.length > 0 && (
        <div className="mt-4 rounded-md border border-ink-200 bg-gradient-to-b from-ink-50/80 to-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="h-4 w-4 text-brand-600" />
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-600">
              Trọng số bị mất theo mức ưu tiên
            </p>
            <span className="ml-auto text-[10px] font-semibold text-ink-400">
              Ba-rem P0 đắt nhất ({weights.P0 ?? 6}) → P3 ({weights.P3 ?? 1})
            </span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {priorities.map((row) => {
              const meta = getPriorityMeta(row.level);
              const share =
                row.totalWeight > 0
                  ? Math.min(100, (row.lostWeight / row.totalWeight) * 100)
                  : 0;
              return (
                <li key={row.level} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[11px] font-semibold text-ink-600">
                    <span className={`inline-flex h-5 w-7 items-center justify-center rounded text-[10px] font-extrabold text-white ${meta.solid} mr-1.5 align-middle`}>
                      {row.level}
                    </span>
                    {meta.label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <span
                        className={`block h-full rounded-full ${meta.solid} transition-[width] duration-500`}
                        style={{ width: `${share}%` }}
                      />
                    </span>
                  </span>
                  <span className="w-40 shrink-0 text-right text-[11px] tabular text-ink-400">
                    mất {formatPoints(row.lostWeight)}/{formatPoints(row.totalWeight)} điểm thô
                    {row.issues > 0 ? ` · ${row.issues} mục` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {analysis.scoringNote && (
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
          {analysis.scoringNote}
        </p>
      )}
    </div>
  );
}
