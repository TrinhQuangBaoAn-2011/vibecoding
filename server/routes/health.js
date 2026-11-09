import { Router } from 'express';
import { config, publicAiConfig } from '../config.js';
import { storeStats } from '../lib/analysisStore.js';
import { rateLimitStats } from '../lib/rateLimit.js';

const router = Router();
const startedAt = Date.now();

router.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    service: 'WEBCHECK AI API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    ai: publicAiConfig(),
    limits: {
      fetchTimeoutMs: config.fetch.timeoutMs,
      maxHtmlBytes: config.fetch.maxBytes,
      analyzePerWindow: config.rateLimit.analyzeMax,
      aiPerWindow: config.rateLimit.aiMax,
      aiChatPerWindow: config.rateLimit.chatMax,
      rateLimitWindowMs: config.rateLimit.windowMs,
    },
    cache: storeStats(),
    rateLimiter: rateLimitStats(),
  });
});

export default router;
