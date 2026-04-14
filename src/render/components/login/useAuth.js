// 极简 useAuth
import { ref, onMounted, onUnmounted } from 'vue'
import { getUser, logout as doLogout, onAuthChange, LOGIN_ENABLED } from './auth.js'

export { LOGIN_ENABLED }

export function useAuth() {
  const user = ref(null)
  const loading = ref(false)

  const init = async () => {
    if (!LOGIN_ENABLED) return
    loading.value = true
    try {
      user.value = await getUser()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    await doLogout()
    user.value = null
  }

  let unwatch = null
  onMounted(() => {
    init()
    if (LOGIN_ENABLED) {
      unwatch = onAuthChange((newUser) => (user.value = newUser))
    }
  })

  onUnmounted(() => unwatch?.())

  return { user, loading, logout, refresh: init }
}
