import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  icon: Icon,
}) {
  const titleId = useId();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto">
      <button
        type="button"
        aria-label="Đóng hộp thoại"
        className="fixed inset-0 animate-fade-in cursor-default bg-ink-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="relative flex min-h-full items-end justify-center sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`relative w-full animate-fade-up rounded-t-3xl border border-ink-200 bg-white shadow-lift sm:rounded-2xl ${SIZES[size] || SIZES.md}`}
        >
          <div className="flex items-start gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
            {Icon && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-bold text-ink-900 sm:text-lg">
                {title}
              </h2>
              {subtitle && <p className="mt-1 text-sm leading-relaxed text-ink-500">{subtitle}</p>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="scrollbar-thin max-h-[min(70vh,720px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
