/*
 * Hằng số hiển thị của WEBCHECK AI — bộ máy 60 tiêu chí v2.0.
 * Nguồn gốc duy nhất của danh mục tiêu chí là criteriaCatalog.js (sinh tự động
 * từ webcheck/js/analyze.js qua node scripts/sync-criteria.mjs — KHÔNG sửa tay).
 * File này chỉ cung cấp nhãn + màu cho trạng thái / ưu tiên / xếp loại.
 */

import {
  Search as SearchIcon,
  Server as ServerIcon,
  ShieldCheck as ShieldCheckIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
  Smartphone as SmartphoneIcon,
  Target as TargetIcon,
  Zap as ZapIcon,
} from 'lucide-react';

import {
  CRITERIA,
  CRITERIA_GROUPS,
  CRITERIA_COUNTS_BY_PRIORITY,
  ENGINE_VERSION,
  METHOD_WORDS,
  PRIORITY_WORDS,
  STATUS_WORDS,
  TOTAL_WEIGHT,
  WARN_KEEP_RATIO,
  WEIGHT_BY_PRIORITY,
} from './criteriaCatalog.js';

export {
  CRITERIA_GROUPS,
  CRITERIA_COUNTS_BY_PRIORITY,
  ENGINE_VERSION,
  METHOD_WORDS,
  PRIORITY_WORDS,
  STATUS_WORDS,
  TOTAL_WEIGHT,
  WARN_KEEP_RATIO,
  WEIGHT_BY_PRIORITY,
};

/* ── Trạng thái từng tiêu chí ──────────────────────────────────────────── */

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
    label: 'Cần cải thiện',
    shortLabel: 'Cần cải thiện',
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
    label: 'Không xác định',
    shortLabel: 'Không xác định',
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    solid: 'bg-violet-400',
    text: 'text-violet-600',
    soft: 'bg-violet-50',
    border: 'border-violet-200',
    ring: 'ring-violet-400/20',
  },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.untestable;
}

/* ── Mức ưu tiên P0–P3 (trọng số khi Chưa đạt) ─────────────────────────── */

export const PRIORITY_META = {
  P0: {
    key: 'P0',
    label: 'Khẩn',
    weight: WEIGHT_BY_PRIORITY.P0,
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    solid: 'bg-rose-500',
    text: 'text-rose-600',
    soft: 'bg-rose-50',
    description: 'Đắt nhất trong điểm tổng — ưu tiên xử lý trước.',
  },
  P1: {
    key: 'P1',
    label: 'Cao',
    weight: WEIGHT_BY_PRIORITY.P1,
    badge: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
    solid: 'bg-orange-500',
    text: 'text-orange-600',
    soft: 'bg-orange-50',
    description: 'Ảnh hưởng lớn tới hiển thị và tin cậy.',
  },
  P2: {
    key: 'P2',
    label: 'Trung bình',
    weight: WEIGHT_BY_PRIORITY.P2,
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    solid: 'bg-amber-500',
    text: 'text-amber-600',
    soft: 'bg-amber-50',
    description: 'Nền tảng ổn định, nên khắc phục sau P0/P1.',
  },
  P3: {
    key: 'P3',
    label: 'Khuyến nghị',
    weight: WEIGHT_BY_PRIORITY.P3,
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    solid: 'bg-sky-500',
    text: 'text-sky-600',
    soft: 'bg-sky-50',
    description: 'Cải thiện thêm khi bản chất đã vững.',
  },
};

export function getPriorityMeta(level) {
  return PRIORITY_META[level] || PRIORITY_META.P2;
}

/* ── Xếp loại điểm tổng ────────────────────────────────────────────────── */

export const CLASSIFICATION_META = {
  good: {
    key: 'good',
    label: 'Tốt',
    range: '85–100',
    description: 'Website đáp ứng tốt hầu hết các tiêu chí quan trọng của WEBCHECK AI.',
    color: '#10b981',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    solid: 'bg-emerald-500',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50',
  },
  fair: {
    key: 'fair',
    label: 'Khá',
    range: '70–84',
    description: 'Website có nền tảng khá tốt nhưng còn một số điểm cần cải thiện.',
    color: '#0ea5e9',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    solid: 'bg-sky-500',
    text: 'text-sky-600',
    soft: 'bg-sky-50',
  },
  average: {
    key: 'average',
    label: 'Trung bình',
    range: '50–69',
    description: 'Website đáp ứng một phần tiêu chí và còn nhiều điểm cần cải thiện.',
    color: '#f59e0b',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    solid: 'bg-amber-500',
    text: 'text-amber-600',
    soft: 'bg-amber-50',
  },
  poor: {
    key: 'poor',
    label: 'Cần cải thiện',
    range: '0–49',
    description: 'Website còn thiếu nhiều yếu tố quan trọng cần được ưu tiên khắc phục.',
    color: '#f43f5e',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    solid: 'bg-rose-500',
    text: 'text-rose-600',
    soft: 'bg-rose-50',
  },
};

export function getClassificationMeta(key) {
  return CLASSIFICATION_META[key] || CLASSIFICATION_META.average;
}

export function classificationFromScore(score) {
  const value = Number(score);
  if (Number.isNaN(value)) return 'average';
  if (value >= 85) return 'good';
  if (value >= 70) return 'fair';
  if (value >= 50) return 'average';
  return 'poor';
}

/* ── Danh mục 60 tiêu chí cho UI ─────────────────────────────────────────
 * T trực tiếp từ catalog (60 mục, trọng số P0=6/P1=4/P2=2/P3=1) và thêm
 * `maxPoints` = trọng số để tương thích các chỗ hiển thị "x/maxPoints điểm".
 */
export const CRITERIA_META = CRITERIA.map((row) => ({
  ...row,
  maxPoints: row.weight,
}));

/* Icon của 7 nhóm tiêu chí — dùng chung cho About/Dashboard để không trôi dạt. */
export const GROUP_ICONS = {
  'SEO & hiển thị': SearchIcon,
  'Chuẩn kỹ thuật': ServerIcon,
  'Di động & hình ảnh': SmartphoneIcon,
  'Tốc độ tải nội dung': ZapIcon,
  'Marketing & chuyển đổi': TargetIcon,
  'Tin cậy & minh bạch': ShieldCheckIcon,
  'Trải nghiệm & truy cập': SlidersHorizontalIcon,
};

/* ── Câu hỏi "thân thiện" theo nhóm — nội dung ghép từ MỤC 2 của bạn nhóm
 * (KhanhThy — github.com/KhanhThy249/module-nh-gi-ki-m-tra-web). Đóng góp vào
 * đây là 7 câu hỏi đời thường cho mỗi nhóm tiêu chí; chỉ là lớp trình bày,
 * không đổi dữ liệu/bảng tiêu chí của engine (quy tắc: một nguồn sự thật). */
export const GROUP_QUESTIONS = Object.freeze({
  'SEO & hiển thị': 'Google có tìm thấy, hiểu và hiển thị website đẹp không?',
  'Chuẩn kỹ thuật': 'Website có được xây dựng đúng chuẩn và an toàn không?',
  'Di động & hình ảnh': 'Xem trên điện thoại có tốt, hình ảnh có được tối ưu không?',
  'Tốc độ tải nội dung': 'Website có tải nhanh không?',
  'Marketing & chuyển đổi': 'Website có giúp doanh nghiệp có thêm khách hàng không?',
  'Tin cậy & minh bạch': 'Khách có đủ thông tin để tin tưởng doanh nghiệp không?',
  'Trải nghiệm & truy cập': 'Mọi người, kể cả người khuyết tật, có dùng website dễ dàng không?',
});
