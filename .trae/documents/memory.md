# OperationRecorder 开发记录

## 2026-04-14

### 阶段一：基础框架与存储 ✅

#### 已修改文件

- `src/manifest.js` - 添加 debugger、history、activeTab 权限

#### 已创建文件

1. **src/render/types/actions.js**
   - 定义了 11 种动作类型（NAVIGATE, CLICK, INPUT, WAIT, SCROLL, SELECT, EXTRACT, KEYPRESS, HOVER, NETWORK, IF, GOTO）
   - 每种动作类型的配置（图标、参数、描述）
   - 执行状态、录制状态枚举
   - 消息类型定义
   - 默认设置、重试配置
   - 工具函数：generateId, createAction, createScript

2. **src/background/storage.js**
   - Chrome Storage API 封装
   - 脚本 CRUD 操作
   - 设置管理
   - 变量管理
   - 日志管理
   - 导入/导出功能

3. **src/render/utils/idb.js**
   - IndexedDB 封装
   - 存储对象：logs, recordings, screenshots
   - 日志查询、清理功能
   - 录制数据管理
   - 截图管理

4. **src/render/store/scripts.js**
   - Pinia store：脚本状态管理
   - 脚本 CRUD、动作操作、变量操作、定时任务
   - 导入/导出功能

5. **src/render/store/recording.js**
   - Pinia store：录制状态管理
   - 录制控制（开始/暂停/恢复/停止）
   - 录制动作管理

6. **src/render/store/settings.js**
   - Pinia store：设置状态管理
   - 设置加载、保存、重置

7. **src/render/store/index.js**
   - Store 入口文件

#### 已安装依赖

- `pinia` - Vue 3 状态管理
- `vue-draggable-plus` - 拖拽排序
- `uuid` - 生成唯一 ID

---

### 阶段二：录制功能 ✅

#### 已创建文件

1. **src/contentScript/selector.js**
   - 智能选择器生成算法
   - 优先级：data-testid > id > name > 稳定类名 > 标签+属性 > 路径
   - 支持 XPath 生成
   - 选择器验证和优化
   - 排除 CSS-in-JS 生成的不稳定类名

2. **src/contentScript/recorder.js**
   - Recorder 类：录制逻辑核心
   - 事件监听：click, input, change, keydown, scroll
   - 导航监听：history.pushState/replaceState/popstate
   - 动作去重机制
   - 滚动事件节流
   - 单例模式管理

3. **src/contentScript/overlay.js**
   - 录制悬浮工具栏
   - 录制控制（开始/暂停/恢复/停止）
   - 实时统计（动作数、时长）
   - 可拖拽、可最小化
   - 现代化 UI 设计

#### 已修改文件

- **src/contentScript/index.js**
  - 集成录制器和悬浮工具栏
  - 处理录制相关消息
  - 实现动作执行功能（click, input, wait, scroll, select, keypress）
  - 元素高亮功能
  - 等待元素出现的 MutationObserver 实现

---

### 阶段三：UI 界面 ✅

#### 已修改文件

- **src/render/views/popup/Popup.vue**
  - 重写为 OperationRecorder 主界面
  - 录制控制区（开始/停止录制按钮）
  - 脚本列表展示
  - 脚本操作（执行、导出、删除）
  - 新建脚本功能
  - 使用 Naive UI 组件

- **src/render/views/options/Options.vue**
  - 重写为设置页面
  - 常规设置：MCP 端口、超时时间、重试次数、自动保存、执行预览
  - 数据管理：导出、导入、清空数据
  - 关于页面：版本信息、功能特性

---

### 阶段四：执行引擎 ✅

#### 已创建文件

- **src/background/executor.js**
  - ExecutionEngine 类
  - 脚本执行流程
  - 动作执行（通过 content script）
  - 重试机制（指数退避）
  - 执行日志记录
  - 暂停/恢复/停止控制
  - 变量系统
  - 条件判断支持

---

### 阶段五：定时任务 ✅

#### 已创建文件

