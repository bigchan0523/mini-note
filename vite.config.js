import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = p => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('./web'),
  base: './',
  build: { outDir: here('./dist'), emptyOutDir: true, target: 'es2020', chunkSizeWarningLimit: 1200 },
  server: { port: 5180 },
});
