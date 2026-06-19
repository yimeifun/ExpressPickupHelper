import { defineStore } from 'pinia'
import { updateWidget, notifyTimeout } from '@/utils/widgetBridge'
import { parsePickupCode } from '@/utils/smsParser'

/**
 * Pinia 全局状态管理 - 快递取件码模块
 *
 * 新增功能：
 * - 批量选择 (chosenIds)
 * - 批量确认取件
 * - 超时提醒检测 (>24小时待取件提醒)
 * - OCR 识别文本转快递
 */
export const useExpressStore = defineStore('express', {
  state: () => ({
    // 所有历史记录（含 pending 与 picked）
    list: [],
    // 本次扫描周期内已处理的短信ID（内存中，不持久化）
    _scanSessionSet: new Set(),
    // 批量选择中的快递ID列表
    chosenIds: [],
    // 上次超时提醒时间（避免重复提醒）
    _lastTimeoutNotifyTime: 0,
    // 本地存储 key
    STORAGE_KEY: 'expressData',
    STATE_KEY: 'expressState'
  }),

  getters: {
    // 未取件列表（仅显示最近14天，按时间倒序）
    pendingList(state) {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
      return state.list
        .filter(item => item.status === 'pending')
        .filter(item => (item.smsTime || 0) >= cutoff)
        .sort((a, b) => (b.smsTime || 0) - (a.smsTime || 0))
    },

    // 已取件列表（仅显示最近14天）
    pickedList(state) {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
      return state.list
        .filter(item => item.status === 'picked')
        .filter(item => (item.pickTime || item.smsTime || 0) >= cutoff)
        .sort((a, b) => (b.pickTime || 0) - (a.pickTime || 0))
    },

    // 合并列表：pending 在前、picked 在后（仅显示最近14天）
    sortedList(state) {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
      const pending = state.list
        .filter(item => item.status === 'pending')
        .filter(item => (item.smsTime || 0) >= cutoff)
        .sort((a, b) => (b.smsTime || 0) - (a.smsTime || 0))
      const picked = state.list
        .filter(item => item.status === 'picked')
        .filter(item => (item.pickTime || item.smsTime || 0) >= cutoff)
        .sort((a, b) => (b.pickTime || a.smsTime || 0) - (a.pickTime || a.smsTime || 0))
      return [...pending, ...picked]
    },

    // 超时未取件列表（>24小时仍 pending）
    timeoutList(state) {
      const cutoff24h = Date.now() - 24 * 60 * 60 * 1000
      return state.list
        .filter(item => item.status === 'pending')
        .filter(item => (item.smsTime || 0) < cutoff24h)
        .sort((a, b) => (a.smsTime || 0) - (b.smsTime || 0)) // 最久的排前面
    },

    // 超时未取件数量（供首页红色横幅显示）
    timeoutCount(state) {
      const cutoff24h = Date.now() - 24 * 60 * 60 * 1000
      return state.list.filter(it =>
        it.status === 'pending' && (it.smsTime || 0) < cutoff24h
      ).length
    },

    // 已选择的数量
    chosenCount(state) {
      return state.chosenIds.length
    },

    // 是否全选（当前可视 pending 列表）
    isAllChosen(state) {
      if (state.chosenIds.length === 0) return false
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
      const pending = state.list
        .filter(it => it.status === 'pending')
        .filter(it => (it.smsTime || 0) >= cutoff)
      return pending.length > 0 && pending.every(it => state.chosenIds.includes(it.id))
    }
  },

  actions: {
    /**
     * 开始新的扫描会话
     */
    beginScanSession() {
      this._scanSessionSet.clear()
      console.log('[store] 开始新的扫描会话')
    },

    /**
     * 添加一条快递记录
     */
    addItem(item, triggerNotify = false) {
      if (!item || !item.code) {
        console.warn('[store] 无效记录，已忽略')
        return null
      }

      const newItem = {
        id: item.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        company: item.company || '其他快递',
        code: item.code,
        address: item.address || '',
        smsTime: item.smsTime || Date.now(),
        status: item.status || 'pending',
        rawSms: item.rawSms || '',
        remark: item.remark || '',
        pickTime: null,
        smsId: item.smsId || null,
        codeType: item.codeType || ''
      }

      if (newItem.smsId && this._scanSessionSet.has(String(newItem.smsId))) {
        return null
      }
      if (newItem.smsId && this.list.some(it => it.smsId === String(newItem.smsId))) {
        return null
      }
      if (newItem.smsId) this._scanSessionSet.add(String(newItem.smsId))

      this.list.unshift(newItem)
      this.saveToStorage()
      updateWidget(this.pendingList)

      if (triggerNotify) {
        // 通知由上层调用（widgetBridge.notifyNewExpress）
      }

      console.log('[store] ✅ 新增：', newItem.company, newItem.code)
      return newItem
    },

    /**
     * 单条确认取件
     */
    pickItem(id) {
      const target = this.list.find(it => it.id === id)
      if (!target) return
      target.status = 'picked'
      target.pickTime = Date.now()
      this.saveToStorage()
      updateWidget(this.pendingList)
      // 若此条在批量选择中，移除
      const idx = this.chosenIds.indexOf(id)
      if (idx >= 0) this.chosenIds.splice(idx, 1)
      console.log('[store] 确认取件：', target.code)
    },

    /**
     * 批量确认取件
     */
    pickBatch(ids) {
      if (!ids || ids.length === 0) return
      let count = 0
      ids.forEach(id => {
        const target = this.list.find(it => it.id === id)
        if (target && target.status === 'pending') {
          target.status = 'picked'
          target.pickTime = Date.now()
          count++
        }
      })
      this.chosenIds = []
      this.saveToStorage()
      updateWidget(this.pendingList)
      console.log(`[store] 批量确认取件：${count} 条`)
      return count
    },

    /**
     * 切换选择状态
     */
    toggleChoose(id) {
      const idx = this.chosenIds.indexOf(id)
      if (idx >= 0) {
        this.chosenIds.splice(idx, 1)
      } else {
        this.chosenIds.push(id)
      }
    },

    /**
     * 全选当前 pending 列表
     */
    chooseAllPending() {
      this.chosenIds = []
      this.pendingList.forEach(it => this.chosenIds.push(it.id))
    },

    /**
     * 清空选择
     */
    clearChoices() {
      this.chosenIds = []
    },

    /**
     * 删除一条记录
     */
    deleteItem(id) {
      const idx = this.list.findIndex(it => it.id === id)
      if (idx < 0) return
      this.list.splice(idx, 1)
      this.saveToStorage()
      updateWidget(this.pendingList)
    },

    /**
     * 清空所有已取件记录
     */
    clearPicked() {
      this.list = this.list.filter(it => it.status === 'pending')
      this.saveToStorage()
      updateWidget(this.pendingList)
      console.log('[store] 已清空所有已取件记录')
    },

    /**
     * 清空所有记录
     */
    clearAll() {
      this.list = []
      this.chosenIds = []
      this.saveToStorage()
      updateWidget([])
      console.log('[store] 已清空所有记录')
    },

    /**
     * 更新备注
     */
    updateRemark(id, remark) {
      const target = this.list.find(it => it.id === id)
      if (!target) return
      target.remark = remark
      this.saveToStorage()
    },

    /**
     * 检测超时未取件 - 供 App 启动或进入前台时调用
     * 逻辑：超时数量 > 0 且距离上次提醒超过 6 小时，则触发系统通知
     * @returns {number} 超时数量
     */
    checkTimeout(forceNotify = false) {
      const count = this.timeoutCount
      if (count === 0) {
        this._lastTimeoutNotifyTime = 0
        return 0
      }
      const now = Date.now()
      // 6 小时内不重复提醒
      const cooldown = 6 * 60 * 60 * 1000
      if (forceNotify || now - this._lastTimeoutNotifyTime > cooldown) {
        const timeoutItems = this.timeoutList.slice(0, 3)
        notifyTimeout(count, timeoutItems)
        this._lastTimeoutNotifyTime = now
        this.saveToStorage()
      }
      return count
    },

    /**
     * 从 OCR 识别文本提取取件码并入库
     * @param {string} ocrText OCR 识别出的文本
     * @param {string} company 可选：用户指定的快递公司
     * @param {string} address 可选：地址
     * @returns {Object|null} 新添加的记录
     */
    addFromOcr(ocrText, company = '', address = '') {
      if (!ocrText || !ocrText.trim()) return null

      // 1) 先用解析函数提取取件码
      const parsed = parsePickupCode(ocrText)
      let code = parsed.code
      let finalCompany = company || parsed.company || '其他快递'
      let finalAddress = address || parsed.address || ''

      // 2) 如果 parsePickupCode 没识别到，做兜底：匹配 3-12 位字母数字
      if (!code) {
        const match = ocrText.match(/\b([A-Za-z0-9]{3,14})\b/)
        if (match && match[1]) code = match[1]
      }

      // 3) 若仍没有，查找 6 位纯数字
      if (!code) {
        const numMatch = ocrText.match(/\b(\d{4,12})\b/)
        if (numMatch && numMatch[1]) code = numMatch[1]
      }

      if (!code) {
        console.log('[store] OCR 未识别到取件码')
        return null
      }

      return this.addItem({
        company: finalCompany,
        code: code.trim(),
        address: finalAddress,
        smsTime: Date.now(),
        status: 'pending',
        rawSms: '（OCR 识别）' + ocrText,
        remark: '',
        codeType: 'OCR',
        smsId: null
      }, false)
    },

    /**
     * 从本地 Storage 加载
     */
    loadFromStorage() {
      try {
        const raw = uni.getStorageSync(this.STORAGE_KEY)
        if (raw && Array.isArray(raw)) {
          this.list = raw
        }
        // 加载额外状态（_lastTimeoutNotifyTime）
        const stateRaw = uni.getStorageSync(this.STATE_KEY)
        if (stateRaw && typeof stateRaw === 'object') {
          if (stateRaw._lastTimeoutNotifyTime) {
            this._lastTimeoutNotifyTime = stateRaw._lastTimeoutNotifyTime
          }
        }
        updateWidget(this.pendingList)
        console.log('[store] 加载完成，共', this.list.length, '条记录')
      } catch (e) {
        console.warn('[store] 加载失败：', e)
      }
    },

    /**
     * 保存到本地
     */
    saveToStorage() {
      try {
        uni.setStorageSync(this.STORAGE_KEY, this.list)
        uni.setStorageSync(this.STATE_KEY, {
          _lastTimeoutNotifyTime: this._lastTimeoutNotifyTime
        })
      } catch (e) {
        console.warn('[store] 持久化失败：', e)
      }
    },

    /**
     * 根据 ID 查询
     */
    findById(id) {
      if (!id) return null
      const target = String(id)
      return this.list.find(it => String(it.id) === target) || null
    }
  }
})
