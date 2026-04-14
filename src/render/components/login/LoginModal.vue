<!-- 极简登录弹窗 - 纯JS实现 -->
<script setup>
import { ref, watch } from 'vue'
import { createDiscreteApi } from 'naive-ui'
import { saveUser } from './auth.js'

const props = defineProps({
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'success'])
const { message } = createDiscreteApi(['message'])

const userId = ref('')
const userSecret = ref('')
const loading = ref(false)

// 加载保存的账号密码
const loadSaved = async () => {
  const { savedCredentials } = await chrome.storage.local.get('savedCredentials')
  if (savedCredentials) {
    userId.value = savedCredentials.userId || ''
    userSecret.value = savedCredentials.userSecret || ''
  }
}

watch(
  () => props.show,
  (val) => val && loadSaved(),
  { immediate: true },
)

const handleLogin = async () => {
  if (!userId.value || !userSecret.value) return message.warning('请输入用户ID和秘钥')
  if (userSecret.value.length < 6) return message.warning('秘钥至少6位')

  loading.value = true
  try {
    const user = await saveUser(userId.value, userSecret.value)
    await chrome.storage.local.set({
      savedCredentials: { userId: userId.value, userSecret: userSecret.value },
    })
    message.success('登录成功！')
    emit('update:show', false)
    emit('success', user)
  } catch (error) {
    message.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const clearSaved = async () => {
  await chrome.storage.local.remove('savedCredentials')
  userId.value = ''
  userSecret.value = ''
  message.info('已清除保存的登录信息')
}

const handleGetKey = () => {
  chrome.tabs.create({ url: 'https://qm.qq.com/q/4x1zI4LkmI' })
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="(val) => emit('update:show', val)"
    preset="card"
    title="用户登录"
    :bordered="false"
    :closable="false"
    :mask-closable="false"
    :close-on-esc="false"
    style="width: 80%; max-width: 400px"
  >
    <n-form @submit.prevent="handleLogin" size="small">
      <n-form-item label="用户 ID" label-placement="top">
        <n-input
          v-model:value="userId"
          placeholder="请输入用户ID"
          :disabled="loading"
          clearable
          size="small"
        />
      </n-form-item>
      <n-form-item label="用户秘钥" label-placement="top">
        <n-input
          v-model:value="userSecret"
          type="password"
          placeholder="至少6位"
          :disabled="loading"
          show-password-on="click"
          clearable
          size="small"
        />
      </n-form-item>
    </n-form>

    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
        font-size: 12px;
        color: #999;
      "
    >
      <span>✓ 登录成功后自动记住账号</span>
      <n-button text type="info" size="tiny" @click="clearSaved" :disabled="loading"
        >清除记住</n-button
      >
    </div>

    <template #footer>
      <div style="display: flex; gap: 12px">
        <n-button type="error" @click="handleGetKey" size="small" style="flex: 1"
          >点击获取卡密</n-button
        >
        <n-button
          type="primary"
          :loading="loading"
          @click="handleLogin"
          size="small"
          style="flex: 1"
          >登录</n-button
        >
      </div>
    </template>
  </n-modal>
</template>
