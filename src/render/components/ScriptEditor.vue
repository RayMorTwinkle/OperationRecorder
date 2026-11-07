<script setup>
import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import {
  PlayOutline,
  SaveOutline,
  TrashOutline,
  AddOutline,
  CloseOutline,
  ArrowUpOutline,
  ArrowDownOutline,
} from '@vicons/ionicons5'
import { useScriptsStore } from '../store/scripts.js'
import { ACTION_TYPES } from '../types/actions.js'

const props = defineProps({
  scriptId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close', 'save'])

const message = useMessage()
const scriptsStore = useScriptsStore()

// 获取脚本
const script = computed(() => scriptsStore.getScriptById(props.scriptId))

// 编辑状态
const editedName = ref('')
const editedDescription = ref('')
const isEditing = ref(false)

// 初始化编辑状态
if (script.value) {
  editedName.value = script.value.name
  editedDescription.value = script.value.description || ''
}

// 开始编辑
function startEdit() {
  isEditing.value = true
  editedName.value = script.value.name
  editedDescription.value = script.value.description || ''
}

// 保存脚本基本信息
async function saveScriptInfo() {
  if (!editedName.value.trim()) {
    message.warning('脚本名称不能为空')
    return
  }

  try {
    const updatedScript = {
      ...script.value,
      name: editedName.value.trim(),
      description: editedDescription.value.trim(),
      updatedAt: Date.now(),
    }
    await scriptsStore.saveScript(updatedScript)
    isEditing.value = false
    message.success('脚本信息已保存')
  } catch (error) {
    message.error('保存失败: ' + error.message)
  }
}

// 删除动作
async function removeAction(actionId) {
  try {
    await scriptsStore.removeAction(props.scriptId, actionId)
    message.success('动作已删除')
  } catch (error) {
    message.error('删除失败: ' + error.message)
  }
}

// 上移动作
async function moveActionUp(index) {
  if (index === 0) return
  try {
    await scriptsStore.moveAction(props.scriptId, script.value.actions[index].id, index - 1)
    message.success('动作已上移')
  } catch (error) {
    message.error('移动失败: ' + error.message)
  }
}

// 下移动作
async function moveActionDown(index) {
  if (index >= script.value.actions.length - 1) return
  try {
    await scriptsStore.moveAction(props.scriptId, script.value.actions[index].id, index + 1)
    message.success('动作已下移')
  } catch (error) {
    message.error('移动失败: ' + error.message)
  }
}

// 获取动作类型配置
function getActionTypeConfig(type) {
  return ACTION_TYPES[type] || { label: type, color: 'gray' }
}

// 格式化动作参数显示
function formatActionParams(action) {
  const params = action.params || {}
  const parts = []

  switch (action.type) {
    case 'navigate':
      parts.push(params.url || '未设置URL')
      break
    case 'click':
    case 'input':
      parts.push(params.selector || '未设置选择器')
      if (params.value) parts.push(`值: ${params.value}`)
      break
    case 'wait':
      if (params.duration) parts.push(`${params.duration}ms`)
      if (params.selector) parts.push(`等待元素: ${params.selector}`)
      break
    case 'scroll':
      parts.push(`x: ${params.x || 0}, y: ${params.y || 0}`)
      break
    case 'keypress':
      parts.push(params.key || '未设置按键')
      break
    default:
      parts.push(JSON.stringify(params))
  }

  return parts.join(' | ')
}

// 执行脚本
async function executeScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      message.error('无法获取当前标签页')
      return
    }

    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_SCRIPT',
      scriptId: props.scriptId,
      tabId: tab.id,
    })

    if (response.success) {
      message.success('脚本执行成功')
    } else {
      message.error('脚本执行失败: ' + response.message)
    }
  } catch (error) {
    message.error('执行失败: ' + error.message)
  }
}
</script>

<template>
  <div class="script-editor">
    <!-- 头部 -->
    <div class="editor-header">
      <div class="header-left">
        <h3 v-if="!isEditing" class="script-name">{{ script?.name }}</h3>
        <n-input v-else v-model:value="editedName" placeholder="脚本名称" class="name-input" />
        <p v-if="!isEditing" class="script-description">{{ script?.description || '无描述' }}</p>
        <n-input
          v-else
          v-model:value="editedDescription"
          placeholder="脚本描述"
          type="textarea"
          :rows="2"
          class="description-input"
        />
      </div>
      <div class="header-actions">
        <template v-if="!isEditing">
          <n-button size="small" @click="startEdit">
            <template #icon>
              <n-icon :component="SaveOutline" />
            </template>
            编辑
          </n-button>
        </template>
        <template v-else>
          <n-button size="small" type="primary" @click="saveScriptInfo">保存</n-button>
          <n-button size="small" @click="isEditing = false">取消</n-button>
        </template>
        <n-button size="small" type="primary" @click="executeScript">
          <template #icon>
            <n-icon :component="PlayOutline" />
          </template>
          执行
        </n-button>
        <n-button size="small" @click="$emit('close')">
          <template #icon>
            <n-icon :component="CloseOutline" />
          </template>
        </n-button>
      </div>
    </div>

    <!-- 动作列表 -->
    <div class="actions-list">
      <div class="list-header">
        <span class="list-title">动作列表 ({{ script?.actions?.length || 0 }})</span>
      </div>

      <div v-if="!script?.actions?.length" class="empty-state">
        <n-icon :component="AddOutline" class="empty-icon" />
        <p>暂无动作</p>
        <p class="empty-hint">录制脚本或手动添加动作</p>
      </div>

      <div v-else class="actions-container">
        <div v-for="(action, index) in script.actions" :key="action.id" class="action-item">
          <div class="action-index">{{ index + 1 }}</div>
          <div class="action-content">
            <div class="action-type">
              <n-tag :type="getActionTypeConfig(action.type).color" size="small">
                {{ getActionTypeConfig(action.type).label }}
              </n-tag>
            </div>
            <div class="action-params">{{ formatActionParams(action) }}</div>
          </div>
          <div class="action-actions">
            <n-button text size="tiny" @click="moveActionUp(index)" :disabled="index === 0">
              <template #icon>
                <n-icon :component="ArrowUpOutline" />
              </template>
            </n-button>
            <n-button
              text
              size="tiny"
              @click="moveActionDown(index)"
              :disabled="index >= script.actions.length - 1"
            >
              <template #icon>
                <n-icon :component="ArrowDownOutline" />
              </template>
            </n-button>
            <n-button text size="tiny" type="error" @click="removeAction(action.id)">
              <template #icon>
                <n-icon :component="TrashOutline" />
              </template>
            </n-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.script-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.header-left {
  flex: 1;
  margin-right: 16px;
}

.script-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.script-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.name-input {
  width: 100%;
  margin-bottom: 8px;
}

.description-input {
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.actions-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.list-header {
  margin-bottom: 12px;
}

.list-title {
  font-weight: 600;
  color: #333;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.action-index {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-right: 12px;
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-type {
  margin-bottom: 4px;
}

.action-params {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}
</style>
