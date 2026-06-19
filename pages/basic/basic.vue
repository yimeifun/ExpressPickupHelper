<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="header-title">基础设置</text>
      <text class="header-sub">管理应用基础功能</text>
    </view>

    <!-- 已取件自动清除 -->
    <view class="section">
      <view class="section-title">已取件自动清除</view>

      <view class="setting-card">
        <view class="setting-header">
          <text class="setting-icon">🗑️</text>
          <view class="setting-info">
            <text class="setting-name">自动清除已取件记录</text>
            <text class="setting-desc">已取件的快递记录会在指定天数后自动清除</text>
          </view>
        </view>

        <!-- 开关 -->
        <view class="switch-row">
          <text class="switch-label">启用自动清除</text>
          <switch
            :checked="autoClearEnabled"
            @change="onAutoClearSwitch"
            color="#1A2A4A"
          />
        </view>

        <!-- 天数选择（仅启用时显示） -->
        <view class="days-row" v-if="autoClearEnabled">
          <text class="days-label">清除天数</text>
          <view class="days-picker">
            <view
              class="day-option"
              :class="{ active: autoClearDays === 1 }"
              @click="setAutoClearDays(1)"
            >
              <text>1 天</text>
            </view>
            <view
              class="day-option"
              :class="{ active: autoClearDays === 3 }"
              @click="setAutoClearDays(3)"
            >
              <text>3 天</text>
            </view>
            <view
              class="day-option"
              :class="{ active: autoClearDays === 7 }"
              @click="setAutoClearDays(7)"
            >
              <text>7 天</text>
            </view>
            <view
              class="day-option"
              :class="{ active: autoClearDays === 14 }"
              @click="setAutoClearDays(14)"
            >
              <text>14 天</text>
            </view>
            <view
              class="day-option"
              :class="{ active: autoClearDays === 30 }"
              @click="setAutoClearDays(30)"
            >
              <text>30 天</text>
            </view>
          </view>
        </view>

        <!-- 立即清除按钮 -->
        <view class="clear-btn" @click="onClearPickedNow">
          <text>🗑️ 立即清除所有已取件记录</text>
        </view>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="section">
      <view class="section-title">数据管理</view>

      <view class="data-card">
        <view class="data-item">
          <text class="data-icon">📊</text>
          <view class="data-info">
            <text class="data-name">待取件数量</text>
            <text class="data-value">{{ pendingCount }} 条</text>
          </view>
        </view>

        <view class="data-item">
          <text class="data-icon">✅</text>
          <view class="data-info">
            <text class="data-name">已取件数量</text>
            <text class="data-value">{{ pickedCount }} 条</text>
          </view>
        </view>

        <view class="data-item danger" @click="onClearAll">
          <text class="data-icon">⚠️</text>
          <view class="data-info">
            <text class="data-name">清空所有记录</text>
            <text class="data-desc">此操作不可恢复，请谨慎</text>
          </view>
          <text class="data-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 底部说明 -->
    <view class="footer-tip">
      <text class="tip-title">💡 说明</text>
      <text class="tip-text">• 自动清除仅在应用启动时执行一次</text>
      <text class="tip-text">• 清除的记录无法恢复，请根据需要选择合适的天数</text>
      <text class="tip-text">• 数据仅保存在本地，卸载应用将清除所有数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useExpressStore } from '@/stores/express'
import { storeToRefs } from 'pinia'

const store = useExpressStore()
const { pendingList, pickedList } = storeToRefs(store)

// 待取件数量
const pendingCount = computed(() => pendingList.value.length)
// 已取件数量
const pickedCount = computed(() => pickedList.value.length)

// 自动清除设置
const autoClearEnabled = ref(false)
const autoClearDays = ref(7)

// 存储键名
const STORAGE_KEY_AUTO_CLEAR = 'autoClearEnabled'
const STORAGE_KEY_AUTO_CLEAR_DAYS = 'autoClearDays'

onMounted(() => {
  // 从本地存储读取设置
  const savedEnabled = uni.getStorageSync(STORAGE_KEY_AUTO_CLEAR)
  const savedDays = uni.getStorageSync(STORAGE_KEY_AUTO_CLEAR_DAYS)

  if (savedEnabled !== '' && savedEnabled !== undefined) {
    autoClearEnabled.value = savedEnabled === true || savedEnabled === 'true'
  }
  if (savedDays) {
    autoClearDays.value = parseInt(savedDays) || 7
  }

  // 如果启用自动清除，执行一次检查
  if (autoClearEnabled.value) {
    performAutoClear()
  }
})

/**
 * 切换自动清除开关
 */
function onAutoClearSwitch(e) {
  autoClearEnabled.value = e.detail.value
  uni.setStorageSync(STORAGE_KEY_AUTO_CLEAR, autoClearEnabled.value)

  uni.showToast({
    title: autoClearEnabled.value ? '已启用自动清除' : '已关闭自动清除',
    icon: 'none'
  })

  // 启用时立即执行一次检查
  if (autoClearEnabled.value) {
    performAutoClear()
  }
}

