import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  HelpCircle,
  Lightbulb,
  MinusCircle,
  Scale,
  XCircle,
} from 'lucide-react';
import { getStatusMeta, getPriorityMeta } from '../lib/constants.js';
import { Modal } from './Modal.jsx';
import { StatusBadge } from './StatusBadge.jsx';

const STATUS_ICONS = {
  pass: CheckCircle2,
  fail: XCircle,
  warning: AlertTriangle,
  na: MinusCircle,
  untestable: HelpCircle,
};

function formatPoints(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace('.', ',');
}

export function CriterionModal({ criterion, open, onClose }) {
  if (!criterion) return null;

  const meta = getStatusMeta(criterion.status);
  const Icon = STATUS_ICONS[criterion.status] || CircleSlash;
  const excluded = ['na', 'untestable'].includes(criterion.status);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={criterion.name}
      subtitle={
        excluded
          ? 'Tiêu chí này không được tính vào mẫu số điểm chuẩn hóa.'
          : `Điểm đạt được: ${formatPoints(criterion.points)} / ${criterion.maxPoints} điểm.`
      }
      icon={Icon}
      size="lg"
      footer={
        <button type="button" className="btn-primary" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={criterion.status} label={criterion.statusLabel} />
          <span className={`badge ${meta.badge}`}>
            {excluded ? 'Không tính vào điểm tổng' : `${formatPoints(criterion.points)}/${criterion.maxPoints} điểm`}
          </span>
          {(() => {
            const priority = getPriorityMeta(criterion.criticality || criterion.priority);
            return (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${priority.badge}`}
                title={priority.description}
              >
                {criterion.criticality || criterion.priority || 'P2'} · {priority.label} · {priority.weight} điểm thô
              </span>
            );
          })()}
          {criterion.group && (
            <span className="badge bg-ink-100 text-ink-600">{criterion.group}</span>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
            Giá trị ghi nhận
          </p>
          <div className="rounded-md border border-ink-200 bg-ink-50/70 px-4 py-3">
            <p className="break-words font-mono text-xs leading-relaxed text-ink-700 sm:text-sm">
              {criterion.value || 'Không tìm thấy'}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
            Nhận định
          </p>
          <p className="text-sm leading-relaxed text-ink-700">{criterion.message}</p>
        </div>

        {criterion.impact && (
          <div className="rounded-md border border-sky-100 bg-sky-50/60 p-4">
            <div className="flex items-start gap-2.5">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-700">
                  Vì sao tiêu chí này quan trọng
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{criterion.impact}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                Đề xuất cải thiện
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{criterion.recommendation}</p>
            </div>
          </div>
        </div>

        {criterion.details?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Bằng chứng chi tiết
            </p>
            <dl className="divide-y divide-ink-100 overflow-hidden rounded-md border border-ink-200">
              {criterion.details.map((detail, index) => (
                <div
                  key={`${detail.label}-${index}`}
                  className="grid gap-1 bg-white px-4 py-2.5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"
                >
                  <dt className="text-xs font-semibold text-ink-500">{detail.label}</dt>
                  <dd className="flex items-start gap-2 break-words text-xs leading-relaxed text-ink-800">
                    {detail.status && (
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          detail.status === 'pass' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                    )}
                    <span>{detail.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </Modal>
  );
}
