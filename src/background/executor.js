/**
 * 执行引擎
 * 负责在后台执行自动化脚本
 */

import { ACTION_TYPES, EXECUTION_STATUS, RETRY_CONFIG } from '../render/types/actions.js'
import * as storage from './storage.js'
import * as idb from '../render/utils/idb.js'

class ExecutionEngine {
  constructor() {
    this.status = EXECUTION_STATUS.IDLE
    this.currentScript = null
    this.currentActionIndex = 0
    this.variables = {}
    this.log = null
    this.isPaused = false
    this.isStopped = false
    this.tabId = null
  }

  /**
   * 执行脚本
   * @param {string} scriptId - 脚本 ID
   * @param {Object} options - 执行选项
   * @returns {Promise<Object>} 执行结果
   */
  async execute(scriptId, options = {}) {
    if (this.status === EXECUTION_STATUS.RUNNING) {
      throw new Error('已有脚本正在执行')
    }

    const script = await storage.getScript(scriptId)
    if (!script) {
      throw new Error('脚本不存在')
    }

    this.currentScript = script
    this.currentActionIndex = 0
    this.variables = {}
    this.isPaused = false
    this.isStopped = false
    this.tabId = options.tabId

    // 创建执行日志
    this.log = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scriptId,
      scriptName: script.name,
      startTime: Date.now(),
      status: EXECUTION_STATUS.RUNNING,
      actions: [],
      error: null,
    }

    this.status = EXECUTION_STATUS.RUNNING

    try {
      // 执行每个动作
      for (let i = 0; i < script.actions.length; i++) {
        if (this.isStopped) {
          this.log.status = EXECUTION_STATUS.FAILED
          this.log.error = '用户停止执行'
          break
        }

        // 等待暂停恢复
        while (this.isPaused) {
          await this.sleep(100)
        }

        this.currentActionIndex = i
        const action = script.actions[i]

        const actionResult = await this.executeAction(action, options)
        this.log.actions.push(actionResult)

        if (!actionResult.success) {
          this.log.status = EXECUTION_STATUS.FAILED
          this.log.error = actionResult.error
          break
        }
      }

      if (this.log.status !== EXECUTION_STATUS.FAILED) {
        this.log.status = EXECUTION_STATUS.SUCCESS
      }
    } catch (error) {
      this.log.status = EXECUTION_STATUS.FAILED
      this.log.error = error.message
    } finally {
      this.log.endTime = Date.now()
      this.log.duration = this.log.endTime - this.log.startTime
      this.status =
        this.log.status === EXECUTION_STATUS.SUCCESS
          ? EXECUTION_STATUS.SUCCESS
          : EXECUTION_STATUS.FAILED

      // 保存日志
      await storage.addLog(this.log)

      // 更新脚本最后执行时间
      script.lastExecutionTime = Date.now()
      await storage.saveScript(script)
    }

