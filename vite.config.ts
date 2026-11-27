import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at the root of the custom domain recipes.ryangano.com (see public/CNAME).
export default defineConfig({
  base: '/',
  plugins: [react()],
});
