import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Lightbulb, Sparkles } from 'lucide-react';

/* Lộ trình cải thiện ưu tiên — bản THU GỌN để chống "trang cuộn dài":
 *  - Mỗi vấn đề = 1 dòng accordion (số thứ tự + tên + mức ưu tiên + điểm mất).
 *    Bấm vào mới mở chi tiết: Vấn đề / Tác động / Đề xuất / Lý do ưu tiên.
 *  - Mặc định chỉ mở sẵn 2 vấn đề nặng nhất ở nhóm ưu tiên cao (bắt đầu từ P0/P1).
 *  - Nhóm P2/P3 gói trong nút "bấm để xem" — người dùng tự mở khi muốn đọc sâu.
 * Nguồn dữ liệu KHÔNG đổi: analysis.criteria trả từ server (một nguồn sự thật),
 * dùng đúng bằng chứng và gợi ý tiếng Việt của bộ máy, không bịa câu.
 * Các mục Đạt / Không xác định / Không áp dụng không xếp vào lộ trình. */

const GENERAL = {
  impact: 'Điểm yếu này làm giảm khả năng hiển thị và mức tin cậy của website với người dùng khi tìm kiếm.',
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

function formatLost(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace('.', ',');
}

function tierOf(criterion) {
  return TIERS.find(
    (tier) => tier.levels.includes(criterion.priority) && ROADMAP_STATUSES.includes(criterion.status),
  );
}

function RoadmapItem({ criterion, open, onToggle, tier }) {
  const lost = lostPoints(criterion);
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-[0_1px_2px_rgba(24,32,48,0.04)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-50/60 sm:px-5"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-xs font-bold text-white">
          {criterion.num}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">
          {criterion.name}
        </span>
        <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset sm:inline ${tier.badgeClass}`}>
          {tier.badge}
        </span>
        {lost > 0 && (
          <span className="hidden shrink-0 text-[10px] font-bold text-rose-600 tabular sm:inline">
            mất {formatLost(lost)} điểm thô
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-ink-100 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
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
            Mức {criterion.priorityLabel || criterion.priority} trong nhóm “{criterion.group}” — Chưa
            đạt mất tới {criterion.maxPoints} điểm thô; dọn xong nhóm này sẽ kéo điểm tổng lên nhanh nhất.
          </p>
        </div>
      )}
    </div>
  );
}

export function RoadmapPanel({ criteria = [] }) {
  const { roadmap, total, autoExpand } = useMemo(() => {
    const grouped = TIERS.map((tier) => ({
      tier,
      items: criteria
        .filter((criterion) => tierOf(criterion) === tier)
        .sort((a, b) => lostPoints(b) - lostPoints(a) || (Number(b.maxPoints) || 0) - (Number(a.maxPoints) || 0)),
    })).filter((section) => section.items.length > 0);

    let counter = 0;
    const numbered = grouped.map((section) => ({
      ...section,
      items: section.items.map((criterion) => ({ ...criterion, num: (counter += 1) })),
    }));

    // 2 vấn đề đầu tiên sau khi sắp theo điểm mất = việc nặng nhất, mở sẵn cho người dùng.
    const expand = new Set();
    for (const section of numbered) {
      for (const item of section.items) {
        if (expand.size < 2) expand.add(item.num); else break;
      }
      if (expand.size >= 2) break;
    }
    return {
      roadmap: numbered,
      total: numbered.reduce((sum, section) => sum + section.items.length, 0),
      autoExpand: expand,
    };
  }, [criteria]);

  // Đổi kết quả phân tích mới → về trạng thái mặc định (mở 2 việc nặng, nhóm phụ đóng.
  const [openIds, setOpenIds] = useState(null);
  const [tierExpanded, setTierExpanded] = useState({});
  useEffect(() => {
    setOpenIds(null);
    setTierExpanded({});
  }, [criteria]);

  const activeOpen = openIds || autoExpand;
  const toggleItem = (num) =>
    setOpenIds((current) => {
      const next = new Set(current || autoExpand);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  const expandTier = (title) =>
    setTierExpanded((current) => ({ ...current, [title]: true }));
  const collapseTier = (title) =>
    setTierExpanded((current) => ({ ...current, [title]: false }));

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink-900">Lộ trình cải thiện ưu tiên</h2>
            <p className="mt-0.5 text-xs text-ink-400">Bấm từng vấn đề để xem chi tiết — mặc định đã mở việc nặng nhất</p>
          </div>
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
        <div className="space-y-5 px-5 py-5 sm:px-6">
          {roadmap.map(({ tier, items }, sectionIndex) => {
            // Nhóm đầu tiên (ưu tiên cao) mở sẵn; nhóm sau thu gọn thành 1 nút.
            const expanded = tierExpanded[tier.title] ?? sectionIndex === 0;
            return (
              <div key={tier.title}>
                {expanded ? (
                  <>
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tier.dot}`} />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-700">{tier.title}</p>
                        <p className="mt-0.5 text-xs text-ink-400">{tier.subtitle}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {items.map((criterion) => (
                        <RoadmapItem
                          key={criterion.id}
                          criterion={criterion}
                          tier={tier}
                          open={activeOpen.has(criterion.num)}
                          onToggle={() => toggleItem(criterion.num)}
                        />
                      ))}
                      {items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => collapseTier(tier.title)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2 text-xs font-bold text-ink-500 transition hover:bg-ink-50"
                        >
                          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                          Thu gọn nhóm này
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => expandTier(tier.title)}
                    aria-expanded={false}
                    className="flex w-full items-center gap-3 rounded-2xl border border-ink-200/80 bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(24,32,48,0.04)] transition hover:bg-ink-50/60 sm:px-5"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tier.dot}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">
                      {tier.title}
                    </span>
                    <span className="tabular shrink-0 text-[10px] font-bold text-ink-400">
                      {items.length} mục
                    </span>
                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset sm:inline ${tier.badgeClass}`}
                    >
                      {tier.badge}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
