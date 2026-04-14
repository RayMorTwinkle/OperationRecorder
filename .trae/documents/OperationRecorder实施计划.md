# OperationRecorder - Chrome 自动化操作插件实施计划

## 一、项目概述

**项目名称**: OperationRecorder
**项目类型**: Chrome 浏览器扩展
**核心功能**: 自动化录制、编排和复现浏览器操作，支持 MCP 协议供 AI 调用
**目标用户**: 需要自动化重复性浏览器操作的用户和 AI 助手

**基于现有项目**: [template-chrome-crx-vue-js](https://gitcode.com/BluerAngala/template-chrome-crx-vue-js)
- Vue 3 + Vite + UnoCSS
- Element Plus (Naive UI)
- Chrome Extension MV3

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Chrome Extension                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐│
│  │    Popup     │  │  Background   │  │   Content    │  │    DevTools      ││
│  │    (Vue)     │  │  (MCP服务)    │  │   Script     │  │    (Vue)         ││
│  │  可视化编排   │  │  Port:9222    │  │  录制/执行   │  │  MCP 控制台      ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘│
│         │                 │                  │                   │         │
│         └─────────────────┴──────────────────┴───────────────────┘         │
│                           │                                                 │
│                    Chrome Storage API                                       │
│                    (本地存储脚本/日志)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Chrome DevTools MCP                                 │
│              通过 chrome.debugger API 与浏览器深度集成                        │
│              支持网络拦截、DOM 操作、性能分析等                               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    外部调用者 (AI)                                           │
│         chrome.runtime.connect() / HTTP/WebSocket / MCP                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

**现有技术栈（保留）**:
- **前端框架**: Vue 3 + Composition API
- **构建工具**: Vite + @crxjs/vite-plugin
- **样式方案**: UnoCSS + Naive UI
- **状态管理**: Pinia
- **浏览器 API**: webextension-polyfill

**新增技术栈**:
- **拖拽交互**: vue-draggable-plus (SortableJS Vue3 封装)
- **MCP 协议**: 自定义 JSON-RPC 实现
- **Chrome DevTools**: chrome.debugger API
- **数据存储**: Chrome Storage API + IndexedDB（大数据量）

## 三、功能模块

### 3.1 录制模块 (Content Script)

#### 录制的动作类型

| 动作类型 | 参数 | 说明 |
|---------|------|------|
| `navigate` | `{ url: string }` | 打开指定 URL |
| `click` | `{ selector: string, selectorType: 'css' | 'xpath' }` | 点击页面元素 |
| `input` | `{ selector: string, value: string, selectorType: 'css' | 'xpath' }` | 输入文本 |
| `wait` | `{ type: 'element' | 'time', target?: string, duration?: number }` | 等待元素或时间 |
| `scroll` | `{ y: number, x?: number }` | 滚动页面 |
| `select` | `{ selector: string, value: string }` | 选择下拉框选项 |
| `extract` | `{ selector: string, variable: string, attribute?: string }` | 提取数据到变量 |
| `keypress` | `{ key: string, modifiers?: string[] }` | 键盘按键 |
| `hover` | `{ selector: string }` | 鼠标悬停 |
| `network` | `{ urlPattern: string, method?: string }` | 网络请求拦截（可选） |

#### 录制流程

1. 用户点击录制按钮（在 Popup 或 SidePanel 中）
2. Content Script 注入页面，显示录制悬浮工具栏
3. 开始监听事件：
   - `click` → 记录 click
   - `input` → 记录 input
   - `change` → 记录 select
   - `keydown` → 记录 keypress
   - `mouseenter` → 记录 hover
   - `navigate` → 记录 navigate
4. 每个动作记录：时间戳、类型、选择器、参数、页面上下文

#### 选择器生成策略

```javascript
// 选择器优先级：
// 1. data-testid, data-id 等自定义属性
// 2. id 属性
// 3. name 属性（表单元素）
// 4. 稳定类名组合
// 5. 标签 + 文本内容
// 6. 路径表达式（最后手段）

function generateSelector(element) {
  if (element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`
  if (element.id) return `#${element.id}`
  if (element.name) return `[name="${element.name}"]`

  const stableClasses = Array.from(element.classList)
    .filter(c => !c.match(/^(css-|styled-|sc-|emotion-)/))
    .join('.')
  if (stableClasses) return `.${stableClasses}`

  if (element.textContent?.trim()) {
    const text = element.textContent.trim().slice(0, 20)
    return `${element.tagName.toLowerCase()}:contains("${text}")`
  }

  return getPathSelector(element)
}
```

### 3.2 可视化编排模块 (Popup / SidePanel)

#### 动作块设计

每个动作块包含：
- 动作类型图标（@vicons/ionicons5）
- 动作名称
- 参数编辑表单
- 拖拽手柄
- 删除/复制/折叠按钮
- 条件分支标记

#### 编排界面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 OperationRecorder                                [⚙设置]  │
├─────────────────────────────────────────────────────────────────┤
│  📁 脚本列表                                                    │
│  ├─ ▶️ 每日签到脚本  (上次执行: 2小时前)    [▶执行] [✎编辑]   │
│  ├─ ⏰ 数据抓取任务  (定时: 每48小时)       [▶执行] [✎编辑]   │
│  └─ ➕ 新建脚本...                                               │
├─────────────────────────────────────────────────────────────────┤
│  🎬 脚本编辑器 - 每日签到脚本                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [🔵开始] → [⏱️等待3秒] → [👆点击.login-btn] → ...        │  │
│  └───────────────────────────────────────────────────────────┘  │
│  动作工具栏: [导航] [点击] [输入] [等待] [滚动] [条件] [变量]  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 复现执行模块 (Background Script)

#### 执行引擎

```javascript
interface ExecutionEngine {
  execute(scriptId: string, options?: ExecuteOptions): Promise<ExecutionResult>
  pause(): void
  resume(): void
  stop(): void
  step(): Promise<void>
}

