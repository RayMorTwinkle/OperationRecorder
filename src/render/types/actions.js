/**
 * OperationRecorder - 动作类型定义
 * 定义所有支持的自动化动作类型及其参数
 */

// 动作类型枚举
export const ACTION_TYPES = {
  NAVIGATE: 'navigate',
  CLICK: 'click',
  INPUT: 'input',
  WAIT: 'wait',
  SCROLL: 'scroll',
  SELECT: 'select',
  EXTRACT: 'extract',
  KEYPRESS: 'keypress',
  HOVER: 'hover',
  NETWORK: 'network',
  IF: 'if',
  GOTO: 'goto',
}

// 选择器类型
export const SELECTOR_TYPES = {
  CSS: 'css',
  XPATH: 'xpath',
}

// 等待类型
export const WAIT_TYPES = {
  ELEMENT: 'element',
  TIME: 'time',
}

// 动作类型配置
export const ACTION_CONFIG = {
  [ACTION_TYPES.NAVIGATE]: {
    label: '导航',
    icon: 'NavigateOutline',
    description: '打开指定 URL',
    params: [
      { name: 'url', label: 'URL', type: 'string', required: true },
      { name: 'newTab', label: '新标签页', type: 'boolean', default: false },
    ],
  },
  [ACTION_TYPES.CLICK]: {
    label: '点击',
    icon: 'FingerPrintOutline',
    description: '点击页面元素',
    params: [
      { name: 'selector', label: '选择器', type: 'string', required: true },
      {
        name: 'selectorType',
        label: '选择器类型',
        type: 'select',
        options: ['css', 'xpath'],
        default: 'css',
      },
      { name: 'doubleClick', label: '双击', type: 'boolean', default: false },
    ],
  },
  [ACTION_TYPES.INPUT]: {
    label: '输入',
    icon: 'CreateOutline',
    description: '在输入框中输入文本',
    params: [
      { name: 'selector', label: '选择器', type: 'string', required: true },
      {
        name: 'selectorType',
        label: '选择器类型',
        type: 'select',
        options: ['css', 'xpath'],
        default: 'css',
      },
      { name: 'value', label: '输入值', type: 'string', required: true },
      { name: 'clearFirst', label: '先清空', type: 'boolean', default: true },
    ],
  },
  [ACTION_TYPES.WAIT]: {
    label: '等待',
    icon: 'TimeOutline',
    description: '等待元素出现或等待指定时间',
    params: [
      {
        name: 'type',
        label: '等待类型',
        type: 'select',
        options: ['element', 'time'],
        default: 'time',
        required: true,
      },
      { name: 'target', label: '目标选择器', type: 'string', showWhen: { type: 'element' } },
      {
        name: 'duration',
        label: '等待时间(毫秒)',
        type: 'number',
        default: 1000,
        showWhen: { type: 'time' },
      },
      {
        name: 'timeout',
        label: '超时时间(毫秒)',
        type: 'number',
        default: 10000,
        showWhen: { type: 'element' },
      },
    ],
  },
  [ACTION_TYPES.SCROLL]: {
    label: '滚动',
    icon: 'MoveOutline',
    description: '滚动页面到指定位置',
    params: [
      { name: 'y', label: 'Y 坐标', type: 'number', default: 0 },
      { name: 'x', label: 'X 坐标', type: 'number', default: 0 },
      {
        name: 'behavior',
        label: '滚动行为',
        type: 'select',
        options: ['auto', 'smooth'],
        default: 'smooth',
      },
    ],
  },
  [ACTION_TYPES.SELECT]: {
    label: '选择',
    icon: 'ListOutline',
    description: '选择下拉框选项',
    params: [
      { name: 'selector', label: '选择器', type: 'string', required: true },
      {
        name: 'selectorType',
        label: '选择器类型',
        type: 'select',
        options: ['css', 'xpath'],
        default: 'css',
      },
      { name: 'value', label: '选项值', type: 'string', required: true },
      {
        name: 'by',
        label: '选择方式',
        type: 'select',
        options: ['value', 'text', 'index'],
        default: 'value',
      },
    ],
  },
  [ACTION_TYPES.EXTRACT]: {
    label: '提取',
    icon: 'DownloadOutline',
    description: '从页面提取数据到变量',
    params: [
      { name: 'selector', label: '选择器', type: 'string', required: true },
      {
        name: 'selectorType',
        label: '选择器类型',
        type: 'select',
        options: ['css', 'xpath'],
        default: 'css',
      },
      {
        name: 'attribute',
        label: '属性',
        type: 'select',
        options: ['textContent', 'innerText', 'value', 'href', 'src', 'innerHTML'],
        default: 'textContent',
      },
      { name: 'variable', label: '变量名', type: 'string', required: true },
    ],
  },
  [ACTION_TYPES.KEYPRESS]: {
    label: '按键',
    icon: 'KeyOutline',
    description: '模拟键盘按键',
    params: [
      { name: 'key', label: '按键', type: 'string', required: true },
      {
        name: 'modifiers',
        label: '修饰键',
        type: 'multiselect',
        options: ['Control', 'Shift', 'Alt', 'Meta'],
      },
    ],
  },
  [ACTION_TYPES.HOVER]: {
    label: '悬停',
    icon: 'HandLeftOutline',
    description: '鼠标悬停在元素上',
    params: [
      { name: 'selector', label: '选择器', type: 'string', required: true },
      {
        name: 'selectorType',
        label: '选择器类型',
        type: 'select',
        options: ['css', 'xpath'],
        default: 'css',
      },
    ],
  },
  [ACTION_TYPES.NETWORK]: {
    label: '网络',
    icon: 'GlobeOutline',
    description: '等待网络请求',
    params: [
      { name: 'urlPattern', label: 'URL 匹配模式', type: 'string', required: true },
      {
        name: 'method',
        label: '请求方法',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'],
        default: 'ANY',
      },
      { name: 'timeout', label: '超时时间(毫秒)', type: 'number', default: 10000 },
    ],
  },
  [ACTION_TYPES.IF]: {
    label: '条件',
    icon: 'GitBranchOutline',
    description: '条件判断',
    params: [
      {
        name: 'conditionType',
        label: '条件类型',
        type: 'select',
        options: [
          'element_exists',
          'element_not_exists',
          'page_contains',
          'variable_equals',
          'variable_contains',
        ],
        default: 'element_exists',
        required: true,
      },
      {
        name: 'selector',
        label: '选择器',
        type: 'string',
        showWhen: { conditionType: ['element_exists', 'element_not_exists'] },
      },
      {
        name: 'text',
        label: '文本内容',
        type: 'string',
        showWhen: { conditionType: ['page_contains'] },
      },
      {
        name: 'variable',
        label: '变量名',
        type: 'string',
        showWhen: { conditionType: ['variable_equals', 'variable_contains'] },
      },
      {
        name: 'value',
        label: '变量值',
        type: 'string',
        showWhen: { conditionType: ['variable_equals', 'variable_contains'] },
      },
    ],
    hasChildren: true,
  },
  [ACTION_TYPES.GOTO]: {
    label: '跳转',
    icon: 'ReturnUpForwardOutline',
    description: '跳转到指定动作',
    params: [{ name: 'targetActionId', label: '目标动作ID', type: 'string', required: true }],
  },
}

