/** Vite build for the static CTL2 GitHub Pages playground. */
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./playground', import.meta.url)),
  base: '/ctl2/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./site-dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: true
  }
});
