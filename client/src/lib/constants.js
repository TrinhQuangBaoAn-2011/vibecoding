export const STATUS_META = {
  pass: {
    label: 'Đạt',
    shortLabel: 'Đạt',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    solid: 'bg-emerald-500',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50',
    border: 'border-emerald-200',
    ring: 'ring-emerald-500/20',
  },
  fail: {
    label: 'Chưa đạt',
    shortLabel: 'Chưa đạt',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    solid: 'bg-rose-500',
    text: 'text-rose-600',
    soft: 'bg-rose-50',
    border: 'border-rose-200',
    ring: 'ring-rose-500/20',
  },
  warning: {
    label: 'Cần xem xét',
    shortLabel: 'Cần xem xét',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    solid: 'bg-amber-500',
    text: 'text-amber-600',
    soft: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'ring-amber-500/20',
  },
  na: {
    label: 'Không áp dụng',
    shortLabel: 'Không áp dụng',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
    solid: 'bg-slate-400',
    text: 'text-slate-500',
    soft: 'bg-slate-50',
    border: 'border-slate-200',
    ring: 'ring-slate-400/20',
  },
  untestable: {
    label: 'Không thể kiểm tra',
    shortLabel: 'Không thể kiểm tra',
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    solid: 'bg-violet-400',
    text: 'text-violet-600',
    soft: 'bg-violet-50',
    border: 'border-violet-200',
    ring: 'ring-violet-500/20',
  },
};

export const CLASSIFICATION_META = {
  good: {
    label: 'Tốt',
    range: '85–100',
    color: '#10b981',
    soft: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    solid: 'bg-emerald-500',
    text: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-400',
    description: 'Website đáp ứng tốt các tiêu chí cơ bản.',
  },
  fair: {
    label: 'Khá',
    range: '70–84',
    color: '#3b82f6',
    soft: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    solid: 'bg-blue-500',
    text: 'text-blue-600',
    gradient: 'from-blue-600 to-cyan-400',
    description: 'Nền tảng khá tốt, còn vài điểm cần cải thiện.',
  },
  average: {
    label: 'Trung bình',
    range: '50–69',
    color: '#f59e0b',
    soft: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    solid: 'bg-amber-500',
    text: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-400',
    description: 'Đáp ứng một phần tiêu chí, cần cải thiện thêm.',
  },
  poor: {
    label: 'Cần cải thiện',
    range: '0–49',
    color: '#ef4444',
    soft: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    solid: 'bg-rose-500',
    text: 'text-rose-600',
    gradient: 'from-rose-500 to-orange-500',
    description: 'Còn thiếu nhiều yếu tố cơ bản cần ưu tiên.',
  },
};

export const CRITERIA_META = [
  { id: 'title', name: 'Thẻ Title', maxPoints: 15 },
  { id: 'meta-description', name: 'Meta Description', maxPoints: 15 },
  { id: 'viewport', name: 'Thẻ Viewport', maxPoints: 10 },
  { id: 'favicon', name: 'Favicon', maxPoints: 5 },
  { id: 'h1', name: 'Tiêu đề H1', maxPoints: 10 },
  { id: 'https', name: 'HTTPS', maxPoints: 10 },
  { id: 'image-alt', name: 'Thuộc tính Alt', maxPoints: 10 },
  { id: 'language', name: 'Ngôn ngữ', maxPoints: 5 },
  { id: 'canonical', name: 'Canonical', maxPoints: 5 },
  { id: 'open-graph', name: 'Open Graph', maxPoints: 15 },
];

export const PRIORITY_META = {
  Cao: {
    label: 'Cao',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    dot: 'bg-rose-500',
    groupLabel: 'Cần khắc phục ngay',
    groupDescription: 'Các vấn đề ảnh hưởng trực tiếp đến hiển thị, bảo mật hoặc trải nghiệm cốt lõi.',
  },
  'Trung bình': {
    label: 'Trung bình',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    dot: 'bg-amber-500',
    groupLabel: 'Nên khắc phục',
    groupDescription: 'Các vấn đề quan trọng nhưng có thể xử lý sau nhóm ưu tiên cao.',
  },
  Thấp: {
    label: 'Thấp',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
    dot: 'bg-slate-500',
    groupLabel: 'Có thể cải thiện sau',
    groupDescription: 'Các điểm tối ưu bổ sung, ít ảnh hưởng trực tiếp đến người dùng.',
  },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.warning;
}

export function getClassificationMeta(key) {
  return CLASSIFICATION_META[key] || CLASSIFICATION_META.average;
}

export function classificationFromScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'average';
  if (value >= 85) return 'good';
  if (value >= 70) return 'fair';
  if (value >= 50) return 'average';
  return 'poor';
}