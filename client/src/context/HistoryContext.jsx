import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from './ToastContext.jsx';
import {
  HISTORY_KEY,
  clearHistoryStorage,
  getStorageInfo,
  isStorageAvailable,
  loadHistory,
  loadSettings,
  saveHistory,
} from '../lib/storage.js';

const HistoryContext = createContext(null);

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildRecord(analysis, review) {
  return {
    version: 1,
    id: analysis.analysisId || analysis.id || makeId(),
    analysisId: analysis.analysisId || analysis.id || null,
    url: analysis.url,
    requestedUrl: analysis.requestedUrl || analysis.url,
    finalUrl: analysis.finalUrl || analysis.url,
    hostname: analysis.hostname,
    analyzedAt: analysis.analyzedAt || new Date().toISOString(),
    score: Number(analysis.score),
    rawPoints: analysis.rawPoints,
    maxAvailable: analysis.maxAvailable,
    maxRaw: analysis.maxRaw,
    normalizedPoints: analysis.normalizedPoints,
    classification: analysis.classification,
    counts: analysis.counts,
    scoredCriteria: analysis.scoredCriteria,
    excludedCriteria: analysis.excludedCriteria,
    scoringNote: analysis.scoringNote,
    criteria: analysis.criteria,
    page: analysis.page,
    durationMs: analysis.durationMs,
    source: analysis.source,
    aiReview: review || null,
    summary: review?.summary || null,
    savedAt: new Date().toISOString(),
  };
}

export function HistoryProvider({ children }) {
  const toast = useToast();
  const initialRef = useRef(null);
  if (initialRef.current === null) initialRef.current = loadHistory();

  const [records, setRecords] = useState(initialRef.current);
  const recordsRef = useRef(initialRef.current);
  const [storageError, setStorageError] = useState(() =>
    isStorageAvailable() ? null : 'Trình duyệt không cho phép lưu dữ liệu cục bộ. Lịch sử sẽ không được giữ lại sau khi tải lại trang.',
  );
  const warnedQuotaRef = useRef(false);
  const warnedFailureRef = useRef(false);

  const persist = useCallback(
    (nextRecords) => {
      let data = nextRecords;
      let result = saveHistory(data);

      if (!result.ok && result.code === 'QUOTA_EXCEEDED' && data.length > 1) {
        const trimmed = data.slice(0, Math.max(5, Math.floor(data.length / 2)));
        const retry = saveHistory(trimmed);
        if (retry.ok) {
          data = trimmed;
          result = retry;
          if (!warnedQuotaRef.current) {
            warnedQuotaRef.current = true;
            toast.info(
              'Bộ nhớ trình duyệt đã đầy. WEBCHECK AI đã tự động dọn bớt các bản ghi cũ để lưu kết quả mới.',
              { title: 'Đã dọn bớt lịch sử cũ' },
            );
          }
        }
      }

      recordsRef.current = data;
      setRecords(data);

      if (!result.ok) {
        setStorageError(result.error);
        if (!warnedFailureRef.current) {
          warnedFailureRef.current = true;
          toast.error(
            `${result.error} Kết quả vẫn hiển thị trong phiên này nhưng có thể mất khi tải lại trang.`,
            { title: 'Không thể lưu lịch sử' },
          );
        }
      } else {
        setStorageError(null);
        warnedFailureRef.current = false;
      }

      return result;
    },
    [toast],
  );

  const addRecord = useCallback(
    (analysis, review = null) => {
      if (!analysis || !analysis.criteria) return null;
      const incoming = buildRecord(analysis, review);
      const current = recordsRef.current;
      const existing = current.find((record) => record.id === incoming.id);

      const merged = existing
        ? {
            ...existing,
            ...incoming,
            aiReview: review || existing.aiReview || null,
            summary: review?.summary || existing.summary || null,
            savedAt: new Date().toISOString(),
          }
        : incoming;

      const next = [merged, ...current.filter((record) => record.id !== merged.id)].sort(
        (a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime(),
      );

      const maxHistory = loadSettings().maxHistory || 50;
      persist(next.slice(0, maxHistory));
      return merged;
    },
    [persist],
  );

  const updateReview = useCallback(
    (recordId, review) => {
      const current = recordsRef.current;
      const next = current.map((record) =>
        record.id === recordId
          ? { ...record, aiReview: review, summary: review?.summary || record.summary, savedAt: new Date().toISOString() }
          : record,
      );
      persist(next);
    },
    [persist],
  );

  const deleteRecord = useCallback(
    (recordId) => {
      const previousLength = recordsRef.current.length;
      const next = recordsRef.current.filter((record) => record.id !== recordId);
      persist(next);
      return next.length !== previousLength;
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    const storage = clearHistoryStorage();
    recordsRef.current = [];
    setRecords([]);
    if (!storage.ok) {
      setStorageError(storage.error);
      toast.error(storage.error);
      return false;
    }
    setStorageError(null);
    return true;
  }, [toast]);

  const pruneTo = useCallback(
    (max) => {
      const next = recordsRef.current.slice(0, max);
      persist(next);
      return next.length;
    },
    [persist],
  );

  const retryStorage = useCallback(() => {
    const available = isStorageAvailable();
    if (available) {
      setStorageError(null);
      warnedFailureRef.current = false;
      persist(recordsRef.current);
      return true;
    }
    setStorageError('Trình duyệt vẫn đang chặn localStorage. Hãy kiểm tra chế độ riêng tư hoặc cài đặt quyền lưu dữ liệu.');
    return false;
  }, [persist]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== HISTORY_KEY) return;
      const next = loadHistory();
      recordsRef.current = next;
      setRecords(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      records,
      storageError,
      addRecord,
      updateReview,
      deleteRecord,
      clearAll,
      pruneTo,
      retryStorage,
      getInfo: () => getStorageInfo(recordsRef.current),
    }),
    [records, storageError, addRecord, updateReview, deleteRecord, clearAll, pruneTo, retryStorage],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) throw new Error('useHistory phải được dùng bên trong HistoryProvider.');
  return context;
}
