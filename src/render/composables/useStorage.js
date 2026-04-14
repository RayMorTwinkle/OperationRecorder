/**
 * 存储相关的组合式函数
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { storage, logger } from '../utils/index.js'

/**
 * 使用Chrome存储的组合式函数
 * @param {string} key - 存储键名
 * @param {any} defaultValue - 默认值
 * @param {Object} options - 选项
 * @returns {Object} 包含响应式数据和操作方法的对象
 */
export function useStorage(key, defaultValue = null, options = {}) {
  const {
    immediate = true,
    deep = true,
    onError = (error) => logger.error(`Storage error for key "${key}":`, error),
  } = options

  const data = ref(defaultValue)
  const loading = ref(false)
  const error = ref(null)

  // 从存储中读取数据
  const read = async () => {
    try {
      loading.value = true
      error.value = null
      const result = await storage.get([key])
      data.value = result[key] !== undefined ? result[key] : defaultValue
    } catch (err) {
      error.value = err
      onError(err)
    } finally {
      loading.value = false
    }
  }

  // 写入数据到存储
  const write = async (value) => {
    try {
      loading.value = true
      error.value = null
      await storage.set({ [key]: value })
      data.value = value
    } catch (err) {
      error.value = err
      onError(err)
    } finally {
      loading.value = false
    }
  }

  // 删除存储数据
  const remove = async () => {
    try {
      loading.value = true
      error.value = null
      await storage.remove([key])
      data.value = defaultValue
    } catch (err) {
      error.value = err
      onError(err)
    } finally {
      loading.value = false
    }
  }

  // 监听Chrome存储变化（跨页面同步）
  const handleStorageChange = (changes, areaName) => {
    if (areaName === 'sync' && changes[key]) {
      const change = changes[key]
      if (change.newValue !== undefined && change.newValue !== data.value) {
        data.value = change.newValue
      }
    }
  }

  // 在组件挂载时添加监听器
  onMounted(() => {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange)
    }
  })

  // 在组件卸载时移除监听器
  onUnmounted(() => {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  })

  // 监听数据变化并自动保存
  if (immediate) {
    read()
  }

  // 监听数据变化
  watch(
    data,
    (newValue) => {
      if (!loading.value) {
        write(newValue)
      }
    },
    { deep },
  )

  return {
    data,
    loading,
    error,
    read,
    write,
    remove,
  }
}

/**
 * 使用计数器的组合式函数
 * @param {string} key - 存储键名
 * @param {number} initialValue - 初始值
 * @returns {Object} 包含计数器相关方法的对象
 */
export function useCounter(key = 'count', initialValue = 0) {
  const { data: count, loading, error } = useStorage(key, initialValue)

  const increment = () => {
    if (!loading.value) {
      count.value = (count.value || 0) + 1
    }
  }

  const decrement = () => {
    if (!loading.value && count.value > 0) {
      count.value = count.value - 1
    }
  }

  const reset = () => {
    if (!loading.value) {
      count.value = initialValue
    }
  }

  const setValue = (value) => {
    if (!loading.value && typeof value === 'number' && value >= 0) {
      count.value = value
    }
  }

  return {
    count,
    loading,
    error,
    increment,
    decrement,
    reset,
    setValue,
  }
}
