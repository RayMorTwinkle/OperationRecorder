/**
 * 录制悬浮工具栏
 * 在页面上显示录制控制界面
 */

import { getRecorder } from './recorder.js'

class RecordingOverlay {
  constructor() {
    this.overlay = null
    this.isVisible = false
    this.recorder = getRecorder()
    this.actionCount = 0
    this.duration = 0
    this.durationInterval = null

    // 绑定方法
    this.handleStart = this.handleStart.bind(this)
    this.handlePause = this.handlePause.bind(this)
    this.handleResume = this.handleResume.bind(this)
    this.handleStop = this.handleStop.bind(this)
    this.handleActionRecorded = this.handleActionRecorded.bind(this)
    this.updateDuration = this.updateDuration.bind(this)
    this.toggleMinimize = this.toggleMinimize.bind(this)
  }

  /**
   * 创建工具栏
   */
  create() {
    if (this.overlay) return

    // 创建容器
    this.overlay = document.createElement('div')
    this.overlay.id = 'operation-recorder-overlay'
    this.overlay.className = 'or-overlay'

    // 设置样式
    this.applyStyles()

    // 创建内容
    this.overlay.innerHTML = `
      <div class="or-header">
        <div class="or-title">
          <span class="or-icon">🔴</span>
          <span class="or-text">录制中</span>
        </div>
        <div class="or-controls">
          <button class="or-btn or-btn-minimize" title="最小化">−</button>
          <button class="or-btn or-btn-close" title="关闭">×</button>
        </div>
      </div>
      <div class="or-body">
        <div class="or-stats">
          <div class="or-stat">
            <span class="or-stat-label">动作</span>
            <span class="or-stat-value or-action-count">0</span>
          </div>
          <div class="or-stat">
            <span class="or-stat-label">时长</span>
            <span class="or-stat-value or-duration">00:00</span>
          </div>
        </div>
        <div class="or-actions">
          <button class="or-btn or-btn-primary or-btn-pause" style="display: none;">
            <span>⏸</span> 暂停
          </button>
          <button class="or-btn or-btn-primary or-btn-resume" style="display: none;">
            <span>▶</span> 继续
          </button>
          <button class="or-btn or-btn-danger or-btn-stop">
            <span>⏹</span> 停止
          </button>
        </div>
      </div>
    `

    // 绑定事件
    this.bindEvents()

    // 添加到页面
    document.body.appendChild(this.overlay)
    this.isVisible = true

    // 监听录制动作
    window.addEventListener('operation-recorder-action', this.handleActionRecorded)

    // 开始更新时长
    this.startDurationUpdate()
  }

  /**
   * 应用样式
   */
  applyStyles() {
    const styles = `
      #operation-recorder-overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 2147483647;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      #operation-recorder-overlay.or-minimized {
        width: auto;
      }

      #operation-recorder-overlay.or-minimized .or-body {
        display: none;
      }

      .or-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%);
        color: white;
      }

      .or-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
      }

      .or-icon {
        font-size: 16px;
      }

      .or-controls {
        display: flex;
        gap: 4px;
      }

      .or-btn {
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.2s;
      }

      .or-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .or-body {
        padding: 16px;
      }

      .or-stats {
        display: flex;
        gap: 24px;
        margin-bottom: 16px;
      }

      .or-stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .or-stat-label {
        font-size: 12px;
        color: #8e8e93;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .or-stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #1c1c1e;
      }

      .or-actions {
        display: flex;
        gap: 8px;
      }

      .or-btn-primary,
      .or-btn-danger {
        flex: 1;
        height: 40px;
        font-size: 14px;
        font-weight: 500;
        gap: 6px;
      }

      .or-btn-primary {
        background: #007aff;
      }

      .or-btn-primary:hover {
        background: #0056b3;
      }

      .or-btn-danger {
        background: #ff3b30;
      }

      .or-btn-danger:hover {
        background: #d32f2f;
      }

      .or-btn span {
        font-size: 14px;
      }

      /* 录制状态指示器 */
      .or-recording-indicator {
        width: 8px;
        height: 8px;
        background: #ff3b30;
        border-radius: 50%;
        animation: or-pulse 1.5s ease-in-out infinite;
      }

      @keyframes or-pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.2);
        }
      }
    `

    // 检查是否已存在样式
    let styleEl = document.getElementById('operation-recorder-styles')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'operation-recorder-styles'
      styleEl.textContent = styles
      document.head.appendChild(styleEl)
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const minimizeBtn = this.overlay.querySelector('.or-btn-minimize')
    const closeBtn = this.overlay.querySelector('.or-btn-close')
    const pauseBtn = this.overlay.querySelector('.or-btn-pause')
    const resumeBtn = this.overlay.querySelector('.or-btn-resume')
    const stopBtn = this.overlay.querySelector('.or-btn-stop')

    minimizeBtn?.addEventListener('click', this.toggleMinimize)
    closeBtn?.addEventListener('click', () => this.hide())
    pauseBtn?.addEventListener('click', this.handlePause)
    resumeBtn?.addEventListener('click', this.handleResume)
    stopBtn?.addEventListener('click', this.handleStop)

    // 拖拽功能
    this.setupDraggable()
  }

