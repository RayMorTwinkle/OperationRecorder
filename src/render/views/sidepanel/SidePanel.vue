<script setup>
import { ref, onMounted, computed } from 'vue'
import { useMessage } from 'naive-ui'
import {
  CloseOutline,
  PlayOutline,
  StopOutline,
  RecordingOutline,
  SettingsOutline,
  ListOutline,
  AddOutline,
  TrashOutline,
  DownloadOutline,
  CloudUploadOutline,
  CreateOutline,
  EyeOutline,
  CopyOutline,
  PauseOutline,
  PlayCircleOutline,
  TimeOutline,
  CodeOutline,
  CalendarOutline,
  ListCircleOutline,
} from '@vicons/ionicons5'
import { useScriptsStore } from '../../store/scripts.js'
import { MESSAGE_TYPES } from '../../types/messages.js'
import {
  MESSAGE_TYPES as ACTION_MESSAGE_TYPES,
  ACTION_TYPES,
  ACTION_CONFIG,
} from '../../types/actions.js'

const message = useMessage()
const scriptsStore = useScriptsStore()

const showNewScriptModal = ref(false)
const showEditScriptModal = ref(false)
const showScriptDetailsModal = ref(false)
const showActionEditorModal = ref(false)
const showVariableManagerModal = ref(false)
const showScheduleModal = ref(false)
const showExecutionHistoryModal = ref(false)

const newScriptName = ref('')
const editingScript = ref(null)
const selectedScript = ref(null)
const isRecording = ref(false)
const isPausedRecording = ref(false)
const isExecuting = ref(false)
const isPausedExecuting = ref(false)
const searchQuery = ref('')
const activeTab = ref('scripts')
const executionProgress = ref(0)
const editingAction = ref(null)
const isEditingExistingAction = ref(false)
const actionIndexToEdit = ref(-1)
const newActionType = ref(ACTION_TYPES.CLICK)
const newActionParams = ref({})

// 定时任务相关
const isScheduleEnabled = ref(false)
const scheduleType = ref('interval')
const cronExpression = ref('0 0 * * *')
const intervalValue = ref(1)
const intervalUnit = ref('hour')
const scheduleTime = ref(null)
const executionTab = ref('current')

const scheduleOptions = [
  { label: 'Cron 表达式', value: 'cron' },
  { label: '间隔执行', value: 'interval' },
  { label: '单次执行', value: 'once' },
]

const intervalOptions = [
  { label: '分钟', value: 'minute' },
  { label: '小时', value: 'hour' },
  { label: '天', value: 'day' },
  { label: '周', value: 'week' },
]

const executionTabOptions = [
  { label: '当前标签页', value: 'current' },
  { label: '新标签页', value: 'new' },
  { label: '后台标签页', value: 'background' },
]

const filteredScripts = computed(() => {
  if (!searchQuery.value) return scriptsStore.scriptList
  return scriptsStore.scriptList.filter(
    (script) =>
      script.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (script.description &&
        script.description.toLowerCase().includes(searchQuery.value.toLowerCase())),
  )
})

onMounted(() => {
  scriptsStore.loadScripts()
})

function formatTime(timestamp) {
  if (!timestamp) return '从未'
  return new Date(timestamp).toLocaleString()
}

function closeSidePanel() {
  window.close()
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
  const startTime = Date.now()
  let status = 'success'
  let errorMessage = null

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

    isExecuting.value = true
    isPausedExecuting.value = false
    executionProgress.value = 0
    message.loading('正在执行脚本...', { duration: 0 })

    const totalActions = script.actions.length
    for (let i = 0; i < totalActions; i++) {
      executionProgress.value = Math.round(((i + 1) / totalActions) * 100)
    }

    const response = await chrome.runtime.sendMessage({
      type: ACTION_MESSAGE_TYPES.EXECUTE_SCRIPT,
      scriptId,
      tabId: tab.id,
    })

    if (response.success) {
      message.success('脚本执行成功')
    } else {
      status = 'failed'
      errorMessage = response.message
      message.error('脚本执行失败: ' + response.message)
    }
  } catch (error) {
    status = 'failed'
    errorMessage = error.message
    message.error('执行脚本失败: ' + error.message)
  } finally {
    const duration = Date.now() - startTime
    scriptsStore.addExecutionHistory(scriptId, status, duration, errorMessage)
    await scriptsStore.saveScript(scriptsStore.getScriptById(scriptId))
    isExecuting.value = false
    isPausedExecuting.value = false
    executionProgress.value = 0
  }
}

