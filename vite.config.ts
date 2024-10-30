import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 9000,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@/config': path.resolve(__dirname, './src/app/config'),
      '@/constant': path.resolve(__dirname, './src/app/constant'),
      '@/context': path.resolve(__dirname, './src/app/context'),
      '@/core': path.resolve(__dirname, './src/app/core'),
      '@/helpers': path.resolve(__dirname, './src/app/helpers'),
      '@/models': path.resolve(__dirname, './src/app/models'),
      '@/services': path.resolve(__dirname, './src/app/services'),
      '@/store': path.resolve(__dirname, './src/app/store'),
      '@/views': path.resolve(__dirname, './src/app/views'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
