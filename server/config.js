import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Support .env at the repository root and an optional server/.env.
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(__dirname, '.env'), override: false });

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: numberFromEnv(process.env.PORT, 5000),
  clientDist: path.join(rootDir, 'client', 'dist'),
  fetch: {
    timeoutMs: numberFromEnv(process.env.FETCH_TIMEOUT_MS, 15_000),
    maxBytes: numberFromEnv(process.env.FETCH_MAX_BYTES, 3 * 1024 * 1024),
    maxRedirects: 5,
    userAgent:
      process.env.FETCH_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 WEBCHECK-AI/1.0',
  },
  rateLimit: {
    windowMs: numberFromEnv(process.env.RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
    analyzeMax: numberFromEnv(process.env.RATE_LIMIT_ANALYZE_MAX, 30),
    aiMax: numberFromEnv(process.env.RATE_LIMIT_AI_MAX, 40),
  },
  ai: {
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    provider: process.env.AI_PROVIDER || 'openai-compatible',
    timeoutMs: numberFromEnv(process.env.AI_TIMEOUT_MS, 30_000),
    temperature: Number.isFinite(Number(process.env.AI_TEMPERATURE))
      ? Number(process.env.AI_TEMPERATURE)
      : 0.25,
    jsonMode: String(process.env.AI_JSON_MODE || '').toLowerCase() === 'true',
  },
};

export function aiIsConfigured() {
  return Boolean(config.ai.apiKey);
}

export function publicAiConfig() {
  return {
    configured: aiIsConfigured(),
    provider: config.ai.provider,
    model: config.ai.model,
    mode: aiIsConfigured() ? 'ai' : 'rules-fallback',
  };
}