interface ExecuteOptions {
  targetTabId?: number
  speed?: number  // 1 = 正常, 2 = 2倍速
  skipWaits?: boolean
}

interface ExecutionResult {
  success: boolean
  scriptId: string
  startTime: number
  endTime: number
  actions: ActionResult[]
  error?: ExecutionError
}
```

#### 执行流程

1. 解析脚本为动作队列
2. 依次执行每个动作：
   - 查找目标元素
   - 执行操作
   - 验证结果
   - 失败重试（最多 3 次）
3. 记录执行日志
4. 返回执行结果

#### 错误处理策略

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
}

async function executeAction(action) {
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      await performAction(action)
      return { success: true }
    } catch (error) {
      if (attempt === RETRY_CONFIG.maxRetries) {
        throw error
      }
      await sleep(RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt))
    }
  }
}
```

### 3.4 定时任务模块 (Background Script)

#### 定时配置

- 使用 Chrome Alarms API
- 支持间隔配置（分钟/小时/自定义）
- 支持特定时间点执行

#### 执行时机

1. **定时触发**: 每 48 小时检查并执行
2. **浏览器启动触发**: 检测是否超过定时间隔
3. **手动触发**: 用户点击执行按钮

#### 48 小时检测逻辑

```javascript
chrome.runtime.onStartup.addListener(() => {
  checkScheduledTasks()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'scheduled-execution') {
    checkScheduledTasks()
  }
})

async function checkScheduledTasks() {
  const scripts = await getAllScripts()
  const now = Date.now()

  for (const script of scripts) {
    if (!script.schedule?.enabled) continue

    const interval = script.schedule.interval // 毫秒
    const lastExecution = script.lastExecutionTime || script.createdAt

    if (now - lastExecution >= interval) {
      await executeScript(script.id)
    }
  }
}
```

### 3.5 MCP 服务器模块 (Background + DevTools)

#### Chrome DevTools MCP 集成

利用 `chrome.debugger` API 提供更强大的浏览器控制能力：

