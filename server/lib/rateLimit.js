const buckets = new Map();

function cleanup(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function createRateLimiter({ windowMs, max, scope = 'general' }) {
  return function rateLimiter(req, res, next) {
    const now = Date.now();
    cleanup(now);

    const key = `${scope}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${resetSeconds} giây.`,
          details: { retryAfterSeconds: resetSeconds },
        },
      });
      return;
    }

    next();
  };
}

export function rateLimitStats() {
  cleanup(Date.now());
  return { activeBuckets: buckets.size };
}
