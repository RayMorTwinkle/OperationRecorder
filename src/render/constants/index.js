/**
 * 应用常量定义
 */

// 应用信息
export const APP_INFO = {
  NAME: 'Chrome Extension Template',
  VERSION: '1.0.0',
  DESCRIPTION: '基于 Vue 3 + Vite 的 Chrome 扩展模板',
  AUTHOR: 'create-chrome-ext',
}

// 存储键名
export const STORAGE_KEYS = {
  COUNT: 'count',
  SETTINGS: 'settings',
  USER_PREFERENCES: 'userPreferences',
  CACHE: 'cache',
  LOGS: 'logs',
}

// 默认配置
export const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'zh-CN',
  autoSave: true,
  notifications: true,
  debugMode: false,
}

// 主题配置
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
}

// 语言配置
export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
  JA_JP: 'ja-JP',
}

// 日志级别
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
}

// 页面类型
export const PAGE_TYPES = {
  POPUP: 'popup',
  OPTIONS: 'options',
  SIDEPANEL: 'sidepanel',
  DEVTOOLS: 'devtools',
  CONTENT_SCRIPT: 'contentScript',
  BACKGROUND: 'background',
}

// 权限列表
export const PERMISSIONS = {
  STORAGE: 'storage',
  TABS: 'tabs',
  ACTIVE_TAB: 'activeTab',
  COOKIES: 'cookies',
  SIDE_PANEL: 'sidePanel',
  SCRIPTING: 'scripting',
  HOST_PERMISSIONS: ['<all_urls>'],
}

// API 端点
export const API_ENDPOINTS = {
  BASE_URL: 'https://api.example.com',
  AUTH: '/auth',
  USER: '/user',
  DATA: '/data',
}

// 错误代码
export const ERROR_CODES = {
  UNKNOWN: 'UNKNOWN_ERROR',
  NETWORK: 'NETWORK_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  STORAGE: 'STORAGE_ERROR',
  TAB_NOT_FOUND: 'TAB_NOT_FOUND',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  TIMEOUT: 'TIMEOUT_ERROR',
}

// 错误消息
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNKNOWN]: '未知错误',
  [ERROR_CODES.NETWORK]: '网络连接错误',
  [ERROR_CODES.PERMISSION]: '权限不足',
  [ERROR_CODES.STORAGE]: '存储操作失败',
  [ERROR_CODES.TAB_NOT_FOUND]: '未找到指定标签页',
  [ERROR_CODES.INVALID_MESSAGE]: '无效的消息格式',
  [ERROR_CODES.TIMEOUT]: '操作超时',
}

// 时间常量（毫秒）
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
}

// 防抖/节流默认延迟
export const DEBOUNCE_DELAYS = {
  FAST: 100,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
}

// 缓存配置
export const CACHE_CONFIG = {
  DEFAULT_TTL: TIME_CONSTANTS.HOUR,
  MAX_SIZE: 100,
  CLEANUP_INTERVAL: TIME_CONSTANTS.MINUTE * 10,
}

// 正则表达式
export const REGEX_PATTERNS = {
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[1-9][\d]{0,15}$/,
  IP_ADDRESS:
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
}

// 文件类型
export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  VIDEO: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
  AUDIO: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz'],
}

// 浏览器信息
export const BROWSER_INFO = {
  CHROME: 'chrome',
  FIREFOX: 'firefox',
  EDGE: 'edge',
  SAFARI: 'safari',
  OPERA: 'opera',
}

// 操作系统信息
export const OS_INFO = {
  WINDOWS: 'windows',
  MAC: 'mac',
  LINUX: 'linux',
  ANDROID: 'android',
  IOS: 'ios',
}

// 快捷键配置
export const SHORTCUTS = {
  OPEN_POPUP: 'Ctrl+Shift+P',
  OPEN_SIDEPANEL: 'Ctrl+Shift+S',
  TOGGLE_FEATURE: 'Ctrl+Shift+T',
}

// 动画配置
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    LINEAR: 'linear',
  },
}

// 登录认证配置
export const AUTH_CONFIG = {
  // Storage 存储键名
  STORAGE_KEYS: {
    TOKEN: 'userToken',
    USER_INFO: 'userInfo',
    LOGIN_TIME: 'loginTime',
  },
  // API 端点（根据实际情况修改）
  API_ENDPOINTS: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    CHECK_AUTH: '/api/auth/check',
    REFRESH_TOKEN: '/api/auth/refresh',
  },
  // Token 过期时间（7天）
  TOKEN_EXPIRE_TIME: 7 * 24 * 60 * 60 * 1000,
  // 是否启用模拟登录（开发调试用）
  ENABLE_MOCK_LOGIN: true,
  // 模拟登录延迟（毫秒）
  MOCK_LOGIN_DELAY: 1000,
}

// 默认导出所有常量
export default {
  APP_INFO,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  THEMES,
  LANGUAGES,
  LOG_LEVELS,
  PAGE_TYPES,
  PERMISSIONS,
  API_ENDPOINTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  TIME_CONSTANTS,
  DEBOUNCE_DELAYS,
  CACHE_CONFIG,
  REGEX_PATTERNS,
  FILE_TYPES,
  BROWSER_INFO,
  OS_INFO,
  SHORTCUTS,
  ANIMATION_CONFIG,
  AUTH_CONFIG,
}
