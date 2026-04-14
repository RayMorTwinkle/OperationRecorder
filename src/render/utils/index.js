/**
 * 通用工具函数库
 */

// 导出日志工具
export { logger } from '../../utils/logger.js'

/**
 * Chrome Storage 操作
 */
export const storage = {
  get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        chrome.runtime.lastError
          ? reject(new Error(chrome.runtime.lastError.message))
          : resolve(result)
      })
    })
  },

  set(items) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(items, () => {
        chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve()
      })
    })
  },

  remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove(keys, () => {
        chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve()
      })
    })
  },
}

/**
 * Chrome 消息发送
 */
export const messaging = {
  sendToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        chrome.runtime.lastError
          ? reject(new Error(chrome.runtime.lastError.message))
          : resolve(response)
      })
    })
  },

  sendToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        chrome.runtime.lastError
          ? reject(new Error(chrome.runtime.lastError.message))
          : resolve(response)
      })
    })
  },
}
