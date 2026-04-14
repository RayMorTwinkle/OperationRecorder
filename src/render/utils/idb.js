/**
 * IndexedDB 封装
 * 用于存储大量数据，如执行日志、录制数据等
 */

const DB_NAME = 'OperationRecorderDB'
const DB_VERSION = 1

// 存储对象配置
const STORES = {
  logs: {
    keyPath: 'id',
    indexes: [
      { name: 'scriptId', keyPath: 'scriptId', options: { unique: false } },
      { name: 'startTime', keyPath: 'startTime', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
    ],
  },
  recordings: {
    keyPath: 'id',
    indexes: [
      { name: 'tabId', keyPath: 'tabId', options: { unique: false } },
      { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
    ],
  },
  screenshots: {
    keyPath: 'id',
    indexes: [
      { name: 'scriptId', keyPath: 'scriptId', options: { unique: false } },
      { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
    ],
  },
}

let db = null

/**
 * 打开数据库
 * @returns {Promise<IDBDatabase>}
 */
export async function openDB() {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      // 创建存储对象
      for (const [storeName, config] of Object.entries(STORES)) {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, {
            keyPath: config.keyPath,
            autoIncrement: config.autoIncrement,
          })

          // 创建索引
          if (config.indexes) {
            for (const index of config.indexes) {
              store.createIndex(index.name, index.keyPath, index.options)
            }
          }
        }
      }
    }
  })
}

/**
 * 关闭数据库
 */
export function closeDB() {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * 获取存储对象
 * @param {string} storeName - 存储名称
 * @param {string} mode - 模式（readonly 或 readwrite）
 * @returns {Promise<IDBObjectStore>}
 */
async function getStore(storeName, mode = 'readonly') {
  const database = await openDB()
  const transaction = database.transaction(storeName, mode)
  return transaction.objectStore(storeName)
}

/**
 * 添加数据
 * @param {string} storeName - 存储名称
 * @param {Object} data - 数据对象
 * @returns {Promise<string>}
 */
export async function add(storeName, data) {
  const store = await getStore(storeName, 'readwrite')

  return new Promise((resolve, reject) => {
    const request = store.add(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 更新数据
 * @param {string} storeName - 存储名称
 * @param {Object} data - 数据对象
 * @returns {Promise<string>}
 */
export async function put(storeName, data) {
  const store = await getStore(storeName, 'readwrite')

  return new Promise((resolve, reject) => {
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取数据
 * @param {string} storeName - 存储名称
 * @param {string} id - 数据 ID
 * @returns {Promise<Object>}
 */
export async function get(storeName, id) {
  const store = await getStore(storeName)

  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 删除数据
 * @param {string} storeName - 存储名称
 * @param {string} id - 数据 ID
 * @returns {Promise<void>}
 */
export async function remove(storeName, id) {
  const store = await getStore(storeName, 'readwrite')

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取所有数据
 * @param {string} storeName - 存储名称
 * @returns {Promise<Array>}
 */
export async function getAll(storeName) {
  const store = await getStore(storeName)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 通过索引查询
 * @param {string} storeName - 存储名称
 * @param {string} indexName - 索引名称
 * @param {any} value - 索引值
 * @returns {Promise<Array>}
 */
export async function getByIndex(storeName, indexName, value) {
  const store = await getStore(storeName)

  return new Promise((resolve, reject) => {
    const index = store.index(indexName)
    const request = index.getAll(value)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 清空存储
 * @param {string} storeName - 存储名称
 * @returns {Promise<void>}
 */
export async function clear(storeName) {
  const store = await getStore(storeName, 'readwrite')

  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 查询数据（支持范围）
 * @param {string} storeName - 存储名称
 * @param {IDBKeyRange} range - 范围
 * @param {string} indexName - 索引名称（可选）
 * @returns {Promise<Array>}
 */
export async function query(storeName, range, indexName = null) {
  const store = await getStore(storeName)

  return new Promise((resolve, reject) => {
    let request
    if (indexName) {
      const index = store.index(indexName)
      request = index.getAll(range)
    } else {
      request = store.getAll(range)
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ==================== 日志相关操作 ====================

/**
 * 添加执行日志
 * @param {Object} log - 日志对象
 * @returns {Promise<string>}
 */
export async function addLog(log) {
  return add('logs', {
    ...log,
    createdAt: Date.now(),
  })
}

/**
 * 获取脚本执行日志
 * @param {string} scriptId - 脚本 ID
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>}
 */
export async function getLogsByScriptId(scriptId, limit = 100) {
  const logs = await getByIndex('logs', 'scriptId', scriptId)
  // 按时间倒序
  logs.sort((a, b) => b.startTime - a.startTime)
  return logs.slice(0, limit)
}

/**
 * 获取最近的日志
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>}
 */
export async function getRecentLogs(limit = 100) {
  const logs = await getAll('logs')
  logs.sort((a, b) => b.startTime - a.startTime)
  return logs.slice(0, limit)
}

/**
 * 清理旧日志
 * @param {number} days - 保留天数
 * @returns {Promise<number>} 删除的日志数量
 */
export async function cleanupOldLogs(days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const logs = await getAll('logs')
  const oldLogs = logs.filter((log) => log.createdAt < cutoff)

  for (const log of oldLogs) {
    await remove('logs', log.id)
  }

  return oldLogs.length
}

// ==================== 录制相关操作 ====================

/**
 * 保存录制数据
 * @param {Object} recording - 录制数据
 * @returns {Promise<string>}
 */
export async function saveRecording(recording) {
  return put('recordings', {
    ...recording,
    timestamp: Date.now(),
  })
}

/**
 * 获取录制数据
 * @param {string} recordingId - 录制 ID
 * @returns {Promise<Object>}
 */
export async function getRecording(recordingId) {
  return get('recordings', recordingId)
}

/**
 * 获取标签页的录制数据
 * @param {number} tabId - 标签页 ID
 * @returns {Promise<Array>}
 */
export async function getRecordingsByTabId(tabId) {
  return getByIndex('recordings', 'tabId', tabId)
}

// ==================== 截图相关操作 ====================

/**
 * 保存截图
 * @param {Object} screenshot - 截图数据
 * @returns {Promise<string>}
 */
export async function saveScreenshot(screenshot) {
  return add('screenshots', {
    ...screenshot,
    timestamp: Date.now(),
  })
}

/**
 * 获取脚本截图
 * @param {string} scriptId - 脚本 ID
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>}
 */
export async function getScreenshotsByScriptId(scriptId, limit = 50) {
  const screenshots = await getByIndex('screenshots', 'scriptId', scriptId)
  screenshots.sort((a, b) => b.timestamp - a.timestamp)
  return screenshots.slice(0, limit)
}

// 默认导出
export default {
  openDB,
  closeDB,
  add,
  put,
  get,
  remove,
  getAll,
  getByIndex,
  clear,
  query,
  addLog,
  getLogsByScriptId,
  getRecentLogs,
  cleanupOldLogs,
  saveRecording,
  getRecording,
  getRecordingsByTabId,
  saveScreenshot,
  getScreenshotsByScriptId,
}
