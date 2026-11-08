import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { checkHealth } from '../lib/api.js';

const HealthContext = createContext(null);

export function HealthProvider({ children }) {
  const [state, setState] = useState({
    health: null,
    status: 'loading',
    error: null,
    lastChecked: null,
  });
  const controllerRef = useRef(null);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, status: current.health ? 'refreshing' : 'loading', error: null }));

    try {
      const health = await checkHealth({ signal: controller.signal });
      setState({
        health,
        status: 'ok',
        error: null,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      if (error?.code === 'ABORTED') return;
      setState((current) => ({
        ...current,
        status: 'offline',
        error: error?.message || 'Không thể kết nối tới backend.',
        lastChecked: new Date().toISOString(),
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 120_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controllerRef.current?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      aiConfigured: Boolean(state.health?.ai?.configured),
      online: state.status === 'ok' || state.status === 'refreshing',
    }),
    [state, refresh],
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) throw new Error('useHealth phải được dùng bên trong HealthProvider.');
  return context;
}
