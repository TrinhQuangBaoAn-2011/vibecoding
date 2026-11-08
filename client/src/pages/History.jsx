import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Download,
  History as HistoryIcon,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState.jsx';
import { RecordCard } from '../components/RecordCard.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { useHistory } from '../context/HistoryContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadHistoryJson } from '../lib/storage.js';
import { classificationFromScore } from '../lib/constants.js';
import { formatBytes, formatDateTime } from '../lib/format.js';

const CLASSIFICATION_OPTIONS = [
  { value: 'all', label: 'Tất cả xếp loại' },
  { value: 'good', label: 'Tốt (85–100)' },
  { value: 'fair', label: 'Khá (70–84)' },
  { value: 'average', label: 'Trung bình (50–69)' },
  { value: 'poor', label: 'Cần cải thiện (0–49)' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất trước' },
  { value: 'oldest', label: 'Cũ nhất trước' },
  { value: 'score-desc', label: 'Điểm cao nhất' },
  { value: 'score-asc', label: 'Điểm thấp nhất' },
];

export function History() {
  const { records, deleteRecord, clearAll, getInfo } = useHistory();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [classification, setClassification] = useState('all');
  const [sort, setSort] = useState('newest');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clearOpen, setClearOpen] = useState(false);

  const info = getInfo();
  const stats = useMemo(() => {
    if (!records.length) return { average: null, best: null, domains: 0 };
    const scores = records.map((record) => Number(record.score) || 0);
    return {
      average: Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10,
      best: Math.max(...scores),
      domains: new Set(records.map((record) => record.hostname)).size,
    };
  }, [records]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = records.filter((record) => {
      if (!term) return true;
      return (
        String(record.hostname || '').toLowerCase().includes(term) ||
        String(record.url || '').toLowerCase().includes(term) ||
        String(record.finalUrl || '').toLowerCase().includes(term)
      );
    });

    if (classification !== 'all') {
      list = list.filter(
        (record) =>
          (record.classification?.key || classificationFromScore(record.score)) === classification,
      );
    }

    return [...list].sort((a, b) => {
      if (sort === 'score-desc') return Number(b.score) - Number(a.score);
      if (sort === 'score-asc') return Number(a.score) - Number(b.score);
      const timeA = new Date(a.analyzedAt).getTime();
      const timeB = new Date(b.analyzedAt).getTime();
      return sort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [records, query, classification, sort]);

  const hasFilters = Boolean(query.trim()) || classification !== 'all' || sort !== 'newest';

  const handleExport = () => {
    const result = downloadHistoryJson(records);
    if (result.ok) {
      toast.success('Đã xuất lịch sử thành tệp JSON.', { title: 'Xuất dữ liệu thành công' });
    } else {
      toast.error(result.error || 'Không thể xuất lịch sử.');
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const hostname = deleteTarget.hostname;
    deleteRecord(deleteTarget.id);
    setDeleteTarget(null);
    toast.success(`Đã xóa bản ghi ${hostname} khỏi lịch sử.`, { title: 'Đã xóa' });
  };

  const handleClearAll = () => {
    const ok = clearAll();
    setClearOpen(false);
    if (ok) {
      toast.success('Đã xóa toàn bộ lịch sử phân tích trên trình duyệt.', {
        title: 'Đã xóa lịch sử',
      });
    }
  };

  const resetFilters = () => {
    setQuery('');
    setClassification('all');
    setSort('newest');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dữ liệu cục bộ</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Lịch sử phân tích
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">
            Tất cả kết quả được lưu trên trình duyệt của bạn. Xem lại báo cáo, so sánh điểm số hoặc xóa
            bất kỳ bản ghi nào.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={records.length === 0}
            className="btn-secondary btn-sm"
          >
            <Download className="h-4 w-4" />
            Xuất JSON
          </button>
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={records.length === 0}
            className="btn-danger btn-sm"
          >
            <Trash2 className="h-4 w-4" />
            Xóa tất cả
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Tổng bản ghi', value: records.length, icon: HistoryIcon },
          { label: 'Tên miền', value: stats.domains, icon: BarChart3 },
          { label: 'Điểm trung bình', value: stats.average ?? '—', icon: BarChart3 },
          { label: 'Điểm cao nhất', value: stats.best ?? '—', icon: Award },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                {item.label}
              </p>
              <item.icon className="h-4 w-4 text-ink-300" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-ink-900 tabular">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên miền hoặc URL..."
              className="input pl-10"
              aria-label="Tìm trong lịch sử"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <select
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
                className="input min-w-[170px] appearance-none py-2.5 pl-9 pr-8 text-xs font-semibold"
                aria-label="Lọc theo xếp loại"
              >
                {CLASSIFICATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="input min-w-[155px] appearance-none py-2.5 text-xs font-semibold"
              aria-label="Sắp xếp lịch sử"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button type="button" onClick={resetFilters} className="btn-ghost btn-sm">
                <X className="h-3.5 w-3.5" />
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 text-[11px] text-ink-500">
          <span>
            Hiển thị <span className="font-bold text-ink-800">{filtered.length}</span> / {records.length} bản ghi
          </span>
          <span>
            Dung lượng ước tính: <span className="font-semibold text-ink-700">{formatBytes(info.usedBytes)}</span>
            {' · '}
            {info.percent}% bộ nhớ trình duyệt
          </span>
        </div>
      </section>

      {records.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Lịch sử đang trống"
          description="Mỗi lần phân tích website sẽ được lưu tự động tại đây. Bạn có thể xem lại báo cáo, so sánh điểm và xuất dữ liệu JSON."
          action={
            <Link to="/analyze" className="btn-primary btn-sm">
              Phân tích website đầu tiên
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Không tìm thấy bản ghi phù hợp"
          description="Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ lịch sử."
          action={
            <button type="button" onClick={resetFilters} className="btn-secondary btn-sm">
              Xóa bộ lọc
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((record) => (
            <RecordCard key={record.id} record={record} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {info.percent >= 70 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-800">
          Bộ nhớ lưu trữ đã dùng {info.percent}%. Nếu gặp lỗi dung lượng, WEBCHECK AI sẽ tự động dọn bớt
          bản ghi cũ. Bạn cũng có thể xuất JSON và xóa bớt lịch sử trong Cài đặt.
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xóa bản ghi lịch sử?"
        description={
          deleteTarget ? (
            <span>
              Bản ghi <strong>{deleteTarget.hostname}</strong> lúc{' '}
              <strong>{formatDateTime(deleteTarget.analyzedAt)}</strong> sẽ bị xóa khỏi trình duyệt.
              Hành động này không thể hoàn tác.
            </span>
          ) : null
        }
        confirmLabel="Xóa bản ghi"
      />

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClearAll}
        title="Xóa toàn bộ lịch sử?"
        description={`Bạn sắp xóa ${records.length} bản ghi phân tích khỏi localStorage. Hành động này không thể hoàn tác. Hãy xuất JSON trước nếu cần lưu dữ liệu.`}
        confirmLabel="Xóa toàn bộ"
      />
    </div>
  );
}
