import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const baseEnv = loadEnv(mode, process.cwd(), '')
  const extensionEnv = loadEnv('ext', process.cwd(), '')
  const env = {
    ...baseEnv,
    ...extensionEnv,
    ...process.env,
  }
  const isExtensionBuild = mode === 'ext' || env.VITE_APP_TYPE === 'EXTENSION'

  return {
    base: './',
    plugins: [react()],
    build: {
      outDir: isExtensionBuild ? 'dist_ext' : 'dist',
    },
    publicDir: isExtensionBuild ? 'public_ext' : 'public',
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    resolve: {
      alias: {
        '@/config': path.resolve(__dirname, './src/config'),
        '@/constant': path.resolve(__dirname, './src/app/constant'),
        '@/context': path.resolve(__dirname, './src/app/context'),
        '@/core': path.resolve(__dirname, './src/app/core'),
        '@/helpers': path.resolve(__dirname, './src/app/helpers'),
        '@/models': path.resolve(__dirname, './src/app/models'),
        '@/services': path.resolve(__dirname, './src/app/services'),
        '@/store': path.resolve(__dirname, './src/app/store'),
        '@/views': path.resolve(__dirname, './src/app/views'),
        '@style': path.resolve(__dirname, './src/style'),
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
