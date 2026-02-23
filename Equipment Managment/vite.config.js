import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
        compact: true,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  esbuild: {
    drop: ['debugger'],
    legalComments: 'none',
  },
  server: {
    host: '127.0.0.1',
    port: 59,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 59,
    strictPort: true,
    allowedHosts: ['em.onehost.site', 'localhost', '127.0.0.1'],
  },
});
