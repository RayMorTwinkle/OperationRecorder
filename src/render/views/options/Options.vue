<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import {
  SettingsOutline,
  ServerOutline,
  TimeOutline,
  RefreshOutline,
  DownloadOutline,
  CloudUploadOutline,
  TrashOutline,
  InformationCircleOutline,
  RecordingOutline,
} from '@vicons/ionicons5'
import { useSettingsStore } from '../../store/settings.js'

const message = useMessage()
const settingsStore = useSettingsStore()

const activeTab = ref('general')
const isLoading = ref(false)

onMounted(() => {
  settingsStore.loadSettings()
})

// 保存设置
async function saveSettings() {
  isLoading.value = true
  try {
    await settingsStore.saveSettings(settingsStore.settings)
    message.success('设置已保存')
  } catch (error) {
    message.error('保存失败: ' + error.message)
  } finally {
    isLoading.value = false
  }
}

// 重置设置
async function resetSettings() {
  try {
    await settingsStore.resetSettings()
    message.success('设置已重置为默认值')
  } catch (error) {
    message.error('重置失败: ' + error.message)
  }
}

// 导出所有数据
async function exportAllData() {
  try {
    const data = await chrome.runtime.sendMessage({ type: 'EXPORT_ALL_DATA' })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    await chrome.downloads.download({
      url,
      filename: `operation-recorder-backup-${new Date().toISOString().split('T')[0]}.json`,
    })

    message.success('数据已导出')
  } catch (error) {
    message.error('导出失败: ' + error.message)
  }
}

// 导入数据
async function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      await chrome.runtime.sendMessage({
        type: 'IMPORT_ALL_DATA',
        data,
      })

      message.success('数据已导入')
      settingsStore.loadSettings()
    } catch (error) {
      message.error('导入失败: ' + error.message)
    }
  }

  input.click()
}

// 清空所有数据
async function clearAllData() {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' })
    message.success('所有数据已清空')
    settingsStore.loadSettings()
  } catch (error) {
    message.error('清空失败: ' + error.message)
  }
}
</script>

<template>
  <div
    class="min-h-screen from-blue-50 via-purple-50 to-pink-50 bg-gradient-to-br p-6 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
  >
    <div class="max-w-800px mx-auto">
      <!-- 头部 -->
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg"
        >
          <n-icon :component="SettingsOutline" class="text-white text-2xl" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">
            OperationRecorder 设置
          </h1>
          <p class="text-sm text-gray-500">配置自动化录制和执行参数</p>
        </div>
      </div>

      <!-- 设置内容 -->
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- 常规设置 -->
        <n-tab-pane name="general" tab="常规设置">
          <n-card class="shadow-sm" :bordered="false">
            <n-form label-placement="left" label-width="180px">
              <!-- MCP 端口设置 -->
              <n-form-item label="MCP 服务器端口">
                <n-input-number
                  v-model:value="settingsStore.settings.mcpPort"
                  :min="1024"
                  :max="65535"
                  placeholder="9222"
                  class="w-150px"
                />
                <template #feedback> MCP 服务器监听端口，供外部 AI 调用 </template>
              </n-form-item>

              <!-- 默认超时 -->
              <n-form-item label="默认超时时间 (毫秒)">
                <n-input-number
                  v-model:value="settingsStore.settings.defaultTimeout"
                  :min="1000"
                  :max="60000"
                  :step="1000"
                  placeholder="30000"
                  class="w-150px"
                />
                <template #feedback> 等待元素出现的默认超时时间 </template>
              </n-form-item>

              <!-- 最大重试次数 -->
              <n-form-item label="最大重试次数">
                <n-input-number
                  v-model:value="settingsStore.settings.maxRetries"
                  :min="0"
                  :max="10"
                  placeholder="3"
                  class="w-150px"
                />
                <template #feedback> 动作执行失败时的最大重试次数 </template>
              </n-form-item>

              <!-- 自动保存 -->
              <n-form-item label="自动保存">
                <n-switch v-model:value="settingsStore.settings.autoSave" />
                <template #feedback> 修改脚本后自动保存 </template>
              </n-form-item>

              <!-- 执行预览 -->
              <n-form-item label="执行预览">
                <n-switch v-model:value="settingsStore.settings.showExecutionPreview" />
                <template #feedback> 执行前高亮显示将要操作的元素 </template>
              </n-form-item>
            </n-form>

            <div
              class="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
            >
              <n-button @click="resetSettings">重置为默认</n-button>
              <n-button type="primary" :loading="isLoading" @click="saveSettings">
                保存设置
              </n-button>
            </div>
          </n-card>
        </n-tab-pane>

        <!-- 数据管理 -->
        <n-tab-pane name="data" tab="数据管理">
          <n-card class="shadow-sm" :bordered="false">
            <div class="space-y-6">
              <!-- 导出数据 -->
              <div
                class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
                  >
                    <n-icon :component="DownloadOutline" class="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div class="font-medium">导出所有数据</div>
                    <div class="text-sm text-gray-500">将脚本、设置、日志导出为 JSON 文件</div>
                  </div>
                </div>
                <n-button @click="exportAllData">导出</n-button>
              </div>

              <!-- 导入数据 -->
              <div
                class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center"
                  >
                    <n-icon
                      :component="CloudUploadOutline"
                      class="text-green-600 dark:text-green-400"
                    />
                  </div>
                  <div>
                    <div class="font-medium">导入数据</div>
                    <div class="text-sm text-gray-500">从 JSON 文件导入脚本和设置</div>
                  </div>
                </div>
                <n-button @click="importData">导入</n-button>
              </div>

              <!-- 清空数据 -->
              <div
                class="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/20"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center"
                  >
                    <n-icon :component="TrashOutline" class="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div class="font-medium text-red-600 dark:text-red-400">清空所有数据</div>
                    <div class="text-sm text-gray-500">删除所有脚本、设置和日志（不可恢复）</div>
                  </div>
                </div>
                <n-popconfirm
                  @positive-click="clearAllData"
                  positive-text="确认清空"
                  negative-text="取消"
                >
                  <template #trigger>
                    <n-button type="error">清空</n-button>
                  </template>
                  确定要清空所有数据吗？此操作不可恢复！
                </n-popconfirm>
              </div>
            </div>
          </n-card>
        </n-tab-pane>

        <!-- 关于 -->
        <n-tab-pane name="about" tab="关于">
          <n-card class="shadow-sm" :bordered="false">
            <div class="text-center py-8">
              <div
                class="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <n-icon :component="SettingsOutline" class="text-white text-4xl" />
              </div>
              <h2 class="text-xl font-bold mb-2">OperationRecorder</h2>
              <p class="text-gray-500 mb-6">Chrome 浏览器自动化操作录制与执行工具</p>

              <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>版本: 1.0.0</div>
                <div>基于 Chrome Extension MV3</div>
                <div>支持 MCP 协议供 AI 调用</div>
              </div>

              <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 class="font-medium mb-3">功能特性</h3>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div class="flex items-center gap-2">
                    <n-icon :component="RecordingOutline" class="text-red-500" />
                    <span>可视化录制</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <n-icon :component="ServerOutline" class="text-blue-500" />
                    <span>MCP 服务器</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <n-icon :component="TimeOutline" class="text-green-500" />
                    <span>定时执行</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <n-icon :component="RefreshOutline" class="text-purple-500" />
                    <span>动作编排</span>
                  </div>
                </div>
              </div>
            </div>
          </n-card>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>
