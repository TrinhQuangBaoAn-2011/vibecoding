import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import { HealthProvider } from './context/HealthContext.jsx';
import { HistoryProvider } from './context/HistoryContext.jsx';
import { Layout } from './components/Layout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Analyze } from './pages/Analyze.jsx';
import { History } from './pages/History.jsx';
import { HistoryDetail } from './pages/HistoryDetail.jsx';
import { Settings } from './pages/Settings.jsx';
import { About } from './pages/About.jsx';
import { NotFound } from './pages/NotFound.jsx';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <HealthProvider>
          <HistoryProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="analyze" element={<Analyze />} />
                <Route path="history" element={<History />} />
                <Route path="history/:id" element={<HistoryDetail />} />
                <Route path="settings" element={<Settings />} />
                <Route path="about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HistoryProvider>
        </HealthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
