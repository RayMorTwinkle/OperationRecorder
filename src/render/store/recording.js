/**
 * Recording Store - 录制状态管理
 * 管理录制过程中的状态和动作
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { RECORDING_STATUS, createAction } from '../types/actions.js'

export const useRecordingStore = defineStore('recording', () => {
  // State
  const status = ref(RECORDING_STATUS.IDLE)
  const tabId = ref(null)
  const scriptName = ref('')
  const recordedActions = ref([])
  const startTime = ref(null)
  const currentUrl = ref('')

  // Getters
  const isRecording = computed(() => status.value === RECORDING_STATUS.RECORDING)
  const isPaused = computed(() => status.value === RECORDING_STATUS.PAUSED)
  const isIdle = computed(() => status.value === RECORDING_STATUS.IDLE)
  const recordingDuration = computed(() => {
    if (!startTime.value) return 0
    return Date.now() - startTime.value
  })
  const actionCount = computed(() => recordedActions.value.length)

  // Actions
  function startRecording(targetTabId, name = '未命名脚本') {
    status.value = RECORDING_STATUS.RECORDING
    tabId.value = targetTabId
    scriptName.value = name
    recordedActions.value = []
    startTime.value = Date.now()
    currentUrl.value = ''
  }

  function pauseRecording() {
    if (status.value === RECORDING_STATUS.RECORDING) {
      status.value = RECORDING_STATUS.PAUSED
    }
  }

  function resumeRecording() {
    if (status.value === RECORDING_STATUS.PAUSED) {
      status.value = RECORDING_STATUS.RECORDING
    }
  }

  function stopRecording() {
    status.value = RECORDING_STATUS.IDLE
    tabId.value = null
    startTime.value = null
  }

  function addRecordedAction(type, params, metadata = {}) {
    if (status.value !== RECORDING_STATUS.RECORDING) return null

    const action = createAction(type, params)
    action.metadata = {
      timestamp: Date.now(),
      url: metadata.url || currentUrl.value,
      title: metadata.title || '',
      ...metadata,
    }

    recordedActions.value.push(action)
    return action
  }

  function removeRecordedAction(actionId) {
    const index = recordedActions.value.findIndex((a) => a.id === actionId)
    if (index !== -1) {
      recordedActions.value.splice(index, 1)
      return true
    }
    return false
  }

  function updateRecordedAction(actionId, updates) {
    const action = recordedActions.value.find((a) => a.id === actionId)
    if (action) {
      Object.assign(action, updates)
      return true
    }
    return false
  }

  function setCurrentUrl(url) {
    currentUrl.value = url
  }

  function clearRecording() {
    recordedActions.value = []
    scriptName.value = ''
    currentUrl.value = ''
  }

  function getRecordingResult() {
    return {
      name: scriptName.value,
      actions: recordedActions.value,
      startTime: startTime.value,
      endTime: Date.now(),
      duration: recordingDuration.value,
    }
  }

  return {
    // State
    status,
    tabId,
    scriptName,
    recordedActions,
    startTime,
    currentUrl,

    // Getters
    isRecording,
    isPaused,
    isIdle,
    recordingDuration,
    actionCount,

    // Actions
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    addRecordedAction,
    removeRecordedAction,
    updateRecordedAction,
    setCurrentUrl,
    clearRecording,
    getRecordingResult,
  }
})