/**
 * 设置自动清除天数
 */
function setAutoClearDays(days) {
  autoClearDays.value = days
  uni.setStorageSync(STORAGE_KEY_AUTO_CLEAR_DAYS, days)

  uni.showToast({
    title: `已设置为 ${days} 天后清除`,
    icon: 'none'
  })
}

/**
 * 执行自动清除
 * 检查所有已取件记录，清除超过指定天数的记录
 */
function performAutoClear() {
  const now = Date.now()
  const threshold = autoClearDays.value * 24 * 60 * 60 * 1000 // 天数转毫秒

  let clearedCount = 0
  const remainingList = store.list.filter(item => {
    if (item.status === 'picked' && item.pickTime) {
      const elapsed = now - item.pickTime
      if (elapsed > threshold) {
        clearedCount++
        return false // 超过阈值，清除
      }
    }
    return true // 保留
  })

  if (clearedCount > 0) {
    store.list = remainingList
    store.saveToStorage()
    console.log(`[basic] 自动清除了 ${clearedCount} 条已取件记录（超过 ${autoClearDays.value} 天）`)
  }
}

/**
 * 立即清除所有已取件记录
 */
function onClearPickedNow() {
  if (pickedCount.value === 0) {
    uni.showToast({ title: '暂无已取件记录', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认清除',
    content: `当前有 ${pickedCount.value} 条已取件记录，确定要全部清除吗？\n\n此操作不可恢复。`,
    confirmText: '确认清除',
    confirmColor: '#C62828',
    success: (res) => {
      if (res.confirm) {
        store.clearPicked()
        uni.showToast({ title: '已清除所有已取件记录', icon: 'success' })
      }
    }
  })
}

/**
 * 清空所有记录
 */
function onClearAll() {
  const total = pendingCount.value + pickedCount.value
  if (total === 0) {
    uni.showToast({ title: '暂无任何记录', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认清空',
    content: `当前共有 ${total} 条记录（待取件 ${pendingCount.value} + 已取件 ${pickedCount.value}），确定要全部清空吗？\n\n此操作不可恢复。`,
    confirmText: '确认清空',
    confirmColor: '#C62828',
    success: (res) => {
      if (res.confirm) {
        store.clearAll()
        uni.showToast({ title: '已清空所有记录', icon: 'success' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F5F6F8;
  padding: 24rpx;
}

/* 顶部标题 */
.header {
  padding: 16rpx 8rpx 28rpx;
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1A2A4A;
  margin-bottom: 8rpx;
}

.header-sub {
  font-size: 24rpx;
  color: #8A8A8A;
}

/* 章节 */
.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 26rpx;
  color: #8A8A8A;
  padding: 0 8rpx 16rpx;
  font-weight: 500;
}

/* 设置卡片 */
.setting-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.setting-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.setting-icon {
  font-size: 44rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.setting-name {
  font-size: 30rpx;
  color: #1A2A4A;
  font-weight: 600;
  margin-bottom: 6rpx;
}

.setting-desc {
  font-size: 24rpx;
  color: #8A8A8A;
}

/* 开关行 */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E8E8E8;
}

.switch-label {
  font-size: 28rpx;
  color: #1A2A4A;
}

/* 天数选择 */
.days-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #E8E8E8;
}

.days-label {
  font-size: 28rpx;
  color: #1A2A4A;
  margin-bottom: 16rpx;
}

.days-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.day-option {
  padding: 12rpx 24rpx;
  background: #F0F0F0;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #5A6A7A;
  transition: all 0.15s ease;
}

.day-option.active {
  background: #1A2A4A;
  color: #FFFFFF;
}

.day-option:active {
  transform: scale(0.96);
}

/* 清除按钮 */
.clear-btn {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
  border-radius: 20rpx;
  padding: 24rpx;
  text-align: center;
  margin-top: 20rpx;
}

.clear-btn text {
  font-size: 28rpx;
  color: #C62828;
  font-weight: 500;
}

.clear-btn:active {
  transform: scale(0.98);
}

/* 数据卡片 */
.data-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 16rpx 0;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.data-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  transition: transform 0.15s ease;
}

.data-item:active {
  transform: scale(0.98);
}

.data-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.data-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.data-name {
  font-size: 30rpx;
  color: #1A2A4A;
  font-weight: 500;
  margin-bottom: 4rpx;
}

.data-value {
  font-size: 26rpx;
  color: #8A8A8A;
}

.data-desc {
  font-size: 24rpx;
  color: #C62828;
}

.data-item.danger .data-name {
  color: #C62828;
}

.data-arrow {
  font-size: 36rpx;
  color: #C0C0C0;
  flex-shrink: 0;
}

/* 底部提示 */
.footer-tip {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.tip-title {
  font-size: 28rpx;
  color: #1A2A4A;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #8A8A8A;
  line-height: 1.7;
  margin-top: 4rpx;
}
</style>