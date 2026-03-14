import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isNativeMode = mode === 'native'

  return {
    plugins: [vue()],
    resolve: {
      alias: isNativeMode
        ? [
            {
              // In native mode, hard-disable web sql.js fallback module.
              find: /^\.\/webDatabase$/,
              replacement: path.resolve(__dirname, 'src/db/webDatabase.native-disabled.ts'),
            },
          ]
        : [],
    },
    optimizeDeps: {
      include: ['sql.js'],
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            echarts: ['echarts'],
            xlsx: ['xlsx'],
          },
        },
      },
    },
  }
})
