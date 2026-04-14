/**
 * 录制逻辑
 * 监听页面事件并记录用户操作
 */

import { ACTION_TYPES, RECORDING_STATUS } from '../render/types/actions.js'
import { generateSelector, getElementInfo } from './selector.js'

class Recorder {
  constructor() {
    this.status = RECORDING_STATUS.IDLE
    this.recordedActions = []
    this.listeners = []
    this.currentUrl = window.location.href
    this.startTime = null

    // 绑定事件处理函数
    this.handleClick = this.handleClick.bind(this)
    this.handleInput = this.handleInput.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.handleKeydown = this.handleKeydown.bind(this)
    this.handleScroll = this.handleScroll.bind(this)
    this.handleNavigate = this.handleNavigate.bind(this)
  }

  /**
   * 开始录制
   */
  start() {
    if (this.status === RECORDING_STATUS.RECORDING) return

    this.status = RECORDING_STATUS.RECORDING
    this.recordedActions = []
    this.startTime = Date.now()
    this.currentUrl = window.location.href

    this.attachListeners()
    this.recordNavigate(window.location.href)

    console.log('[OperationRecorder] 开始录制')
  }

  /**
   * 暂停录制
   */
  pause() {
    if (this.status === RECORDING_STATUS.RECORDING) {
      this.status = RECORDING_STATUS.PAUSED
      this.detachListeners()
      console.log('[OperationRecorder] 暂停录制')
    }
  }

  /**
   * 恢复录制
   */
  resume() {
    if (this.status === RECORDING_STATUS.PAUSED) {
      this.status = RECORDING_STATUS.RECORDING
      this.attachListeners()
      console.log('[OperationRecorder] 恢复录制')
    }
  }

  /**
   * 停止录制
   */
  stop() {
    this.status = RECORDING_STATUS.IDLE
    this.detachListeners()

    const result = {
      actions: this.recordedActions,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
    }

    console.log('[OperationRecorder] 停止录制', result)
    return result
  }

  /**
   * 附加事件监听器
   */
  attachListeners() {
    // 使用捕获阶段以优先处理
    document.addEventListener('click', this.handleClick, true)
    document.addEventListener('input', this.handleInput, true)
    document.addEventListener('change', this.handleChange, true)
    document.addEventListener('keydown', this.handleKeydown, true)
    document.addEventListener('scroll', this.handleScroll, true)

    // 监听导航变化
    this.setupNavigationListener()

    this.listeners = [
      { type: 'click', handler: this.handleClick },
      { type: 'input', handler: this.handleInput },
      { type: 'change', handler: this.handleChange },
      { type: 'keydown', handler: this.handleKeydown },
      { type: 'scroll', handler: this.handleScroll },
    ]
  }

  /**
   * 移除事件监听器
   */
  detachListeners() {
    this.listeners.forEach(({ type, handler }) => {
      document.removeEventListener(type, handler, true)
    })
    this.listeners = []

    // 移除导航监听
    this.teardownNavigationListener()
  }

