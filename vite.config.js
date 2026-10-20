import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

/* The service worker's cache name was the hardcoded string 'squiggle-v2.0.0'.
   Its activate handler deletes every cache that is NOT the current name, so a
   name that never changes means old caches are never purged and a deploy relies
   entirely on the navigation request being network-first. One forgotten manual
   bump and launch-day fixes sit behind a stale cache.

   public/ is copied verbatim, so there is no define or token substitution to
   hook. Stamp it after the bundle exists, from the hash of the real entry
   bundle, so the name changes exactly when the code does — and not otherwise,
   which keeps repeat visits warm. */
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    closeBundle() {
      const out = resolve('dist');
      const html = readFileSync(resolve(out, 'index.html'), 'utf8');
      const entry = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? '';
      const build = createHash('sha256').update(entry).digest('hex').slice(0, 12);
      const swPath = resolve(out, 'sw.js');
      const sw = readFileSync(swPath, 'utf8');
      if (!sw.includes('__BUILD__')) {
        this.warn('sw.js has no __BUILD__ token — cache name will not change between deploys');
        return;
      }
      writeFileSync(swPath, sw.replaceAll('__BUILD__', build));
    },
  };
}

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  server: { port: 5173, open: true },
  build: {
    // Each game mode is its own chunk so the home page does not download eight
    // games it may never show. Matches the "lazy-load game modules" quality bar.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'motion';
          if (id.includes('node_modules/roughjs')) return 'rough';
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  }
});
