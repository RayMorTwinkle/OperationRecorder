// 登录系统 - 认证、API调用、设备指纹
/* eslint-env browser, serviceworker */

// 是否启用登录功能（开发环境禁用，生产环境启用）
export const LOGIN_ENABLED = import.meta.env.MODE !== 'development'

// 过期时间（7天）
const TOKEN_EXPIRE_DAYS = 7
// API 端点
const API_BASE = 'https://env-00jxtnydr3fv.dev-hz.cloudbasefunction.cn/user_obj/verifyAPIKey'
// 集合名称
const COLLECTION_NAME = 'crx_apikey'
// 是否检查机器码
const CHECK_MACHINE_CODE = true

// 生成设备唯一标识（插件ID + 随机UUID）
export async function getDeviceId() {
  const { deviceId } = await chrome.storage.local.get('deviceId')
  if (deviceId) return deviceId

  // 使用插件ID + 随机UUID，稳定且唯一
  const randomId = globalThis.crypto.randomUUID()
  const extensionId = chrome.runtime.id
  const newDeviceId = `${extensionId}_${randomId}`

  await chrome.storage.local.set({ deviceId: newDeviceId })
  return newDeviceId
}

// 登录验证 API
async function checkVIP(userId, userSecret) {
  const deviceId = await getDeviceId()

  const requestBody = {
    collectionName: COLLECTION_NAME,
    id: userId,
    key: userSecret,
  }

  if (CHECK_MACHINE_CODE) requestBody.machineCode = deviceId

  const response = await globalThis.fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '登录失败' }))
    throw new Error(error.message || '登录失败')
  }

  const result = await response.json()
  if (result.code !== 200) throw new Error(result.msg || result.message || '验证失败')
  return result
}

// 获取登录信息
export async function getUser() {
  if (!LOGIN_ENABLED) return null

  const { user } = await chrome.storage.sync.get('user')
  if (!user || !user.token) return null

  const expireTime = TOKEN_EXPIRE_DAYS * 24 * 60 * 60 * 1000
  if (Date.now() - user.loginTime > expireTime) {
    await logout()
    return null
  }

  return user
}

// 保存登录信息
export async function saveUser(userId, userSecret) {
  if (!LOGIN_ENABLED) return null

  const result = await checkVIP(userId, userSecret)

  const user = {
    userId,
    userSecret,
    userName: result.userName || `用户_${userId}`,
    token: result.token || `token_${Date.now()}`,
    loginTime: Date.now(),
    lastVerifyTime: Date.now(),
    strategy: result.strategy || '',
  }

  await chrome.storage.sync.set({ user })
  startAutoVerify()
  return user
}

// 重新验证用户状态
export async function reverifyUser() {
  if (!LOGIN_ENABLED) return true

  const user = await getUser()
  if (!user || !user.userId || !user.userSecret) return false

  try {
    await checkVIP(user.userId, user.userSecret)
    user.lastVerifyTime = Date.now()
    await chrome.storage.sync.set({ user })
    console.log('✅ 登录状态校验成功')
    return true
  } catch (error) {
    console.error('❌ 登录状态校验失败:', error.message)
    await logout()
    return false
  }
}

// 启动自动校验（每1小时）
export async function startAutoVerify() {
  if (!LOGIN_ENABLED) return
  // 检查是否已存在定时器，避免重复创建
  const existing = await chrome.alarms.get('autoVerifyLogin')
  if (existing) {
    console.log('⏰ 自动登录校验已在运行中')
    return
  }
  chrome.alarms.create('autoVerifyLogin', { periodInMinutes: 60 })
  console.log('🔄 已启动自动登录校验（每1小时）')
}

// 登出
export async function logout() {
  await chrome.storage.sync.remove('user')
}

// 监听登录状态变化
export function onAuthChange(callback) {
  const listener = (changes, area) => {
    if (area === 'sync' && changes.user) {
      callback(changes.user.newValue || null)
    }
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// ==================== 自动初始化 Background ====================
// 检测是否在 background 环境并自动注册监听器
if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
  try {
    // 判断是否在 Service Worker 或 Background 环境
    const isBackground = typeof document === 'undefined' || typeof window.document === 'undefined'

    if (isBackground) {
      // Background 环境：自动注册定时器监听
      if (chrome.alarms?.onAlarm) {
        chrome.alarms.onAlarm.addListener((alarm) => {
          if (alarm.name === 'autoVerifyLogin') {
            reverifyUser()
          }
        })
      }

      // 插件安装时启动定时校验
      if (chrome.runtime?.onInstalled) {
        chrome.runtime.onInstalled.addListener(() => {
          startAutoVerify()
        })
      }

      console.log('🔐 登录系统已在 Background 自动初始化')
    }
  } catch {
    // 非 background 环境或权限不足，忽略
  }
}
