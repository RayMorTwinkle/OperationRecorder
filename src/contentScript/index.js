import {
  MESSAGE_TYPES,
  POST_MESSAGE_TYPES,
  createPostMessageResponse,
} from '../render/types/messages.js'
import { logger } from './logger.js'
import { getRecorder } from './recorder.js'
import { getOverlay } from './overlay.js'

logger.info('🎬 Content Script 已启动', { url: window.location.href })

// 获取录制器和悬浮工具栏实例
const recorder = getRecorder()
const overlay = getOverlay()

/**
 * 验证消息来源是否安全（仅允许同源）
 * @param {string} origin - 消息来源
 * @returns {boolean} 是否安全
 */
function isOriginSafe(origin) {
  return origin === window.location.origin
}

/**
 * 发送响应消息到页面
 * @param {string} traceId - 追踪ID
 * @param {boolean} success - 是否成功
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @param {string} origin - 目标来源
 */
function sendResponse(traceId, success, data, message, origin) {
  logger.debug('发送响应到页面', { traceId, success, message })
  window.postMessage(createPostMessageResponse(traceId, success, data, message), origin)
}

// 通知页面 contentScript 已加载
window.postMessage(
  {
    type: MESSAGE_TYPES.CONTENT_SCRIPT_READY,
    message: '插件已准备就绪',
  },
  '*',
)
logger.info('已通知页面：Content Script 准备就绪')

// 监听来自页面的 postMessage 消息
window.addEventListener('message', async (event) => {
  // 验证消息来源安全性
  if (!isOriginSafe(event.origin)) {
    logger.warn('拒绝来自不安全来源的消息', { origin: event.origin })
    return
  }

  const message = event.data

  // 检查是否是我们要处理的消息格式
  if (message?.type !== POST_MESSAGE_TYPES.REQUEST) {
    return
  }

  logger.debug('收到页面消息', { action: message.action, traceId: message.traceId })

  try {
    switch (message.action) {
      case MESSAGE_TYPES.PUBLISH_ARTICLE:
        logger.info('处理发布文章请求，转发到 background', { traceId: message.traceId })
        // 转发到 background 脚本处理
        chrome.runtime.sendMessage(
          {
            type: MESSAGE_TYPES.PUBLISH_ARTICLE,
            message: message,
            source: 'contentScript',
          },
          (response) => {
            logger.debug('收到 background 响应', { response })
            sendResponse(
              message.traceId,
              response?.success || false,
              response?.data || null,
              response?.message || '处理完成',
              event.origin,
            )
          },
        )
        break

      default:
        logger.warn('未知的操作类型', { action: message.action })
        sendResponse(
          message.traceId,
          false,
          null,
          `未知的操作类型: ${message.action}`,
          event.origin,
        )
        break
    }
  } catch (error) {
    logger.error('处理消息时发生错误:', error)
    sendResponse(message.traceId, false, null, `处理消息时发生错误: ${error.message}`, event.origin)
  }
})

// ==================== 录制相关消息处理 ====================

/**
 * 处理来自 Background/Popup 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('Content Script 收到消息', { type: request.type })

  try {
    switch (request.type) {
      // 开始录制
      case MESSAGE_TYPES.START_RECORDING:
        logger.info('开始录制')
        overlay.show()
        sendResponse({
          success: true,
          message: '录制已开始',
          data: recorder.getStatus(),
        })
        break

      // 暂停录制
      case MESSAGE_TYPES.PAUSE_EXECUTION:
        logger.info('暂停录制')
        recorder.pause()
        sendResponse({
          success: true,
          message: '录制已暂停',
          data: recorder.getStatus(),
        })
        break

      // 恢复录制
      case MESSAGE_TYPES.RESUME_EXECUTION:
        logger.info('恢复录制')
        recorder.resume()
        sendResponse({
          success: true,
          message: '录制已恢复',
          data: recorder.getStatus(),
        })
        break

      // 停止录制
      case MESSAGE_TYPES.STOP_RECORDING: {
        logger.info('停止录制')
        const result = recorder.stop()
        overlay.hide()
        sendResponse({
          success: true,
          message: '录制已停止',
          data: result,
        })
        break
      }

      // 获取录制状态
      case 'GET_RECORDING_STATUS':
        sendResponse({
          success: true,
          data: recorder.getStatus(),
        })
        break

      // 获取录制的动作
      case 'GET_RECORDED_ACTIONS':
        sendResponse({
          success: true,
          data: recorder.getActions(),
        })
        break

      // 清空录制的动作
      case 'CLEAR_RECORDED_ACTIONS':
        recorder.clearActions()
        sendResponse({
          success: true,
          message: '录制的动作已清空',
        })
        break

      // 高亮元素（用于执行预览）
      case 'HIGHLIGHT_ELEMENT':
        if (request.selector) {
          const element = document.querySelector(request.selector)
          if (element) {
            highlightElement(element)
            sendResponse({ success: true, message: '元素已高亮' })
          } else {
            sendResponse({ success: false, message: '未找到元素' })
          }
        }
        break

      // 执行动作
      case 'EXECUTE_ACTION':
        executeAction(request.action)
          .then((result) => {
            sendResponse({ success: true, data: result })
          })
          .catch((error) => {
            sendResponse({ success: false, message: error.message })
          })
        return true // 异步响应

      default:
        // 不处理的消息，不发送响应
        break
    }
  } catch (error) {
    logger.error('处理消息时发生错误:', error)
    sendResponse({
      success: false,
      message: error.message,
    })
  }

  return true // 保持消息通道开放
})

/**
 * 高亮元素
 * @param {Element} element - DOM 元素
 */
