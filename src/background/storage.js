/**
 * Chrome Storage 封装
 * 提供统一的存储 API，支持 local 和 sync 存储区域
 */

import { DEFAULT_SETTINGS } from '../render/types/actions.js'

// 存储区域类型
const STORAGE_AREA = 'local'

/**
 * 获取存储值
 * @param {string|Array|Object} keys - 要获取的键
 * @returns {Promise<Object>} 存储值
 */
export async function get(keys = null) {
  return new Promise((resolve, reject) => {
    chrome.storage[STORAGE_AREA].get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result)
      }
    })
  })
}

/**
 * 设置存储值
 * @param {Object} items - 要设置的键值对
 * @returns {Promise<void>}
 */
export async function set(items) {
  return new Promise((resolve, reject) => {
    chrome.storage[STORAGE_AREA].set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 移除存储值
 * @param {string|Array} keys - 要移除的键
 * @returns {Promise<void>}
 */
export async function remove(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage[STORAGE_AREA].remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 清空存储
 * @returns {Promise<void>}
 */
export async function clear() {
  return new Promise((resolve, reject) => {
    chrome.storage[STORAGE_AREA].clear(() => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * 获取所有脚本
 * @returns {Promise<Object>} 脚本列表
 */
export async function getScripts() {
  const result = await get('scripts')
  return result.scripts || {}
}

/**
 * 获取单个脚本
 * @param {string} scriptId - 脚本 ID
 * @returns {Promise<Object|null>} 脚本对象
 */
export async function getScript(scriptId) {
  const scripts = await getScripts()
  return scripts[scriptId] || null
}

/**
 * 保存脚本
 * @param {Object} script - 脚本对象
 * @returns {Promise<void>}
 */
export async function saveScript(script) {
  const scripts = await getScripts()
  scripts[script.id] = {
    ...script,
    updatedAt: Date.now(),
  }
  await set({ scripts })
}

/**
 * 删除脚本
 * @param {string} scriptId - 脚本 ID
 * @returns {Promise<void>}
 */
export async function deleteScript(scriptId) {
  const scripts = await getScripts()
  delete scripts[scriptId]
  await set({ scripts })
}

/**
 * 获取设置
 * @returns {Promise<Object>} 设置对象
 */
export async function getSettings() {
  const result = await get('settings')
  return { ...DEFAULT_SETTINGS, ...result.settings }
}

/**
 * 保存设置
 * @param {Object} settings - 设置对象
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  const currentSettings = await getSettings()
  await set({
    settings: { ...currentSettings, ...settings },
  })
}

/**
 * 获取变量
 * @returns {Promise<Object>} 变量列表
 */
export async function getVariables() {
  const result = await get('variables')
  return result.variables || {}
}

/**
 * 设置变量
 * @param {string} name - 变量名
 * @param {any} value - 变量值
 * @returns {Promise<void>}
 */
export async function setVariable(name, value) {
  const variables = await getVariables()
  variables[name] = value
  await set({ variables })
}

/**
 * 删除变量
 * @param {string} name - 变量名
 * @returns {Promise<void>}
 */
export async function deleteVariable(name) {
  const variables = await getVariables()
  delete variables[name]
  await set({ variables })
}

/**
 * 获取执行日志
 * @param {string} scriptId - 脚本 ID（可选）
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} 日志列表
 */
export async function getLogs(scriptId = null, limit = 100) {
  const result = await get('logs')
  let logs = result.logs || []

  if (scriptId) {
    logs = logs.filter((log) => log.scriptId === scriptId)
  }

  // 按时间倒序
  logs.sort((a, b) => b.startTime - a.startTime)

  return logs.slice(0, limit)
}

/**
 * 添加执行日志
 * @param {Object} log - 日志对象
 * @returns {Promise<void>}
 */
export async function addLog(log) {
  const result = await get('logs')
  const logs = result.logs || []

  logs.push({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...log,
    createdAt: Date.now(),
  })

  // 只保留最近 1000 条日志
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000)
  }

  await set({ logs })
}

/**
 * 清空日志
 * @returns {Promise<void>}
 */
export async function clearLogs() {
  await set({ logs: [] })
}

/**
 * 导出所有数据
 * @returns {Promise<Object>} 所有数据
 */
export async function exportAll() {
  const [scripts, settings, variables] = await Promise.all([
    getScripts(),
    getSettings(),
    getVariables(),
  ])

  return {
    version: chrome.runtime.getManifest().version,
    exportTime: Date.now(),
    scripts,
    settings,
    variables,
  }
}

/**
 * 导入数据
 * @param {Object} data - 导入的数据
 * @returns {Promise<void>}
 */
export async function importAll(data) {
  if (data.scripts) {
    await set({ scripts: data.scripts })
  }
  if (data.settings) {
    await set({ settings: { ...DEFAULT_SETTINGS, ...data.settings } })
  }
  if (data.variables) {
    await set({ variables: data.variables })
  }
}

/**
 * 监听存储变化
 * @param {Function} callback - 回调函数
 * @returns {Function} 取消监听的函数
 */
export function onChanged(callback) {
  const listener = (changes, areaName) => {
    if (areaName === STORAGE_AREA) {
      callback(changes)
    }
  }

  chrome.storage.onChanged.addListener(listener)

  // 返回取消监听的函数
  return () => {
    chrome.storage.onChanged.removeListener(listener)
  }
}

// 默认导出
export default {
  get,
  set,
  remove,
  clear,
  getScripts,
  getScript,
  saveScript,
  deleteScript,
  getSettings,
  saveSettings,
  getVariables,
  setVariable,
  deleteVariable,
  getLogs,
  addLog,
  clearLogs,
  exportAll,
  importAll,
  onChanged,
}
