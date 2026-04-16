/**
 * 统一的消息类型定义
 * 用于 background、contentScript、popup 等模块间的通信
 */

// 消息类型常量
export const MESSAGE_TYPES = {
  // 计数相关
  COUNT: 'COUNT',

  // 界面操作
  OPEN_SIDEPANEL: 'OPEN_SIDEPANEL',
  TOGGLE_OPTIONS: 'TOGGLE_OPTIONS',
  OPEN_POPUP: 'OPEN_POPUP',

  // 文章发布相关
  PUBLISH_ARTICLE: '发布文章',

  // 测试相关
  TEST: '测试',

  // ContentScript 状态
  CONTENT_SCRIPT_READY: 'contentScriptReady',

  // 数据管理
  EXPORT_ALL_DATA: 'EXPORT_ALL_DATA',
  IMPORT_ALL_DATA: 'IMPORT_ALL_DATA',
  CLEAR_ALL_DATA: 'CLEAR_ALL_DATA',

  // 脚本管理
  GET_SCRIPTS: 'GET_SCRIPTS',
  SAVE_SCRIPT: 'SAVE_SCRIPT',
  DELETE_SCRIPT: 'DELETE_SCRIPT',
  GET_SCRIPT: 'GET_SCRIPT',

  // 日志管理
  GET_LOGS: 'GET_LOGS',
  ADD_LOG: 'ADD_LOG',
  CLEAR_LOGS: 'CLEAR_LOGS',

  // 设置管理
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
}

// PostMessage 消息类型
export const POST_MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
}

// 响应状态
export const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
}

/**
 * 创建标准化的消息对象
 * @param {string} type - 消息类型
 * @param {any} data - 消息数据
 * @param {string} source - 消息来源
 * @returns {object} 标准化的消息对象
 */
export function createMessage(type, data = null, source = 'unknown') {
  return {
    type,
    data,
    source,
    timestamp: Date.now(),
  }
}

/**
 * 创建标准化的响应对象
 * @param {boolean} success - 是否成功
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @param {string} traceId - 追踪ID
 * @returns {object} 标准化的响应对象
 */
export function createResponse(success, data = null, message = '', traceId = null) {
  return {
    success,
    data,
    message,
    traceId,
    timestamp: Date.now(),
  }
}

/**
 * 创建 PostMessage 请求对象
 * @param {string} action - 动作类型
 * @param {any} data - 请求数据
 * @param {string} traceId - 追踪ID
 * @returns {object} PostMessage 请求对象
 */
export function createPostMessageRequest(action, data = null, traceId = null) {
  return {
    type: POST_MESSAGE_TYPES.REQUEST,
    action,
    data,
    traceId: traceId || `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  }
}

/**
 * 创建 PostMessage 响应对象
 * @param {string} traceId - 追踪ID
 * @param {boolean} success - 是否成功
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {object} PostMessage 响应对象
 */
export function createPostMessageResponse(traceId, success, data = null, message = '') {
  return {
    type: POST_MESSAGE_TYPES.RESPONSE,
    traceId,
    success,
    data,
    message,
    timestamp: Date.now(),
  }
}
