import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
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
window.__squiggle = Object.freeze({ MODES, POOLS, fingerprint, logScore });

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
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      /* Tell the player when a new build is waiting, instead of leaving them on
         an old one until they happen to close every tab. The worker calls
         skipWaiting, so the update is ready the moment it installs; all this
         does is offer the reload rather than yanking the page from under a run
         in progress. */
      const offerReload = () => {
        if (document.querySelector('.swtoast')) return;
        const el = document.createElement('div');
        el.className = 'swtoast';
        el.setAttribute('role', 'status');
        el.innerHTML = '<span>A new version is ready.</span>';
        const go = document.createElement('button');
        go.type = 'button';
        go.textContent = 'Reload';
        go.addEventListener('click', () => location.reload());
        el.appendChild(go);
        document.body.appendChild(el);
      };

      reg.addEventListener('updatefound', () => {
        const fresh = reg.installing;
        if (!fresh) return;
        fresh.addEventListener('statechange', () => {
          // controller === null means this is the FIRST install, not an update.
          if (fresh.state === 'installed' && navigator.serviceWorker.controller) offerReload();
        });
      });
    } catch { /* offline is optional */ }
  });
}
