export const CLASSIFICATIONS = Object.freeze({
  good: {
    key: 'good',
    label: 'Tốt',
    range: '85–100',
    description: 'Website đáp ứng tốt các tiêu chí cơ bản của WEBCHECK AI.',
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
    description: 'Website còn thiếu nhiều yếu tố cơ bản cần được ưu tiên khắc phục.',
  },
});

export function classifyScore(score) {
  if (score >= 85) return CLASSIFICATIONS.good;
  if (score >= 70) return CLASSIFICATIONS.fair;
  if (score >= 50) return CLASSIFICATIONS.average;
  return CLASSIFICATIONS.poor;
}

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

  return {
    score,
    rawPoints: Math.round(rawPoints * 100) / 100,
    maxAvailable,
    maxRaw,
    normalizedPoints: Math.round(normalized * 10) / 10,
    classification,
    counts,
    scoredCriteria: applicable.length,
    excludedCriteria: criteria.length - applicable.length,
    scoringNote:
      'Điểm được chuẩn hóa về thang 100 sau khi loại các tiêu chí Không áp dụng hoặc Không thể kiểm tra khỏi mẫu số. Đây là đánh giá theo bộ tiêu chí cơ bản của WEBCHECK AI, không phải điểm xếp hạng chính thức của Google.',
  };
}