async function pauseExecution() {
  isPausedExecuting.value = true
  message.info('执行已暂停')
}

async function resumeExecution() {
  isPausedExecuting.value = false
  message.info('执行已恢复')
}

async function deleteScript(scriptId) {
  try {
    await scriptsStore.deleteScript(scriptId)
    if (selectedScript.value?.id === scriptId) {
      selectedScript.value = null
    }
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
    if (selectedScript.value?.id === editingScript.value.id) {
      selectedScript.value = scriptsStore.getScriptById(editingScript.value.id)
    }
    editingScript.value = null
    message.success('脚本已更新')
  } catch (error) {
    message.error('更新脚本失败: ' + error.message)
  }
}

function viewScriptDetails(scriptId) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }
  selectedScript.value = script
  showScriptDetailsModal.value = true
}

function selectScript(scriptId) {
  const script = scriptsStore.getScriptById(scriptId)
  if (script) {
    selectedScript.value = script
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

function openActionEditor(scriptId, actionIndex = -1) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }

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
    newActionType.value = ACTION_TYPES.CLICK
    newActionParams.value = {}
  }

  selectedScript.value = script
  showActionEditorModal.value = true
}

async function saveAction() {
  if (!selectedScript.value) return

  try {
    if (isEditingExistingAction.value && actionIndexToEdit.value >= 0) {
      const action = selectedScript.value.actions[actionIndexToEdit.value]
      if (action) {
        scriptsStore.updateAction(selectedScript.value.id, action.id, {
          type: newActionType.value,
          params: newActionParams.value,
        })
      }
    } else {
      scriptsStore.addAction(selectedScript.value.id, newActionType.value, newActionParams.value)
    }

    await scriptsStore.saveScript(selectedScript.value)
    showActionEditorModal.value = false
    message.success('动作已保存')
  } catch (error) {
    message.error('保存动作失败: ' + error.message)
  }
}

function deleteAction(scriptId, actionIndex) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script || !script.actions[actionIndex]) return

  const action = script.actions[actionIndex]
  scriptsStore.removeAction(scriptId, action.id)
  scriptsStore.saveScript(script)
  message.success('动作已删除')
}

function openVariableManager(scriptId) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }
  selectedScript.value = script
  showVariableManagerModal.value = true
}

function openExecutionHistory(scriptId) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }
  selectedScript.value = script
  showExecutionHistoryModal.value = true
}

// 变量管理
function addNewVariable() {
  if (!selectedScript.value) return

  const newVar = {
    name: `变量${selectedScript.value.variables.length + 1}`,
    type: 'string',
    value: '',
  }
  selectedScript.value.variables.push(newVar)
}

function editVariable() {
  // 这里可以添加更复杂的编辑逻辑，比如弹窗编辑
  message.info('编辑变量功能即将完善')
}

function removeVariable(variableName) {
  if (!selectedScript.value) return

  const index = selectedScript.value.variables.findIndex((v) => v.name === variableName)
  if (index !== -1) {
    selectedScript.value.variables.splice(index, 1)
    message.success('变量已删除')
  }
}

async function saveVariables() {
  if (!selectedScript.value) return

  try {
    await scriptsStore.saveScript(selectedScript.value)
    message.success('变量已保存')
    showVariableManagerModal.value = false
  } catch (error) {
    message.error('保存变量失败: ' + error.message)
  }
}

async function clearExecutionHistory() {
  if (!selectedScript.value) return

  try {
    scriptsStore.clearExecutionHistory(selectedScript.value.id)
    await scriptsStore.saveScript(selectedScript.value)
    message.success('执行历史已清空')
  } catch (error) {
    message.error('清空执行历史失败: ' + error.message)
  }
}

// 定时任务方法
function formatSchedule(schedule) {
  if (!schedule) return '无'

  switch (schedule.type) {
    case 'cron':
      return `Cron: ${schedule.expression}`
    case 'interval':
      return `间隔: ${schedule.value} ${schedule.unit}`
    case 'once':
      return `单次: ${new Date(schedule.time).toLocaleString()}`
    default:
      return '未知'
  }
}

