import { safeFetchHtml } from './fetcher.js';
import { analyzeHtml, assertAnalyzablePage } from './analyzer.js';
import { computeScore } from './scoring.js';
import { normalizeInputUrl } from './urlSecurity.js';
import { saveAnalysis } from './analysisStore.js';

export async function runAnalysis(rawUrl, { onProgress } = {}) {
  const startedAt = Date.now();

  onProgress?.('validate', 'Đang kiểm tra và chuẩn hóa URL...');
  const inputUrl = normalizeInputUrl(rawUrl);

  const page = await safeFetchHtml(inputUrl, {
    onProgress: (stage, message) => onProgress?.(stage, message),
  });
  assertAnalyzablePage(page);

  onProgress?.('fetch', `Đã tải ${Math.round(page.htmlBytes / 1024)} KB HTML. Đang phân tích...`);

  const analysisPage = await analyzeHtml(page, {
    onProgress: (stage, message) => onProgress?.(stage, message),
  });

  const scoring = computeScore(analysisPage.criteria);
  onProgress?.('score', 'Đang hoàn tất bảng điểm...');

  const finalUrl = page.finalUrl;
  const analysis = {
    analysisId: null,
    url: finalUrl,
    requestedUrl: inputUrl.href,
    finalUrl,
    hostname: new URL(finalUrl).hostname.replace(/^www\./, ''),
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    ...scoring,
    criteria: analysisPage.criteria,
    page: analysisPage.page,
    source: {
      type: 'html',
      fetchedAt: new Date().toISOString(),
      httpStatus: page.statusCode,
      htmlBytes: page.htmlBytes,
      redirects: page.redirects,
      fetchTimeMs: page.fetchTimeMs,
    },
  };

  const analysisId = saveAnalysis(analysis);
  analysis.analysisId = analysisId;

  return analysis;
}
