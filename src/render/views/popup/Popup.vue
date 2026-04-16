<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import {
  PlayOutline,
  StopOutline,
  RecordingOutline,
  SettingsOutline,
  ListOutline,
  AddOutline,
  TrashOutline,
  DownloadOutline,
  CloudUploadOutline,
  OpenOutline,
  CreateOutline,
  EyeOutline,
  CopyOutline,
  PauseOutline,
  PlayCircleOutline,
  CodeOutline,
} from '@vicons/ionicons5'
import { useScriptsStore } from '../../store/scripts.js'
import { MESSAGE_TYPES } from '../../types/messages.js'
import { MESSAGE_TYPES as ACTION_MESSAGE_TYPES, ACTION_CONFIG } from '../../types/actions.js'

const message = useMessage()
const scriptsStore = useScriptsStore()

const showNewScriptModal = ref(false)
const showEditScriptModal = ref(false)
const showActionEditorModal = ref(false)
const newScriptName = ref('')
const editingScript = ref(null)
const isRecording = ref(false)
const isPausedRecording = ref(false)
const editingAction = ref(null)
const isEditingExistingAction = ref(false)
const actionIndexToEdit = ref(-1)
const newActionType = ref(ACTION_CONFIG.CLICK?.type || 'click')
const newActionParams = ref({})
const currentEditingScriptId = ref(null)

const availableActions = Object.entries(ACTION_CONFIG).map(([type, config]) => ({
  type,
  label: config.label,
  description: config.description,
}))

onMounted(() => {
  scriptsStore.loadScripts()
})

function formatTime(timestamp) {
  if (!timestamp) return '从未'
  return new Date(timestamp).toLocaleString()
}

async function startRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      message.error('无法获取当前标签页')
      return
    }

    await chrome.tabs.sendMessage(tab.id, { type: ACTION_MESSAGE_TYPES.START_RECORDING })
    isRecording.value = true
    isPausedRecording.value = false
    message.success('开始录制')
  } catch (error) {
    message.error('开始录制失败: ' + error.message)
  }
}

async function pauseRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) return

    await chrome.tabs.sendMessage(tab.id, { type: ACTION_MESSAGE_TYPES.PAUSE_EXECUTION })
    isPausedRecording.value = true
    message.success('录制已暂停')
  } catch (error) {
    message.error('暂停录制失败: ' + error.message)
  }
}

async function resumeRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) return

    await chrome.tabs.sendMessage(tab.id, { type: ACTION_MESSAGE_TYPES.RESUME_EXECUTION })
    isPausedRecording.value = false
    message.success('录制已恢复')
  } catch (error) {
    message.error('恢复录制失败: ' + error.message)
  }
}

async function stopRecording() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) return

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: ACTION_MESSAGE_TYPES.STOP_RECORDING,
    })
    isRecording.value = false
    isPausedRecording.value = false

    if (response.success) {
      const scriptName = `录制脚本 ${new Date().toLocaleString()}`
      const script = await scriptsStore.createNewScript(scriptName, '通过录制生成')

      response.data.actions.forEach((action) => {
        scriptsStore.addAction(script.id, action.type, action.params)
      })

      message.success(`录制完成，已创建脚本 "${scriptName}"`)
    }
  } catch (error) {
    message.error('停止录制失败: ' + error.message)
  }
}

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

    const response = await chrome.runtime.sendMessage({
      type: ACTION_MESSAGE_TYPES.EXECUTE_SCRIPT,
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

async function deleteScript(scriptId) {
  try {
    await scriptsStore.deleteScript(scriptId)
    message.success('脚本已删除')
  } catch (error) {
    message.error('删除失败: ' + error.message)
  }
}

async function cloneScript(scriptId) {
  try {
    const clonedScript = await scriptsStore.cloneScript(scriptId)
    message.success(`脚本已复制为 "${clonedScript.name}"`)
  } catch (error) {
    message.error('复制脚本失败: ' + error.message)
  }
}

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

async function importScript() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const scriptData = JSON.parse(text)

      const scriptName = scriptData.name || file.name.replace('.json', '')
      const script = await scriptsStore.createNewScript(
        scriptName,
        scriptData.description || '导入的脚本',
      )

      if (scriptData.actions && Array.isArray(scriptData.actions)) {
        scriptData.actions.forEach((action) => {
          scriptsStore.addAction(script.id, action.type, action.params)
        })
      }

      message.success('脚本已导入')
    } catch (error) {
      message.error('导入脚本失败: ' + error.message)
    }
  }

  input.click()
}

