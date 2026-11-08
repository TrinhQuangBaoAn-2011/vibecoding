import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeUrlStream, requestAiReview } from '../lib/api.js';
import { normalizeUrlInput } from '../lib/url.js';
import { loadSettings } from '../lib/storage.js';

const INITIAL_STEPS = [
  {
    key: 'validate',
    label: 'Kiểm tra và chuẩn hóa URL',
    detail: 'Xác minh định dạng và giao thức của địa chỉ website.',
    status: 'pending',
  },
  {
    key: 'connect',
    label: 'Kết nối và tải website',
    detail: 'Backend xác minh địa chỉ, kết nối và truy xuất HTML thực tế.',
    status: 'pending',
  },
  {
    key: 'check',
    label: 'Kiểm tra 10 tiêu chí',
    detail: 'Đọc HTML bằng Cheerio và đánh giá từng tiêu chí.',
    status: 'pending',
  },
  {
    key: 'score',
    label: 'Tính điểm website',
    detail: 'Chuẩn hóa điểm và phân loại kết quả trên thang 100.',
    status: 'pending',
  },
  {
    key: 'ai',
    label: 'AI tổng hợp nhận xét',
    detail: 'Gửi dữ liệu đã chuẩn hóa để nhận nhận xét bằng tiếng Việt.',
    status: 'pending',
  },
  {
    key: 'done',
    label: 'Hoàn tất phân tích',
    detail: 'Lưu kết quả vào lịch sử và hiển thị báo cáo.',
    status: 'pending',
  },
];

const STAGE_INDEX = {
  validate: 0,
  connect: 1,
  fetch: 1,
  redirect: 1,
  parse: 2,
  check: 2,
  score: 3,
};

function freshSteps() {
  return INITIAL_STEPS.map((step) => ({ ...step }));
}

function markStep(steps, index, status, message) {
  return steps.map((step, stepIndex) => {
    if (stepIndex < index) {
      return step.status === 'error' || step.status === 'skipped' ? step : { ...step, status: 'done' };
    }
    if (stepIndex === index) {
      return { ...step, status, ...(message ? { detail: message } : {}) };
    }
    return step;
  });
}

