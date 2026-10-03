<script setup>
import { ref, onMounted } from 'vue'
import {
  SettingsOutline,
  ServerOutline,
  TimeOutline,
  RefreshOutline,
  DownloadOutline,
  CloudUploadOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { useSettingsStore } from '../../store/settings.js'
import OptionsContent from './OptionsContent.vue'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.loadSettings()
})
</script>

<template>
  <n-message-provider>
    <OptionsContent />
  </n-message-provider>
</template>
