import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createRateLimiter } from '../lib/rateLimit.js';
import { getAnalysis } from '../lib/analysisStore.js';
import { coerceAnalysisPayload, generateReview } from '../lib/aiReview.js';
import { AppError } from '../lib/errors.js';

const router = Router();
const aiLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.aiMax,
  scope: 'ai',
});

router.post(
  '/ai-review',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const analysisId = req.body?.analysisId;
    let analysis = getAnalysis(analysisId);

    if (!analysis) {
      if (!req.body?.analysis) {
        throw new AppError(
          'Kết quả phân tích đã hết hạn hoặc không tồn tại. Vui lòng phân tích lại website.',
          { status: 404, code: 'ANALYSIS_NOT_FOUND' },
        );
      }
      analysis = coerceAnalysisPayload(req.body.analysis);
    }

    const review = await generateReview(analysis);

    res.setHeader('Cache-Control', 'no-store');
    console.log(
      `[ai-review] ${analysis.hostname} · source=${review.source}${review.model ? ` · model=${review.model}` : ''}`,
    );
    res.json({ review, analysisId: analysis.analysisId || null });
  }),
);

export default router;