// 执行状态
export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  PAUSED: 'paused',
}

// 录制状态
export const RECORDING_STATUS = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PAUSED: 'paused',
}

// 消息类型
export const MESSAGE_TYPES = {
  // 录制相关
  START_RECORDING: 'start_recording',
  STOP_RECORDING: 'stop_recording',
  RECORD_ACTION: 'record_action',
  RECORDING_STATUS_CHANGED: 'recording_status_changed',

  // 执行相关
  EXECUTE_SCRIPT: 'execute_script',
  EXECUTION_STATUS_CHANGED: 'execution_status_changed',
  PAUSE_EXECUTION: 'pause_execution',
  RESUME_EXECUTION: 'resume_execution',
  STOP_EXECUTION: 'stop_execution',

  // 脚本管理
  GET_SCRIPTS: 'get_scripts',
  SAVE_SCRIPT: 'save_script',
  DELETE_SCRIPT: 'delete_script',
  IMPORT_SCRIPT: 'import_script',
  EXPORT_SCRIPT: 'export_script',

  // 日志
  GET_LOGS: 'get_logs',
  CLEAR_LOGS: 'clear_logs',

  // 设置
  GET_SETTINGS: 'get_settings',
  SAVE_SETTINGS: 'save_settings',

  // MCP
  MCP_REQUEST: 'mcp_request',
  MCP_RESPONSE: 'mcp_response',
}

// 默认设置
export const DEFAULT_SETTINGS = {
  mcpPort: 9222,
  defaultTimeout: 30000,
  maxRetries: 3,
  theme: 'auto',
  autoSave: true,
  showExecutionPreview: true,
}

// 重试配置
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
}

// 生成唯一 ID
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 创建新动作
export function createAction(type, params = {}) {
  return {
    id: generateId(),
    type,
    params,
    children: [],
  }
}

// 创建新脚本
export function createScript(name, description = '') {
  return {
    id: generateId(),
    name,
    description,
    actions: [],
    variables: [],
    schedule: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastExecutionTime: null,
  }
}
