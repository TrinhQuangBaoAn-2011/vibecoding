import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

// Bundle đã tải + chạy: gỡ màn hình chờ tĩnh của index.html (boot splash) và
// tắt bộ tự phục hồi "trang trắng" — mọi lỗi render về sau do ErrorBoundary nhận.
window.__wbDone?.();

const container = document.getElementById('root');

createRoot(container).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
