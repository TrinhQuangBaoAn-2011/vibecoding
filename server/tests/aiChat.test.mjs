import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineCatalog } from '../lib/webcheckEngine.js';
import { coerceAnalysisPayload } from '../lib/aiReview.js';
import { normalizeChatPayload, buildRuleBasedReply } from '../lib/aiChat.js';
import { AppError } from '../lib/errors.js';

/* Nino chạy offline — không đụng mạng, không đụng AI:
 * dữ liệu phân tích dựng thẳng từ catalog 60 mục qua coerceAnalysisPayload
 * (cùng đường mà /api/ai-chat nhận khi store hết hạn),
 * rồi test bộ quy tắc trả lời theo từng chủ đề câu hỏi.
 */

const catalog = engineCatalog();
const failingIds = ['https', 'title']; // P0 + P1 → phải nổi đầu trong câu trả lời
const analysis = coerceAnalysisPayload({
  url: 'https://example.test/trang',
  criteria: catalog.map((row) => ({
    id: row.id,
    status: failingIds.includes(row.id) ? 'fail' : 'pass',
  })),
});

const httpsName = analysis.criteria.find((criterion) => criterion.id === 'https').name;

test('normalizeChatPayload: thiếu câu hỏi bị chặn; history phải lọc sạch + bó 8 mục', () => {
  assert.throws(() => normalizeChatPayload({ question: '   ' }), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, 'CHAT_QUESTION_REQUIRED');
    return true;
  });

  const { question, history } = normalizeChatPayload({
    question: '  Điểm   yếu   nằm ở đâu?  ',
    history: [
      { role: 'user', content: 'điểm bao nhiêu' },
      { role: 'assistant', content: 'Website đạt 88/100...' },
      { role: 'system', content: 'được truyền vào là lọc bỏ' },
      { role: 'user', content: '   ' }, // rỗng sau chuẩn hoá => bỏ
      null,
      ...Array.from({ length: 10 }, (_, index) => ({
        role: 'user',
        content: `mục rác ${index}`,
      })),
    ],
  });

  assert.equal(question, 'Điểm yếu nằm ở đâu?');
  // Lọc mất mục rác, rồi chỉ giữ 8 mục CUỐI (slice trước khi lọc giữ ổn định thứ tự)
  assert.equal(history.length, 8);
  assert.ok(history.every((item) => item.role === 'user' || item.role === 'assistant'));
  assert.ok(history.at(-1).content.startsWith('mục rác'));
});

test('bộ quy tắc: hỏi điểm → trích đúng điểm + xếp loại của báo cáo, không bịa', () => {
  const reply = buildRuleBasedReply(analysis, 'Website đạt bao nhiêu điểm?');
  assert.equal(reply.intent, 'score');
  assert.equal(reply.source, 'rules');
  assert.match(reply.reply, new RegExp(`${analysis.score}\\s*/\\s*100`));
  assert.ok(reply.reply.includes(analysis.classification.label));
  // minh bạch nguồn + giới hạn phạm vi
  assert.ok(reply.notice.includes('bộ quy tắc'));
  assert.ok(reply.disclaimer.includes('không tính lại điểm'));
});

test('bộ quy tắc: hỏi điểm yếu → nêu đích danh tiêu chí chưa đạt, P0 đứng trước', () => {
  const reply = buildRuleBasedReply(analysis, 'Điểm nào yếu nhất?');
  assert.equal(reply.intent, 'weakness');
  assert.ok(reply.reply.includes(httpsName));
  // tiêu chí P0 (https) phải xuất hiện trước tiêu chí P1 (title) trong liệt kê
  const titleName = analysis.criteria.find((criterion) => criterion.id === 'title').name;
  const positionHttps = reply.reply.indexOf(httpsName);
  const positionTitle = reply.reply.indexOf(titleName);
  assert.ok(positionHttps > -1 && positionTitle > -1);
  assert.ok(positionHttps < positionTitle);
});

test('bộ quy tắc: hỏi việc cần làm trước → gợi ý ôn theo ưu tiên từ recommendation', () => {
  const reply = buildRuleBasedReply(analysis, 'Nên sửa điều gì trước?');
  assert.equal(reply.intent, 'next-steps');
  const httpsCriterion = analysis.criteria.find((criterion) => criterion.id === 'https');
  assert.ok(reply.reply.includes(httpsCriterion.name));
  assert.ok(reply.reply.includes('P0'));
});

test('bộ quy tắc: hỏi điểm mạnh → chỉ liệt kê tiêu chí Đạt', () => {
  const reply = buildRuleBasedReply(analysis, 'Điểm mạnh của website là gì?');
  assert.equal(reply.intent, 'strength');
  assert.ok(reply.reply.startsWith('Điểm sáng từ dữ liệu báo cáo:'));
  // không lọt tiêu chí chưa đạt vào mục Điểm sáng
  assert.ok(!reply.reply.includes(httpsName));
});

test('bộ quy tắc: giới thiệu bản thân + từ chối ngoài phạm vi, không hứa hẹn thứ hạng', () => {
  const intro = buildRuleBasedReply(analysis, 'Nino ơi, bạn làm được gì?');
  assert.equal(intro.intent, 'identity');
  assert.ok(intro.reply.includes('Nino'));
  assert.ok(intro.reply.includes('không tự quét web'));

  const out = buildRuleBasedReply(analysis, 'So sánh website tôi với đối thủ đi');
  assert.equal(out.intent, 'out-of-scope');
  assert.ok(out.reply.includes('ngoài dữ liệu'));

  // Không lọt lời hứa kiểu "chắc chắn tăng thứ hạng"
  for (const question of [
    'Điểm bao nhiêu?',
    'Yếu chỗ nào?',
    'Sửa gì trước?',
    'Điểm mạnh đâu?',
  ]) {
    assert.ok(!buildRuleBasedReply(analysis, question).reply.includes('chắc chắn tăng thứ hạng'));
  }
});

test('bộ quy tắc: câu hỏi rời rạc không rơi trống — luôn trích đúng dữ liệu', () => {
  const reply = buildRuleBasedReply(analysis, 'blah blah xyz');
  assert.equal(reply.source, 'rules');
  assert.ok(reply.reply.length >= 20);
  // câu trả lời mặc định không được ghi điểm khác với báo cáo
  assert.ok(!reply.reply.match(/\d+\s*\/\s*100/) || reply.reply.includes(`${analysis.score}/100`));
});