```javascript
// DevTools MCP 能力
const DEVTOOLS_CAPABILITIES = {
  // DOM 操作
  DOM: ['getDocument', 'querySelector', 'getAttributes', 'setAttributeAsMarkup'],

  // 网络拦截
  Network: ['enable', 'disable', 'getResponseBody', 'setRequestHeaders'],

  // 运行时
  Runtime: ['evaluate', 'callFunctionOn', 'getProperties'],

  // 输入控制
  Input: ['dispatchMouseEvent', 'dispatchKeyEvent', 'insertText'],

  // 页面控制
  Page: ['navigate', 'reload', 'captureScreenshot', 'printToPDF'],
}
```

#### MCP 协议实现

```javascript
// MCP JSON-RPC 2.0 实现
class MCPServer {
  constructor(port = 9222) {
    this.port = port
    this.tools = this.registerTools()
  }

  registerTools() {
    return [
      {
        name: 'list_scripts',
        description: '列出所有已保存的自动化脚本',
        inputSchema: {},
        handler: async () => {
          const scripts = await storage.get('scripts')
          return { scripts: Object.values(scripts) }
        },
      },
      {
        name: 'execute_script',
        description: '执行指定的自动化脚本',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string' },
            options: {
              type: 'object',
              properties: {
                tab_id: { type: 'number' },
                speed: { type: 'number', default: 1 },
              },
            },
          },
          required: ['script_id'],
        },
        handler: async ({ script_id, options }) => {
          const result = await executeScript(script_id, options)
          return result
        },
      },
      {
        name: 'start_recording',
        description: '开始录制新的自动化动作',
        inputSchema: {
          type: 'object',
          properties: {
            tab_id: { type: 'number' },
            script_name: { type: 'string' },
          },
        },
        handler: async ({ tab_id, script_name }) => {
          await startRecording(tab_id, script_name)
          return { status: 'recording' }
        },
      },
      {
        name: 'stop_recording',
        description: '停止录制并保存脚本',
        inputSchema: {
          type: 'object',
          properties: {
            script_name: { type: 'string' },
          },
        },
        handler: async ({ script_name }) => {
          const script = await stopRecording(script_name)
          return { script }
        },
      },
      {
        name: 'create_script',
        description: '创建新的自动化脚本',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            actions: { type: 'array' },
          },
          required: ['name'],
        },
        handler: async ({ name, actions = [] }) => {
          const script = await createScript(name, actions)
          return { script }
        },
      },
      {
        name: 'get_execution_logs',
        description: '获取脚本执行日志',
        inputSchema: {
          type: 'object',
          properties: {
            script_id: { type: 'string' },
            limit: { type: 'number', default: 10 },
          },
        },
        handler: async ({ script_id, limit = 10 }) => {
          const logs = await getLogs(script_id, limit)
          return { logs }
        },
      },
      {
        name: 'screenshot',
        description: '对指定标签页截图',
        inputSchema: {
          type: 'object',
          properties: {
            tab_id: { type: 'number' },
            full_page: { type: 'boolean', default: false },
          },
        },
        handler: async ({ tab_id, full_page = false }) => {
          const dataUrl = await captureScreenshot(tab_id, full_page)
          return { screenshot: dataUrl }
        },
      },
    ]
  }

  async handleRequest(request) {
    const { method, params, id } = request

    if (method === 'tools/list') {
      return { tools: this.tools.map(t => ({ name: t.name, description: t.description })) }
    }

    if (method.startsWith('tools/call/')) {
      const toolName = method.replace('tools/call/', '')
      const tool = this.tools.find(t => t.name === toolName)
      if (!tool) throw new Error(`Unknown tool: ${toolName}`)

      const result = await tool.handler(params)
      return { result }
    }

    throw new Error(`Unknown method: ${method}`)
  }
}
```

#### 通信方式

1. **DevTools Protocol**: 通过 `chrome.debugger` 暴露
2. **WebSocket 桥接**: 本地 WebSocket 服务器供外部调用
3. **Native Messaging**: 与本地应用通信（可选）

