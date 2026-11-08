import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/*
 * Đồng bộ danh mục 60 tiêu chí v2.0 từ webcheck/js/analyze.js (độc quyền mốc 1,
 * KHÔNG sửa) sang client/src/lib/criteriaCatalog.js để React hiển thị.
 * Nạp đúng theo seam công khai mà tests mốc 1 khai báo trong
 * webcheck/tests/analyze.test.mjs: `new Function(src + ';return WebCheck;')()`.
 * Chạy lại lệnh này mỗi khi bộ máy mốc 1 đổi tiêu chí: node scripts/sync-criteria.mjs
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const enginePath = join(root, 'webcheck', 'js', 'analyze.js');
const src = readFileSync(enginePath, 'utf8');
const WebCheck = new Function(`${src}\n;return WebCheck;`)();

/* Ba-lê trọng số đã chốt cho máy chấm điểm WEBCHECK AI:
 * - criticality của mỗi tiêu chí = mức ưu tiên lúc CHƯA ĐẠT (fail) trong 
 *   PRIORITY_MAP của engine — đây chính là "quy tắc quan trọng ấn nhiều" bạn 
 *   dùng để chấm: P0 Khẩn chấm nặng nhất, rồi P1 Cao, P2 Trung bình, P3 Khuyến nghị.
 * - Cần cải thiện (warn) giữ 60% điểm của tiêu chí — thành WARN_KEEP_RATIO.
 */
const WEIGHT_BY_PRIORITY = { P0: 6, P1: 4, P2: 2, P3: 1 };
const WARN_KEEP_RATIO = 0.6;

if (!Array.isArray(WebCheck.DEFS) || WebCheck.DEFS.length !== 60) {
  throw new Error(`Bộ máy phải có đúng 60 DEF, hiện ${WebCheck.DEFS?.length ?? 'không rõ'} — dừng thêm không hợp đồng.`);
}

const rows = WebCheck.DEFS.map((d) => {
  const map = WebCheck.PRIORITY_MAP[d.id] || {};
  const criticality = map.fail || 'P2';
  return {
    id: d.id,
    name: d.label,
    group: d.group,
    method: d.method,
    impact: d.impact,
    criticality,
    warnPriority: map.warn || null,
    weight: WEIGHT_BY_PRIORITY[criticality],
  };
});

const ids = rows.map((r) => r.id);
if (new Set(ids).size !== 60) throw new Error('DEF có id trùng — bộ máy đổi mà chưa kịp chốt, dừng lại.');

const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);
const counts = rows.reduce((acc, r) => { acc[r.criticality] = (acc[r.criticality] || 0) + 1; return acc; }, {});
const groups = [...new Set(rows.map((r) => r.group))];

const banner = `/* ĐỒNG BỘ TỰ ĐỘNG — lệnh node scripts/sync-criteria.mjs từ webcheck/js/analyze.js (v${WebCheck.VERSION}).
 * KHÔNG sửa tay: file này chạy lại từ bộ máy gốc. 60 tiêu chí, tổng ${totalWeight} điểm thô.
 * Trọng số: P0=6, P1=4, P2=2, P3=1 (theo mức ưu tiên khi Chưa đạt). Cần cải thiện giữ 60%.
 */`;

const module2 = `${banner}
export const ENGINE_VERSION = ${JSON.stringify(WebCheck.VERSION)};
export const WEIGHT_BY_PRIORITY = ${JSON.stringify(WEIGHT_BY_PRIORITY)};
export const WARN_KEEP_RATIO = ${WARN_KEEP_RATIO};
export const CRITERIA_GROUPS = ${JSON.stringify(groups, null, 2).replace(/\n/g, '\n')};
export const STATUS_WORDS = ${JSON.stringify(WebCheck.STATUS_WORDS, null, 2)};
export const PRIORITY_WORDS = ${JSON.stringify(WebCheck.PRIORITY_WORDS, null, 2)};
export const METHOD_WORDS = ${JSON.stringify(WebCheck.METHOD_WORDS, null, 2)};
export const CRITERIA_COUNTS_BY_PRIORITY = ${JSON.stringify(counts, null, 2)};
export const TOTAL_WEIGHT = ${totalWeight};

export const CRITERIA = [
${rows.map((r) => `  ${JSON.stringify(r, null, 2).replace(/\n/g, '\n  ')},`).join('\n')}
];
`;

writeFileSync(join(root, 'client', 'src', 'lib', 'criteriaCatalog.js'), module2.endsWith('\n') ? module2 : `${module2}\n`);

console.log(`browser catalog written: 60 criteria, total raw weight ${totalWeight}`);
console.log(`priority counts: ${JSON.stringify(counts)}`);
console.log(`groups: ${groups.length} —`, groups.join(' / '));
console.log(`sum check: ${rows.reduce((s, r) => s + r.weight, 0)}`);
