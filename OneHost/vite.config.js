import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 55,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 55,
    strictPort: true,
    allowedHosts: ['sklep.onehost.site', 'localhost', '127.0.0.1'],
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
  },
});