```javascript
// WebSocket 桥接（供外部 AI 调用）
class MCPBridge {
  constructor(server) {
    this.server = server
    this.connections = new Set()
  }

  start(port = 9222) {
    // 使用 chrome.sockets 或独立进程
    // 这里简化实现，实际需要 WebSocket 库
  }

  async handleConnection(ws) {
    this.connections.add(ws)

    ws.on('message', async (data) => {
      const request = JSON.parse(data)
      const result = await this.server.handleRequest(request)
      ws.send(JSON.stringify(result))
    })

    ws.on('close', () => {
      this.connections.delete(ws)
    })
  }
}
```

### 3.6 数据存储模块

#### 存储结构

```javascript
// Chrome Storage 存储
const STORAGE_SCHEMA = {
  scripts: {},           // 脚本数据
  settings: {            // 用户设置
    mcpPort: 9222,
    defaultTimeout: 30000,
    maxRetries: 3,
    theme: 'auto',
  },
  variables: {},         // 全局变量
}

// IndexedDB 存储（日志、大数据量）
const IDB_SCHEMA = {
  logs: {
    keyPath: 'id',
    indexes: ['scriptId', 'startTime', 'status'],
  },
  recordings: {
    keyPath: 'id',
    indexes: ['tabId', 'timestamp'],
  },
}

interface Script {
  id: string
  name: string
  description?: string
  actions: Action[]
  schedule?: ScheduleConfig
  variables: Variable[]
  createdAt: number
  updatedAt: number
  lastExecutionTime?: number
}

interface ScheduleConfig {
  enabled: boolean
  interval: number  // 毫秒
  type: 'interval' | 'cron'
  cronExpression?: string
}

interface Action {
  id: string
  type: 'navigate' | 'click' | 'input' | 'wait' | 'scroll' | 'select' | 'extract' | 'keypress' | 'hover' | 'if' | 'goto'
  params: Record<string, any>
  children?: Action[]  // 用于条件块
  condition?: Condition
}

interface Variable {
  name: string
  type: 'string' | 'number' | 'selector'
  value: any
}
```

### 3.7 辅助功能

#### 脚本导出/导入

```javascript
async function exportScript(scriptId) {
  const script = await storage.get(`scripts.${scriptId}`)
  const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  chrome.downloads.download({
    url,
    filename: `${script.name}.or-script.json`,
  })
}

async function importScript(file) {
  const text = await file.text()
  const script = JSON.parse(text)
  script.id = generateId()
  script.importedAt = Date.now()

  await storage.set(`scripts.${script.id}`, script)
  return script
}
```

#### 执行预览

在执行前高亮显示将要操作的元素：

```javascript
function highlightElement(selector) {
  const element = document.querySelector(selector)
  if (!element) return null

  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: absolute;
    background: rgba(255, 0, 0, 0.3);
    border: 2px solid red;
    pointer-events: none;
    z-index: 999999;
  `

  const rect = element.getBoundingClientRect()
  overlay.style.left = `${rect.left}px`
  overlay.style.top = `${rect.top}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`

  document.body.appendChild(overlay)
  return overlay
}
```

#### 条件判断

```javascript
interface ConditionalAction {
  type: 'if'
  condition: {
    type: 'element_exists' | 'element_not_exists' | 'page_contains' | 'variable_equals'
    selector?: string
    text?: string
    variable?: string
    value?: any
  }
  then: Action[]
  else?: Action[]
}

async function evaluateCondition(condition) {
  switch (condition.type) {
    case 'element_exists':
      return document.querySelector(condition.selector) !== null
    case 'element_not_exists':
      return document.querySelector(condition.selector) === null
    case 'page_contains':
      return document.body.textContent.includes(condition.text)
    case 'variable_equals':
      return getVariable(condition.variable) === condition.value
  }
}
```

#### 变量系统

```javascript
// 支持从页面提取数据
interface ExtractAction {
  type: 'extract'
  selector: string
  attribute: 'textContent' | 'href' | 'src' | 'value' | 'innerHTML'
  variable: string
}

