'use strict';
/*
 * Máy phân tích WEBCHECK AI — chạy TRỌN BỘ 60 tiêu chí v2.0 của bộ máy mốc 1.
 * ---------------------------------------------------------------
 * Trước đây file này dùng cheerio với 10 tiêu chí tự dựng ("bản thử") — thay
 * hoàn toàn bằng lớp nối webcheckEngine.js: nạp webcheck/js/analyze.js (file
 * độc quyền mốc 1, không sửa, không sao chép logic) và chấm từng điểm một.
 *
 * Điểm theo trọng số: mỗi tiêu chí có `criticality` (P0–P3, mức khi Chưa đạt)
 * → maxPoints = P0:6, P1:4, P2:2, P3:1 — "tiêu chí nào quan trọng chấm nhiều".
 *   Đạt = đủ điểm | Cần cải thiện = 60% | Chưa đạt = 0
 *   Không xác định → 'untestable', bị loại khỏi mẫu số (không phạt oan).
 * Điểm thô được scoring.js chuẩn hóa về thang 100.
 */

import { AppError } from './errors.js';
import {
  buildEngineMeta,
  runWebCheckEngine,
  engineCatalog,
  enginePriorityWords,
  WEIGHT_BY_PRIORITY,
  WARN_KEEP_RATIO,
} from './webcheckEngine.js';
import { DOMParser } from 'linkedom';

export const STATUS = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  WARNING: 'warning',
  NOT_APPLICABLE: 'na',
  UNTESTABLE: 'untestable',
});

export const STATUS_LABELS = Object.freeze({
  pass: 'Đạt',
  fail: 'Chưa đạt',
  warning: 'Cần cải thiện',
  na: 'Không áp dụng',
  untestable: 'Không xác định',
});

const METHOD_WORDS = {
  html: 'HTML tĩnh',
  network: 'Tài nguyên mạng',
  'html+network': 'HTML + mạng',
};

// Trạng thái engine v2.0 (pass/warn/fail/unknown) → trạng thái server app.
const ENGINE_STATUS_TO_APP = Object.freeze({
  pass: 'pass',
  warn: 'warning',
  fail: 'fail',
  unknown: 'untestable',
});

function truncate(value, max = 600) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const ROUND_1 = (x) => Math.round(x * 10) / 10;

/** 1 check của engine v2.0 → 1 criterion của server app.
 * Export để server/tests chấm trực tiếp từng trạng thái offline (không cần mạng). */
export function mapCriterion(check, catalogById, priorityWords) {
  const catalog = catalogById.get(check.id) || {};
  const status = ENGINE_STATUS_TO_APP[check.status] || STATUS.UNTESTABLE;
  const criticality = catalog.criticality || 'P2';
  const maxPoints = WEIGHT_BY_PRIORITY[criticality];
  let points = 0;
  if (status === STATUS.PASS) points = maxPoints;
  else if (status === STATUS.WARNING) points = ROUND_1(maxPoints * WARN_KEEP_RATIO);

  const priority = check.priority || criticality;

  return {
    id: check.id,
    name: check.label || catalog.label || check.id,
    group: check.group || catalog.group || 'Khác',
    method: check.method || catalog.method || 'html',
    criticality,
    priority,
    priorityLabel: priorityWords[priority] || priority,
    status,
    statusLabel: STATUS_LABELS[status],
    points,
    maxPoints,
    value: truncate(check.detail, 600) || 'Không đề cập',
    message: truncate(check.detail, 420),
    recommendation: truncate(check.suggestion, 600),
    impact: truncate(check.impact, 600),
    details: [
      { label: 'Vì sao tiêu chí này quan trọng', value: truncate(check.impact, 420) },
      {
        label: 'Trọng số trong điểm tổng',
        value:
          status === STATUS.UNTESTABLE
            ? `Trọng số ${maxPoints} — trạng thái Không xác định nên được loại khỏi mẫu số`
            : `Trọng số ${maxPoints} (${priority}: ${priorityWords[criticality] || criticality})`,
      },
      { label: 'Cách chấm', value: METHOD_WORDS[check.method] || check.method },
    ],
  };
}

