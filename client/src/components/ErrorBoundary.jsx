import { Component } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[WEBCHECK AI] Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-ink-200 bg-white p-6 shadow-lift sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-ink-900">Giao diện gặp lỗi không mong muốn</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                Dữ liệu phân tích và lịch sử vẫn được giữ trong trình duyệt. Hãy tải lại trang để tiếp
                tục. Nếu lỗi lặp lại, kiểm tra console để xem chi tiết kỹ thuật.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-ink-200 bg-ink-50 px-3.5 py-3">
            <p className="break-words font-mono text-[11px] leading-relaxed text-ink-600">
              {this.state.error?.message || 'Unknown UI error'}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              <RefreshCw className="h-4 w-4" />
              Tải lại trang
            </button>
            <a href="/" className="btn-secondary">
              Về trang tổng quan
            </a>
          </div>

          <p className="mt-5 flex items-center gap-1.5 text-[11px] text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            WEBCHECK AI · Lỗi được ghi log cục bộ, không gửi dữ liệu ra ngoài.
          </p>
        </div>
      </div>
    );
  }
}
