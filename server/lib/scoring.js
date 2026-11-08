import { enginePriorityWords, WEIGHT_BY_PRIORITY, WARN_KEEP_RATIO, engineCatalog } from './webcheckEngine.js';

export const CLASSIFICATIONS = Object.freeze({
  good: {
    key: 'good',
    label: 'Tốt',
    range: '85–100',
    description: 'Website đáp ứng tốt các tiêu chí quan trọng của WEBCHECK AI.',
  },
  fair: {
    key: 'fair',
    label: 'Khá',
    range: '70–84',
    description: 'Website có nền tảng khá tốt nhưng còn một số điểm cần cải thiện.',
  },
  average: {
    key: 'average',
    label: 'Trung bình',
    range: '50–69',
    description: 'Website đáp ứng một phần tiêu chí và còn nhiều điểm cần cải thiện.',
  },
  poor: {
    key: 'poor',
    label: 'Cần cải thiện',
    range: '0–49',
    description: 'Website còn thiếu nhiều yếu tố quan trọng cần được ưu tiên khắc phục.',
  },
});

export function classifyScore(score) {
  if (score >= 85) return CLASSIFICATIONS.good;
  if (score >= 70) return CLASSIFICATIONS.fair;
  if (score >= 50) return CLASSIFICATIONS.average;
  return CLASSIFICATIONS.poor;
}

/** Tổng hợp việc cần làm theo mức ưu tiên (P0 vẫn đứng đầu), gồm bớt điểm thô. */
function buildPrioritySummary(criteria, priorityWords) {
  const levels = ['P0', 'P1', 'P2', 'P3'];
  return levels
    .map((level) => {
      const open = criteria.filter(
        (criterion) =>
          criterion.criticality === level &&
          ['fail', 'warning'].includes(criterion.status),
      );
      const lostWeight = open.reduce((total, c) => total + (c.maxPoints - c.points), 0);
      const totalWeight = criteria
        .filter((criterion) => criterion.criticality === level)
        .reduce((total, c) => total + c.maxPoints, 0);
      return {
        level,
        label: priorityWords[level] || level,
        weight: WEIGHT_BY_PRIORITY[level],
        issues: open.length,
        lostWeight: ROUND_1(lostWeight),
        totalWeight,
      };
    })
    .filter((entry) => entry.totalWeight > 0 || entry.issues > 0);
}

const ROUND_1 = (x) => Math.round(x * 10) / 10;

export function computeScore(criteria) {
  const applicable = criteria.filter(
    (criterion) => !['na', 'untestable'].includes(criterion.status),
  );

  const maxAvailable = applicable.reduce((total, criterion) => total + criterion.maxPoints, 0);
  const rawPoints = applicable.reduce((total, criterion) => total + criterion.points, 0);

  if (maxAvailable <= 0) {
    throw new Error('Không có tiêu chí nào có thể chấm điểm.');
  }

  const normalized = (rawPoints / maxAvailable) * 100;
  const score = Math.max(0, Math.min(100, Math.round(normalized)));
  const classification = classifyScore(score);

  const counts = {
    pass: criteria.filter((criterion) => criterion.status === 'pass').length,
    fail: criteria.filter((criterion) => criterion.status === 'fail').length,
    warning: criteria.filter((criterion) => criterion.status === 'warning').length,
    na: criteria.filter((criterion) => criterion.status === 'na').length,
    untestable: criteria.filter((criterion) => criterion.status === 'untestable').length,
  };

  const maxRaw = criteria.reduce((total, criterion) => total + criterion.maxPoints, 0);
  const priorityWords = enginePriorityWords();

  return {
    score,
    rawPoints: ROUND_1(rawPoints),
    maxAvailable,
    maxRaw: Math.round(maxRaw * 10) / 10,
    totalWeightOfEngine: engineCatalog().reduce((total, row) => total + row.weight, 0),
    normalizedPoints: ROUND_1(normalized),
    classification,
    counts,
    scoredCriteria: applicable.length,
    excludedCriteria: criteria.length - applicable.length,
    priorities: buildPrioritySummary(criteria, priorityWords),
    weights: WEIGHT_BY_PRIORITY,
    warnKeepRatio: WARN_KEEP_RATIO,
    scoringNote:
      'Điểm chuẩn hóa về thang 100. Mỗi tiêu chí mang trọng số theo mức ưu tiên khi Chưa đạt: ' +
      `P0 đắt nhất (${WEIGHT_BY_PRIORITY.P0} điểm), P1 (${WEIGHT_BY_PRIORITY.P1}), P2 (${WEIGHT_BY_PRIORITY.P2}), P3 (${WEIGHT_BY_PRIORITY.P3}). ` +
      `Trạng thái Cần cải thiện giữ ${Math.round(WARN_KEEP_RATIO * 100)}% điểm của tiêu chí; Chưa đạt mất nguyên trọng số. ` +
      'Tiêu chí Không xác định được loại khỏi cả tử số và mẫu số để không phạt website oan. ' +
      'Đây là đánh giá theo bộ 60 tiêu chí v2.0 của WEBCHECK AI, không phải điểm xếp hạng chính thức của Google.',
  };
}
