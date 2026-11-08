import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, History as HistoryIcon, Trash2 } from 'lucide-react';
import { AnalysisReport } from '../components/AnalysisReport.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useHistory } from '../context/HistoryContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { requestAiReview } from '../lib/api.js';
import { buildComparison } from '../lib/comparison.js';

export function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, updateReview, deleteRecord } = useHistory();
  const toast = useToast();

  const record = useMemo(() => records.find((item) => item.id === id) || null, [records, id]);
  const [review, setReview] = useState(record?.aiReview || null);
  const [aiState, setAiState] = useState('idle');
  const [aiError, setAiError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const controllerRef = useRef(null);

  useEffect(() => {
    setReview(record?.aiReview || null);
    setAiState('idle');
    setAiError(null);
  }, [record?.id]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const comparison = useMemo(
    () => (record ? buildComparison(record, records) : null),
    [record, records],
  );

  if (!record) {
    return (
      <div className="space-y-5">
        <Link to="/history" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
          <ArrowLeft className="h-4 w-4" />
          Quay lại lịch sử
        </Link>
        <EmptyState
          icon={HistoryIcon}
          title="Không tìm thấy bản ghi"
          description="Bản ghi này có thể đã bị xóa khỏi trình duyệt hoặc đường dẫn không hợp lệ."
          action={
            <Link to="/history" className="btn-primary btn-sm">
              Về trang lịch sử
            </Link>
          }
        />
      </div>
    );
  }

  const handleRetryAi = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setAiState('pending');
    setAiError(null);

    try {
      const result = await requestAiReview({
        analysisId: record.analysisId || record.id,
        analysis: record,
        signal: controller.signal,
      });
      setReview(result);
      setAiState('done');
      updateReview(record.id, result);
      toast.success('Đã tạo và lưu nhận xét mới cho bản ghi này.', {
        title: 'Nhận xét đã sẵn sàng',
      });
    } catch (error) {
      if (error?.code === 'ABORTED') return;
      setAiError(error);
      setAiState('error');
      toast.error(error?.message || 'Không thể tạo nhận xét AI.', {
        title: 'Không thể tạo nhận xét',
      });
    }
  };

  const handleDelete = () => {
    deleteRecord(record.id);
    setDeleteOpen(false);
    toast.success(`Đã xóa bản ghi ${record.hostname}.`, { title: 'Đã xóa' });
    navigate('/history');
  };

  let aiStatus = 'idle';
  if (aiState === 'pending') aiStatus = 'pending';
  else if (aiState === 'error') aiStatus = 'error';
  else if (review) aiStatus = 'done';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại lịch sử
        </Link>
        <span className="text-xs text-ink-400">Bản ghi lưu trên trình duyệt</span>
      </div>

      <AnalysisReport
        analysis={record}
        review={review}
        aiStatus={aiStatus}
        aiError={aiError}
        onRetryAi={handleRetryAi}
        comparison={comparison}
        onDelete={() => setDeleteOpen(true)}
        onReanalyze={() =>
          navigate(
            `/analyze?url=${encodeURIComponent(record.requestedUrl || record.finalUrl || record.url)}`,
          )
        }
        saved
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Xóa bản ghi này?"
        description={`Bản ghi ${record.hostname} sẽ bị xóa khỏi lịch sử trình duyệt. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa bản ghi"
      />
    </div>
  );
}
