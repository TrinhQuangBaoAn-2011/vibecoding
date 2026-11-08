import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Globe, Loader2, Sparkles } from 'lucide-react';
import { validateUrlInput } from '../lib/url.js';

const EXAMPLES = [
  { label: 'vnexpress.net', value: 'https://vnexpress.net' },
  { label: 'example.com', value: 'https://example.com' },
  { label: 'shopee.vn', value: 'https://shopee.vn' },
];

export function UrlForm({
  onSubmit,
  loading = false,
  defaultValue = '',
  compact = false,
  autoFocus = false,
  className = '',
  submitLabel = 'Phân tích ngay',
}) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef(null);
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState(null);

  useEffect(() => {
    setValue(defaultValue || '');
  }, [defaultValue]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    const result = validateUrlInput(value);
    if (!result.ok) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    onSubmit?.(result.url);
  };

  const handleExample = (example) => {
    setValue(example);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`} noValidate>
      <div
        className={`flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-soft transition focus-within:border-brand-300 focus-within:shadow-glow sm:flex-row sm:items-center ${
          error ? 'border-rose-300' : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
          <Globe className="h-5 w-5 shrink-0 text-ink-400" strokeWidth={2} />
          <label htmlFor={inputId} className="sr-only">
            Địa chỉ website cần phân tích
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Nhập URL website, ví dụ: https://congty.vn"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            disabled={loading}
            className="w-full min-w-0 bg-transparent py-2.5 text-sm font-medium text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary shrink-0 px-5 py-3 sm:min-w-[160px]"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang phân tích...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {submitLabel}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-rose-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-400">Thử nhanh:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.value}
              type="button"
              onClick={() => handleExample(example.value)}
              disabled={loading}
              className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
            >
              {example.label}
            </button>
          ))}
          <span className="ml-auto hidden text-xs text-ink-400 sm:inline">
            Chỉ phân tích website công khai
          </span>
        </div>
      )}
    </form>
  );
}
