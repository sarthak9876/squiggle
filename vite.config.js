import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
