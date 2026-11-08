export const HISTORY_KEY = 'webcheck_ai_history_v1';
export const SETTINGS_KEY = 'webcheck_ai_settings_v1';

export const DEFAULT_SETTINGS = Object.freeze({
  autoAi: true,
  maxHistory: 50,
});

function getStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isStorageAvailable() {
  const storage = getStorage();
  if (!storage) return false;
  const key = '__webcheck_storage_test__';
  try {
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function isValidRecord(record) {
  return Boolean(
    record &&
      typeof record.id === 'string' &&
      typeof record.url === 'string' &&
      Number.isFinite(Number(record.score)) &&
      typeof record.analyzedAt === 'string' &&
      Array.isArray(record.criteria),
  );
}

export function loadHistory() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecord).slice(0, 100);
  } catch {
    return [];
  }
}

export function saveHistory(records) {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, code: 'STORAGE_UNAVAILABLE', error: 'Trình duyệt không cho phép lưu dữ liệu cục bộ.' };
  }
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(records));
    return { ok: true, error: null };
  } catch (error) {
    const quota = error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014;
    return {
      ok: false,
      code: quota ? 'QUOTA_EXCEEDED' : 'STORAGE_ERROR',
      error: quota
        ? 'Bộ nhớ lưu trữ của trình duyệt đã đầy.'
        : 'Không thể lưu lịch sử vào trình duyệt.',
    };
  }
}

export function loadSettings() {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const maxHistory = [20, 50, 100].includes(Number(parsed?.maxHistory))
      ? Number(parsed.maxHistory)
      : DEFAULT_SETTINGS.maxHistory;
    return {
      autoAi: typeof parsed?.autoAi === 'boolean' ? parsed.autoAi : DEFAULT_SETTINGS.autoAi,
      maxHistory,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, error: 'Trình duyệt không cho phép lưu cài đặt.' };
  }
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'Không thể lưu cài đặt vào trình duyệt.' };
  }
}

export function clearHistoryStorage() {
  const storage = getStorage();
  if (!storage) return { ok: false, error: 'Trình duyệt không cho phép truy cập bộ nhớ cục bộ.' };
  try {
    storage.removeItem(HISTORY_KEY);
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'Không thể xóa lịch sử khỏi trình duyệt.' };
  }
}

function byteLength(text) {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length * 2;
  }
}

export function getStorageInfo(records = loadHistory()) {
  const historyText = JSON.stringify(records || []);
  const settingsText = JSON.stringify(loadSettings());
  const usedBytes = byteLength(historyText) + byteLength(settingsText);
  return {
    records: records.length,
    usedBytes,
    limitBytes: 5 * 1024 * 1024,
    percent: Math.min(100, Math.round((usedBytes / (5 * 1024 * 1024)) * 1000) / 10),
    available: isStorageAvailable(),
  };
}

export function downloadHistoryJson(records) {
  try {
    const payload = JSON.stringify(
      {
        app: 'WEBCHECK AI',
        version: 1,
        exportedAt: new Date().toISOString(),
        total: records.length,
        records,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `webcheck-ai-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Không thể xuất dữ liệu lịch sử.' };
  }
}

export function testStorageRoundTrip() {
  const value = `ok-${Date.now()}`;
  const key = '__webcheck_roundtrip__';
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    const read = storage.getItem(key);
    storage.removeItem(key);
    return read === value;
  } catch {
    return false;
  }
}
