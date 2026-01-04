import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: './src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/shared': resolve(__dirname, './src/shared'),
      '@/client': resolve(__dirname, './src/client')
    }
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002'
    }
  }
})