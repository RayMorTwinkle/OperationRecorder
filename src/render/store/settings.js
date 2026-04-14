/**
 * Settings Store - 设置状态管理
 * 管理用户设置和偏好
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_SETTINGS } from '../types/actions.js'

// 模拟存储 API
const mockStorage = {
  settings: { ...DEFAULT_SETTINGS },
  async getSettings() {
    return this.settings
  },
  async saveSettings(settings) {
    this.settings = { ...this.settings, ...settings }
  },
}

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref({ ...DEFAULT_SETTINGS })
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const mcpPort = computed(() => settings.value.mcpPort)
  const defaultTimeout = computed(() => settings.value.defaultTimeout)
  const maxRetries = computed(() => settings.value.maxRetries)
  const theme = computed(() => settings.value.theme)
  const autoSave = computed(() => settings.value.autoSave)
  const showExecutionPreview = computed(() => settings.value.showExecutionPreview)

  // Actions
  async function loadSettings() {
    isLoading.value = true
    error.value = null
    try {
      const data = await mockStorage.getSettings()
      settings.value = { ...DEFAULT_SETTINGS, ...data }
    } catch (err) {
      error.value = err.message
      console.error('加载设置失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function saveSettings(newSettings) {
    try {
      const updated = { ...settings.value, ...newSettings }
      await mockStorage.saveSettings(updated)
      settings.value = updated
      return true
    } catch (err) {
      error.value = err.message
      console.error('保存设置失败:', err)
      return false
    }
  }

  async function updateSetting(key, value) {
    return saveSettings({ [key]: value })
  }

  async function resetSettings() {
    return saveSettings({ ...DEFAULT_SETTINGS })
  }

  return {
    // State
    settings,
    isLoading,
    error,

    // Getters
    mcpPort,
    defaultTimeout,
    maxRetries,
    theme,
    autoSave,
    showExecutionPreview,

    // Actions
    loadSettings,
    saveSettings,
    updateSetting,
    resetSettings,
  }
})
