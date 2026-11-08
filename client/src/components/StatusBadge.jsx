import { AlertTriangle, CheckCircle2, HelpCircle, MinusCircle, XCircle } from 'lucide-react';
import { getStatusMeta } from '../lib/constants.js';

const ICONS = {
  pass: CheckCircle2,
  fail: XCircle,
  warning: AlertTriangle,
  na: MinusCircle,
  untestable: HelpCircle,
};

export function StatusBadge({ status, label, showIcon = true, className = '' }) {
  const meta = getStatusMeta(status);
  const Icon = ICONS[status] || HelpCircle;
  return (
    <span className={`badge ${meta.badge} ${className}`}>
      {showIcon && <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />}
      {label || meta.label}
    </span>
  );
}

export function StatusIcon({ status, className = 'h-5 w-5' }) {
  const Icon = ICONS[status] || HelpCircle;
  const meta = getStatusMeta(status);
  return <Icon className={`${className} ${meta.text}`} strokeWidth={2.2} />;
}
