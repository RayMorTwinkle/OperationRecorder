import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(), // Tailwind/Windi CSS 兼容预设
    presetAttributify(), // 支持属性化模式
    presetIcons({
      scale: 1.2,
      warn: true,
    }), // 图标预设
    presetTypography(), // 排版预设
    presetWebFonts({
      fonts: {
        sans: 'Inter',
      },
    }), // 字体预设
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  shortcuts: {
    // 自定义快捷方式
  },
  rules: [
    // 隐藏滚动条但保留滚动功能
    ['scrollbar-hide', { '-ms-overflow-style': 'none', 'scrollbar-width': 'none' }],
    // 淡入动画
    [
      'animate-fade-in',
      {
        animation: 'fadeIn 0.3s ease-in',
      },
    ],
    // 动画持续时间
    [/^animate-duration-(\d+)$/, ([, d]) => ({ 'animation-duration': `${d}ms` })],
  ],
  // 添加动画关键帧
  preflights: [
    {
      getCSS: () => `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `,
    },
  ],
  theme: {
    colors: {
      // 可以自定义颜色
      primary: '#409EFF',
      success: '#67C23A',
      warning: '#E6A23C',
      danger: '#F56C6C',
      info: '#909399',
    },
  },
})
