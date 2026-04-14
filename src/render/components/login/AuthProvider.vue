<!-- 登录系统 Provider - 按需引入，自动处理所有登录逻辑 -->
<script setup>
import { ref, watch, provide } from 'vue'
import { useAuth, LOGIN_ENABLED } from './useAuth.js'
import LoginModal from './LoginModal.vue'

const props = defineProps({
  fullscreen: { type: Boolean, default: true }, // 全屏遮罩模式
  autoShow: { type: Boolean, default: true }, // 自动弹窗
})

const { user, loading, logout } = useAuth()
const showLoginModal = ref(false)

// 权限检查
const canOperate = () => !LOGIN_ENABLED || !!user.value

// 监听登录状态，已登录时自动关闭弹窗
watch(user, (newUser) => {
  if (newUser) {
    showLoginModal.value = false
  }
})

// 自动显示登录弹窗
watch(
  [loading, user],
  () => {
    if (props.autoShow && !loading.value && !user.value && LOGIN_ENABLED) {
      showLoginModal.value = true
    }
  },
  { immediate: true },
)

// 提供给子组件（可选用 inject 获取）
provide('auth', { user, loading, logout, canOperate })
</script>

<template>
  <!-- 全屏遮罩模式 -->
  <div
    v-if="fullscreen && LOGIN_ENABLED && !user"
    class="h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-50"
  >
    <div class="text-center text-gray-500">
      <div class="text-6xl mb-4">🔐</div>
      <div class="text-lg font-medium">请先登录使用</div>
    </div>
  </div>

  <!-- 正常内容 -->
  <slot v-else :user="user" :loading="loading" :can-operate="canOperate" :logout="logout"></slot>

  <!-- 登录弹窗 -->
  <LoginModal v-model:show="showLoginModal" @success="(u) => (user = u)" />
</template>