- **src/background/scheduler.js**
  - Scheduler 类
  - Chrome Alarms API 集成
  - 支持多种定时类型：interval、daily、weekly
  - 浏览器启动检测
  - 定时任务执行
  - 48 小时自动执行逻辑

---

### 阶段六：MCP 服务器 ✅

#### 已创建文件

- **src/background/mcp-server.js**
  - MCPServer 类
  - JSON-RPC 2.0 协议实现
  - 14 个 MCP 工具：
    - list_scripts - 列出所有脚本
    - get_script - 获取脚本详情
    - create_script - 创建脚本
    - update_script - 更新脚本
    - delete_script - 删除脚本
    - execute_script - 执行脚本
    - start_recording - 开始录制
    - stop_recording - 停止录制
    - get_recording_status - 获取录制状态
    - get_execution_logs - 获取执行日志
    - screenshot - 截图
    - set_schedule - 设置定时任务
    - get_settings - 获取设置
    - update_settings - 更新设置

#### 已修改文件

- **src/background/index.js**
  - 初始化执行引擎、调度器、MCP 服务器
  - 集成 OperationRecorder 消息处理
  - 支持脚本执行、数据导入导出、清空数据

---

### 功能清单

✅ **录制功能**

- 点击录制按钮开始录制
- 自动捕获页面操作（点击、输入、导航等）
- 智能生成稳定的选择器
- 录制悬浮工具栏显示进度
- 停止录制后自动生成脚本

✅ **脚本管理**

- 创建、编辑、删除脚本
- 脚本列表展示
- 导入/导出脚本
- 执行历史记录

✅ **执行功能**

- 执行脚本
- 重试机制（最多3次）
- 执行日志
- 元素高亮预览

✅ **定时任务**

- 间隔执行（如每48小时）
- 每天特定时间执行
- 每周特定星期几执行
- 浏览器启动检测

✅ **MCP 服务器**

- 14 个工具供 AI 调用
- JSON-RPC 2.0 协议
- 支持脚本管理、录制、执行、截图等

✅ **UI 界面**

- Popup 主界面（录制控制、脚本列表）
- Options 设置页面（设置、数据管理、关于）
- 录制悬浮工具栏

---

### 使用说明

1. **录制脚本**
   - 点击扩展图标打开 Popup
   - 点击"录制"按钮
   - 在页面上进行操作
   - 点击"停止"按钮保存脚本

2. **执行脚本**
   - 在 Popup 中找到要执行的脚本
   - 点击播放按钮执行

3. **设置定时任务**
   - 通过 MCP 工具 `set_schedule` 设置
   - 支持 interval、daily、weekly 类型

4. **AI 调用**
   - 通过 MCP 协议调用 14 个工具
   - 支持脚本管理、录制、执行等操作

---

### 项目结构

```
src/
├── background/
│   ├── index.js          # Background 入口
│   ├── executor.js       # 执行引擎
│   ├── scheduler.js      # 定时任务
│   ├── mcp-server.js     # MCP 服务器
│   ├── storage.js        # 存储封装
│   └── logger.js         # 日志
├── contentScript/
│   ├── index.js          # Content Script 入口
│   ├── recorder.js       # 录制逻辑
│   ├── selector.js       # 选择器生成
│   └── overlay.js        # 录制悬浮工具栏
├── render/
│   ├── views/
│   │   ├── popup/Popup.vue      # 主界面
│   │   └── options/Options.vue  # 设置页面
│   ├── store/
│   │   ├── scripts.js    # 脚本状态
│   │   ├── recording.js  # 录制状态
│   │   ├── settings.js   # 设置状态
│   │   └── index.js      # Store 入口
│   ├── types/
│   │   └── actions.js    # 类型定义
│   └── utils/
│       └── idb.js        # IndexedDB
└── manifest.js           # 扩展配置
```

---

### 下一步优化

1. 可视化脚本编辑器（拖拽编排动作）
2. 执行历史详情页面
3. 脚本调试功能
4. 更多动作类型支持
5. 性能优化
