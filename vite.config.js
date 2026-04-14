import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import manifest from './src/manifest.js'
import { resolve } from 'path'

// UnoCSS - 原子化CSS引擎
import UnoCSS from 'unocss/vite'
// unplugin-auto-import - 自动导入Vue和Naive UI的API，无需手动import
import AutoImport from 'unplugin-auto-import/vite'
// unplugin-vue-components - 自动导入Vue组件
import Components from 'unplugin-vue-components/vite'
// NaiveUiResolver - Naive UI的解析器，配合上面两个插件实现按需导入
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const production = mode === 'production'

  return {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/render'),
      },
    },
    build: {
      emptyOutDir: true,
      outDir: 'build',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/chunk-[hash].js',
        },
      },
    },
    plugins: [
      crx({ manifest }),
      vue(),
      // 引入UnoCSS
      UnoCSS(),
      // 自动导入Vue API
      AutoImport({
        imports: [
          'vue',
          {
            'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
          },
        ],
      }),
      // 自动导入Vue组件（包括Naive UI组件）
      Components({
        resolvers: [NaiveUiResolver()],
      }),
    ],
    legacy: {
      skipWebSocketTokenCheck: true,
    },
    server: !production
      ? {
          host: 'localhost',
          port: 5173,
          hmr: {
            host: 'localhost',
            port: 5173,
          },
        }
      : undefined,
  }
})
