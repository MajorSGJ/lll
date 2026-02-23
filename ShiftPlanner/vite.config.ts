import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 57,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 57,
    strictPort: true,
    allowedHosts: ['shiftplanner.onehost.site', 'localhost', '127.0.0.1'],
  },
})