function highlightElement(element) {
  // 移除已有的高亮
  removeHighlight()

  // 创建高亮层
  const highlight = document.createElement('div')
  highlight.id = 'operation-recorder-highlight'
  highlight.style.cssText = `
    position: fixed;
    background: rgba(255, 59, 48, 0.3);
    border: 2px solid #ff3b30;
    border-radius: 4px;
    pointer-events: none;
    z-index: 2147483646;
    transition: all 0.3s ease;
  `

  const rect = element.getBoundingClientRect()
  highlight.style.left = `${rect.left}px`
  highlight.style.top = `${rect.top}px`
  highlight.style.width = `${rect.width}px`
  highlight.style.height = `${rect.height}px`

  document.body.appendChild(highlight)

  // 3秒后自动移除
  setTimeout(removeHighlight, 3000)
}

/**
 * 移除高亮
 */
function removeHighlight() {
  const highlight = document.getElementById('operation-recorder-highlight')
  if (highlight) {
    highlight.remove()
  }
}

/**
 * 执行动作
 * @param {Object} action - 动作对象
 * @returns {Promise<any>}
 */
async function executeAction(action) {
  const { type, params } = action

  switch (type) {
    case 'navigate':
      window.location.href = params.url
      return { url: params.url }

    case 'click': {
      const clickElement = document.querySelector(params.selector)
      if (!clickElement) throw new Error(`未找到元素: ${params.selector}`)
      clickElement.click()
      return { selector: params.selector }
    }

    case 'input': {
      const inputElement = document.querySelector(params.selector)
      if (!inputElement) throw new Error(`未找到元素: ${params.selector}`)
      if (params.clearFirst) {
        inputElement.value = ''
      }
      inputElement.value = params.value
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
      inputElement.dispatchEvent(new Event('change', { bubbles: true }))
      return { selector: params.selector, value: params.value }
    }

    case 'wait':
      if (params.type === 'time') {
        await sleep(params.duration)
        return { duration: params.duration }
      } else if (params.type === 'element') {
        await waitForElement(params.target, params.timeout)
        return { selector: params.target }
      }
      break

    case 'scroll':
      window.scrollTo({
        left: params.x,
        top: params.y,
        behavior: params.behavior || 'smooth',
      })
      return { x: params.x, y: params.y }

    case 'select': {
      const selectElement = document.querySelector(params.selector)
      if (!selectElement) throw new Error(`未找到元素: ${params.selector}`)
      selectElement.value = params.value
      selectElement.dispatchEvent(new Event('change', { bubbles: true }))
      return { selector: params.selector, value: params.value }
    }

    case 'keypress': {
      const event = new KeyboardEvent('keydown', {
        key: params.key,
        ctrlKey: params.modifiers?.includes('Control'),
        shiftKey: params.modifiers?.includes('Shift'),
        altKey: params.modifiers?.includes('Alt'),
        metaKey: params.modifiers?.includes('Meta'),
        bubbles: true,
      })
      document.dispatchEvent(event)
      return { key: params.key }
    }

    default:
      throw new Error(`未知的动作类型: ${type}`)
  }
}

/**
 * 等待指定时间
 * @param {number} ms - 毫秒
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 等待元素出现
 * @param {string} selector - 选择器
 * @param {number} timeout - 超时时间
 * @returns {Promise<Element>}
 */
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (element) {
        observer.disconnect()
        clearTimeout(timeoutId)
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    const timeoutId = setTimeout(() => {
      observer.disconnect()
      reject(new Error(`等待元素超时: ${selector}`))
    }, timeout)
  })
}

// 监听录制完成事件
window.addEventListener('operation-recorder-finished', (event) => {
  logger.info('录制完成', event.detail)
})
