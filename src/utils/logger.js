/**
 * 统一日志管理系统
 * 适用于 background、contentScript、popup、options、sidepanel 等所有上下文
 *
 * 功能特性：
 * - 自动识别运行上下文
 * - 统一的日志格式（时间戳、等级、上下文、消息）
 * - 日志等级控制（TRACE/DEBUG/INFO/WARN/ERROR/SILENT）
 * - 开发/生产环境自动适配
 * - 支持日志持久化到 chrome.storage
 * - 支持日志收集到 background（可选）
 */

import log from 'loglevel'

// 日志等级枚举
export const LOG_LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SILENT: 'silent',
}

// 上下文类型枚举
export const CONTEXT_TYPES = {
  BACKGROUND: 'background',
  CONTENT_SCRIPT: 'contentScript',
  POPUP: 'popup',
  OPTIONS: 'options',
  SIDEPANEL: 'sidepanel',
  DEVTOOLS: 'devtools',
  NEWTAB: 'newtab',
  UNKNOWN: 'unknown',
}

// 日志配置键
const STORAGE_KEY = 'logger_config'

/**
 * 检测当前运行上下文
 * @returns {string} 上下文类型
 */
function detectContext() {
  if (typeof window === 'undefined') {
    return CONTEXT_TYPES.BACKGROUND
  }

  // 通过路径检测
  const path = window.location?.pathname || ''
  if (path.includes('popup.html')) return CONTEXT_TYPES.POPUP
  if (path.includes('options.html')) return CONTEXT_TYPES.OPTIONS
  if (path.includes('sidepanel.html')) return CONTEXT_TYPES.SIDEPANEL
  if (path.includes('devtools.html')) return CONTEXT_TYPES.DEVTOOLS
  if (path.includes('newtab.html')) return CONTEXT_TYPES.NEWTAB

  // 通过 chrome API 检测
  if (window.location?.protocol === 'chrome-extension:') {
    return CONTEXT_TYPES.UNKNOWN
  }

  // 如果有 chrome.runtime 但不是扩展页面，可能是 content script
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    return CONTEXT_TYPES.CONTENT_SCRIPT
  }

  return CONTEXT_TYPES.UNKNOWN
}

/**
 * 格式化时间戳
 * @returns {string} 格式化的时间字符串
 */
function formatTimestamp() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * 获取日志等级颜色（用于控制台）
 * @param {string} level - 日志等级
 * @returns {string} CSS 颜色
 */
function getLevelColor(level) {
  const colors = {
    [LOG_LEVELS.TRACE]: '#999',
    [LOG_LEVELS.DEBUG]: '#0ea5e9',
    [LOG_LEVELS.INFO]: '#10b981',
    [LOG_LEVELS.WARN]: '#f59e0b',
    [LOG_LEVELS.ERROR]: '#ef4444',
  }
  return colors[level] || '#666'
}

/**
 * 获取上下文颜色
 * @param {string} context - 上下文类型
 * @returns {string} CSS 颜色
 */
function getContextColor(context) {
  const colors = {
    [CONTEXT_TYPES.BACKGROUND]: '#8b5cf6',
    [CONTEXT_TYPES.CONTENT_SCRIPT]: '#ec4899',
    [CONTEXT_TYPES.POPUP]: '#06b6d4',
    [CONTEXT_TYPES.OPTIONS]: '#f97316',
    [CONTEXT_TYPES.SIDEPANEL]: '#6366f1',
    [CONTEXT_TYPES.DEVTOOLS]: '#14b8a6',
    [CONTEXT_TYPES.NEWTAB]: '#a855f7',
  }
  return colors[context] || '#64748b'
}

/**
 * 创建日志记录器
 * @param {string} name - 日志记录器名称
 * @param {Object} options - 配置选项
 * @returns {Object} 日志记录器实例
 */