    return {
      success: this.log.status === EXECUTION_STATUS.SUCCESS,
      log: this.log,
    }
  }

  /**
   * 执行单个动作
   * @param {Object} action - 动作对象
   * @param {Object} options - 执行选项
   * @returns {Promise<Object>} 动作执行结果
   */
  async executeAction(action, options = {}) {
    const { type, params } = action
    const startTime = Date.now()

    const actionLog = {
      actionId: action.id,
      type,
      params,
      startTime,
      endTime: null,
      success: false,
      error: null,
      retries: 0,
    }

    try {
      // 获取目标标签页
      let targetTabId = this.tabId
      if (!targetTabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        targetTabId = tab?.id
      }

      if (!targetTabId) {
        throw new Error('无法获取目标标签页')
      }

      // 重试机制
      let lastError = null
      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
          actionLog.retries = attempt

          const result = await this.performAction(type, params, targetTabId)

          actionLog.success = true
          actionLog.result = result
          actionLog.endTime = Date.now()

          return actionLog
        } catch (error) {
          lastError = error

          if (attempt < RETRY_CONFIG.maxRetries) {
            // 等待后重试
            const delay =
              RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt)
            await this.sleep(delay)
          }
        }
      }

      // 所有重试都失败了
      throw lastError || new Error('动作执行失败')
    } catch (error) {
      actionLog.success = false
      actionLog.error = error.message
      actionLog.endTime = Date.now()
      return actionLog
    }
  }

  /**
   * 执行具体动作
   * @param {string} type - 动作类型
   * @param {Object} params - 动作参数
   * @param {number} tabId - 标签页 ID
   * @returns {Promise<any>}
   */
  async performAction(type, params, tabId) {
    switch (type) {
      case ACTION_TYPES.NAVIGATE:
        await chrome.tabs.update(tabId, { url: params.url })
        // 等待页面加载
        await this.waitForTabLoad(tabId)
        return { url: params.url }

      case ACTION_TYPES.CLICK:
      case ACTION_TYPES.INPUT:
      case ACTION_TYPES.WAIT:
      case ACTION_TYPES.SCROLL:
      case ACTION_TYPES.SELECT:
      case ACTION_TYPES.KEYPRESS:
      case ACTION_TYPES.HOVER:
        // 这些动作在 content script 中执行
        return await this.executeInContentScript(tabId, { type, params })

      case ACTION_TYPES.EXTRACT:
        const result = await this.executeInContentScript(tabId, { type, params })
        // 保存到变量
        if (result && params.variable) {
          this.variables[params.variable] = result.value
        }
        return result

      case ACTION_TYPES.IF:
        // 条件判断
        const conditionMet = await this.evaluateCondition(params, tabId)
        return { conditionMet }

      default:
        throw new Error(`未知的动作类型: ${type}`)
    }
  }

  /**
   * 在 Content Script 中执行动作
   * @param {number} tabId - 标签页 ID
   * @param {Object} action - 动作对象
   * @returns {Promise<any>}
   */
  async executeInContentScript(tabId, action) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          type: 'EXECUTE_ACTION',
          action,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else if (response?.success) {
            resolve(response.data)
          } else {
            reject(new Error(response?.message || '执行失败'))
          }
        },
      )
    })
  }

  /**
   * 评估条件
   * @param {Object} params - 条件参数
   * @param {number} tabId - 标签页 ID
   * @returns {Promise<boolean>}
   */
  async evaluateCondition(params, tabId) {
    const { conditionType, selector, text, variable, value } = params

    switch (conditionType) {
      case 'element_exists':
        try {
          await this.executeInContentScript(tabId, {
            type: 'WAIT',
            params: { type: 'element', target: selector, timeout: 5000 },
          })
          return true
        } catch {
          return false
        }

      case 'element_not_exists':
        try {
          await this.executeInContentScript(tabId, {
            type: 'WAIT',
            params: { type: 'element', target: selector, timeout: 5000 },
          })
          return false
        } catch {
          return true
        }

      case 'variable_equals':
        return this.variables[variable] === value

      case 'variable_contains':
        const varValue = this.variables[variable]
        return typeof varValue === 'string' && varValue.includes(value)

      default:
        return false
    }
  }

  /**
   * 等待标签页加载完成
   * @param {number} tabId - 标签页 ID
   * @returns {Promise<void>}
   */
  async waitForTabLoad(tabId) {
    return new Promise((resolve) => {
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          // 额外等待一下确保页面脚本已加载
          setTimeout(resolve, 500)
        }
      }

      chrome.tabs.onUpdated.addListener(listener)

      // 超时处理
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, 30000)
    })
  }

  /**
   * 暂停执行
   */
  pause() {
    this.isPaused = true
  }

  /**
   * 恢复执行
   */
  resume() {
    this.isPaused = false
  }

  /**
   * 停止执行
   */
  stop() {
    this.isStopped = true
  }

  /**
   * 获取执行状态
   */
  getStatus() {
    return {
      status: this.status,
      scriptId: this.currentScript?.id,
      currentActionIndex: this.currentActionIndex,
      totalActions: this.currentScript?.actions?.length || 0,
      isPaused: this.isPaused,
    }
  }

  /**
   * 等待
   * @param {number} ms - 毫秒
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// 创建单例
let executorInstance = null

export function getExecutor() {
  if (!executorInstance) {
    executorInstance = new ExecutionEngine()
  }
  return executorInstance
}

export function createExecutor() {
  executorInstance = new ExecutionEngine()
  return executorInstance
}

export default ExecutionEngine
