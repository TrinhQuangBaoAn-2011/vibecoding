import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Search } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="relative">
        <p className="bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-400 bg-clip-text text-[92px] font-extrabold leading-none tracking-tighter text-transparent sm:text-[128px]">
          404
        </p>
        <span className="absolute -right-6 bottom-6 flex h-12 w-12 rotate-6 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-lift ring-1 ring-ink-200">
          <Compass className="h-6 w-6" />
        </span>
      </div>
      <h1 className="mt-2 text-xl font-bold text-ink-900 sm:text-2xl">Không tìm thấy trang này</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        Đường dẫn có thể đã thay đổi hoặc bản ghi lịch sử đã bị xóa. Hãy quay về tổng quan hoặc bắt đầu
        một lần phân tích mới.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn-primary">
          <ArrowLeft className="h-4 w-4" />
          Về tổng quan
        </Link>
        <Link to="/analyze" className="btn-secondary">
          <Search className="h-4 w-4" />
          Phân tích website
        </Link>
      </div>
    </div>
  );
}
