<script setup lang="js">
import { ref } from 'vue'
import { CloseOutline } from '@vicons/ionicons5'
import { useAuth, LOGIN_ENABLED } from '../../components/login/useAuth.js'
import LoginModal from '../../components/login/LoginModal.vue'
import Counter from '../../components/Counter.vue'

const { user, loading, logout } = useAuth()
const showLogin = ref(false)

// 未登录时自动显示登录弹窗
if (LOGIN_ENABLED && !loading.value && !user.value) {
  showLogin.value = true
}

// 关闭侧边栏
const closeSidePanel = () => {
  window.close()
}

// 处理登出
const handleLogout = async () => {
  await logout()
}
</script>

<template>
  <div
    class="h-screen overflow-y-auto scrollbar-hide from-indigo-50 to-blue-50 bg-gradient-to-b p-6 dark:from-gray-900 dark:to-gray-800"
  >
    <div class="mx-auto max-w-md">
      <!-- 头部 -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl text-gray-800 font-bold dark:text-gray-100">SidePanel 页面</h2>
          <p v-if="user" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            欢迎，{{ user.userName }}
          </p>
        </div>
        <n-button text circle @click="closeSidePanel" title="关闭侧边栏">
          <template #icon>
            <n-icon :size="24"><CloseOutline /></n-icon>
          </template>
        </n-button>
      </div>

      <!-- 主要内容 -->
      <n-card :bordered="false" class="shadow-lg mb-4">
        <Counter title="计数器示例" />
      </n-card>

      <!-- 用户信息卡片 -->
      <n-card v-if="user" :bordered="false" class="shadow-lg">
        <template #header>
          <div class="flex items-center justify-between">
            <span>用户信息</span>
            <n-button size="small" @click="handleLogout"> 退出登录 </n-button>
          </div>
        </template>

        <n-space vertical :size="12">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">用户 ID：</span>
            <span class="font-medium">{{ user.userId }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">用户名：</span>
            <span class="font-medium">{{ user.userName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">登录时间：</span>
            <span class="text-sm">{{
              user.loginTime ? new Date(user.loginTime).toLocaleString() : '-'
            }}</span>
          </div>
        </n-space>
      </n-card>

      <!-- 登录弹窗 -->
      <LoginModal v-model:show="showLogin" />
    </div>
  </div>
</template>