function editScript(scriptId) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }
  editingScript.value = { ...script }
  showEditScriptModal.value = true
}

async function saveEditedScript() {
  if (!editingScript.value.name.trim()) {
    message.warning('请输入脚本名称')
    return
  }
  try {
    await scriptsStore.saveScript(editingScript.value)
    showEditScriptModal.value = false
    editingScript.value = null
    message.success('脚本已更新')
  } catch (error) {
    message.error('更新脚本失败: ' + error.message)
  }
}

function openActionEditor(scriptId, actionIndex = -1) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }

  currentEditingScriptId.value = scriptId

  if (actionIndex >= 0 && script.actions[actionIndex]) {
    editingAction.value = { ...script.actions[actionIndex] }
    isEditingExistingAction.value = true
    actionIndexToEdit.value = actionIndex
    newActionType.value = editingAction.value.type
    newActionParams.value = { ...editingAction.value.params }
  } else {
    editingAction.value = null
    isEditingExistingAction.value = false
    actionIndexToEdit.value = -1
    newActionType.value = availableActions[0]?.type || 'click'
    newActionParams.value = {}
  }

  showActionEditorModal.value = true
}

async function saveAction() {
  if (!currentEditingScriptId.value) return

  try {
    if (isEditingExistingAction.value && actionIndexToEdit.value >= 0) {
      const script = scriptsStore.getScriptById(currentEditingScriptId.value)
      const action = script?.actions[actionIndexToEdit.value]
      if (action) {
        scriptsStore.updateAction(currentEditingScriptId.value, action.id, {
          type: newActionType.value,
          params: newActionParams.value,
        })
      }
    } else {
      scriptsStore.addAction(
        currentEditingScriptId.value,
        newActionType.value,
        newActionParams.value,
      )
    }

    await scriptsStore.saveScript(scriptsStore.getScriptById(currentEditingScriptId.value))
    showActionEditorModal.value = false
    message.success('动作已保存')
  } catch (error) {
    message.error('保存动作失败: ' + error.message)
  }
}

function viewScriptDetails(scriptId) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }
  message.info(`脚本详情: ${script.name}，包含 ${script.actions.length} 个动作`)
}

async function openSidePanel() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDEPANEL })
    if (response.success) {
      message.success('侧边栏已打开')
    }
  } catch (error) {
    message.error('打开侧边栏失败: ' + error.message)
  }
}

