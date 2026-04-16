import {
  MESSAGE_TYPES as MESSAGING_MESSAGE_TYPES,
  createResponse,
} from '../render/types/messages.js'
import { MESSAGE_TYPES as ACTION_MESSAGE_TYPES } from '../render/types/actions.js'
import { logger } from './logger.js'
import { getExecutor } from './executor.js'
import { getScheduler } from './scheduler.js'
import { getMCPServer } from './mcp-server.js'
import * as storage from './storage.js'

logger.info('🚀 Background 脚本已启动')

// 初始化核心模块
const executor = getExecutor()
const scheduler = getScheduler()
const mcpServer = getMCPServer()

// 初始化调度器
scheduler.init().catch((error) => {
  logger.error('调度器初始化失败:', error)
})

// 追踪打开的页面
let optionsTabId = null

/**
 * 统一的错误处理函数
 */
function handleError(error, context, sendResponse) {
  logger.error(`${context}错误:`, error)
  if (sendResponse) {
    sendResponse(createResponse(false, null, `${context}错误: ${error.message}`))
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('收到消息:', request)

  // 处理 OperationRecorder 相关消息
  handleOperationRecorderMessage(request, sender, sendResponse)

  // 处理原有的消息
  try {
    switch (request.type) {
      case MESSAGING_MESSAGE_TYPES.OPEN_SIDEPANEL:
        handleOpenSidepanel(sendResponse)
        return true

      case MESSAGING_MESSAGE_TYPES.TOGGLE_OPTIONS:
        handleToggleOptions(sendResponse)
        return true

      case MESSAGING_MESSAGE_TYPES.PUBLISH_ARTICLE:
        handlePublishArticle(request, sendResponse)
        return true

      default:
        // 未知消息类型，不处理
        break
    }
  } catch (error) {
    handleError(error, '消息处理', sendResponse)
  }

  return false
})

/**
 * 处理 OperationRecorder 消息
 */
async function handleOperationRecorderMessage(request, sender, sendResponse) {
  try {
    // 使用 MCP 服务器处理消息
    const result = await mcpServer.handleMessage(request)

    if (result !== null) {
      sendResponse(createResponse(true, result))
      return true
    }

    // 处理特定的后台消息
    switch (request.type) {
      case ACTION_MESSAGE_TYPES.EXECUTE_SCRIPT: {
        const execResult = await executor.execute(request.scriptId, { tabId: request.tabId })
        sendResponse(createResponse(execResult.success, execResult))
        return true
      }

      case 'EXPORT_ALL_DATA': {
        const exportData = await storage.exportAll()
        sendResponse(createResponse(true, exportData))
        return true
      }

      case 'IMPORT_ALL_DATA': {
        await storage.importAll(request.data)
        sendResponse(createResponse(true, null, '数据已导入'))
        return true
      }

      case 'CLEAR_ALL_DATA': {
        await storage.clear()
        sendResponse(createResponse(true, null, '数据已清空'))
        return true
      }

      default:
        return false
    }
  } catch (error) {
    logger.error('处理 OperationRecorder 消息失败:', error)
    sendResponse(createResponse(false, null, error.message))
    return true
  }
}

/**
 * 处理打开侧边栏
 */
function handleOpenSidepanel(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    try {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
        logger.info('侧边栏已打开', { tabId: tabs[0].id })
        sendResponse(createResponse(true, null, '侧边栏已打开'))
      } else {
        logger.warn('未找到活动标签页')
        sendResponse(createResponse(false, null, '未找到活动标签页'))
      }
    } catch (error) {
      handleError(error, '打开侧边栏', sendResponse)
    }
  })
}

/**
 * 处理切换设置页面
 */
function handleToggleOptions(sendResponse) {
  if (optionsTabId !== null) {
    chrome.tabs.get(optionsTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        openOptionsPage(sendResponse)
      } else {
        chrome.tabs.remove(optionsTabId, () => {
          logger.info('设置页面已关闭', { tabId: optionsTabId })
          optionsTabId = null
          sendResponse(createResponse(true, null, '设置页面已关闭'))
        })
      }
    })
  } else {
    openOptionsPage(sendResponse)
  }
}

/**
 * 打开设置页面
 */
function openOptionsPage(sendResponse) {
  chrome.runtime.openOptionsPage(() => {
    chrome.tabs.query(
      { url: chrome.runtime.getURL('src/render/views/options/options.html') },
      (tabs) => {
        if (tabs[0]) {
          optionsTabId = tabs[0].id
          logger.info('设置页面已打开', { tabId: optionsTabId })
        }
      },
    )
  })
  sendResponse(createResponse(true, null, '设置页面已打开'))
}

/**
 * 处理发布文章
 */
function handlePublishArticle(request, sendResponse) {
  const reqMessage = request.message
  logger.info('处理发布文章请求', { traceId: reqMessage?.traceId })

  if (reqMessage?.action === MESSAGING_MESSAGE_TYPES.PUBLISH_ARTICLE) {
    sendResponse(
      createResponse(true, reqMessage.data, '插件收到了发布文章请求，正在执行', reqMessage.traceId),
    )

    chrome.tabs.create(
      {
        url: 'https://mp.weixin.qq.com',
        active: true,
      },
      (tab) => {
        try {
          chrome.sidePanel.open({ tabId: tab.id })
          logger.info('已打开微信公众号页面并打开侧边栏', { tabId: tab.id })
        } catch (error) {
          logger.error('打开侧边栏失败:', error)
        }
      },
    )
  } else {
    logger.warn('未知的发布文章动作', { action: reqMessage?.action })
    sendResponse(
      createResponse(false, null, `未知的发布文章动作: ${reqMessage?.action}`, reqMessage?.traceId),
    )
  }
}

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === optionsTabId) {
    logger.info('设置页面标签已关闭', { tabId })
    optionsTabId = null
  }
})

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('扩展已安装/更新', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  })
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
})
