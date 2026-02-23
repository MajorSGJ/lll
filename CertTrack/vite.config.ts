import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    target: 'es2020',
    minify: 'esbuild',
  },
  server: {
    host: '127.0.0.1',
    port: 61,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:62',
    },
  },
})
