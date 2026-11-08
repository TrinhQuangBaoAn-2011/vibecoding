import { useMemo, useState } from 'react';
import { ChevronRight, ListChecks } from 'lucide-react';
import { getPriorityMeta, getStatusMeta } from '../lib/constants.js';
import { StatusBadge, StatusIcon } from './StatusBadge.jsx';
import { CriterionModal } from './CriterionModal.jsx';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pass', label: 'Đạt' },
  { key: 'fail', label: 'Chưa đạt' },
  { key: 'warning', label: 'Cần cải thiện' },
  { key: 'other', label: 'Không tính điểm' },
];

function formatPoints(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace('.', ',');
}

function matchesFilter(criterion, filter) {
  if (filter === 'all') return true;
  if (filter === 'other') return ['na', 'untestable'].includes(criterion.status);
  return criterion.status === filter;
}

export function CriteriaList({ criteria = [] }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const counts = useMemo(
    () => ({
      all: criteria.length,
      pass: criteria.filter((criterion) => criterion.status === 'pass').length,
      fail: criteria.filter((criterion) => criterion.status === 'fail').length,
      warning: criteria.filter((criterion) => criterion.status === 'warning').length,
      other: criteria.filter((criterion) => ['na', 'untestable'].includes(criterion.status)).length,
    }),
    [criteria],
  );

  const visible = useMemo(
    () => criteria.filter((criterion) => matchesFilter(criterion, filter)),
    [criteria, filter],
  );

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ListChecks className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink-900">Chi tiết 60 tiêu chí</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Chọn từng tiêu chí để xem bằng chứng, trọng số và đề xuất.
            </p>
          </div>
        </div>
        <span className="badge bg-emerald-50 text-emerald-700">
          {counts.pass}/{criteria.length} tiêu chí đạt
        </span>
      </div>

      <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b border-ink-100 px-4 py-3 sm:px-5">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-ink-100/70 text-ink-600 hover:bg-ink-200/70 hover:text-ink-900'
              }`}
            >
              {item.label}
              <span className={`ml-1.5 tabular ${active ? 'text-white/70' : 'text-ink-400'}`}>
                {counts[item.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-ink-100">
        {visible.map((criterion) => {
          const meta = getStatusMeta(criterion.status);
          const priority = getPriorityMeta(criterion.criticality || criterion.priority);
          const excluded = ['na', 'untestable'].includes(criterion.status);
          const max = Number(criterion.maxPoints) || 0;
          const points = Number(criterion.points) || 0;
          const width = excluded || max <= 0 ? 0 : Math.max(2, Math.min(100, (points / max) * 100));

          return (
            <button
              key={criterion.id}
              type="button"
              onClick={() => setSelected(criterion)}
              className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-ink-50/80 sm:items-center sm:px-6"
            >
              <span className="mt-0.5 shrink-0 sm:mt-0">
                <StatusIcon status={criterion.status} className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-ink-900">{criterion.name}</span>
                  <StatusBadge
                    status={criterion.status}
                    label={criterion.statusLabel}
                    showIcon={false}
                    className="!px-2 !py-0.5 !text-[10px]"
                  />
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${priority.badge}`}
                    title={`Trọng số ${priority.weight} điểm thô — mức ưu tiên ${priority.label}`}
                  >
                    {criterion.criticality || criterion.priority || 'P2'} · {priority.weight}đ
                  </span>
                  {excluded && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                      Không tính vào điểm
                    </span>
                  )}
                </span>
                <span className="mt-1 hidden max-w-2xl truncate text-xs text-ink-500 sm:block">
                  {criterion.message}
                </span>
                <span className="mt-2 flex items-center gap-2">
                  <span className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-100">
                    <span
                      className={`block h-full rounded-full ${meta.solid}`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-ink-400 tabular">
                    {excluded ? '—' : `${formatPoints(points)}/${max}`}
                  </span>
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2 self-center">
                <span className={`text-sm font-bold tabular ${excluded ? 'text-ink-400' : meta.text}`}>
                  {excluded ? '—' : formatPoints(points)}
                  <span className="text-xs font-semibold text-ink-400">/{max}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-500" />
              </span>
            </button>
          );
        })}

        {visible.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-ink-500">
            Không có tiêu chí nào trong nhóm này.
          </div>
        )}
      </div>

      <CriterionModal
        criterion={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