async function saveSchedule() {
  if (!selectedScript.value) return

  try {
    let schedule = null
    if (isScheduleEnabled.value) {
      switch (scheduleType.value) {
        case 'cron':
          schedule = {
            type: 'cron',
            expression: cronExpression.value,
            executionTab: executionTab.value,
          }
          break
        case 'interval':
          schedule = {
            type: 'interval',
            value: intervalValue.value,
            unit: intervalUnit.value,
            executionTab: executionTab.value,
          }
          break
        case 'once':
          schedule = {
            type: 'once',
            time: scheduleTime.value?.getTime(),
            executionTab: executionTab.value,
          }
          break
      }
    }

    scriptsStore.setSchedule(selectedScript.value.id, schedule)
    await scriptsStore.saveScript(selectedScript.value)
    message.success('定时任务已保存')
    showScheduleModal.value = false
  } catch (error) {
    message.error('保存定时任务失败: ' + error.message)
  }
}

function openScheduleManager(scriptId) {
  const script = scriptsStore.getScriptById(scriptId)
  if (!script) {
    message.error('脚本不存在')
    return
  }

  selectedScript.value = script

  // 初始化定时任务状态
  if (script.schedule) {
    isScheduleEnabled.value = true
    scheduleType.value = script.schedule.type
    executionTab.value = script.schedule.executionTab || 'current'

    switch (script.schedule.type) {
      case 'cron':
        cronExpression.value = script.schedule.expression || '0 0 * * *'
        break
      case 'interval':
        intervalValue.value = script.schedule.value || 1
        intervalUnit.value = script.schedule.unit || 'hour'
        break
      case 'once':
        scheduleTime.value = script.schedule.time ? new Date(script.schedule.time) : null
        break
    }
  } else {
    isScheduleEnabled.value = false
    scheduleType.value = 'interval'
    cronExpression.value = '0 0 * * *'
    intervalValue.value = 1
    intervalUnit.value = 'hour'
    scheduleTime.value = null
    executionTab.value = 'current'
  }

  showScheduleModal.value = true
}

const availableActions = Object.entries(ACTION_CONFIG).map(([type, config]) => ({
  type,
  label: config.label,
  description: config.description,
}))
</script>