export function useAnalyze() {
  const [status, setStatus] = useState('idle');
  const [analysis, setAnalysis] = useState(null);
  const [review, setReview] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [aiSkipped, setAiSkipped] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(freshSteps);
  const [activeStage, setActiveStage] = useState(null);

  const analyzeControllerRef = useRef(null);
  const aiControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      analyzeControllerRef.current?.abort();
      aiControllerRef.current?.abort();
    };
  }, []);

  const advance = useCallback((stage, message) => {
    const index = STAGE_INDEX[stage];
    if (index === undefined) return;
    setActiveStage(stage);
    setProgress((current) => markStep(current, index, 'active', message));
  }, []);

  const runAi = useCallback(async (analysisData) => {
    if (!analysisData) return null;
    aiControllerRef.current?.abort();
    const controller = new AbortController();
    aiControllerRef.current = controller;
    setAiError(null);
    setAiSkipped(false);
    setStatus('ai-pending');
    setProgress((current) => markStep(current, 4, 'active'));

    try {
      const result = await requestAiReview({
        analysisId: analysisData.analysisId,
        analysis: analysisData,
        signal: controller.signal,
      });
      if (!mountedRef.current) return null;
      setReview(result);
      setAiError(null);
      setProgress((current) => {
        const aiDone = markStep(current, 4, 'done');
        return markStep(aiDone, 5, 'active');
      });
      setStatus('success');
      setProgress((current) => markStep(current, 5, 'done'));
      return result;
    } catch (aiFailure) {
      if (!mountedRef.current) return null;
      if (aiFailure?.code === 'ABORTED') return null;
      setAiError(aiFailure);
      setProgress((current) => markStep(current, 4, 'error'));
      setStatus('success');
      return null;
    }
  }, []);

  const run = useCallback(
    async (rawUrl) => {
      let normalized;
      try {
        normalized = normalizeUrlInput(rawUrl);
      } catch (validationError) {
        setStatus('error');
        setError({ message: validationError.message, code: 'INVALID_URL' });
        setProgress((current) => markStep(markStep(freshSteps(), 0, 'error'), 0, 'error', validationError.message));
        return null;
      }

      cancelledRef.current = false;
      analyzeControllerRef.current?.abort();
      aiControllerRef.current?.abort();
      const controller = new AbortController();
      analyzeControllerRef.current = controller;

      setStatus('analyzing');
      setError(null);
      setAnalysis(null);
      setReview(null);
      setAiError(null);
      setAiSkipped(false);
      setActiveStage('validate');
      setProgress(markStep(freshSteps(), 0, 'active', 'Đang kiểm tra URL...'));

      const settings = loadSettings();

      try {
        const result = await analyzeUrlStream(normalized, {
          signal: controller.signal,
          onProgress: ({ stage, message }) => {
            if (!mountedRef.current) return;
            if (stage === 'validate') {
              advance('validate', message || 'URL hợp lệ. Đang chuẩn bị kết nối...');
              return;
            }
            if (stage === 'connect') {
              advance('connect', message);
              return;
            }
            if (stage === 'redirect') {
              advance('redirect', message);
              return;
            }
            if (stage === 'fetch') {
              advance('fetch', message);
              return;
            }
            if (stage === 'parse' || stage === 'check') {
              advance(stage, message);
              return;
            }
            if (stage === 'score') {
              advance('score', message);
            }
          },
        });

        if (!mountedRef.current) return null;
        if (cancelledRef.current) return null;

        setAnalysis(result);
        setProgress((current) => markStep(markStep(current, 3, 'done'), 3, 'done', 'Điểm đã được tính và chuẩn hóa về thang 100.'));

        if (settings.autoAi) {
          await runAi(result);
        } else {
          setAiSkipped(true);
          setProgress((current) => {
            const skipped = markStep(current, 4, 'skipped', 'Đã tắt tự động nhận xét AI trong Cài đặt.');
            return markStep(skipped, 5, 'done');
          });
          setStatus('success');
        }

        return result;
      } catch (analyzeError) {
        if (!mountedRef.current) return null;
        if (analyzeError?.code === 'ABORTED' || cancelledRef.current) return null;
        setError({
          message: analyzeError?.message || 'Không thể phân tích website này.',
          code: analyzeError?.code || 'ANALYZE_FAILED',
          details: analyzeError?.details || null,
        });
        setStatus('error');
        setProgress((current) => {
          const activeIndex = current.findIndex((step) => step.status === 'active');
          const index = activeIndex >= 0 ? activeIndex : 0;
          return markStep(current, index, 'error', analyzeError?.message);
        });
        return null;
      }
    },
    [advance, runAi],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    analyzeControllerRef.current?.abort();
    aiControllerRef.current?.abort();
    setStatus('idle');
    setError(null);
    setProgress(freshSteps());
    setActiveStage(null);
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    analyzeControllerRef.current?.abort();
    aiControllerRef.current?.abort();
    setStatus('idle');
    setAnalysis(null);
    setReview(null);
    setAiError(null);
    setAiSkipped(false);
    setError(null);
    setProgress(freshSteps());
    setActiveStage(null);
  }, []);

  const retryAi = useCallback(() => {
    if (!analysis) return Promise.resolve(null);
    return runAi(analysis);
  }, [analysis, runAi]);

  const currentStep = useMemo(
    () => progress.find((step) => step.status === 'active') || progress.find((step) => step.status === 'error') || null,
    [progress],
  );

  return {
    status,
    analysis,
    review,
    aiError,
    aiSkipped,
    error,
    progress,
    activeStage,
    currentStep,
    run,
    retryAi,
    cancel,
    reset,
  };
}