async function openSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TOGGLE_OPTIONS })
    if (response.success) {
      message.success(response.message)
    }
  } catch (error) {
    message.error('打开设置页面失败: ' + error.message)
  }
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
      <div class="flex items-center gap-1">
        <n-button text @click="openSidePanel" title="打开侧边栏">
          <n-icon :component="OpenOutline" class="text-xl" />
        </n-button>
        <n-button text @click="openSettings" title="打开设置">
          <n-icon :component="SettingsOutline" class="text-xl" />
        </n-button>
      </div>
    </div>

    <!-- 录制控制区 -->
    <n-card size="small" class="mb-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ isPausedRecording ? '录制已暂停' : isRecording ? '正在录制...' : '准备录制' }}
          </div>
          <div class="text-xs text-gray-500">
            {{
              isPausedRecording
                ? '点击恢复继续录制'
                : isRecording
                  ? '点击页面元素进行录制'
                  : '点击下方按钮开始录制'
            }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <template v-if="isRecording">
            <n-button v-if="!isPausedRecording" size="large" round @click="pauseRecording">
              <template #icon>
                <n-icon :component="PauseOutline" />
              </template>
              暂停
            </n-button>
            <n-button v-else size="large" round type="primary" @click="resumeRecording">
              <template #icon>
                <n-icon :component="PlayCircleOutline" />
              </template>
              恢复
            </n-button>
            <n-button type="error" size="large" round ghost @click="stopRecording">
              <template #icon>
                <n-icon :component="StopOutline" />
              </template>
              停止
            </n-button>
          </template>
          <n-button v-else type="error" size="large" round @click="startRecording">
            <template #icon>
              <n-icon :component="RecordingOutline" />
            </template>
            录制
          </n-button>
        </div>
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
          <div class="flex items-center gap-1">
            <n-button text size="small" @click="importScript">
              <template #icon>
                <n-icon :component="CloudUploadOutline" />
              </template>
              导入
            </n-button>
            <n-button text size="small" @click="showNewScriptModal = true">
              <template #icon>
                <n-icon :component="AddOutline" />
              </template>
              新建
            </n-button>
          </div>
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
              <n-button text size="small" @click="viewScriptDetails(script.id)" title="查看详情">
                <template #icon>
                  <n-icon :component="EyeOutline" />
                </template>
              </n-button>
              <n-button text size="small" @click="executeScript(script.id)" title="执行">
                <template #icon>
                  <n-icon :component="PlayOutline" />
                </template>
              </n-button>
              <n-button text size="small" @click="openActionEditor(script.id)" title="编辑动作">
                <template #icon>
                  <n-icon :component="CodeOutline" />
                </template>
              </n-button>
              <n-button text size="small" @click="cloneScript(script.id)" title="复制">
                <template #icon>
                  <n-icon :component="CopyOutline" />
                </template>
              </n-button>
              <n-button text size="small" @click="editScript(script.id)" title="编辑">
                <template #icon>
                  <n-icon :component="CreateOutline" />
                </template>
              </n-button>
              <n-button text size="small" @click="exportScript(script.id)" title="导出">
                <template #icon>
                  <n-icon :component="DownloadOutline" />
                </template>
              </n-button>
              <n-button
                text
                size="small"
                type="error"
                @click="deleteScript(script.id)"
                title="删除"
              >
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

    <!-- 编辑脚本弹窗 -->
    <n-modal v-model:show="showEditScriptModal" title="编辑脚本" preset="card" class="w-350px">
      <n-form :label-placement="'left'" label-width="80px">
        <n-form-item label="脚本名称">
          <n-input v-model:value="editingScript.name" placeholder="输入脚本名称" />
        </n-form-item>
        <n-form-item label="脚本描述">
          <n-input
            v-model:value="editingScript.description"
            type="textarea"
            placeholder="输入脚本描述"
            :rows="3"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showEditScriptModal = false">取消</n-button>
          <n-button type="primary" @click="saveEditedScript">保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 动作编辑器弹窗 -->
    <n-modal
      v-model:show="showActionEditorModal"
      :title="isEditingExistingAction ? '编辑动作' : '添加动作'"
      preset="card"
      class="w-400px"
    >
      <div class="space-y-4">
        <n-form-item label="动作类型">
          <n-select
            v-model:value="newActionType"
            :options="availableActions"
            label-field="label"
            value-field="type"
          />
        </n-form-item>

        <n-form-item v-if="newActionType" label="动作配置">
          <n-card size="small" class="bg-gray-50 dark:bg-gray-800">
            <div class="text-xs text-gray-500 mb-2">
              {{ ACTION_CONFIG[newActionType]?.description }}
            </div>
            <n-input
              v-model:value="newActionParams"
              type="textarea"
              placeholder='{"key": "value"}'
              :rows="4"
            />
            <div class="text-xs text-gray-400 mt-1">输入 JSON 格式的参数</div>
          </n-card>
        </n-form-item>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showActionEditorModal = false">取消</n-button>
          <n-button type="primary" @click="saveAction">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