<template>
  <div
    class="h-screen overflow-y-auto scrollbar-hide from-indigo-50 to-blue-50 bg-gradient-to-b dark:from-gray-900 dark:to-gray-800 flex flex-col"
  >
    <div class="flex-1 flex flex-col p-4">
      <!-- 头部 -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center"
          >
            <n-icon :component="RecordingOutline" class="text-white text-xl" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">OperationRecorder</h2>
            <p class="text-xs text-gray-500">侧边栏模式</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <n-button text @click="openSettings" title="设置">
            <n-icon :component="SettingsOutline" class="text-xl" />
          </n-button>
          <n-button text circle @click="closeSidePanel" title="关闭侧边栏">
            <n-icon :size="20"><CloseOutline /></n-icon>
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

      <!-- 标签页 -->
      <n-tabs v-model:value="activeTab" type="card" size="small" class="mb-4">
        <n-tab-pane name="scripts" tab="脚本列表">
          <!-- 搜索框 -->
          <div class="mb-3">
            <n-input v-model:value="searchQuery" placeholder="搜索脚本..." clearable size="small">
              <template #prefix>
                <n-icon component="SearchOutline" />
              </template>
            </n-input>
          </div>

          <!-- 脚本操作按钮 -->
          <div class="flex gap-2 mb-3">
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

          <!-- 脚本列表 -->
          <div v-if="filteredScripts.length === 0" class="py-8 text-center text-gray-500">
            <n-icon :component="ListOutline" class="text-4xl mb-2 opacity-50" />
            <div class="text-sm">暂无脚本</div>
            <div class="text-xs mt-1">点击录制按钮或新建按钮创建脚本</div>
          </div>

          <div v-else class="space-y-2 max-h-500px overflow-y-auto">
            <div
              v-for="script in filteredScripts"
              :key="script.id"
              :class="[
                'p-3 rounded-lg transition-colors cursor-pointer',
                selectedScript?.id === script.id
                  ? 'bg-blue-100 dark:bg-blue-900/50'
                  : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800',
              ]"
              @click="selectScript(script.id)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">{{ script.name }}</div>
                  <div class="text-xs text-gray-500">
                    {{ script.actions.length }} 个动作 · {{ formatTime(script.updatedAt) }}
                  </div>
                  <div
                    v-if="script.tags && script.tags.length > 0"
                    class="flex flex-wrap gap-1 mt-1"
                  >
                    <n-tag v-for="tag in script.tags" :key="tag" size="tiny" type="info">
                      {{ tag }}
                    </n-tag>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <n-button
                    text
                    size="small"
                    @click.stop="viewScriptDetails(script.id)"
                    title="查看详情"
                  >
                    <template #icon>
                      <n-icon :component="EyeOutline" />
                    </template>
                  </n-button>
                  <n-button
                    text
                    size="small"
                    :disabled="isExecuting"
                    @click.stop="executeScript(script.id)"
                    title="执行"
                  >
                    <template #icon>
                      <n-icon :component="PlayOutline" />
                    </template>
                  </n-button>
                  <n-button
                    text
                    size="small"
                    @click.stop="openActionEditor(script.id)"
                    title="编辑动作"
                  >
                    <template #icon>
                      <n-icon :component="CodeOutline" />
                    </template>
                  </n-button>
                  <n-button text size="small" @click.stop="cloneScript(script.id)" title="复制">
                    <template #icon>
                      <n-icon :component="CopyOutline" />
                    </template>
                  </n-button>
                  <n-button text size="small" @click.stop="editScript(script.id)" title="编辑">
                    <template #icon>
                      <n-icon :component="CreateOutline" />
                    </template>
                  </n-button>
                  <n-button text size="small" @click.stop="exportScript(script.id)" title="导出">
                    <template #icon>
                      <n-icon :component="DownloadOutline" />
                    </template>
                  </n-button>
                  <n-button
                    text
                    size="small"
                    type="error"
                    @click.stop="deleteScript(script.id)"
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
        </n-tab-pane>

        <n-tab-pane name="details" tab="脚本详情">
          <div v-if="!selectedScript" class="py-8 text-center text-gray-500">
            <div class="text-sm">请选择一个脚本</div>
          </div>
          <div v-else class="space-y-4">
            <n-card size="small" :bordered="false">
              <div class="space-y-3">
                <div>
                  <div class="text-sm text-gray-500">脚本名称</div>
                  <div class="font-medium">{{ selectedScript.name }}</div>
                </div>
                <div v-if="selectedScript.description">
                  <div class="text-sm text-gray-500">描述</div>
                  <div>{{ selectedScript.description }}</div>
                </div>
                <div>
                  <div class="text-sm text-gray-500">动作数量</div>
                  <div>{{ selectedScript.actions.length }} 个</div>
                </div>
                <div>
                  <div class="text-sm text-gray-500">创建时间</div>
                  <div>{{ formatTime(selectedScript.createdAt) }}</div>
                </div>
                <div>
                  <div class="text-sm text-gray-500">更新时间</div>
                  <div>{{ formatTime(selectedScript.updatedAt) }}</div>
                </div>
                <div>
                  <div class="text-sm text-gray-500">最后执行</div>
                  <div>{{ formatTime(selectedScript.lastExecutionTime) }}</div>
                </div>
                <div v-if="selectedScript.tags && selectedScript.tags.length > 0">
                  <div class="text-sm text-gray-500">标签</div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <n-tag v-for="tag in selectedScript.tags" :key="tag" size="small">
                      {{ tag }}
                    </n-tag>
                  </div>
                </div>

                <div class="flex gap-2 pt-2">
                  <n-button size="small" @click="openActionEditor(selectedScript.id)">
                    <template #icon>
                      <n-icon :component="CodeOutline" />
                    </template>
                    编辑动作
                  </n-button>
                  <n-button size="small" @click="openVariableManager(selectedScript.id)">
                    <template #icon>
                      <n-icon :component="ListCircleOutline" />
                    </template>
                    变量管理
                  </n-button>
                  <n-button size="small" @click="openScheduleManager(selectedScript.id)">
                    <template #icon>
                      <n-icon :component="CalendarOutline" />
                    </template>
                    定时任务
                  </n-button>
                  <n-button size="small" @click="openExecutionHistory(selectedScript.id)">
                    <template #icon>
                      <n-icon :component="TimeOutline" />
                    </template>
                    执行历史
                  </n-button>
                </div>
              </div>
            </n-card>

            <n-card size="small" :bordered="false" title="动作列表">
              <div
                v-if="selectedScript.actions.length === 0"
                class="py-4 text-center text-gray-500 text-sm"
              >
                暂无动作
              </div>
              <div v-else class="space-y-2 max-h-300px overflow-y-auto">
                <div
                  v-for="(action, index) in selectedScript.actions"
                  :key="action.id"
                  class="p-2 rounded bg-gray-50 dark:bg-gray-800 text-sm"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-gray-500">#{{ index + 1 }}</span>
                      <span class="font-medium">{{
                        ACTION_CONFIG[action.type]?.label || action.type
                      }}</span>
                    </div>
                    <div class="flex gap-1">
                      <n-button
                        text
                        size="tiny"
                        @click="openActionEditor(selectedScript.id, index)"
                      >
                        编辑
                      </n-button>
                      <n-button
                        text
                        size="tiny"
                        type="error"
                        @click="deleteAction(selectedScript.id, index)"
                      >
                        删除
                      </n-button>
                    </div>
                  </div>
                  <div v-if="action.params" class="mt-1 text-xs text-gray-500">
                    {{ JSON.stringify(action.params) }}
                  </div>
                </div>
              </div>
            </n-card>
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>

    <!-- 执行进度条 -->
    <div
      v-if="isExecuting"
      class="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <div class="flex items-center gap-3">
        <div class="flex-1">
          <div class="text-sm font-medium mb-1">正在执行脚本...</div>
          <n-progress :percentage="executionProgress" :show-indicator="false" />
        </div>
        <div class="text-sm text-gray-500">{{ executionProgress }}%</div>
        <n-button v-if="!isPausedExecuting" size="small" @click="pauseExecution">
          <template #icon>
            <n-icon :component="PauseOutline" />
          </template>
        </n-button>
        <n-button v-else size="small" type="primary" @click="resumeExecution">
          <template #icon>
            <n-icon :component="PlayCircleOutline" />
          </template>
        </n-button>
      </div>
    </div>

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
        <n-form-item label="标签">
          <n-select
            v-model:value="editingScript.tags"
            placeholder="输入标签，按回车添加"
            multiple
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

    <!-- 脚本详情弹窗 -->
    <n-modal v-model:show="showScriptDetailsModal" title="脚本详情" preset="card" class="w-400px">
      <div v-if="selectedScript" class="space-y-4">
        <div>
          <div class="text-sm text-gray-500">脚本名称</div>
          <div class="font-medium">{{ selectedScript.name }}</div>
        </div>
        <div v-if="selectedScript.description">
          <div class="text-sm text-gray-500">描述</div>
          <div>{{ selectedScript.description }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">动作数量</div>
          <div>{{ selectedScript.actions.length }} 个</div>
        </div>
        <div>
          <div class="text-sm text-gray-500">动作列表</div>
          <div class="space-y-2 max-h-300px overflow-y-auto mt-2">
            <div
              v-for="(action, index) in selectedScript.actions"
              :key="action.id"
              class="p-2 rounded bg-gray-50 dark:bg-gray-800 text-sm"
            >
              <div class="flex items-center gap-2">
                <span class="font-mono text-gray-500">#{{ index + 1 }}</span>
                <span class="font-medium">{{
                  ACTION_CONFIG[action.type]?.label || action.type
                }}</span>
              </div>
              <div v-if="action.params" class="mt-1 text-xs text-gray-500">
                {{ JSON.stringify(action.params) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <n-button @click="showScriptDetailsModal = false">关闭</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 动作编辑器弹窗 -->
    <n-modal
      v-model:show="showActionEditorModal"
      :title="isEditingExistingAction ? '编辑动作' : '添加动作'"
      preset="card"
      class="w-450px"
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

    <!-- 变量管理弹窗 -->
    <n-modal v-model:show="showVariableManagerModal" title="变量管理" preset="card" class="w-400px">
      <div v-if="selectedScript" class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-medium">变量列表</h3>
          <n-button size="small" @click="addNewVariable">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            添加变量
          </n-button>
        </div>

        <div
          v-if="selectedScript.variables.length === 0"
          class="py-4 text-center text-gray-500 text-sm"
        >
          暂无变量
        </div>

        <div v-else class="space-y-2 max-h-300px overflow-y-auto">
          <div
            v-for="variable in selectedScript.variables"
            :key="variable.name"
            class="p-3 rounded bg-gray-50 dark:bg-gray-800"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-sm">{{ variable.name }}</div>
                <div class="text-xs text-gray-500">{{ variable.type }}</div>
              </div>
              <div class="flex gap-1">
                <n-button text size="tiny" @click="editVariable(variable)"> 编辑 </n-button>
                <n-button text size="tiny" type="error" @click="removeVariable(variable.name)">
                  删除
                </n-button>
              </div>
            </div>
            <div class="mt-1">
              <n-input v-model:value="variable.value" placeholder="变量值" size="small" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showVariableManagerModal = false">关闭</n-button>
          <n-button type="primary" @click="saveVariables">保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 定时任务弹窗 -->
    <n-modal v-model:show="showScheduleModal" title="定时任务" preset="card" class="w-400px">
      <div v-if="selectedScript" class="space-y-4">
        <div class="flex items-center gap-2">
          <n-switch v-model:value="isScheduleEnabled" />
          <span class="text-sm">启用定时任务</span>
        </div>

        <div v-if="isScheduleEnabled" class="space-y-3">
          <n-form-item label="执行频率">
            <n-select v-model:value="scheduleType" :options="scheduleOptions" />
          </n-form-item>

          <n-form-item v-if="scheduleType === 'cron'" label="Cron 表达式">
            <n-input v-model:value="cronExpression" placeholder="例如: 0 0 * * * (每天午夜)" />
            <div class="text-xs text-gray-500 mt-1">格式: 分 时 日 月 周</div>
          </n-form-item>

          <n-form-item v-else-if="scheduleType === 'interval'" label="间隔时间">
            <div class="flex gap-2">
              <n-input v-model:value="intervalValue" type="number" min="1" />
              <n-select v-model:value="intervalUnit" :options="intervalOptions" />
            </div>
          </n-form-item>

          <n-form-item v-else-if="scheduleType === 'once'" label="执行时间">
            <n-date-picker v-model:value="scheduleTime" type="datetime" />
          </n-form-item>

          <n-form-item label="执行标签页">
            <n-select v-model:value="executionTab" :options="executionTabOptions" />
          </n-form-item>
        </div>

        <div
          v-if="selectedScript.schedule"
          class="p-3 rounded bg-blue-50 dark:bg-blue-900/30 text-sm"
        >
          <div class="font-medium mb-1">当前定时任务</div>
          <div>{{ formatSchedule(selectedScript.schedule) }}</div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showScheduleModal = false">取消</n-button>
          <n-button type="primary" @click="saveSchedule">保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 执行历史弹窗 -->
    <n-modal
      v-model:show="showExecutionHistoryModal"
      title="执行历史"
      preset="card"
      class="w-400px"
    >
      <div v-if="selectedScript" class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-medium">执行记录</h3>
          <n-button size="small" @click="clearExecutionHistory"> 清空历史 </n-button>
        </div>

        <div
          v-if="!selectedScript.executionHistory || selectedScript.executionHistory.length === 0"
          class="py-4 text-center text-gray-500 text-sm"
        >
          暂无执行记录
        </div>

        <div v-else class="space-y-2 max-h-300px overflow-y-auto">
          <div
            v-for="history in selectedScript.executionHistory"
            :key="history.id"
            class="p-3 rounded bg-gray-50 dark:bg-gray-800"
          >
            <div class="flex items-center justify-between">
              <div class="font-medium text-sm">{{ formatTime(history.timestamp) }}</div>
              <n-tag :type="history.status === 'success' ? 'success' : 'error'" size="small">
                {{ history.status === 'success' ? '成功' : '失败' }}
              </n-tag>
            </div>
            <div class="mt-1 text-xs text-gray-500">
              执行时长: {{ Math.round(history.duration / 1000) }} 秒
            </div>
            <div v-if="history.error" class="mt-1 text-xs text-red-500">
              错误: {{ history.error }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <n-button @click="showExecutionHistoryModal = false">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
