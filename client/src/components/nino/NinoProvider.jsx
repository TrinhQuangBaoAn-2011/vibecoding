import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* Nino — mascot của WEBCHECK AI (client-side, thuần SVG/CSS, không truy cập
 * backend). Provider này là điểm đồng bộ duy nhất giữa trạng thái ứng dụng và
 * trạng thái nhân vật: mọi trang nói cho Nino biết "chất" hiện tại qua
 * setMood(), Nino tự lo animation và chuyển động. Không có mood nào tồi tệ hơn
 * mức này; tắt Nino vẫn chạy đủ mọi chức năng (mascot luôn là phụ kiện). */

const PRESETS = {
  idle: { emotion: 'idle', label: 'Đang rảnh' },
  looking: { emotion: 'looking', label: 'Đang nhìn' },
  walking: { emotion: 'walking', label: 'Đang đi dạo' },
  thinking: { emotion: 'thinking', label: 'Đang suy nghĩ' },
  greeting: { emotion: 'greeting', label: 'Chào bạn' },
  reacting: { emotion: 'reacting', label: 'Phản ứng' },
  happy: { emotion: 'happy', label: 'Vui mừng' },
  concerned: { emotion: 'concerned', label: 'Lo lắng' },
};

const NinoContext = createContext(null);

function readStoredFlag() {
  try {
    return window.localStorage.getItem('webcheck_nino_enabled') !== 'false';
  } catch {
    return true;
  }
}

export function NinoProvider({ children }) {
  const [enabled, setEnabled] = useState(readStoredFlag);
  const [mood, setMood] = useState('idle');
  const [meta, setMeta] = useState(null);

  const setMoodState = useCallback((next, detail = null) => {
    if (!PRESETS[next]) return;
    setMood(next);
    setMeta(detail);
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('webcheck_nino_enabled', next ? 'true' : 'false');
      } catch {
        // Lưu không được thì cứ giữ trong RAM — Nino vẫn tắt/bật cho phiên này.
      }
      return next;
    });
  }, []);

  // Mood tạm (thinking/greeting/...) tự trở về idle sau một khoảng ngắn
  // để nhân vật không bị "kẹt" trong một biểu cảm duy nhất.
  useEffect(() => {
    if (mood === 'idle' || mood === 'walking') return undefined;
    const timer = window.setTimeout(() => setMoodState('idle'), 4200);
    return () => window.clearTimeout(timer);
  }, [mood, meta, setMoodState]);

  const value = useMemo(
    () => ({
      enabled,
      mood,
      meta,
      setMood: setMoodState,
      toggleEnabled,
      moods: PRESETS,
    }),
    [enabled, mood, meta, setMoodState, toggleEnabled],
  );

  return <NinoContext.Provider value={value}>{children}</NinoContext.Provider>;
}

export function useNino() {
  const context = useContext(NinoContext);
  if (!context) {
    return {
      enabled: false,
      mood: 'idle',
      meta: null,
      setMood: () => {},
      toggleEnabled: () => {},
      moods: PRESETS,
    };
  }
  return context;
}

export const NINO_MOODS = PRESETS;
