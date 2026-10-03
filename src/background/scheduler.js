/**
 * 定时任务调度器
 * 管理脚本的定时执行
 */

import { getExecutor } from './executor.js'
import * as storage from './storage.js'

const ALARM_NAME = 'operation-recorder-scheduler'
const CHECK_INTERVAL_MINUTES = 1 // 每分钟检查一次

class Scheduler {
  constructor() {
    this.isInitialized = false
    this.executor = getExecutor()
  }

  /**
   * 初始化调度器
   */
  async init() {
    if (this.isInitialized) return

    // 创建定时闹钟
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: CHECK_INTERVAL_MINUTES,
    })

    // 监听闹钟事件
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM_NAME) {
        this.checkScheduledTasks()
      }
    })

    // 监听浏览器启动事件
    chrome.runtime.onStartup.addListener(() => {
      this.checkScheduledTasks()
    })

    this.isInitialized = true
    console.log('[Scheduler] 调度器已初始化')
  }

  /**
   * 检查定时任务
   */
  async checkScheduledTasks() {
    try {
      const scripts = await storage.getScripts()
      const now = Date.now()

      for (const script of Object.values(scripts)) {
        if (!script.schedule?.enabled) continue

        const shouldExecute = this.shouldExecute(script, now)
        if (shouldExecute) {
          console.log(`[Scheduler] 执行定时脚本: ${script.name}`)
          await this.executeScheduledScript(script)
        }
      }
    } catch (error) {
      console.error('[Scheduler] 检查定时任务失败:', error)
    }
  }

  /**
   * 判断是否应该执行脚本
   * @param {Object} script - 脚本对象
   * @param {number} now - 当前时间戳
   * @returns {boolean}
   */
  shouldExecute(script, now) {
    const { schedule, lastExecutionTime } = script
    if (!schedule) return false

    const lastExecution = lastExecutionTime || script.createdAt

    switch (schedule.type) {
      case 'interval':
        // 间隔执行
        return now - lastExecution >= schedule.interval

      case 'daily': {
        // 每天特定时间执行
        if (!schedule.time) return false
        const [hours, minutes] = schedule.time.split(':').map(Number)
        const scheduledTime = new Date()
        scheduledTime.setHours(hours, minutes, 0, 0)

        // 检查是否在今天的时间点之后，且上次执行不是今天
        const lastExecutionDate = new Date(lastExecution)
        const isSameDay = lastExecutionDate.toDateString() === new Date().toDateString()

        return now >= scheduledTime.getTime() && !isSameDay
      }

      case 'weekly': {
        // 每周特定星期几执行
        if (!schedule.dayOfWeek || !schedule.time) return false
        const currentDay = new Date().getDay()
        if (currentDay !== schedule.dayOfWeek) return false

        const [wHours, wMinutes] = schedule.time.split(':').map(Number)
        const weeklyScheduledTime = new Date()
        weeklyScheduledTime.setHours(wHours, wMinutes, 0, 0)

        const lastWeeklyExecution = new Date(lastExecution)
        const isSameWeek = this.isSameWeek(lastWeeklyExecution, new Date())

        return now >= weeklyScheduledTime.getTime() && !isSameWeek
      }

      default:
        return false
    }
  }

  /**
   * 判断两个日期是否在同一周
   * @param {Date} date1
   * @param {Date} date2
   * @returns {boolean}
   */
  isSameWeek(date1, date2) {
    const startOfWeek = (date) => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(d.setDate(diff))
    }

    return startOfWeek(date1).toDateString() === startOfWeek(date2).toDateString()
  }

  /**
   * 执行定时脚本
   * @param {Object} script - 脚本对象
   */
  async executeScheduledScript(script) {
    try {
      // 查找或创建执行用的标签页
      const tab = await this.findOrCreateExecutionTab()

      // 执行脚本
      const result = await this.executor.execute(script.id, { tabId: tab.id })

      if (result.success) {
        console.log(`[Scheduler] 脚本执行成功: ${script.name}`)
      } else {
        console.error(`[Scheduler] 脚本执行失败: ${script.name}`, result.log.error)
      }
    } catch (error) {
      console.error(`[Scheduler] 执行脚本时出错: ${script.name}`, error)
    }
  }

  /**
   * 查找或创建执行用的标签页
   * @returns {Promise<Object>}
   */
  async findOrCreateExecutionTab() {
    // 查找现有的活动标签页
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTab) {
      return activeTab
    }

    // 创建新标签页
    const tab = await chrome.tabs.create({
      url: 'about:blank',
      active: false,
    })

    return tab
  }

  /**
   * 设置脚本定时任务
   * @param {string} scriptId - 脚本 ID
   * @param {Object} schedule - 定时配置
   */
  async setSchedule(scriptId, schedule) {
    const script = await storage.getScript(scriptId)
    if (!script) {
      throw new Error('脚本不存在')
    }

    script.schedule = schedule
    await storage.saveScript(script)

    console.log(`[Scheduler] 已设置定时任务: ${script.name}`)
  }

  /**
   * 移除脚本定时任务
   * @param {string} scriptId - 脚本 ID
   */
  async removeSchedule(scriptId) {
    const script = await storage.getScript(scriptId)
    if (!script) {
      throw new Error('脚本不存在')
    }

    script.schedule = null
    await storage.saveScript(script)

    console.log(`[Scheduler] 已移除定时任务: ${script.name}`)
  }

  /**
   * 获取所有定时任务
   * @returns {Promise<Array>}
   */
  async getScheduledScripts() {
    const scripts = await storage.getScripts()
    return Object.values(scripts).filter((script) => script.schedule?.enabled)
  }

  /**
   * 立即执行一次脚本（用于测试）
   * @param {string} scriptId - 脚本 ID
   */
  async executeNow(scriptId) {
    const script = await storage.getScript(scriptId)
    if (!script) {
      throw new Error('脚本不存在')
    }

    await this.executeScheduledScript(script)
  }

  /**
   * 停止调度器
   */
  async stop() {
    await chrome.alarms.clear(ALARM_NAME)
    this.isInitialized = false
    console.log('[Scheduler] 调度器已停止')
  }
}

// 创建单例
let schedulerInstance = null

export function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler()
  }
  return schedulerInstance
}

export function createScheduler() {
  schedulerInstance = new Scheduler()
  return schedulerInstance
}

export default Scheduler
