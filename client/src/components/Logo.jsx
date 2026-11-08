import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function Logo({ compact = false, linked = true }) {
  const content = (
    <div className="flex items-center gap-3">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-400 shadow-glow">
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent" />
        <ShieldCheck className="relative h-6 w-6 text-white" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block text-[17px] font-extrabold leading-tight tracking-tight text-ink-900">
            WEBCHECK <span className="gradient-text">AI</span>
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Website Intelligence
          </span>
        </span>
      )}
    </div>
  );

  if (!linked) return content;
  return (
    <Link to="/" className="inline-flex rounded-xl" aria-label="WEBCHECK AI – Trang tổng quan">
      {content}
    </Link>
  );
}
