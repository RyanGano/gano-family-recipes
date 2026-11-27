import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at the root of the custom domain recipes.ryangano.com (see public/CNAME).
// Routes are plain paths (/recipe/<slug>); GitHub Pages answers unknown paths with
// 404.html, so ship a copy of index.html there and the app routes itself.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'spa-404-fallback',
      apply: 'build',
      enforce: 'post',
      generateBundle(_options, bundle) {
        const page = bundle['index.html'];
        if (page?.type !== 'asset') throw new Error('index.html missing from the bundle');
        this.emitFile({ type: 'asset', fileName: '404.html', source: page.source });
      },
    },
  ],
});
