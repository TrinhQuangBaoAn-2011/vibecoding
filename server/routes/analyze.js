import { Router } from 'express';
import { config } from '../config.js';
import { runAnalysis } from '../lib/analyzeService.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createRateLimiter } from '../lib/rateLimit.js';
import { errorPayload } from '../lib/errors.js';
import { normalizeInputUrl, validateResolvedUrl } from '../lib/urlSecurity.js';

const router = Router();
const analyzeLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.analyzeMax,
  scope: 'analyze',
});

router.post(
  '/analyze',
  analyzeLimiter,
  asyncHandler(async (req, res) => {
    const analysis = await runAnalysis(req.body?.url);
    res.setHeader('Cache-Control', 'no-store');
    console.log(
      `[analyze] ${analysis.hostname} · ${analysis.score}/100 · ${analysis.durationMs}ms · ${analysis.criteria.length} tiêu chí`,
    );
    res.json({ analysis });
  }),
);

router.post(
  '/fetch',
  analyzeLimiter,
  asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL là bắt buộc.' });
    }

    try {
      // Normalize and validate URL
      const normalized = normalizeInputUrl(url);
      validateResolvedUrl(normalized);

      // Fetch the website HTML
      const analysis = await runAnalysis(normalized.href, {
        onProgress: () => {}, // Silence progress
      });

      // Fetch robots.txt
      let robots = null;
      try {
        const robotsUrl = new URL('/robots.txt', normalized.href).href;
        const robotsRes = await fetch(robotsUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 WEBCHECK-AI/1.0',
            'Accept': 'text/plain',
          },
          timeout: 5000,
        });
        if (robotsRes.ok) {
          robots = {
            statusCode: robotsRes.status,
            text: await robotsRes.text(),
          };
        }
      } catch {
        robots = null;
      }

      // Fetch sitemap.xml
      let sitemap = null;
      try {
        const sitemapUrl = new URL('/sitemap.xml', normalized.href).href;
        const sitemapRes = await fetch(sitemapUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 WEBCHECK-AI/1.0',
            'Accept': 'application/xml',
          },
          timeout: 5000,
        });
        if (sitemapRes.ok) {
          sitemap = {
            statusCode: sitemapRes.status,
            text: await sitemapRes.text(),
          };
        }
      } catch {
        sitemap = null;
      }

      res.json({
        html: analysis.html,
        finalUrl: analysis.finalUrl,
        statusCode: analysis.statusCode,
        elapsedMs: analysis.durationMs,
      });
    } catch (error) {
      const payload = errorPayload(error);
      res.status(payload.status || 502).json({ error: payload.message });
    }
  }),
);

router.post('/analyze/stream', analyzeLimiter, async (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const canWrite = () => !res.writableEnded && !res.destroyed;
  const send = (event) => {
    if (!canWrite()) return;
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const analysis = await runAnalysis(req.body?.url, {
      onProgress: (stage, message) => send({ type: 'progress', stage, message }),
    });

    send({ type: 'result', analysis });
    console.log(
      `[analyze:stream] ${analysis.hostname} · ${analysis.score}/100 · ${analysis.durationMs}ms · ${analysis.criteria.length} tiêu chí`,
    );
  } catch (error) {
    const payload = errorPayload(error);
    send({ type: 'error', ...payload });
    console.warn(`[analyze:stream] ${payload.error.code}: ${payload.error.message}`);
  } finally {
    if (canWrite()) res.end();
  }
});

export default router;