/** Dựng `page` meta theo hình dạng cũ mà client + AI prompt đang phụ thuộc. */
function buildPageMeta(page, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const pick = (selector, attribute) => doc.querySelector(selector)?.getAttribute(attribute)?.trim() || '';
  const title = doc.querySelector('title')?.textContent?.trim() || '';

  const ogTargets = [
    { key: 'og:title', label: 'OG Title' },
    { key: 'og:description', label: 'OG Description' },
    { key: 'og:image', label: 'OG Image' },
  ];
  const og = ogTargets.map((target) => {
    const content = doc.querySelector(`meta[property="${target.key}" i]`)?.getAttribute('content')?.trim() || '';
    return {
      label: target.label,
      value: truncate(content, 300) || 'Không tìm thấy hoặc nội dung trống',
      status: content ? 'pass' : 'fail',
    };
  });

  const images = doc.querySelectorAll('img');
  let withAlt = 0;
  for (const img of images) {
    const content = (img.getAttribute('alt') || '').trim();
    if (content) withAlt += 1;
  }

  const faviconEl = doc.querySelector('link[rel~="icon" i], link[rel="apple-touch-icon" i]');
  const faviconUrl = faviconEl?.getAttribute('href')?.trim() || '';

  return {
    title: truncate(title, 200),
    description: truncate(pick('meta[name="description" i]', 'content'), 300),
    viewport: truncate(pick('meta[name="viewport" i]', 'content'), 200),
    language: truncate((doc.documentElement?.getAttribute('lang') || '').trim(), 40),
    canonical: truncate(pick('link[rel="canonical" i]', 'href'), 300),
    h1Count: doc.querySelectorAll('h1').length,
    og,
    images: {
      total: images.length,
      withAlt,
      withoutAlt: images.length - withAlt,
    },
    favicon: { declared: Boolean(faviconEl), url: faviconUrl || null, probe: null },
    finalUrl: page.finalUrl,
    requestedUrl: page.requestedUrl,
    statusCode: page.statusCode,
    contentType: page.contentType,
    htmlBytes: page.htmlBytes,
    redirects: page.redirects,
    fetchTimeMs: page.fetchTimeMs,
    metaTagCount: doc.querySelectorAll('meta').length,
    scriptCount: doc.querySelectorAll('script').length,
    stylesheetCount: doc.querySelectorAll('link[rel="stylesheet" i]').length,
  };
}

export async function analyzeHtml(page, { onProgress } = {}) {
  onProgress?.('parse', 'Đang nạp bộ máy 60 tiêu chí v2.0 (WebCheck)...');
  const catalogById = new Map(engineCatalog().map((row) => [row.id, row]));
  const priorityWords = enginePriorityWords();

  onProgress?.('fetch', 'Đang nạp robots.txt và sitemap.xml cho các mục mạng...');
  const meta = await buildEngineMeta(page);

  onProgress?.('check', `Đang chấm ${catalogById.size} tiêu chí theo trọng số P0–P3...`);
  const result = runWebCheckEngine(page.html, meta);

  const checks = Array.isArray(result?.checks) ? result.checks : [];
  if (checks.length !== catalogById.size) {
    // Bộ máy mốc 1 vẫn phải trả đủ 60 mục theo hợp đồng v2.0 — lệch là bất ổn,
    // nhưng không nổ máy: tiếp tục chấm với những gì có và ghi cảnh báo.
    console.warn(
      `[analyzer] bộ máy trả ${checks.length} mục thay vì ${catalogById.size} — kiểm tra version ${result?.version ?? '?'}`,
    );
  }

  const criteria = checks.map((check) => mapCriterion(check, catalogById, priorityWords));

  onProgress?.('score', 'Đang tính điểm có trọng số và tổng hợp kết quả...');

  return { criteria, page: buildPageMeta(page, page.html) };
}

export function assertAnalyzablePage(page) {
  if (!page?.html || typeof page.html !== 'string') {
    throw new AppError('Không nhận được nội dung HTML hợp lệ để phân tích.', {
      status: 502,
      code: 'INVALID_HTML',
    });
  }
}