  /**
   * 设置拖拽
   */
  setupDraggable() {
    const header = this.overlay.querySelector('.or-header')
    let isDragging = false
    let startX, startY, startLeft, startTop

    header.addEventListener('mousedown', (e) => {
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      const rect = this.overlay.getBoundingClientRect()
      startLeft = rect.left
      startTop = rect.top
      this.overlay.style.transition = 'none'
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      this.overlay.style.left = `${startLeft + dx}px`
      this.overlay.style.top = `${startTop + dy}px`
      this.overlay.style.right = 'auto'
    })

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false
        this.overlay.style.transition = 'all 0.3s ease'
      }
    })
  }

  /**
   * 处理开始录制
   */
  handleStart() {
    this.recorder.start()
    this.updateUI()
  }

  /**
   * 处理暂停
   */
  handlePause() {
    this.recorder.pause()
    this.updateUI()
    this.stopDurationUpdate()
  }

  /**
   * 处理恢复
   */
  handleResume() {
    this.recorder.resume()
    this.updateUI()
    this.startDurationUpdate()
  }

  /**
   * 处理停止
   */
  handleStop() {
    const result = this.recorder.stop()
    this.stopDurationUpdate()
    this.hide()

    // 发送消息到 background
    chrome.runtime?.sendMessage({
      type: 'RECORDING_FINISHED',
      data: result,
    })

    return result
  }

  /**
   * 处理动作记录
   */
  handleActionRecorded(event) {
    this.actionCount = event.detail.actionCount
    this.updateStats()
  }

  /**
   * 更新时长
   */
  updateDuration() {
    const status = this.recorder.getStatus()
    this.duration = status.duration
    this.updateStats()
  }

  /**
   * 开始更新时长
   */
  startDurationUpdate() {
    this.durationInterval = setInterval(this.updateDuration, 1000)
  }

  /**
   * 停止更新时长
   */
  stopDurationUpdate() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    const actionCountEl = this.overlay?.querySelector('.or-action-count')
    const durationEl = this.overlay?.querySelector('.or-duration')

    if (actionCountEl) {
      actionCountEl.textContent = this.actionCount
    }

    if (durationEl) {
      durationEl.textContent = this.formatDuration(this.duration)
    }
  }

  /**
   * 格式化时长
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * 更新 UI 状态
   */
  updateUI() {
    const status = this.recorder.getStatus()
    const titleText = this.overlay.querySelector('.or-text')
    const pauseBtn = this.overlay.querySelector('.or-btn-pause')
    const resumeBtn = this.overlay.querySelector('.or-btn-resume')

    if (status.status === 'recording') {
      titleText.textContent = '录制中'
      pauseBtn.style.display = 'flex'
      resumeBtn.style.display = 'none'
    } else if (status.status === 'paused') {
      titleText.textContent = '已暂停'
      pauseBtn.style.display = 'none'
      resumeBtn.style.display = 'flex'
    }
  }

  /**
   * 切换最小化
   */
  toggleMinimize() {
    this.overlay.classList.toggle('or-minimized')
    const btn = this.overlay.querySelector('.or-btn-minimize')
    btn.textContent = this.overlay.classList.contains('or-minimized') ? '+' : '−'
  }

  /**
   * 显示工具栏
   */
  show() {
    if (!this.overlay) {
      this.create()
    }
    this.overlay.style.display = 'block'
    this.isVisible = true

    // 自动开始录制
    this.handleStart()
  }

  /**
   * 隐藏工具栏
   */
  hide() {
    if (this.overlay) {
      this.overlay.style.display = 'none'
    }
    this.isVisible = false
    this.stopDurationUpdate()
  }

  /**
   * 销毁工具栏
   */
  destroy() {
    this.stopDurationUpdate()
    window.removeEventListener('operation-recorder-action', this.handleActionRecorded)

    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }

    // 移除样式
    const styleEl = document.getElementById('operation-recorder-styles')
    if (styleEl) {
      styleEl.remove()
    }

    this.isVisible = false
  }
}

// 创建单例
let overlayInstance = null

export function getOverlay() {
  if (!overlayInstance) {
    overlayInstance = new RecordingOverlay()
  }
  return overlayInstance
}

export function createOverlay() {
  overlayInstance = new RecordingOverlay()
  return overlayInstance
}

export default RecordingOverlay