  /**
   * 设置导航监听
   */
  setupNavigationListener() {
    // 监听 history 变化
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = (...args) => {
      originalPushState.apply(history, args)
      this.handleNavigate(window.location.href)
    }

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args)
      this.handleNavigate(window.location.href)
    }

    window.addEventListener('popstate', () => {
      this.handleNavigate(window.location.href)
    })

    // 保存原始方法以便恢复
    this._originalPushState = originalPushState
    this._originalReplaceState = originalReplaceState
  }

  /**
   * 移除导航监听
   */
  teardownNavigationListener() {
    if (this._originalPushState) {
      history.pushState = this._originalPushState
    }
    if (this._originalReplaceState) {
      history.replaceState = this._originalReplaceState
    }
  }

  /**
   * 处理点击事件
   */
  handleClick(event) {
    if (this.status !== RECORDING_STATUS.RECORDING) return

    const element = event.target
    const selector = generateSelector(element)

    // 忽略录制工具栏本身的点击
    if (this.isRecorderElement(element)) return

    this.addAction(ACTION_TYPES.CLICK, {
      selector,
      selectorType: 'css',
      doubleClick: event.detail === 2,
    })
  }

  /**
   * 处理输入事件
   */
  handleInput(event) {
    if (this.status !== RECORDING_STATUS.RECORDING) return

    const element = event.target
    if (!this.isInputElement(element)) return

    const selector = generateSelector(element)

    // 对于输入框，记录最终的值
    this.addAction(ACTION_TYPES.INPUT, {
      selector,
      selectorType: 'css',
      value: element.value,
      clearFirst: true,
    })
  }

  /**
   * 处理变化事件（select、checkbox、radio）
   */
  handleChange(event) {
    if (this.status !== RECORDING_STATUS.RECORDING) return

    const element = event.target
    const selector = generateSelector(element)
    const tagName = element.tagName.toLowerCase()

    if (tagName === 'select') {
      this.addAction(ACTION_TYPES.SELECT, {
        selector,
        selectorType: 'css',
        value: element.value,
        by: 'value',
      })
    }
  }

  /**
   * 处理键盘事件
   */
  handleKeydown(event) {
    if (this.status !== RECORDING_STATUS.RECORDING) return

    // 只记录特殊按键（Enter、Tab、Escape 等）
    const specialKeys = [
      'Enter',
      'Tab',
      'Escape',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ]
    if (!specialKeys.includes(event.key)) return

    const modifiers = []
    if (event.ctrlKey) modifiers.push('Control')
    if (event.shiftKey) modifiers.push('Shift')
    if (event.altKey) modifiers.push('Alt')
    if (event.metaKey) modifiers.push('Meta')

    this.addAction(ACTION_TYPES.KEYPRESS, {
      key: event.key,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    })
  }

  /**
   * 处理滚动事件（节流）
   */
  handleScroll(event) {
    if (this.status !== RECORDING_STATUS.RECORDING) return

    // 使用节流，避免记录过多滚动事件
    if (this._scrollTimeout) return

    this._scrollTimeout = setTimeout(() => {
      this._scrollTimeout = null

      // 只记录主要滚动（超过 100px）
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      if (Math.abs(scrollY) > 100 || Math.abs(scrollX) > 100) {
        this.addAction(ACTION_TYPES.SCROLL, {
          x: scrollX,
          y: scrollY,
          behavior: 'smooth',
        })
      }
    }, 500)
  }

  /**
   * 处理导航事件
   */
  handleNavigate(url) {
    if (this.status !== RECORDING_STATUS.RECORDING) return
    if (url === this.currentUrl) return

    this.currentUrl = url
    this.recordedActions.push({
      id: this.generateId(),
      type: ACTION_TYPES.NAVIGATE,
      params: { url },
      timestamp: Date.now(),
    })
  }

  /**
   * 记录导航动作
   */
  recordNavigate(url) {
    this.recordedActions.push({
      id: this.generateId(),
      type: ACTION_TYPES.NAVIGATE,
      params: { url },
      timestamp: Date.now(),
    })
  }

  /**
   * 添加动作
   */
  addAction(type, params) {
    // 去重：如果最后一个动作相同，则更新而不是添加
    const lastAction = this.recordedActions[this.recordedActions.length - 1]
    if (lastAction && lastAction.type === type) {
      const isSame = Object.keys(params).every((key) => lastAction.params[key] === params[key])
      if (isSame) {
        lastAction.timestamp = Date.now()
        return
      }
    }

    this.recordedActions.push({
      id: this.generateId(),
      type,
      params,
      timestamp: Date.now(),
    })

    // 通知外部（如悬浮工具栏）
    this.notifyActionRecorded()
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 检查元素是否是输入元素
   */
  isInputElement(element) {
    const tagName = element.tagName.toLowerCase()
    const inputTypes = ['input', 'textarea', 'select']
    return inputTypes.includes(tagName) || element.isContentEditable
  }

  /**
   * 检查元素是否是录制工具栏的元素
   */
  isRecorderElement(element) {
    return element.closest?.('#operation-recorder-overlay') !== null
  }

  /**
   * 通知动作已记录
   */
  notifyActionRecorded() {
    // 发送自定义事件
    window.dispatchEvent(
      new CustomEvent('operation-recorder-action', {
        detail: {
          actionCount: this.recordedActions.length,
          lastAction: this.recordedActions[this.recordedActions.length - 1],
        },
      }),
    )
  }

  /**
   * 获取录制状态
   */
  getStatus() {
    return {
      status: this.status,
      actionCount: this.recordedActions.length,
      duration: this.startTime ? Date.now() - this.startTime : 0,
    }
  }

  /**
   * 获取录制的动作列表
   */
  getActions() {
    return [...this.recordedActions]
  }

  /**
   * 清空录制的动作
   */
  clearActions() {
    this.recordedActions = []
  }
}

// 创建单例
let recorderInstance = null

export function getRecorder() {
  if (!recorderInstance) {
    recorderInstance = new Recorder()
  }
  return recorderInstance
}

export function createRecorder() {
  recorderInstance = new Recorder()
  return recorderInstance
}

export default Recorder
