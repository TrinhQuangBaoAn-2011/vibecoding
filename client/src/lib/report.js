import { classificationFromScore, getClassificationMeta, getStatusMeta } from './constants.js';
import { formatDateTime } from './format.js';

function aiSourceLabel(review) {
  if (!review) return 'Chưa có nhận xét';
  if (review.source === 'ai') return `AI trực tiếp${review.model ? ` (${review.model})` : ''}`;
  return 'Bộ quy tắc WEBCHECK (AI dự phòng hoặc chưa cấu hình)';
}

export function buildReport(record) {
  const classification =
    record.classification?.label ||
    getClassificationMeta(record.classification?.key || classificationFromScore(record.score)).label;

  const criteriaLines = (record.criteria || []).map((criterion) => {
    const label = criterion.statusLabel || getStatusMeta(criterion.status).label;
    const excluded = criterion.status === 'na' || criterion.status === 'untestable';
    const points = excluded
      ? 'không tính vào điểm'
      : `${criterion.points}/${criterion.maxPoints} điểm`;
    return `- ${criterion.name}: ${label} (${points})`;
  });

  const review = record.aiReview;
  const strengths = review?.strengths?.length
    ? review.strengths
        .map(
          (item, index) =>
            `${index + 1}. ${item.title}\n   - Vì sao: ${item.why}\n   - Lợi ích: ${item.benefit}`,
        )
        .join('\n')
    : 'Chưa có đủ dữ liệu hoặc chưa có nhận xét từ AI cho lần phân tích này.';

  const improvements = review?.improvements?.length
    ? review.improvements
        .map(
          (item, index) =>
            `${index + 1}. ${item.title} (Ưu tiên: ${item.priority})\n   - Vấn đề: ${item.problem}\n   - Tác động: ${item.impact}\n   - Đề xuất: ${item.solution}\n   - Lý do ưu tiên: ${item.priorityReason}`,
        )
        .join('\n')
    : 'Chưa có đủ dữ liệu hoặc chưa có nhận xét từ AI cho lần phân tích này.';

  const overall =
    review?.summary ||
    `Website đạt ${record.score}/100, xếp loại ${classification}. Kết quả ghi nhận ${
      record.counts?.pass ?? 0
    } tiêu chí đạt, ${record.counts?.warning ?? 0} tiêu chí cần xem xét và ${
      record.counts?.fail ?? 0
    } tiêu chí chưa đạt.`;

  const notes = [review?.dataNotes, review?.notice].filter(Boolean).join(' ');
  const separator = '-'.repeat(48);

  return `BÁO CÁO PHÂN TÍCH WEBSITE – WEBCHECK AI

Website: ${record.finalUrl || record.url}
Ngày kiểm tra: ${formatDateTime(record.analyzedAt)}
Điểm đánh giá: ${record.score}/100
Xếp loại: ${classification}
Nguồn nhận xét: ${aiSourceLabel(review)}

I. KẾT QUẢ KIỂM TRA

${criteriaLines.join('\n')}

II. ĐIỂM MẠNH NỔI BẬT

${strengths}

III. VIỆC CẦN CẢI THIỆN ƯU TIÊN

${improvements}

IV. ĐÁNH GIÁ TỔNG QUAN

${overall}${notes ? `\n\nGhi chú dữ liệu: ${notes}` : ''}

${separator}
Báo cáo được tạo bởi WEBCHECK AI.
Website hỗ trợ đánh giá các yếu tố cơ bản, không thay thế một cuộc kiểm toán SEO chuyên sâu.
Điểm số theo bộ tiêu chí cơ bản của WEBCHECK AI, không phải điểm xếp hạng chính thức của Google.`;
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard' };
    } catch {
      // Fall through to the legacy copy path.
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok
      ? { ok: true, method: 'fallback' }
      : { ok: false, method: 'fallback', error: 'Trình duyệt không cho phép sao chép tự động.' };
  } catch (error) {
    return { ok: false, method: 'fallback', error: error?.message || 'Không thể sao chép báo cáo.' };
  }
}
