import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TONES = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-white',
    iconClass: 'bg-emerald-50 text-emerald-600',
  },
  error: {
    icon: AlertCircle,
    className: 'border-rose-200 bg-white',
    iconClass: 'bg-rose-50 text-rose-600',
  },
  info: {
    icon: Info,
    className: 'border-brand-200 bg-white',
    iconClass: 'bg-brand-50 text-brand-600',
  },
};

function ToastItem({ toast, onClose }) {
  const tone = TONES[toast.type] || TONES.info;
  const Icon = tone.icon;

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full animate-fade-up items-start gap-3 rounded-2xl border p-3.5 shadow-lift ${tone.className}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.iconClass}`}>
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-ink-900">{toast.title || 'Thông báo'}</p>
        <p className="mt-0.5 break-words text-sm leading-relaxed text-ink-600">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="rounded-lg p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
        aria-label="Đóng thông báo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message, options = {}) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const toast = {
        id,
        type,
        message,
        title: options.title || (type === 'success' ? 'Thành công' : type === 'error' ? 'Có lỗi xảy ra' : 'Thông tin'),
        duration: options.duration ?? 4500,
      };
      setToasts((current) => [...current.slice(-3), toast]);
      if (toast.duration > 0) {
        window.setTimeout(() => remove(id), toast.duration);
      }
      return id;
    },
    [remove],
  );

  const api = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      info: (message, options) => push('info', message, options),
      remove,
    }),
    [push, remove],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-end px-4 sm:top-5 sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-2.5" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={remove} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast phải được dùng bên trong ToastProvider.');
  return context;
}
