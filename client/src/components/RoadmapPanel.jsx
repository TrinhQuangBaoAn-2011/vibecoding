import { useMemo } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';

/* Lộ trình cải thiện ưu tiên — gom các tiêu chí đang Chưa đạt / Cần cải thiện
 * lại theo mức ưu tiên thực tế của từng tình huống (engine v2.0 đã map
 * theo bảng ưu tiên trung tâm: fail → criticality, warn → warnPriority).
 * Mỗi vấn đề thành một thẻ: Vấn đề / Tác động / Đề xuất + lý do ưu tiên
 * (dùng đúng bằng chứng và gợi ý tiếng Việt của bộ máy, không bịa câu).
 * Các mục Đạt / Không xác định / Không áp dụng không xếp vào lộ trình. */

const GENERAL = {
  impact: 'Nghịch lý này làm giảm khả năng hiển thị và mức tin cậy của website với người dùng khi tìm kiếm.',
  recommendation: 'Mở mục tiêu chí trong "Chi tiết 60 tiêu chí" của báo cáo để xem bằng chứng và cách khắc phục đúng tình huống.',
};

const TIERS = [
  {
    levels: ['P0', 'P1'],
    title: 'Cần khắc phục ngay · Ưu tiên cao',
    subtitle: 'Các vấn đề ảnh hưởng trực tiếp đến hiển thị, bảo mật hoặc trải nghiệm cốt lõi.',
    dot: 'bg-rose-500',
    badge: 'Ưu tiên Cao',
    badgeClass: 'bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200',
    boxes: {
      problem: 'bg-rose-50/70 text-ink-700',
      label: 'text-rose-600',
      impact: 'bg-amber-50/70 text-ink-700',
      labelImpact: 'text-amber-700',
      suggestion: 'bg-emerald-50/70 text-ink-700',
      labelSuggestion: 'text-emerald-600',
    },
  },
  {
    levels: ['P2'],
    title: 'Nên khắc phục · Ưu tiên trung bình',
    subtitle: 'Các vấn đề quan trọng nhưng có thể xử lý sau nhóm ưu tiên cao.',
    dot: 'bg-amber-500',
    badge: 'Ưu tiên Trung bình',
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    boxes: {
      problem: 'bg-amber-50/70 text-ink-700',
      label: 'text-amber-700',
      impact: 'bg-sky-50/70 text-ink-700',
      labelImpact: 'text-sky-700',
      suggestion: 'bg-emerald-50/70 text-ink-700',
      labelSuggestion: 'text-emerald-600',
    },
  },
  {
    levels: ['P3'],
    title: 'Khuyến nghị · Ưu tiên thấp',
    subtitle: 'Việc cải thiện nên làm dần, sau khi nhóm ưu tiên cao đã xử lý xong.',
    dot: 'bg-sky-500',
    badge: 'Ưu tiên Thấp',
    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    boxes: {
      problem: 'bg-sky-50/70 text-ink-700',
      label: 'text-sky-700',
      impact: 'bg-indigo-50/70 text-ink-700',
      labelImpact: 'text-indigo-700',
      suggestion: 'bg-emerald-50/70 text-ink-700',
      labelSuggestion: 'text-emerald-600',
    },
  },
];

const ROADMAP_STATUSES = ['fail', 'warning'];

function lostPoints(criterion) {
  return (Number(criterion.maxPoints) || 0) - (Number(criterion.points) || 0);
}

function tierOf(criterion) {
  return TIERS.find((tier) => tier.levels.includes(criterion.priority) && ROADMAP_STATUSES.includes(criterion.status));
}

export function RoadmapPanel({ criteria = [] }) {
  const { roadmap, total } = useMemo(() => {
    const grouped = TIERS.map((tier) => ({
      tier,
      items: criteria
        .filter((criterion) => tierOf(criterion) === tier)
        .sort((a, b) => lostPoints(b) - lostPoints(a) || (b.maxPoints || 0) - (a.maxPoints || 0)),
    })).filter((section) => section.items.length > 0);
    return { roadmap: grouped, total: grouped.reduce((sum, section) => sum + section.items.length, 0) };
  }, [criteria]);

  let counter = 0;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Lightbulb className="h-5 w-5" />
          </span>
          <h2 className="text-base font-bold text-ink-900">Lộ trình cải thiện ưu tiên</h2>
        </div>
        <span className="text-xs font-semibold text-ink-400">{total} mục</span>
      </div>

      {total === 0 ? (
        <div className="flex items-start gap-3 px-5 py-5 sm:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="text-sm text-ink-600">
            Không còn mục nào cần khắc phục trong lộ trình — phần lớn tiêu chí khả thi đã Đạt hoặc chỉ còn cảnh báo nhỏ.
          </p>
        </div>
      ) : (
        <div className="space-y-6 px-5 py-5 sm:px-6">
          {roadmap.map(({ tier, items }) => (
            <div key={tier.title}>
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tier.dot}`} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-700">{tier.title}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{tier.subtitle}</p>
                </div>
              </div>

              <div className="mt-3 space-y-4">
                {items.map((criterion) => {
                  counter += 1;
                  return (
                    <article key={criterion.id} className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(24,32,48,0.04)] sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">
                          {counter}
                        </span>
                        <h3 className="min-w-0 flex-1 break-words text-[15px] font-bold leading-snug text-ink-900">
                          {criterion.name}
                        </h3>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${tier.badgeClass}`}>
                          {tier.badge}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className={`rounded-xl p-4 ${tier.boxes.problem}`}>
                          <p className={`text-xs font-bold ${tier.boxes.label}`}>Vấn đề</p>
                          <p className="mt-1.5 text-sm leading-relaxed">{criterion.message || criterion.value}</p>
                        </div>
                        <div className={`rounded-xl p-4 ${tier.boxes.impact}`}>
                          <p className={`text-xs font-bold ${tier.boxes.labelImpact}`}>Tác động</p>
                          <p className="mt-1.5 text-sm leading-relaxed">{criterion.impact || GENERAL.impact}</p>
                        </div>
                      </div>

                      <div className={`mt-3 rounded-xl p-4 ${tier.boxes.suggestion}`}>
                        <p className={`text-xs font-bold ${tier.boxes.labelSuggestion}`}>Đề xuất</p>
                        <p className="mt-1.5 text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                          {criterion.recommendation || GENERAL.recommendation}
                        </p>
                      </div>

                      <p className="mt-3 text-xs text-ink-500">
                        <span className="font-bold text-ink-700">Lý do ưu tiên: </span>
                        Mức {criterion.priorityLabel || criterion.priority} trong nhóm “{criterion.group}” — khi Chưa
                        đạt mất tới {criterion.maxPoints} điểm thô; dọn xong nhóm này sẽ kéo điểm tổng lên nhanh nhất.
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
