'use strict';
/*
 * Lớp nối WEBCHECK AI → bộ máy 60 tiêu chí v2.0 (mốc 1).
 * ---------------------------------------------------------------
 * File webcheck/js/analyze.js là ĐỘC QUYỀN của mốc 1 — KHÔNG sửa, KHÔNG sao
 * chép logic vào đây. Lớp này chỉ NẠP file gốc bằng đúng seam công khai mà
 * chính tests của mốc 1 khai báo trong webcheck/tests/analyze.test.mjs:
 *   const WebCheck = new Function(src + '\n;return WebCheck;')();
 * và chạy runChecks(html, meta, buildDoc) với buildDoc = linkedom DOMParser.
 * Chuyển chạy được cả local lẫn Vercel lambda (đường dẫn file gắn vào includeFiles).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { DOMParser } from 'linkedom';

const here = dirname(fileURLToPath(import.meta.url));

/* Trọng số theo mức quan trọng (quy tắc "tiêu chí nào quan trọng chấm nhiều"):
 * criticality của mỗi tiêu chí = mức ưu tiên khi Chưa đạt trong PRIORITY_MAP
 * của bộ máy. P0 Khẩn chấm nặng nhất (×6), P1 Cao (×4), P2 Trung bình (×2),
 * P3 Khuyến nghị (×1). Điểm thô tổng sau đó được chuẩn hóa về thang 100 nên
 * phân bố điểm cuối ổn định và dễ giải thích cho người dùng. */
export const WEIGHT_BY_PRIORITY = Object.freeze({ P0: 6, P1: 4, P2: 2, P3: 1 });
/* Cần cải thiện giữ 60% điểm của trọng số; Chưa đạt 0; Đạt đủ 100%. */
export const WARN_KEEP_RATIO = 0.6;

let cachedEngine = null;

function resolveEnginePath() {
  // repo worktree: server/lib → ../../webcheck/js/analyze.js
  // lambda @vercel/node: /var/task/server/lib → cùng tỉ lệ ({cwd} an toàn thêm).
  const candidates = [
    resolve(here, '../../webcheck/js/analyze.js'),
    resolve(process.cwd(), 'webcheck/js/analyze.js'),
    resolve(process.cwd(), '../webcheck/js/analyze.js'),
  ];
  for (const path of candidates) {
    try {
      readFileSync(path, 'utf8');
      return path;
    } catch {
      // thử đường kế tiếp
    }
  }
  throw new Error('Không tìm thấy webcheck/js/analyze.js để nạp bộ máy 60 tiêu chí.');
}

export function loadWebCheckEngine() {
  if (cachedEngine) return cachedEngine;
  const srcPath = resolveEnginePath();
  const src = readFileSync(srcPath, 'utf8');
  cachedEngine = new Function(`${src}\n;return WebCheck;`)(); // đúng seam của tests mốc 1
  return cachedEngine;
}

async function probeMetaFile(urlString) {
  // robots.txt / sitemap.xml — hợp đồng ?soft=1 của mốc 1: lỗi HTTP là một
  // "kết quả" hợp lệ (404 → engine chấm luôn), chỉ lỗi mạng mới bỏ rơi.
  try {
    const response = await fetch(urlString, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WEBCHECK-AI/2.0; server-side probe)',
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    });
    const raw = await response.text();
    return { statusCode: response.status, text: raw.slice(0, 1_000_000) };
  } catch {
    return null; // mạng quá tải/không phân giải → engine chấm 'unknown' (loại khỏi mẫu số)
  }
}

/** Dựng meta đúng hợp đồng runChecks của engine từ `page` mà fetcher trả về. */
export async function buildEngineMeta(page) {
  const [robots, sitemap] = await Promise.all([
    probeMetaFile(new URL('/robots.txt', page.finalUrl).href),
    probeMetaFile(new URL('/sitemap.xml', page.finalUrl).href),
  ]);
  return {
    inputUrl: page.requestedUrl,
    finalUrl: page.finalUrl,
    statusCode: page.statusCode,
    elapsedMs: page.fetchTimeMs,
    ...(robots ? { robots } : {}),
    ...(sitemap ? { sitemap } : {}),
  };
}

/** Chạy trọn bộ 60 mục trên HTML đã tải. Trả về Result v2.0 của engine. */
export function runWebCheckEngine(html, meta) {
  const engine = loadWebCheckEngine();
  const buildDoc = (raw) => new DOMParser().parseFromString(raw, 'text/html');
  return engine.runChecks(html, meta, buildDoc);
}

/** Danh mục 60 mục dùng cho máy chấm/AI (không gọi lại nhiều lần). */
export function engineCatalog() {
  const engine = loadWebCheckEngine();
  const rows = [];
  for (const def of engine.DEFS) {
    const map = engine.PRIORITY_MAP[def.id] || {};
    const criticality = map.fail || 'P2';
    rows.push({
      id: def.id,
      label: def.label,
      group: def.group,
      method: def.method,
      impact: def.impact,
      criticality,
      warnPriority: map.warn || null,
      weight: WEIGHT_BY_PRIORITY[criticality],
    });
  }
  return rows;
}

export function engineVersion() {
  return loadWebCheckEngine().VERSION;
}

export function enginePriorityWords() {
  return loadWebCheckEngine().PRIORITY_WORDS;
}
