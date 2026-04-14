import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from '@vue/eslint-config-prettier'

export default [
  // JavaScript 推荐规则
  js.configs.recommended,

  // Vue 3 推荐规则
  ...pluginVue.configs['flat/recommended'],

  // Prettier 集成（必须放在最后）
  prettier,

  // 自定义规则
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // 浏览器全局变量
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',

        // Chrome 扩展 API
        chrome: 'readonly',

        // Node.js 环境变量
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // Vite 环境变量
        import: 'readonly',

        // 定时器
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',

        // 其他浏览器 API
        alert: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        KeyboardEvent: 'readonly',
        CustomEvent: 'readonly',
        MutationObserver: 'readonly',
        Node: 'readonly',
        indexedDB: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
      },
    },
    rules: {
      // Vue 规则
      'vue/multi-word-component-names': 'off', // 允许单个单词的组件名
      'vue/no-v-html': 'warn', // 警告使用 v-html
      'vue/require-default-prop': 'off', // 不强制要求默认 prop
      'vue/require-explicit-emits': 'off', // 不强制声明 emits
      'vue/attributes-order': 'off', // 不强制属性顺序（与实际使用冲突）
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always', // <img /> <br />
            normal: 'never', // <div></div>
            component: 'always', // <MyComponent />
          },
          svg: 'always',
          math: 'always',
        },
      ],

      // JavaScript 规则
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-catch': 'warn',

      // 代码风格（由 Prettier 处理，这里只保留必要的）
      semi: ['error', 'never'], // 不使用分号
      quotes: ['error', 'single', { avoidEscape: true }], // 使用单引号
      'comma-dangle': ['error', 'always-multiline'], // 多行时使用尾随逗号（与 Prettier 保持一致）
    },
  },

  // 忽略特定文件
  {
    ignores: [
      // 依赖
      'node_modules/**',
      'pnpm-lock.yaml',
      'package-lock.json',

      // 构建输出
      'build/**',
      'dist/**',
      '*.local',

      // 公共资源
      'public/**',

      // 日志
      'logs/**',
      '*.log',
      'npm-debug.log*',
      'pnpm-debug.log*',

      // 编辑器
      '.vscode/**',
      '.idea/**',
      '*.swp',
      '*.swo',
      '*~',

      // 系统文件
      '.DS_Store',
      'Thumbs.db',

      // 压缩文件
      '*.min.js',
      '*.bundle.js',

      // 特殊脚本
      'scripts/generate-logos.js', // Sharp 图片处理脚本
      'src/manifest.js', // 使用 import assertions 语法
    ],
  },
]
