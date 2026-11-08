import { useId } from 'react';
import { classificationFromScore, getClassificationMeta } from '../lib/constants.js';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({
  score = 0,
  size = 168,
  strokeWidth = 10,
  showLabel = true,
  className = '',
}) {
  const rawId = useId();
  const gradientId = `score-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const meta = getClassificationMeta(classificationFromScore(value));
  const offset = CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Điểm ${Math.round(value)} trên 100, xếp loại ${meta.label}`}
    >
      <svg viewBox="0 0 120 120" width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={meta.color} />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tabular font-extrabold leading-none tracking-tight text-ink-900"
          style={{ fontSize: Math.max(18, size * 0.25) }}
        >
          {Math.round(value)}
        </span>
        <span
          className="mt-1 font-bold uppercase tracking-[0.14em] text-ink-400"
          style={{ fontSize: Math.max(8, size * 0.062) }}
        >
          / 100 điểm
        </span>
        {showLabel && (
          <span
            className={`mt-2 rounded-full px-2 py-0.5 font-bold ${meta.soft} ${meta.text}`}
            style={{ fontSize: Math.max(9, size * 0.068) }}
          >
            {meta.label}
          </span>
        )}
      </div>
    </div>
  );
}
