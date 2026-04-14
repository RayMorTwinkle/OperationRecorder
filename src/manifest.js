import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json' with { type: 'json' }

const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'img/logo16.png',
    32: 'img/logo32.png',
    48: 'img/logo48.png',
    128: 'img/logo256.png',
  },
  action: {
    default_popup: 'src/render/views/popup/popup.html',
    default_icon: 'img/logo48.png',
  },
  options_page: 'src/render/views/options/options.html',
  devtools_page: 'src/render/views/devtools/devtools.html',
  background: {
    service_worker: 'src/background/index.js',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', 'file://*/*'],
      js: ['src/contentScript/index.js'],
    },
  ],
  side_panel: {
    default_path: 'src/render/views/sidepanel/sidepanel.html',
  },
  web_accessible_resources: [
    {
      resources: ['img/logo16.png', 'img/logo32.png', 'img/logo48.png', 'img/logo256.png'],
      matches: [],
    },
  ],

  // 授权
  permissions: [
    // 侧边栏
    'sidePanel',
    // 储存
    'storage',
    //  cookies
    'cookies',
    // 通知
    'notifications',
    // 标签页
    'tabs',
    // 剪切板复制、粘贴
    'clipboardWrite',
    'clipboardRead',
    // 浏览器标签页
    'scripting',
    // 声明式内容脚本
    'contentSettings',
    // 下载
    'downloads',
    // 后台脚本
    'background',
    // 闹钟
    'alarms',
    // 桌面捕获
    'desktopCapture',
    // 声明式网络请求
    'declarativeNetRequest',
    // DevTools 调试协议（用于 MCP）
    'debugger',
    // 历史记录（用于监听导航）
    'history',
    // 活跃标签页
    'activeTab',
  ],

  // 设置默认的浏览器新标签页
  // chrome_url_overrides: {
  //   newtab: 'newtab.html',
  // },
})
