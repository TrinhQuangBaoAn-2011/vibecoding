import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapCriterion } from '../lib/analyzer.js';
import { computeScore, classifyScore } from '../lib/scoring.js';
import {
  engineCatalog,
  enginePriorityWords,
  WEIGHT_BY_PRIORITY,
  WARN_KEEP_RATIO,
} from '../lib/webcheckEngine.js';
import { coerceAnalysisPayload } from '../lib/aiReview.js';

/* Quy tắc chấm trọng số của WEBCHECK AI (chạy offline, không đụng mạng):
 * - ba-rem trọn bộ 60 tiêu chí, id không trùng
 * - trọng số theo mức ưu tiên khi Chưa đạt: P0=6, P1=4, P2=2, P3=1
 * - Đạt = trọn trọng số | Cần cải thiện = 60% | Chưa đạt = 0
 * - Không xác định → untestable, loại khỏi cả tử số và mẫu số
 */

const catalog = engineCatalog();
const catalogById = new Map(catalog.map((row) => [row.id, row]));
const priorityWords = enginePriorityWords();

const check = (id, status) => ({
  id,
  status,
  label: catalogById.get(id).label,
  group: catalogById.get(id).group,
  method: catalogById.get(id).method,
  // không gắn priority — mapCriterion phải rơi về criticality của catalog
  detail: 'chi tiết',
  suggestion: 'đề xuất',
  impact: 'tác động',
});

test('ba-rem 60 tiêu chí, trọng số theo P0–P3, tổng 136 điểm thô', () => {
  assert.equal(catalog.length, 60);
  const counts = catalog.reduce((acc, row) => ((acc[row.criticality] = (acc[row.criticality] || 0) + 1), acc), {});
  assert.deepEqual(
    { P0: counts.P0, P1: counts.P1, P2: counts.P2, P3: counts.P3 },
    { P0: 4, P1: 10, P2: 26, P3: 20 },
  );
  assert.equal(catalog.reduce((total, row) => total + WEIGHT_BY_PRIORITY[row.criticality], 0), 136);
  assert.deepEqual(WEIGHT_BY_PRIORITY, { P0: 6, P1: 4, P2: 2, P3: 1 });
  // Cấm id trùng — nguồn catalog duy nhất phải sạch
  assert.equal(new Set(catalog.map((row) => row.id)).size, 60);
});

test('mapCriterion: Đạt đủ | Cần cải thiện 60% | Chưa đạt 0 | Không xác định loại khỏi điểm', () => {
  const pass = mapCriterion(check('https', 'pass'), catalogById, priorityWords);
  assert.equal(pass.status, 'pass');
  assert.equal(pass.criticality, 'P0');
  assert.equal(pass.maxPoints, WEIGHT_BY_PRIORITY.P0);
  assert.equal(pass.points, pass.maxPoints);
  assert.equal(pass.priorityLabel, 'Khẩn');

  const failTarget = mapCriterion(check('https', 'fail'), catalogById, priorityWords);
  assert.equal(failTarget.status, 'fail');
  assert.equal(failTarget.points, 0);

  const warnTarget = mapCriterion(check('title', 'warn'), catalogById, priorityWords);
  assert.equal(warnTarget.status, 'warning');
  const ratio = Math.round((WARN_KEEP_RATIO * warnTarget.maxPoints) * 10) / 10;
  assert.equal(warnTarget.points, ratio);
  assert.ok(Math.abs(warnTarget.points / warnTarget.maxPoints - 0.6) < 1e-9);

  const unknown = mapCriterion(check('sitemap', 'unknown'), catalogById, priorityWords);
  assert.equal(unknown.status, 'untestable');
  assert.equal(unknown.points, 0);
  assert.equal(unknown.statusLabel, 'Không xác định');
});

test('computeScore: chuẩn hóa /100, loại untestable khỏi tử và mẫu', () => {
  const criteria = [
    mapCriterion(check('https', 'fail'), catalogById, priorityWords), // P0
    mapCriterion(check('h1', 'pass'), catalogById, priorityWords), // P2
    mapCriterion(check('title', 'warn'), catalogById, priorityWords), // P1 → 60%
    mapCriterion(check('sitemap', 'unknown'), catalogById, priorityWords), // loại
  ];
  const scored = computeScore(criteria);

  const maxAvailable = criteria
    .filter((c) => !['na', 'untestable'].includes(c.status))
    .reduce((total, c) => total + c.maxPoints, 0);
  const rawPoints = criteria
    .filter((c) => !['na', 'untestable'].includes(c.status))
    .reduce((total, c) => total + c.points, 0);
  const expected = Math.max(0, Math.min(100, Math.round((rawPoints / maxAvailable) * 100)));

  assert.equal(scored.score, expected);
  assert.equal(scored.maxAvailable, maxAvailable);
  assert.equal(scored.rawPoints, Math.round(rawPoints * 10) / 10);
  assert.equal(scored.counts.untestable, 1);
  assert.equal(scored.scoredCriteria, 3);
  assert.equal(scored.excludedCriteria, 1);
  assert.equal(scored.totalWeightOfEngine, 136);
  // scoringNote luôn giải thích cách chấm để UI hiển thị minh bạch
  assert.match(scored.scoringNote, /60 tiêu chí/);
});

test('computeScore: priorities tổng hợp đúng số mất theo từng mức P0–P3', () => {
  const p2Id = catalog.find((row) => row.criticality === 'P2').id;
  const criteria = [
    mapCriterion(check('https', 'fail'), catalogById, priorityWords), // P0 → mất nguyên 6
    mapCriterion(check('title', 'fail'), catalogById, priorityWords), // P1 → mất nguyên 4
    mapCriterion(check('h1', 'pass'), catalogById, priorityWords), // P1 đạt
    mapCriterion(check(p2Id, 'pass'), catalogById, priorityWords), // P2 đạt
  ];
  const scored = computeScore(criteria);
  const priorities = Object.fromEntries(scored.priorities.map((row) => [row.level, row]));

  assert.equal(priorities.P0.lostWeight, WEIGHT_BY_PRIORITY.P0); // https nguyên trọng số
  assert.equal(priorities.P0.issues, 1);
  assert.equal(priorities.P1.lostWeight, WEIGHT_BY_PRIORITY.P1); // chỉ title fail
  assert.equal(priorities.P1.issues, 1);
  assert.equal(priorities.P2.issues, 0); // h1/P2 đạt
  assert.equal(priorities.P2.lostWeight, 0);

  // P0 chưa đạt → không thể xếp loại Tốt
  assert.notEqual(scored.classification.key, 'good');
  assert.equal(classifyScore(85).key, 'good');
  assert.equal(classifyScore(69).key, 'average');
  assert.equal(classifyScore(49).key, 'poor');
});

test('coerceAnalysisPayload: đủ 60 mục thì qua, bản cũ 10 mục bị chặn nhắc phân tích lại', () => {
  const full = { criteria: catalog.map((row) => ({ id: row.id, status: 'pass' })) };
  const coerced = coerceAnalysisPayload(full);
  assert.equal(coerced.criteria.length, 60);
  // mỗi mục giữ đúng trọng số của catalog
  const byId = Object.fromEntries(coerced.criteria.map((c) => [c.id, c]));
  assert.equal(byId.https.maxPoints, catalogById.get('https').weight);
  assert.equal(byId.theme_color.maxPoints, catalogById.get('theme_color').weight);

  assert.throws(
    () => coerceAnalysisPayload({ criteria: [{ id: 'title', status: 'pass' }] }),
    (error) => error.code === 'INVALID_ANALYSIS',
  );
});
