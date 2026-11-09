import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createRateLimiter } from '../lib/rateLimit.js';
import { getAnalysis } from '../lib/analysisStore.js';
import { coerceAnalysisPayload } from '../lib/aiReview.js';
import { generateChatReply, normalizeChatPayload } from '../lib/aiChat.js';
import { AppError } from '../lib/errors.js';

const router = Router();
// Nino dùng riêng một bucket 'ai-chat' (cùng cửa sổ 10 phút) — không tranh
// quota với nhận xét /api/ai-review để một panel bận không kẹt panel kia.
const chatLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.chatMax,
  scope: 'ai-chat',
});

router.post(
  '/ai-chat',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const { question, history } = normalizeChatPayload(req.body);

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

    const chat = await generateChatReply({ analysis, question, history });

    res.setHeader('Cache-Control', 'no-store');
    console.log(
      `[ai-chat] ${analysis.hostname} · source=${chat.source}${chat.model ? ` · model=${chat.model}` : ''} · q="${question.slice(0, 60)}"`,
    );
    res.json({ chat, analysisId: analysis.analysisId || null });
  }),
);

export default router;
