import crypto from 'node:crypto';

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 120;

const store = new Map();

function cleanup() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
}

const cleanupTimer = setInterval(cleanup, 5 * 60 * 1000);
cleanupTimer.unref?.();

export function saveAnalysis(analysis) {
  cleanup();
  const analysisId = crypto.randomUUID();
  store.set(analysisId, {
    analysis: { ...analysis, analysisId },
    expiresAt: Date.now() + TTL_MS,
  });
  return analysisId;
}

export function getAnalysis(analysisId) {
  if (!analysisId || typeof analysisId !== 'string') return null;
  const entry = store.get(analysisId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(analysisId);
    return null;
  }
  return entry.analysis;
}

export function storeStats() {
  cleanup();
  return { entries: store.size, ttlMinutes: TTL_MS / 60000, maxEntries: MAX_ENTRIES };
}
