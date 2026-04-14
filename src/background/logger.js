/**
 * Background 上下文专用日志记录器
 */
import { createLogger, LOG_LEVELS, CONTEXT_TYPES } from '../utils/logger.js'

// 创建 background 专用日志记录器
export const logger = createLogger('background', {
  context: CONTEXT_TYPES.BACKGROUND,
  level: process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO,
  enablePersist: true, // 启用日志持久化
  enableCollect: false, // background 不需要收集到自己
})

// 可选：监听来自其他上下文的日志收集
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.type === 'LOG_COLLECT') {
    const { log } = request
    const context = log.context || 'unknown'
    const senderInfo = sender.tab ? `tab:${sender.tab.id}` : 'extension'

    // 使用 background logger 记录收集到的日志
    logger.debug(`[${context}] [${senderInfo}]`, ...log.message)
  }
})

export default logger
