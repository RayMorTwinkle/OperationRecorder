<script setup lang="js">
import {
  AddCircleOutline,
  RemoveCircleOutline,
  RefreshOutline,
  SettingsOutline,
  MenuOutline,
} from '@vicons/ionicons5'
import { useCounter } from '@/composables/useStorage'
import { MESSAGE_TYPES } from '@/types/messages.js'

defineProps({
  title: {
    type: String,
    default: '计数器',
  },
})

const { count, increment, decrement, reset, loading } = useCounter('global-counter', 0)

// 打开/关闭设置页面
const openOptions = () => {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TOGGLE_OPTIONS })
}

// 打开侧边栏（关闭需在侧边栏内点击关闭按钮）
const openSidePanel = () => {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDEPANEL })
}
</script>

<template>
  <n-space vertical :size="20" align="center" class="w-full">
    <n-statistic :label="title" tabular-nums class="text-center">
      <n-number-animation :from="0" :to="count" :duration="300" :active="true" />
    </n-statistic>
    <n-button-group>
      <n-button type="success" :loading="loading" @click="increment" strong>
        <template #icon>
          <n-icon><AddCircleOutline /></n-icon>
        </template>
        增加
      </n-button>
      <n-button type="warning" :loading="loading" @click="decrement" strong>
        <template #icon>
          <n-icon><RemoveCircleOutline /></n-icon>
        </template>
        减少
      </n-button>
      <n-button type="info" :loading="loading" @click="reset" strong>
        <template #icon>
          <n-icon><RefreshOutline /></n-icon>
        </template>
        重置
      </n-button>
    </n-button-group>
    <n-divider class="my-2" />
    <n-space :size="12">
      <n-button type="primary" @click="openSidePanel" strong>
        <template #icon>
          <n-icon><MenuOutline /></n-icon>
        </template>
        侧边栏
      </n-button>
      <n-button type="default" @click="openOptions" strong>
        <template #icon>
          <n-icon><SettingsOutline /></n-icon>
        </template>
        设置
      </n-button>
    </n-space>
  </n-space>
</template>
