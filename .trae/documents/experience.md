# OperationRecorder 开发经验总结

## 项目概述

Chrome 浏览器扩展 - 自动化操作录制与执行工具，支持可视化编排、定时任务和 MCP 协议供 AI 调用。

---

## 关键错误与修复经验

### 1. Naive UI useMessage 错误

**错误信息**:

```
Uncaught Error: [naive/use-message]: No outer <n-message-provider /> founded.
```

**根本原因**:

- `useMessage()` 必须在 `<n-message-provider>` 组件内部调用
- 不能直接在 script setup 中调用 `useMessage()`，因为此时 provider 还未挂载

**修复方案**:
将组件拆分为两层结构：

```vue
<!-- 外层组件：提供 provider -->
<template>
  <n-message-provider>
    <PopupContent />
  </n-message-provider>
</template>

<!-- 内容组件：使用 message -->
<script setup>
const message = useMessage() // 现在可以正常工作了
</script>
```

**相关文件**:

- `src/render/views/popup/Popup.vue` → `PopupContent.vue`
- `src/render/views/options/Options.vue` → `OptionsContent.vue`

---

### 2. Pinia Store 未初始化错误

**错误信息**:

```
TypeError: Cannot read properties of undefined (reading '_s')
```

**根本原因**:

- Vue 应用入口文件没有创建 Pinia 实例
- 直接使用 `useScriptsStore()` 等 store 时，Pinia 还未安装

**修复方案**:
所有 Vue 入口文件必须初始化 Pinia：

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(createPinia()) // 必须先安装 Pinia
app.mount('#app')
```

**需要修复的文件**:

- `src/render/views/popup/index.js`
- `src/render/views/options/index.js`
- `src/render/views/sidepanel/index.js`
- `src/render/views/newtab/index.js`
- `src/render/views/devtools/index.js`

---

## 开发规范

### Vue 组件结构规范

1. **使用 Naive UI 的组件时**:
   - `useMessage()` → 需要 `<n-message-provider>`
   - `useDialog()` → 需要 `<n-dialog-provider>`
   - `useNotification()` → 需要 `<n-notification-provider>`
   - `useLoadingBar()` → 需要 `<n-loading-bar-provider>`

2. **推荐模式**:
   ```
   views/
   ├── popup/
   │   ├── index.js      # 入口：初始化 Vue + Pinia
   │   ├── Popup.vue     # 外层：提供各种 Provider
   │   └── PopupContent.vue  # 内容：使用 hooks
   ```

### Store 使用规范

1. **必须先初始化 Pinia** 才能使用任何 store
2. 在组件的 script setup 中可以直接使用 `useXXXStore()`
3. 确保在 `app.use(createPinia())` 之后挂载应用

---

## 调试技巧

### 查看扩展错误

1. 打开 `chrome://extensions/`
2. 找到扩展的「错误」按钮
3. 或者访问 `chrome://extensions/?errors=<扩展ID>`

### Service Worker 调试

1. 扩展详情页 → 点击「Service Worker」
2. 打开 DevTools 查看 console

---

## 常见警告（可忽略）

```
[unocss] "virtual:uno.css" is being imported multiple times
```

- 不影响功能，是 UnoCSS 的正常行为

```
Use of eval is strongly discouraged
```

- 在 `contentScript/index.js` 中使用 eval 执行用户脚本
- 这是功能需求，无法避免

---

## 构建命令

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build

# 打包为 zip
pnpm zip

# 打包为 crx
pnpm crx
```

---

## 项目结构

```
src/
├── background/       # Service Worker
│   ├── executor.js   # 脚本执行引擎
│   ├── mcp-server.js # MCP 服务器
│   ├── scheduler.js  # 定时任务
│   └── storage.js    # 存储管理
├── contentScript/    # 内容脚本
│   ├── recorder.js   # 录制逻辑
│   ├── selector.js   # 选择器生成
│   └── overlay.js    # 录制遮罩
└── render/           # UI 界面
    ├── views/        # 页面视图
    ├── store/        # Pinia stores
    └── components/   # 公共组件
```

---

## 经验教训

1. **不要假设库已正确配置** - 每次使用新库时检查初始化要求
2. **分离 Provider 和使用者** - 将 UI 库 hooks 使用放在子组件中
3. **统一入口文件模式** - 所有 Vue 入口文件遵循相同的初始化流程
4. **及时查看错误页面** - Chrome 扩展的错误信息在 `chrome://extensions/?errors=...`
5. **测试所有视图** - 修改共享代码后，测试 popup、options、sidepanel 等所有视图
6. **不要硬编码构建后的文件名** - Vite 构建会添加 hash，使用动态注入方式

---

### 新增：Content Script 动态注入方案

**问题**: 构建后的文件名包含 hash（如 `index.js-loader-C8QiBDr2.js`），无法硬编码

**最佳解决方案**: 从 manifest 中动态获取文件路径：

```javascript
// 获取 content script 文件路径
function getContentScriptFile() {
  const manifest = chrome.runtime.getManifest()
  const contentScript = manifest.content_scripts?.[0]
  if (contentScript && contentScript.js && contentScript.js.length > 0) {
    return contentScript.js[0] // 返回构建后的文件路径
  }
  return 'assets/index.js-loader-CBWLS_RY.js' // 备用默认路径
}

// 注入 content script
async function injectContentScript(tabId) {
  const contentScriptFile = getContentScriptFile()
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [contentScriptFile],
  })
}
```

**优点**:

- 自动适应构建后的文件名变化
- 无需手动更新硬编码路径
- 可靠性高

**注意**:

- 需要 `scripting` 权限
- 注入后需要等待一段时间（500ms）让 content script 初始化
- 需要添加 TEST 消息处理来检查 content script 是否已注入

---

_最后更新: 2025-01-14_
