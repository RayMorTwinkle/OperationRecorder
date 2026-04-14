/**
 * MCP (Model Context Protocol) 服务器
 * 提供 JSON-RPC 2.0 接口供 AI 调用
 */

import { getExecutor } from './executor.js'
import * as storage from './storage.js'

class MCPServer {
  constructor(port = 9222) {
    this.port = port
    this.tools = this.registerTools()
    this.isRunning = false
    this.executor = getExecutor()
  }

  /**
   * 注册 MCP 工具
   */
  registerTools() {
    return [
      {
        name: 'list_scripts',
        description: '列出所有已保存的自动化脚本',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          const scripts = await storage.getScripts()
          return {
            scripts: Object.values(scripts).map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              actionCount: s.actions.length,
              lastExecutionTime: s.lastExecutionTime,
            })),
          }
        },
      },
      {
        name: 'get_script',
        description: '获取指定脚本的详细信息',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string', description: '脚本 ID' },
          },
          required: ['script_id'],
        },
        handler: async ({ script_id }) => {
          const script = await storage.getScript(script_id)
          if (!script) {
            throw new Error(`脚本不存在: ${script_id}`)
          }
          return { script }
        },
      },
      {
        name: 'create_script',
        description: '创建新的自动化脚本',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '脚本名称' },
            description: { type: 'string', description: '脚本描述' },
            actions: {
              type: 'array',
              description: '动作列表',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: '动作类型' },
                  params: { type: 'object', description: '动作参数' },
                },
              },
            },
          },
          required: ['name'],
        },
        handler: async ({ name, description = '', actions = [] }) => {
          const { createScript, generateId } = await import('../render/types/actions.js')
          const script = createScript(name, description)

          actions.forEach((action) => {
            script.actions.push({
              id: generateId(),
              type: action.type,
              params: action.params,
            })
          })

          await storage.saveScript(script)
          return { script }
        },
      },
      {
        name: 'update_script',
        description: '更新脚本',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string', description: '脚本 ID' },
            name: { type: 'string', description: '脚本名称' },
            description: { type: 'string', description: '脚本描述' },
            actions: { type: 'array', description: '动作列表' },
          },
          required: ['script_id'],
        },
        handler: async ({ script_id, ...updates }) => {
          const script = await storage.getScript(script_id)
          if (!script) {
            throw new Error(`脚本不存在: ${script_id}`)
          }

          Object.assign(script, updates)
          await storage.saveScript(script)
          return { script }
        },
      },
      {
        name: 'delete_script',
        description: '删除脚本',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string', description: '脚本 ID' },
          },
          required: ['script_id'],
        },
        handler: async ({ script_id }) => {
          await storage.deleteScript(script_id)
          return { success: true }
        },
      },
      {
        name: 'execute_script',
        description: '执行指定的自动化脚本',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string', description: '脚本 ID' },
            tab_id: { type: 'number', description: '目标标签页 ID（可选）' },
          },
          required: ['script_id'],
        },
        handler: async ({ script_id, tab_id }) => {
          const result = await this.executor.execute(script_id, { tabId: tab_id })
          return result
        },
      },
      {
        name: 'start_recording',
        description: '开始录制新的自动化动作',
        inputSchema: {
          type: 'object',
          properties: {
            tab_id: { type: 'number', description: '要录制的标签页 ID' },
          },
        },
        handler: async ({ tab_id }) => {
          // 获取当前活动标签页
          let targetTabId = tab_id
          if (!targetTabId) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            targetTabId = tab?.id
          }

          if (!targetTabId) {
            throw new Error('无法获取目标标签页')
          }

          // 发送消息到 content script
          await chrome.tabs.sendMessage(targetTabId, { type: 'START_RECORDING' })

          return {
            success: true,
            message: '录制已开始',
            tab_id: targetTabId,
          }
        },
      },
      {
        name: 'stop_recording',
        description: '停止录制并保存脚本',
        inputSchema: {
          type: 'object',
          properties: {
            script_name: { type: 'string', description: '脚本名称（可选）' },
          },
        },
        handler: async ({ script_name }) => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (!tab) {
            throw new Error('无法获取当前标签页')
          }

          const response = await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' })

          if (response.success) {
            // 创建新脚本
            const name = script_name || `录制脚本 ${new Date().toLocaleString()}`
            const { createScript, generateId } = await import('../render/types/actions.js')
            const script = createScript(name, '通过 MCP 录制生成')

            // 添加录制的动作
            response.data.actions.forEach((action) => {
              script.actions.push({
                id: generateId(),
                type: action.type,
                params: action.params,
              })
            })

            await storage.saveScript(script)

            return {
              success: true,
              script,
              actionCount: script.actions.length,
            }
          } else {
            throw new Error(response.message || '录制失败')
          }
        },
      },
      {
        name: 'get_recording_status',
        description: '获取当前录制状态',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (!tab) {
            return { status: 'idle', message: '无法获取当前标签页' }
          }

          try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_RECORDING_STATUS' })
            return response.data
          } catch {
            return { status: 'idle' }
          }
        },
      },
      {
        name: 'get_execution_logs',
        description: '获取脚本执行日志',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string', description: '脚本 ID（可选）' },
            limit: { type: 'number', description: '返回数量限制', default: 10 },
          },
        },
        handler: async ({ script_id, limit = 10 }) => {
          const logs = await storage.getLogs(script_id, limit)
          return { logs }
        },
      },
      {
        name: 'screenshot',
        description: '对指定标签页截图',
        inputSchema: {
          type: 'object',
          properties: {
            tab_id: { type: 'number', description: '标签页 ID' },
            full_page: { type: 'boolean', description: '是否截取整个页面', default: false },
          },
        },
        handler: async ({ tab_id, full_page = false }) => {
          let targetTabId = tab_id
          if (!targetTabId) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            targetTabId = tab?.id
          }

          if (!targetTabId) {
            throw new Error('无法获取目标标签页')
          }

          const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
            format: 'png',
          })

          return {
            screenshot: dataUrl,
            tab_id: targetTabId,
          }
        },
      },
      {
        name: 'set_schedule',
        description: '设置脚本的定时执行计划',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string', description: '脚本 ID' },
            enabled: { type: 'boolean', description: '是否启用' },
            type: {
              type: 'string',
              description: '定时类型: interval, daily, weekly',
              enum: ['interval', 'daily', 'weekly'],
            },
            interval: { type: 'number', description: '间隔时间（毫秒，用于 interval 类型）' },
            time: { type: 'string', description: '执行时间 HH:MM（用于 daily/weekly 类型）' },
            day_of_week: { type: 'number', description: '星期几 0-6（用于 weekly 类型）' },
          },
          required: ['script_id', 'enabled', 'type'],
        },
        handler: async ({ script_id, enabled, type, interval, time, day_of_week }) => {
          const { getScheduler } = await import('./scheduler.js')
          const scheduler = getScheduler()

          const schedule = {
            enabled,
            type,
            interval,
            time,
            dayOfWeek: day_of_week,
          }

          await scheduler.setSchedule(script_id, schedule)

          return {
            success: true,
            message: '定时任务已设置',
          }
        },
      },
      {
        name: 'get_settings',
        description: '获取插件设置',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          const settings = await storage.getSettings()
          return { settings }
        },
      },
      {
        name: 'update_settings',
        description: '更新插件设置',
        inputSchema: {
          type: 'object',
          properties: {
            mcp_port: { type: 'number', description: 'MCP 服务器端口' },
            default_timeout: { type: 'number', description: '默认超时时间（毫秒）' },
            max_retries: { type: 'number', description: '最大重试次数' },
          },
        },
        handler: async (updates) => {
          const currentSettings = await storage.getSettings()
          const newSettings = {
            ...currentSettings,
            ...updates,
          }
          await storage.saveSettings(newSettings)
          return { settings: newSettings }
        },
      },
    ]
  }

  /**
   * 处理 MCP 请求
   * @param {Object} request - JSON-RPC 请求
   * @returns {Object} JSON-RPC 响应
   */
  async handleRequest(request) {
    const { id, method, params = {} } = request

    try {
      // 处理工具列表请求
      if (method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
            })),
          },
        }
      }

      // 处理工具调用
      if (method.startsWith('tools/call/')) {
        const toolName = method.replace('tools/call/', '')
        const tool = this.tools.find((t) => t.name === toolName)

        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          }
        }

        const result = await tool.handler(params)
        return {
          jsonrpc: '2.0',
          id,
          result,
        }
      }

      // 未知方法
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error.message,
        },
      }
    }
  }

  /**
   * 处理来自 extension 的消息
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>}
   */
  async handleMessage(message) {
    // 将 extension 消息转换为 MCP 格式
    const methodMap = {
      LIST_SCRIPTS: 'tools/call/list_scripts',
      GET_SCRIPT: 'tools/call/get_script',
      CREATE_SCRIPT: 'tools/call/create_script',
      UPDATE_SCRIPT: 'tools/call/update_script',
      DELETE_SCRIPT: 'tools/call/delete_script',
      EXECUTE_SCRIPT: 'tools/call/execute_script',
      START_RECORDING: 'tools/call/start_recording',
      STOP_RECORDING: 'tools/call/stop_recording',
      GET_RECORDING_STATUS: 'tools/call/get_recording_status',
      GET_EXECUTION_LOGS: 'tools/call/get_execution_logs',
      SCREENSHOT: 'tools/call/screenshot',
      SET_SCHEDULE: 'tools/call/set_schedule',
      GET_SETTINGS: 'tools/call/get_settings',
      UPDATE_SETTINGS: 'tools/call/update_settings',
    }

    const mcpMethod = methodMap[message.type]
    if (!mcpMethod) {
      return null // 不处理的消息
    }

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: mcpMethod,
      params: message,
    }

    const response = await this.handleRequest(request)
    return response.result || response.error
  }
}

// 创建单例
let mcpServerInstance = null

export function getMCPServer() {
  if (!mcpServerInstance) {
    mcpServerInstance = new MCPServer()
  }
  return mcpServerInstance
}

export function createMCPServer(port) {
  mcpServerInstance = new MCPServer(port)
  return mcpServerInstance
}

export default MCPServer
