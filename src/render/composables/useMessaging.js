/**
 * 消息通信相关的组合式函数
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { messaging, logger } from '../utils/index.js'
import { MESSAGE_TYPES, createMessage, createResponse } from '../types/messages.js'

/**
 * 使用消息监听的组合式函数
 * @param {Function} messageHandler - 消息处理函数
 * @returns {Object} 包含连接状态和操作方法的对象
 */
export function useMessageListener(messageHandler) {
  const isConnected = ref(false)
  const lastMessage = ref(null)
  const messageCount = ref(0)

  let listener = null

  const startListening = () => {
    if (listener) return

    listener = (request, sender, sendResponse) => {
      try {
        lastMessage.value = request
        messageCount.value++
        logger.debug('Received message:', request)

        if (messageHandler) {
          const result = messageHandler(request, sender, sendResponse)
          if (result instanceof Promise) {
            result.catch((error) => {
              logger.error('Message handler error:', error)
              sendResponse(createResponse(false, null, error.message))
            })
          }
        }
      } catch (error) {
        logger.error('Message listener error:', error)
        sendResponse(createResponse(false, null, error.message))
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    isConnected.value = true
    logger.info('Message listener started')
  }

  const stopListening = () => {
    if (listener) {
      chrome.runtime.onMessage.removeListener(listener)
      listener = null
      isConnected.value = false
      logger.info('Message listener stopped')
    }
  }

  onMounted(() => {
    startListening()
  })

  onUnmounted(() => {
    stopListening()
  })

  return {
    isConnected,
    lastMessage,
    messageCount,
    startListening,
    stopListening,
  }
}

/**
 * 使用消息发送的组合式函数
 * @returns {Object} 包含发送方法的对象
 */
export function useMessageSender() {
  const sending = ref(false)
  const lastError = ref(null)

  const sendMessage = async (type, data = {}) => {
    try {
      sending.value = true
      lastError.value = null

      const message = createMessage(type, data)
      const response = await messaging.sendToBackground(message)

      logger.debug('Message sent successfully:', { message, response })
      return response
    } catch (error) {
      lastError.value = error
      logger.error('Failed to send message:', error)
      throw error
    } finally {
      sending.value = false
    }
  }

  const sendToTab = async (tabId, type, data = {}) => {
    try {
      sending.value = true
      lastError.value = null

      const message = createMessage(type, data)
      const response = await messaging.sendToTab(tabId, message)

      logger.debug('Message sent to tab successfully:', { tabId, message, response })
      return response
    } catch (error) {
      lastError.value = error
      logger.error('Failed to send message to tab:', error)
      throw error
    } finally {
      sending.value = false
    }
  }

  const sendToActiveTab = async (type, data = {}) => {
    try {
      sending.value = true
      lastError.value = null

      const message = createMessage(type, data)
      const response = await messaging.sendToActiveTab(message)

      logger.debug('Message sent to active tab successfully:', { message, response })
      return response
    } catch (error) {
      lastError.value = error
      logger.error('Failed to send message to active tab:', error)
      throw error
    } finally {
      sending.value = false
    }
  }

  // 便捷方法
  const sendCount = (count) => sendMessage(MESSAGE_TYPES.COUNT, { count })
  const sendTest = (message = 'Test message') => sendMessage(MESSAGE_TYPES.TEST, { message })
  const openSidePanel = () => sendMessage(MESSAGE_TYPES.OPEN_SIDEPANEL)
  const publishArticle = (data) => sendMessage(MESSAGE_TYPES.PUBLISH_ARTICLE, data)

  return {
    sending,
    lastError,
    sendMessage,
    sendToTab,
    sendToActiveTab,
    sendCount,
    sendTest,
    openSidePanel,
    publishArticle,
  }
}

/**
 * 使用标签页操作的组合式函数
 * @returns {Object} 包含标签页操作方法的对象
 */
export function useTabs() {
  const currentTab = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const getCurrentTab = async () => {
    try {
      loading.value = true
      error.value = null

      const tab = await chrome.tabs.query({ active: true, currentWindow: true })
      currentTab.value = tab[0] || null

      logger.debug('Current tab retrieved:', currentTab.value)
      return currentTab.value
    } catch (err) {
      error.value = err
      logger.error('Failed to get current tab:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const createTab = async (url, options = {}) => {
    try {
      loading.value = true
      error.value = null

      const tab = await chrome.tabs.create({ url, ...options })

      logger.debug('Tab created:', tab)
      return tab
    } catch (err) {
      error.value = err
      logger.error('Failed to create tab:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const refreshCurrentTab = async () => {
    if (currentTab.value) {
      try {
        await chrome.tabs.reload(currentTab.value.id)
        logger.debug('Tab refreshed:', currentTab.value.id)
      } catch (err) {
        error.value = err
        logger.error('Failed to refresh tab:', err)
        throw err
      }
    }
  }

  return {
    currentTab,
    loading,
    error,
    getCurrentTab,
    createTab,
    refreshCurrentTab,
  }
}
