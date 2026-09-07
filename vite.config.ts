import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves this app from /Access-Energy/ rather than /
    base: process.env.GITHUB_ACTIONS === 'true' ? '/Access-Energy/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Always ignore the local data/ folder: the backend writes data/database.json on
      // every save (local cache / offline fallback for Supabase). Without this, Vite's
      // watcher sees that write and forces a full browser reload — which looks like the
      // app "refreshing back to the dashboard" every time you create/save a Devis, BL or
      // Facture.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : { ignored: ['**/data/**'] },
    },
  };
});
