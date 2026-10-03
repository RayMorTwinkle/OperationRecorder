<script setup>
import { ref, onMounted } from 'vue'
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
  CloudUploadOutline,
} from '@vicons/ionicons5'
import { useScriptsStore } from '../../store/scripts.js'
import { useRecordingStore } from '../../store/recording.js'
import PopupContent from './PopupContent.vue'

const scriptsStore = useScriptsStore()
const recordingStore = useRecordingStore()

onMounted(() => {
  scriptsStore.loadScripts()
})
</script>

<template>
  <n-message-provider>
    <PopupContent />
  </n-message-provider>
</template>
