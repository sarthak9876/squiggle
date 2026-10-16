import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/icons.css';
import './styles/home.css';
import './styles/game.css';
import './styles/shell.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { MODES, POOLS } from './modes/index.js';
import { fingerprint } from './lib/bias.js';
import { logScore } from './modes/contract.js';

// Read-only test surface over the REAL shipped modes, so the suite exercises what
// players run rather than a copy of it.
window.__hunch = Object.freeze({ MODES, POOLS, fingerprint, logScore });

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* TOP-LEVEL boundary. The one inside App sits below App's own render, so an
        error while App computed a child's props unmounted the entire tree and the
        player got a white page with no way back. */}
    <ErrorBoundary onReset={() => { history.replaceState({}, '', '/'); location.reload(); }}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register the service worker AFTER load so it never competes with first paint.
// Guarded on production: in dev it would cache the vite client and cause confusion.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline is optional */ });
  });
}
