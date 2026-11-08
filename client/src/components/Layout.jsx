import { useEffect, useState } from 'react';
import {
  Home,
  History,
  Info,
  Settings,
  Rocket,
  Menu,
  X,
  Shield,
  Sun,
  Moon,
  ListChecks,
} from 'lucide-react';
import { NavLink, Link, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', Icon: Home, end: true },
  { to: '/analyze', label: 'Phân tích', Icon: Rocket },
  { to: '/webcheck/', label: '60 tiêu chí', Icon: ListChecks },
  { to: '/history', label: 'Lịch sử', Icon: History },
  { to: '/about', label: 'Về WEBCHECK AI', Icon: Info },
  { to: '/settings', label: 'Cài đặt', Icon: Settings },
];

function navLinkClass(isActive) {
  return [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-brand-600 text-white shadow-lift'
      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  ].join(' ');
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');

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

  return (
    <div className="min-h-screen bg-ink-50 text-ink-800 dark:bg-ink-950 dark:text-ink-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/80 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="WEBCHECK AI - Trang chủ">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift">
              <Shield className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-xl">
              WEBCHECK<span className="text-brand-600 dark:text-brand-400"> AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/analyze"
              className="hidden rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-lift transition-colors hover:bg-brand-700 sm:inline-flex sm:items-center sm:gap-2"
            >
              <Rocket className="h-4 w-4" />
              Phân tích ngay
            </Link>
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
          } fixed top-16 bottom-0 left-0 z-20 w-64 overflow-y-auto border-r border-ink-200/80 bg-white p-3 dark:border-ink-800 dark:bg-ink-900 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:shrink-0`}
        >
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
            Điều hướng
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
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-ink-200/80 bg-ink-50 p-4 text-xs leading-relaxed text-ink-500 dark:border-ink-800 dark:bg-ink-800/50 dark:text-ink-300">
            <p className="font-bold text-ink-700 dark:text-ink-100">WEBCHECK AI</p>
            <p className="mt-1">
              Phân tích website thời gian thực: 10 tiêu chí SEO, báo cáo AI và danh sách kiểm tra
              22 hạng mục.
            </p>
          </div>
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
