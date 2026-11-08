import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './index.css';

const container = document.getElementById('root');

createRoot(container).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
