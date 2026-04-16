/**
 * Scripts Store - 脚本状态管理
 * 使用 Pinia 管理脚本数据
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createScript, createAction, generateId } from '../types/actions.js'

// 模拟存储 API（实际项目中会从 background 获取）
const mockStorage = {
  scripts: {},
  async getScripts() {
    return this.scripts
  },
  async saveScript(script) {
    this.scripts[script.id] = script
  },
  async deleteScript(scriptId) {
    delete this.scripts[scriptId]
  },
}

export const useScriptsStore = defineStore('scripts', () => {
  // State
  const scripts = ref({})
  const currentScriptId = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const scriptList = computed(() => {
    return Object.values(scripts.value).sort((a, b) => b.updatedAt - a.updatedAt)
  })

  const currentScript = computed(() => {
    return currentScriptId.value ? scripts.value[currentScriptId.value] : null
  })

  const getScriptById = computed(() => {
    return (id) => scripts.value[id] || null
  })

  // Actions
  async function loadScripts() {
    isLoading.value = true
    error.value = null
    try {
      // 实际项目中通过 message 发送到 background 获取
      const data = await mockStorage.getScripts()
      scripts.value = data
    } catch (err) {
      error.value = err.message
      console.error('加载脚本失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createNewScript(name, description = '') {
    const script = createScript(name, description)
    await saveScript(script)
    return script
  }

  async function saveScript(script) {
    try {
      script.updatedAt = Date.now()
      await mockStorage.saveScript(script)
      scripts.value[script.id] = script
    } catch (err) {
      error.value = err.message
      console.error('保存脚本失败:', err)
      throw err
    }
  }

  async function deleteScript(scriptId) {
    try {
      await mockStorage.deleteScript(scriptId)
      delete scripts.value[scriptId]
      if (currentScriptId.value === scriptId) {
        currentScriptId.value = null
      }
    } catch (err) {
      error.value = err.message
      console.error('删除脚本失败:', err)
      throw err
    }
  }

  function selectScript(scriptId) {
    currentScriptId.value = scriptId
  }

  function deselectScript() {
    currentScriptId.value = null
  }

  // 动作操作
  function addAction(scriptId, actionType, params = {}, parentId = null) {
    const script = scripts.value[scriptId]
    if (!script) return null

    const action = createAction(actionType, params)

    if (parentId) {
      // 添加到父动作的 children 中
      const parent = findAction(script.actions, parentId)
      if (parent && parent.children) {
        parent.children.push(action)
      }
    } else {
      script.actions.push(action)
    }

    script.updatedAt = Date.now()
    return action
  }

  function updateAction(scriptId, actionId, updates) {
    const script = scripts.value[scriptId]
    if (!script) return false

    const action = findAction(script.actions, actionId)
    if (!action) return false

    Object.assign(action, updates)
    script.updatedAt = Date.now()
    return true
  }

  function removeAction(scriptId, actionId) {
    const script = scripts.value[scriptId]
    if (!script) return false

    const removed = removeActionRecursive(script.actions, actionId)
    if (removed) {
      script.updatedAt = Date.now()
    }
    return removed
  }

  function moveAction(scriptId, actionId, newIndex, parentId = null) {
    const script = scripts.value[scriptId]
    if (!script) return false

    const actions = parentId ? findAction(script.actions, parentId)?.children : script.actions

    if (!actions) return false

    const oldIndex = actions.findIndex((a) => a.id === actionId)
    if (oldIndex === -1) return false

    const [action] = actions.splice(oldIndex, 1)
    actions.splice(newIndex, 0, action)

    script.updatedAt = Date.now()
    return true
  }

  // 辅助函数：递归查找动作
  function findAction(actions, actionId) {
    for (const action of actions) {
      if (action.id === actionId) return action
      if (action.children?.length) {
        const found = findAction(action.children, actionId)
        if (found) return found
      }
    }
    return null
  }

  // 辅助函数：递归删除动作
  function removeActionRecursive(actions, actionId) {
    const index = actions.findIndex((a) => a.id === actionId)
    if (index !== -1) {
      actions.splice(index, 1)
      return true
    }

    for (const action of actions) {
      if (action.children?.length) {
        if (removeActionRecursive(action.children, actionId)) {
          return true
        }
      }
    }
    return false
  }

  // 变量操作
  function addVariable(scriptId, name, type = 'string', value = '') {
    const script = scripts.value[scriptId]
    if (!script) return false

    if (script.variables.some((v) => v.name === name)) {
      return false // 变量名已存在
    }

    script.variables.push({ name, type, value })
    script.updatedAt = Date.now()
    return true
  }

  function updateVariable(scriptId, name, updates) {
    const script = scripts.value[scriptId]
    if (!script) return false

    const variable = script.variables.find((v) => v.name === name)
    if (!variable) return false

    Object.assign(variable, updates)
    script.updatedAt = Date.now()
    return true
  }

  function removeVariable(scriptId, name) {
    const script = scripts.value[scriptId]
    if (!script) return false

    const index = script.variables.findIndex((v) => v.name === name)
    if (index === -1) return false

    script.variables.splice(index, 1)
    script.updatedAt = Date.now()
    return true
  }

  // 定时任务
  function setSchedule(scriptId, schedule) {
    const script = scripts.value[scriptId]
    if (!script) return false

    script.schedule = schedule
    script.updatedAt = Date.now()
    return true
  }

  function removeSchedule(scriptId) {
    const script = scripts.value[scriptId]
    if (!script) return false

    script.schedule = null
    script.updatedAt = Date.now()
    return true
  }

  // 导入/导出
  async function exportScript(scriptId) {
    const script = scripts.value[scriptId]
    if (!script) return null

    return {
      ...script,
      exportTime: Date.now(),
      version: '1.0',
    }
  }

  async function importScript(data) {
    const script = {
      ...data,
      id: generateId(),
      importedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastExecutionTime: null,
    }

    await saveScript(script)
    return script
  }

  return {
    // State
    scripts,
    currentScriptId,
    isLoading,
    error,

    // Getters
    scriptList,
    currentScript,
    getScriptById,

    // Actions
    loadScripts,
    createNewScript,
    saveScript,
    deleteScript,
    selectScript,
    deselectScript,

    // 动作操作
    addAction,
    updateAction,
    removeAction,
    moveAction,

    // 变量操作
    addVariable,
    updateVariable,
    removeVariable,

    // 定时任务
    setSchedule,
    removeSchedule,

    // 导入/导出
    exportScript,
    importScript,
  }
})
