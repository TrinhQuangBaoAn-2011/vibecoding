import { useEffect, useState } from 'react';
import {
  History,
  Info,
  LayoutGrid,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Wifi,
  X,
} from 'lucide-react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useHealth } from '../context/HealthContext.jsx';
import { useHistory } from '../context/HistoryContext.jsx';

/* Sidebar theo thiết kế WEBCHECK AI: khối logo, nút "Phân tích URL mới",
 * nhóm "KHÔNG GIAN LÀM VIỆC" và thẻ trạng thái backend cuối sidebar. */
const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan', Icon: LayoutGrid, end: true },
  { to: '/analyze', label: 'Phân tích website', Icon: Search },
  { to: '/history', label: 'Lịch sử phân tích', Icon: History },
  { to: '/settings', label: 'Cài đặt', Icon: Settings },
  { to: '/about', label: 'Giới thiệu', Icon: Info },
];

const CRUMB_TITLES = [
  ['/history/', 'Lịch sử phân tích'],
  ['/history', 'Lịch sử phân tích'],
  ['/analyze', 'Phân tích website'],
  ['/settings', 'Cài đặt'],
  ['/about', 'Giới thiệu'],
];

function breadcrumbTitle(pathname) {
  const found = CRUMB_TITLES.find(([prefix]) => pathname === prefix || (prefix !== '/' && pathname.startsWith(prefix)));
  return found ? found[1] : 'Tổng quan';
}

function navLinkClass(isActive) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100'
      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  ].join(' ');
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const { pathname } = useLocation();
  const { records } = useHistory();
  const { health, status: healthStatus, refresh: refreshHealth, error: healthError } = useHealth();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const backendOnline = healthStatus === 'ok' || healthStatus === 'refreshing';
  const apiVersion = health?.version || '1.0.0';
  const aiLine = health?.ai?.mode === 'ai'
    ? `AI thật: ${health?.ai?.model || 'mô hình đã cấu hình'}`
    : 'AI dự phòng bằng bộ quy tắc minh bạch';
  const statusPill = healthStatus === 'loading'
    ? { text: 'Đang kiểm kết nối', dot: 'bg-amber-500', pillClass: 'bg-amber-50 text-amber-700 ring-amber-200' }
    : backendOnline
      ? { text: 'Hệ thống ổn định', dot: 'bg-emerald-500', pillClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
      : { text: 'Backend chưa kết nối', dot: 'bg-amber-500', pillClass: 'bg-amber-50 text-amber-700 ring-amber-200' };

  return (
    <div className="min-h-screen bg-ink-50 text-ink-800 dark:bg-ink-950 dark:text-ink-100">
      {/* Header: breadcrumb + trạng thái hệ thống */}
      <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label="WEBCHECK AI - Trang chủ">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift">
                <Shield className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
                WEBCHECK<span className="text-brand-600 dark:text-brand-400"> AI</span>
              </span>
            </Link>
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
              <Link to="/" className="font-semibold tracking-tight text-ink-400 transition-colors hover:text-ink-600 dark:text-ink-300">
                WEBCHECK AI
              </Link>
              <span className="text-ink-300 dark:text-ink-600">/</span>
              <span className="truncate font-bold text-ink-800 dark:text-ink-100">{breadcrumbTitle(pathname)}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshHealth()}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition-colors ${statusPill.pillClass}`}
              title={healthError ? `Chi tiết lỗi: ${healthError}` : 'Nhấn để làm mới trạng thái hệ thống'}
            >
              <span className={`h-2 w-2 rounded-full ${statusPill.dot}`} />
              {statusPill.text}
              <RefreshCw className={`ml-1 h-3.5 w-3.5 ${healthStatus === 'loading' || healthStatus === 'refreshing' ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl p-2 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
              aria-label="Chuyển giao diện sáng/tối"
            >
              {theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-xl p-2 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white lg:hidden"
              aria-label="Mở/đóng menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } fixed top-16 bottom-0 left-0 z-20 flex w-64 flex-col overflow-y-auto border-r border-ink-200/80 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:shrink-0`}
        >
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 border-b border-ink-100 pb-4 dark:border-ink-800"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift">
              <Shield className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-extrabold leading-tight tracking-tight text-ink-900 dark:text-white">
                WEBCHECK <span className="text-brand-600 dark:text-brand-400">AI</span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-ink-400">
                Website Intelligence
              </span>
            </span>
          </Link>

          <Link
            to="/analyze"
            onClick={() => setSidebarOpen(false)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lift transition hover:from-brand-700 hover:to-brand-600"
          >
            <Sparkles className="h-4 w-4" />
            Phân tích URL mới
          </Link>

          <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
            Không gian làm việc
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{label}</span>
                {to === '/history' && records?.length > 0 && (
                  <span className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
                    {records.length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-ink-200/80 bg-ink-50 p-4 dark:border-ink-800 dark:bg-ink-800/50">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold text-ink-800 dark:text-ink-100">
                <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {backendOnline ? 'Backend trực tuyến' : 'Backend chưa kết nối'}
              </span>
              <button
                type="button"
                onClick={() => refreshHealth()}
                className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700"
                aria-label="Làm mới trạng thái backend"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500 dark:text-ink-300">
              <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {aiLine}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-400">
              API v{apiVersion} · {backendOnline ? 'sẵn sàng' : 'chờ kết nối'}
            </p>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-400">
            <History className="h-3.5 w-3.5 shrink-0" />
            Lịch sử được lưu cục bộ trên trình duyệt
          </p>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-10 bg-ink-950/40 lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-ink-200/80 bg-white/70 py-4 text-center text-xs text-ink-400 dark:border-ink-800 dark:bg-ink-900/70">
        WEBCHECK AI · Phân tích website · Dữ liệu cục bộ trên trình duyệt · Bảo vệ SSRF
      </footer>
    </div>
  );
}
