<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import {
  PlayOutline,
  PauseOutline,
  StopOutline,
  RecordingOutline,
  SettingsOutline,
  ListOutline,
  AddOutline,
  TrashOutline,
  DownloadOutline,
  UploadOutline,
} from '@vicons/ionicons5'
import { useScriptsStore } from '../../store/scripts.js'
import { useRecordingStore } from '../../store/recording.js'

const message = useMessage()
const scriptsStore = useScriptsStore()
const recordingStore = useRecordingStore()

const activeTab = ref('scripts')
const showNewScriptModal = ref(false)
const newScriptName = ref('')
const isRecording = ref(false)

onMounted(() => {
  scriptsStore.loadScripts()
})

// 开始录制
async function startRecording() {
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      message.error('无法获取当前标签页')
      return
    }

    // 发送消息到 content script 开始录制
    await chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' })
    isRecording.value = true
    message.success('开始录制')
  } catch (error) {
    message.error('开始录制失败: ' + error.message)
  }
}

// 停止录制
async function stopRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) return

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' })
    isRecording.value = false

    if (response.success) {
      // 创建新脚本
      const scriptName = `录制脚本 ${new Date().toLocaleString()}`
      const script = await scriptsStore.createNewScript(scriptName, '通过录制生成')

      // 将录制的动作添加到脚本
      response.data.actions.forEach((action) => {
        scriptsStore.addAction(script.id, action.type, action.params)
      })

      message.success(`录制完成，已创建脚本 "${scriptName}"`)
    }
  } catch (error) {
    message.error('停止录制失败: ' + error.message)
  }
}

// 执行脚本
async function executeScript(scriptId) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      message.error('无法获取当前标签页')
      return
    }

    const script = scriptsStore.getScriptById(scriptId)
    if (!script) {
      message.error('脚本不存在')
      return
    }

    message.loading('正在执行脚本...', { duration: 0 })

    // 发送消息到 background 执行脚本
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_SCRIPT',
      scriptId,
      tabId: tab.id,
    })

    if (response.success) {
      message.success('脚本执行成功')
    } else {
      message.error('脚本执行失败: ' + response.message)
    }
  } catch (error) {
    message.error('执行脚本失败: ' + error.message)
  }
}

// 删除脚本
async function deleteScript(scriptId) {
  try {
    await scriptsStore.deleteScript(scriptId)
    message.success('脚本已删除')
  } catch (error) {
    message.error('删除失败: ' + error.message)
  }
}

// 创建新脚本
async function createNewScript() {
  if (!newScriptName.value.trim()) {
    message.warning('请输入脚本名称')
    return
  }

  try {
    await scriptsStore.createNewScript(newScriptName.value)
    newScriptName.value = ''
    showNewScriptModal.value = false
    message.success('脚本创建成功')
  } catch (error) {
    message.error('创建失败: ' + error.message)
  }
}

// 导出脚本
async function exportScript(scriptId) {
  try {
    const script = await scriptsStore.exportScript(scriptId)
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    await chrome.downloads.download({
      url,
      filename: `${script.name}.json`,
    })

    message.success('脚本已导出')
  } catch (error) {
    message.error('导出失败: ' + error.message)
  }
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '从未'
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div
    class="w-400px min-h-400px from-blue-50 to-purple-50 bg-gradient-to-br p-4 dark:from-gray-900 dark:to-gray-800"
  >
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center"
        >
          <n-icon :component="RecordingOutline" class="text-white text-lg" />
        </div>
        <h1 class="text-lg font-bold text-gray-800 dark:text-gray-100">OperationRecorder</h1>
      </div>
      <n-button text @click="activeTab = 'settings'">
        <n-icon :component="SettingsOutline" class="text-xl" />
      </n-button>
    </div>

    <!-- 录制控制区 -->
    <n-card size="small" class="mb-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ isRecording ? '正在录制...' : '准备录制' }}
          </div>
          <div class="text-xs text-gray-500">
            {{ isRecording ? '点击页面元素进行录制' : '点击下方按钮开始录制' }}
          </div>
        </div>
        <n-button v-if="!isRecording" type="error" size="large" round @click="startRecording">
          <template #icon>
            <n-icon :component="RecordingOutline" />
          </template>
          录制
        </n-button>
        <n-button v-else type="error" size="large" round ghost @click="stopRecording">
          <template #icon>
            <n-icon :component="StopOutline" />
          </template>
          停止
        </n-button>
      </div>
    </n-card>

    <!-- 脚本列表 -->
    <n-card size="small" class="shadow-sm" :bordered="false">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <n-icon :component="ListOutline" />
            <span class="font-medium">脚本列表</span>
          </div>
          <n-button text size="small" @click="showNewScriptModal = true">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            新建
          </n-button>
        </div>
      </template>

      <div v-if="scriptsStore.scriptList.length === 0" class="py-8 text-center text-gray-500">
        <n-icon :component="ListOutline" class="text-4xl mb-2 opacity-50" />
        <div class="text-sm">暂无脚本</div>
        <div class="text-xs mt-1">点击录制按钮或新建按钮创建脚本</div>
      </div>

      <div v-else class="space-y-2 max-h-250px overflow-y-auto">
        <div
          v-for="script in scriptsStore.scriptList"
          :key="script.id"
          class="p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">{{ script.name }}</div>
              <div class="text-xs text-gray-500">
                {{ script.actions.length }} 个动作 · 上次执行:
                {{ formatTime(script.lastExecutionTime) }}
              </div>
            </div>
            <div class="flex items-center gap-1">
              <n-button text size="small" @click="executeScript(script.id)">
                <template #icon>
                  <n-icon :component="PlayOutline" />
                </template>
              </n-button>
              <n-button text size="small" @click="exportScript(script.id)">
                <template #icon>
                  <n-icon :component="DownloadOutline" />
                </template>
              </n-button>
              <n-button text size="small" type="error" @click="deleteScript(script.id)">
                <template #icon>
                  <n-icon :component="TrashOutline" />
                </template>
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 新建脚本弹窗 -->
    <n-modal v-model:show="showNewScriptModal" title="新建脚本" preset="card" class="w-300px">
      <n-input
        v-model:value="newScriptName"
        placeholder="输入脚本名称"
        @keyup.enter="createNewScript"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showNewScriptModal = false">取消</n-button>
          <n-button type="primary" @click="createNewScript">创建</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
