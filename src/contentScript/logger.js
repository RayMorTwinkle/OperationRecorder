/**
 * Content Script 上下文专用日志记录器
 */
import { createLogger, LOG_LEVELS, CONTEXT_TYPES } from '../utils/logger.js'

// 创建 content script 专用日志记录器
export const logger = createLogger('contentScript', {
  context: CONTEXT_TYPES.CONTENT_SCRIPT,
  level: process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO,
  enablePersist: false, // content script 可以不持久化，交给 background
  enableCollect: true, // 收集日志到 background
})

export default logger
