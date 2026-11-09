import { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Download,
  HardDrive,
  RefreshCw,
  Server,
  Settings as SettingsIcon,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { useHistory } from '../context/HistoryContext.jsx';
import { useHealth } from '../context/HealthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNino } from '../components/nino/index.js';
import {
  downloadHistoryJson,
  loadSettings,
  saveSettings,
  testStorageRoundTrip,
} from '../lib/storage.js';
import { formatBytes, formatDuration, formatNumber } from '../lib/format.js';

const HISTORY_OPTIONS = [20, 50, 100];

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-ink-900">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? 'bg-brand-600' : 'bg-ink-300'
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
          }`}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </div>
  );
}

export function Settings() {
  const { records, clearAll, pruneTo, getInfo } = useHistory();
  const { status, health, aiConfigured, refresh } = useHealth();
  const toast = useToast();
  const { enabled: ninoEnabled, toggleEnabled, setMood } = useNino();
  const [settings, setSettings] = useState(loadSettings);
  const [clearOpen, setClearOpen] = useState(false);

  const info = getInfo();
  const limits = health?.limits;

  const persistSettings = (next) => {
    setSettings(next);
    const result = saveSettings(next);
    if (result.ok) {
      toast.success('Cài đặt đã được lưu trên trình duyệt.', { title: 'Đã lưu' });
    } else {
      toast.error(result.error || 'Không thể lưu cài đặt.');
    }
  };

  const handleAutoAi = () => {
    persistSettings({ ...settings, autoAi: !settings.autoAi });
  };

  const handleNinoToggle = () => {
    toggleEnabled();
    setMood('reacting', { trigger: 'setting' });
  };

  const handleMaxHistory = (event) => {
    const max = Number(event.target.value);
    const next = { ...settings, maxHistory: max };
    setSettings(next);
    const result = saveSettings(next);
    if (!result.ok) {
      toast.error(result.error || 'Không thể lưu cài đặt.');
      return;
    }
    if (records.length > max) {
      const kept = pruneTo(max);
      toast.info(`Đã giữ lại ${kept} bản ghi mới nhất để phù hợp giới hạn mới.`, {
        title: 'Đã tinh gọn lịch sử',
      });
    } else {
      toast.success('Đã cập nhật giới hạn lịch sử.', { title: 'Đã lưu' });
    }
  };

  const handleExport = () => {
    const result = downloadHistoryJson(records);
    if (result.ok) {
      toast.success('Đã xuất lịch sử thành tệp JSON.', { title: 'Xuất dữ liệu thành công' });
    } else {
      toast.error(result.error || 'Không thể xuất lịch sử.');
    }
  };

  const handleTestStorage = () => {
    const ok = testStorageRoundTrip();
    if (ok) {
      toast.success('localStorage hoạt động bình thường trên trình duyệt này.', {
        title: 'Kiểm tra thành công',
      });
    } else {
      toast.error('Không thể ghi và đọc dữ liệu thử. Hãy kiểm tra chế độ riêng tư hoặc quyền lưu trữ.', {
        title: 'Kiểm tra thất bại',
      });
    }
  };

  const handleClearAll = () => {
    const ok = clearAll();
    setClearOpen(false);
    if (ok) {
      toast.success('Đã xóa toàn bộ lịch sử phân tích.', { title: 'Đã xóa lịch sử' });
    }
  };

  const backendStats = [
    {
      label: 'Tải website tối đa',
      value: limits ? formatDuration(limits.fetchTimeoutMs) : '—',
    },
    {
      label: 'Kích thước HTML',
      value: limits ? formatBytes(limits.maxHtmlBytes) : '—',
    },
    {
      label: 'Phân tích / 10 phút',
      value: limits?.analyzePerWindow ?? '—',
    },
    {
      label: 'Lượt AI / 10 phút',
      value: limits?.aiPerWindow ?? '—',
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Tùy chỉnh</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Cài đặt</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-500">
          Điều chỉnh cách WEBCHECK AI hoạt động trên trình duyệt này.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <SettingsIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Tùy chọn phân tích</h2>
              <p className="mt-0.5 text-xs text-ink-500">Áp dụng cho các lần phân tích tiếp theo.</p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <Toggle
              checked={settings.autoAi}
              onChange={handleAutoAi}
              label="Tự động tạo nhận xét AI"
              description="Sau khi chấm điểm, gửi dữ liệu đã lọc tới backend để nhận nhận xét tiếng Việt. Nếu tắt, bạn vẫn có thể tạo nhận xét sau."
            />

            <div className="divider" />

            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-900">Giới hạn lịch sử</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                    Số bản ghi tối đa được giữ trên trình duyệt. Hiện có {records.length} bản ghi.
                  </p>
                </div>
                <select
                  value={settings.maxHistory}
                  onChange={handleMaxHistory}
                  className="input w-24 shrink-0 py-2 text-xs font-semibold"
                  aria-label="Giới hạn số bản ghi lịch sử"
                >
                  {HISTORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
                Khi giảm giới hạn, các bản ghi cũ nhất sẽ bị xóa để giữ số lượng mới. Khi bộ nhớ đầy,
                hệ thống tự động dọn bớt và thông báo.
              </p>
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Dữ liệu trên trình duyệt</h2>
              <p className="mt-0.5 text-xs text-ink-500">Lịch sử được lưu bằng localStorage.</p>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-ink-200 bg-ink-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-600">
              <span>Dung lượng ước tính</span>
              <span className="tabular">
                {formatBytes(info.usedBytes)} / ~5 MB
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-inset ring-ink-200">
              <div
                className={`h-full rounded-full ${
                  info.percent >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-brand-600 to-cyan-400'
                }`}
                style={{ width: `${Math.max(info.percent > 0 ? 1 : 0, info.percent)}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-ink-500">
              <span>{formatNumber(info.percent, 1)}% dung lượng</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  info.available ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${info.available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {info.available ? 'localStorage khả dụng' : 'localStorage bị chặn'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={handleExport} disabled={records.length === 0} className="btn-secondary btn-sm">
              <Download className="h-4 w-4" />
              Xuất JSON
            </button>
            <button type="button" onClick={handleTestStorage} className="btn-secondary btn-sm">
              <CheckCircle2 className="h-4 w-4" />
              Kiểm tra lưu trữ
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
            Lịch sử không được gửi lên máy chủ. Khi xóa dữ liệu trình duyệt hoặc dùng chế độ riêng tư,
            lịch sử có thể mất.
          </p>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Trợ lý Nino</h2>
              <p className="mt-0.5 text-xs text-ink-500">Nhân vật vui nhộn ở đáy màn hình.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Toggle
              checked={ninoEnabled}
              onChange={handleNinoToggle}
              label="Hiện Nino"
              description="Nino đi dạo ở dải đáy màn hình, mắt nhìn theo con trỏ và biểu cảm theo kết quả phân tích. Tắt Nino không ảnh hưởng chức năng nào."
            />
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
              Trên điện thoại và chế độ giảm chuyển động: Nino đứng tĩnh, không đi dạo và không theo
              mắt để tiết kiệm pin.
            </p>
          </div>
        </section>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                aiConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-ink-100 text-ink-500'
              }`}
            >
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Trạng thái AI</h2>
              <p className="mt-0.5 text-xs text-ink-500">Nguồn tạo nhận xét cho kết quả phân tích.</p>
            </div>
          </div>
          <button type="button" onClick={refresh} className="btn-secondary btn-sm shrink-0">
            <RefreshCw className={`h-4 w-4 ${status === 'refreshing' ? 'animate-spin' : ''}`} />
            Kiểm tra lại
          </button>
        </div>

        <div
          className={`mt-5 flex items-start gap-2.5 rounded-md border p-4 ${
            aiConfigured ? 'border-emerald-200 bg-emerald-50/60' : 'border-ink-200 bg-ink-50/60'
          }`}
        >
          {aiConfigured ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
          )}
          <div>
            <p className={`text-sm font-bold ${aiConfigured ? 'text-emerald-800' : 'text-ink-800'}`}>
              {aiConfigured ? 'Nhận xét do AI trực tiếp tạo' : 'Đang dùng bộ quy tắc dự phòng'}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${aiConfigured ? 'text-emerald-700' : 'text-ink-500'}`}>
              {aiConfigured
                ? 'Nhận xét được tạo từ dữ liệu kiểm tra thực tế và luôn được ghi rõ nguồn gốc.'
                : 'Nhận xét vẫn được tạo từ chính kết quả chấm điểm thực tế và được ghi rõ là dự phòng, không trình bày như AI trực tiếp.'}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
            <Server className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink-900">Giới hạn hệ thống</h2>
            <p className="mt-0.5 text-xs text-ink-500">Áp dụng cho các lần phân tích qua WEBCHECK AI.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {backendStats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-ink-100 bg-ink-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-400">{stat.label}</p>
              <p className="mt-1 text-sm font-bold text-ink-800 tabular">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card border-rose-200 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink-900">Xóa toàn bộ lịch sử</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                Xóa {records.length} bản ghi khỏi localStorage. Không ảnh hưởng tới cấu hình backend.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={records.length === 0}
            className="btn-danger btn-sm shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            Xóa lịch sử
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClearAll}
        title="Xóa toàn bộ lịch sử?"
        description={`Bạn sắp xóa ${records.length} bản ghi phân tích khỏi localStorage. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa toàn bộ"
      />
    </div>
  );
}