// 支持变量替换
function interpolate(str, variables) {
  return str.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    return variables[name] ?? match
  })
}
```

## 四、项目结构

```
operation-recorder/
├── src/
│   ├── manifest.js                    # Chrome 扩展配置
│   ├── background/
│   │   ├── index.js                   # Background 入口
│   │   ├── mcp-server.js              # MCP 服务器
│   │   ├── scheduler.js               # 定时任务
│   │   ├── executor.js                # 执行引擎
│   │   └── storage.js                 # 存储封装
│   ├── contentScript/
│   │   ├── index.js                   # Content Script 入口
│   │   ├── recorder.js                # 录制逻辑
│   │   ├── selector.js               # 选择器生成
│   │   ├── injector.js               # 元素高亮注入
│   │   └── overlay.js                # 录制悬浮工具栏
│   ├── render/
│   │   ├── views/
│   │   │   ├── popup/
│   │   │   │   └── Popup.vue          # 主弹窗（脚本列表 + 编辑器）
│   │   │   ├── sidepanel/
│   │   │   │   └── SidePanel.vue      # 侧边栏（主要工作区）
│   │   │   ├── devtools/
│   │   │   │   └── DevTools.vue       # DevTools 面板（MCP 控制台）
│   │   │   └── options/
│   │   │       └── Options.vue        # 设置页面
│   │   ├── components/
│   │   │   ├── ScriptList.vue         # 脚本列表
│   │   │   ├── ScriptEditor.vue        # 脚本编辑器
│   │   │   ├── ActionBlock.vue        # 动作块组件
│   │   │   ├── ActionToolbar.vue      # 动作工具栏
│   │   │   ├── RecordingOverlay.vue    # 录制悬浮工具栏
│   │   │   └── MCPTerminal.vue        # MCP 终端
│   │   ├── composables/
│   │   │   ├── useScripts.js          # 脚本 CRUD
│   │   │   ├── useRecording.js        # 录制状态
│   │   │   ├── useExecution.js         # 执行控制
│   │   │   └── useMCP.js              # MCP 通信
│   │   ├── store/
│   │   │   ├── scripts.js             # 脚本状态
│   │   │   ├── recording.js           # 录制状态
│   │   │   └── settings.js            # 设置状态
│   │   ├── types/
│   │   │   ├── messages.js            # 消息类型定义
│   │   │   └── actions.js             # 动作类型定义
│   │   └── utils/
│   │       ├── storage.js              # 存储工具
│   │       └── idb.js                  # IndexedDB 封装
│   └── styles/
│       └── recorder.css               # 录制相关样式
├── public/
│   └── icons/                         # 图标资源
├── package.json
├── vite.config.js
├── uno.config.js                      # UnoCSS 配置
└── eslint.config.js
```

## 五、文件修改清单

### 需要修改的现有文件

| 文件 | 修改内容 |
|------|---------|
| `src/manifest.js` | 添加 debugger、tabs 权限 |
| `src/background/index.js` | 添加 MCP 服务器、定时任务初始化 |
| `src/contentScript/index.js` | 添加录制监听器 |
| `package.json` | 添加新依赖 |

### 需要新建的文件

| 文件 | 说明 |
|------|------|
| `src/background/mcp-server.js` | MCP 协议实现 |
| `src/background/scheduler.js` | 定时任务管理 |
| `src/background/executor.js` | 脚本执行引擎 |
| `src/contentScript/recorder.js` | 录制逻辑 |
| `src/contentScript/selector.js` | 选择器生成算法 |
| `src/contentScript/overlay.js` | 录制悬浮工具栏 |
| `src/render/components/ScriptList.vue` | 脚本列表组件 |
| `src/render/components/ScriptEditor.vue` | 脚本编辑器组件 |
| `src/render/components/ActionBlock.vue` | 动作块组件 |
| `src/render/composables/useScripts.js` | 脚本 CRUD |
| `src/render/composables/useRecording.js` | 录制控制 |
| `src/render/composables/useExecution.js` | 执行控制 |
| `src/render/composables/useMCP.js` | MCP 通信 |
| `src/render/types/actions.js` | 动作类型定义 |

## 六、实施步骤

### 阶段一：基础框架与存储 (1-2天)

1. 修改 `src/manifest.js`，添加必要权限
2. 创建类型定义 `src/render/types/actions.js`
3. 创建存储封装 `src/background/storage.js`
4. 创建 IndexedDB 封装 `src/render/utils/idb.js`
5. 创建 Pinia store：`src/render/store/`

### 阶段二：录制功能 (2-3天)

1. 创建选择器生成器 `src/contentScript/selector.js`
2. 创建录制逻辑 `src/contentScript/recorder.js`
3. 创建录制悬浮工具栏 `src/contentScript/overlay.js`
4. 修改 `src/contentScript/index.js` 集成录制功能
5. 创建录制 composable `src/render/composables/useRecording.js`
6. 创建录制 UI 组件 `src/render/components/RecordingOverlay.vue`

### 阶段三：可视化编排 (2-3天)

1. 创建脚本列表组件 `src/render/components/ScriptList.vue`
2. 创建动作块组件 `src/render/components/ActionBlock.vue`
3. 创建动作工具栏 `src/render/components/ActionToolbar.vue`
4. 创建脚本编辑器 `src/render/components/ScriptEditor.vue`
5. 集成 vue-draggable-plus 实现拖拽排序
6. 创建脚本 CRUD composable `src/render/composables/useScripts.js`
7. 更新 Popup.vue 集成编辑器

### 阶段四：执行引擎 (2-3天)

1. 创建执行引擎 `src/background/executor.js`
2. 创建执行 composable `src/render/composables/useExecution.js`
3. 实现重试机制
4. 实现执行预览高亮
5. 实现执行日志记录

### 阶段五：定时任务 (1-2天)

1. 创建定时任务管理器 `src/background/scheduler.js`
2. 在 background 中初始化调度器
3. 添加定时配置 UI
4. 实现浏览器启动检测

### 阶段六：MCP 服务器 (2-3天)

1. 实现 MCP 协议 `src/background/mcp-server.js`
2. 实现 DevTools MCP 集成
3. 创建 MCP 控制台组件 `src/render/components/MCPTerminal.vue`
4. 创建 MCP composable `src/render/composables/useMCP.js`
5. 更新 DevTools.vue 集成 MCP 终端
6. 实现 WebSocket 桥接（可选）

### 阶段七：优化与完善 (1-2天)

1. 实现脚本导入/导出
2. 实现执行历史记录
3. 完善错误报告 UI
4. 优化选择器算法
5. 添加快捷键支持

## 七、依赖包清单

```json
{
  "dependencies": {
    "@vicons/ionicons5": "^0.12.0",
    "loglevel": "^1.9.2",
    "naive-ui": "^2.40.1",
    "vue": "^3.2.37",
    "webextension-polyfill": "^0.12.0",
    "pinia": "^2.1.0",
    "vue-draggable-plus": "^0.5.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.26",
    "unocss": "^66.5.2",
    "vite": "^7.1.7"
  }
}
```

**新增依赖说明**:
- `pinia`: Vue 3 状态管理（替代手动状态）
- `vue-draggable-plus`: Vue 3 拖拽排序
- `uuid`: 生成唯一 ID

## 八、注意事项

1. **Chrome 扩展安全**:
   - 注意权限申请，避免过度授权
   - 使用 `chrome.scripting.executeScript` 替代 `eval`

2. **选择器稳定性**:
   - 确保生成的选择器在页面变化后仍可用
   - 提供手动调整选择器的功能

3. **执行可靠性**:
   - 添加适当的等待时间
   - 使用 MutationObserver 检测动态内容

4. **日志完整性**:
   - 记录足够的调试信息
   - 提供日志导出功能

5. **向后兼容**:
   - 存储结构变更时做好版本迁移
   - 提供数据迁移工具

---

**文档版本**: v1.1
**最后更新**: 2026-04-14