export function createLogger(name = 'app', options = {}) {
  const {
    context = detectContext(),
    level = process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO,
    enablePersist = false,
    enableCollect = false,
  } = options

  // 创建 loglevel 实例
  const logger = log.getLogger(name)

  // 设置日志等级
  logger.setLevel(level)

  // 保存原始方法
  const originalFactory = logger.methodFactory

  // 自定义日志输出格式
  logger.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName)

    return function (...args) {
      const timestamp = formatTimestamp()
      const levelColor = getLevelColor(methodName)
      const contextColor = getContextColor(context)

      // 格式化的日志前缀
      const prefix = [
        `%c[${timestamp}]%c`,
        `%c[${methodName.toUpperCase()}]%c`,
        `%c[${context}]%c`,
        loggerName !== 'app' ? `%c[${loggerName}]%c` : '',
      ]
        .filter(Boolean)
        .join(' ')

      const styles = [
        'color: #999',
        '',
        `color: ${levelColor}; font-weight: bold`,
        '',
        `color: ${contextColor}; font-weight: bold`,
        '',
      ]

      if (loggerName !== 'app') {
        styles.push('color: #666', '')
      }

      // 输出日志
      rawMethod.apply(undefined, [prefix, ...styles, ...args])

      // 持久化日志（如果启用）
      if (enablePersist) {
        persistLog(methodName, context, loggerName, args)
      }

      // 收集日志到 background（如果启用且不在 background 中）
      if (enableCollect && context !== CONTEXT_TYPES.BACKGROUND) {
        collectLog(methodName, context, loggerName, args)
      }
    }
  }

  // 重新设置等级以应用自定义格式
  logger.setLevel(logger.getLevel())

  // 添加额外的辅助方法
  logger.context = context
  logger.name = name

  /**
   * 设置日志等级
   * @param {string} level - 日志等级
   */
  logger.setLogLevel = function (newLevel) {
    logger.setLevel(newLevel)
    if (enablePersist) {
      saveConfig({ level: newLevel })
    }
  }

  /**
   * 获取当前配置
   * @returns {Object} 配置对象
   */
  logger.getConfig = function () {
    return {
      name,
      context,
      level: logger.getLevel(),
      enablePersist,
      enableCollect,
    }
  }

  // 从存储中恢复配置（如果启用持久化）
  if (enablePersist) {
    restoreConfig(logger)
  }

  return logger
}

/**
 * 持久化日志到 chrome.storage
 * @param {string} level - 日志等级
 * @param {string} context - 上下文
 * @param {string} name - 日志记录器名称
 * @param {Array} args - 日志参数
 */
async function persistLog(level, context, name, args) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return

    const logEntry = {
      timestamp: Date.now(),
      level,
      context,
      name,
      message: args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' '),
    }

    // 获取现有日志
    const result = await chrome.storage.local.get(['logs'])
    const logs = result.logs || []

    // 添加新日志（保留最近 1000 条）
    logs.push(logEntry)
    if (logs.length > 1000) {
      logs.shift()
    }

    // 保存日志
    await chrome.storage.local.set({ logs })
  } catch (err) {
    console.error('Failed to persist log:', err)
  }
}

/**
 * 收集日志到 background
 * @param {string} level - 日志等级
 * @param {string} context - 上下文
 * @param {string} name - 日志记录器名称
 * @param {Array} args - 日志参数
 */
function collectLog(level, context, name, args) {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime) return

    chrome.runtime
      .sendMessage({
        type: 'LOG_COLLECT',
        log: {
          timestamp: Date.now(),
          level,
          context,
          name,
          message: args,
        },
      })
      .catch(() => {
        // 忽略错误（background 可能未监听）
      })
  } catch {
    // 忽略错误
  }
}

/**
 * 保存配置到 chrome.storage
 * @param {Object} config - 配置对象
 */
async function saveConfig(config) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return
    await chrome.storage.local.set({ [STORAGE_KEY]: config })
  } catch (err) {
    console.error('Failed to save logger config:', err)
  }
}

/**
 * 从 chrome.storage 恢复配置
 * @param {Object} logger - 日志记录器实例
 */
async function restoreConfig(logger) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return

    const result = await chrome.storage.local.get([STORAGE_KEY])
    const config = result[STORAGE_KEY]

    if (config?.level) {
      logger.setLevel(config.level)
    }
  } catch (err) {
    console.error('Failed to restore logger config:', err)
  }
}

/**
 * 获取持久化的日志
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 日志列表
 */
export async function getLogs(options = {}) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return []

    const result = await chrome.storage.local.get(['logs'])
    let logs = result.logs || []

    // 过滤日志
    if (options.level) {
      logs = logs.filter((log) => log.level === options.level)
    }
    if (options.context) {
      logs = logs.filter((log) => log.context === options.context)
    }
    if (options.startTime) {
      logs = logs.filter((log) => log.timestamp >= options.startTime)
    }
    if (options.endTime) {
      logs = logs.filter((log) => log.timestamp <= options.endTime)
    }

    // 限制数量
    if (options.limit) {
      logs = logs.slice(-options.limit)
    }

    return logs
  } catch (err) {
    console.error('Failed to get logs:', err)
    return []
  }
}

/**
 * 清除持久化的日志
 * @returns {Promise<boolean>} 是否成功
 */
export async function clearLogs() {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return false
    await chrome.storage.local.remove(['logs'])
    return true
  } catch (err) {
    console.error('Failed to clear logs:', err)
    return false
  }
}

// 创建默认日志记录器
export const logger = createLogger('app', {
  level: process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO,
  enablePersist: false,
  enableCollect: false,
})

// 导出默认实例
export default logger
