<template>
  <view class="page">
    <!-- 顶部标题与刷新 -->
    <view class="header">
      <view class="header-left">
        <text class="header-title">权限自检</text>
        <text class="header-sub">一键检测核心权限运行状态</text>
      </view>
      <view class="refresh-btn" @click="refreshReport">
        <text>🔄 重新检测</text>
      </view>
    </view>

    <!-- 总体状态卡 -->
    <view
      class="health-summary"
      :class="{ healthy: report.allOk, unhealthy: !report.allOk }"
    >
      <text class="summary-icon">{{ report.allOk ? '✅' : '⚠️' }}</text>
      <view class="summary-text">
        <text class="summary-title">{{ report.allOk ? '一切正常' : '存在异常' }}</text>
        <text class="summary-desc">{{ report.allOk ? '核心功能均运行正常' : '请根据下方提示处理异常项' }}</text>
        <text class="summary-time">检测时间：{{ lastCheckTime }}</text>
      </view>
    </view>

    <!-- 3 个检测项 -->
    <view class="check-list">
      <view
        class="check-item"
        :class="{ ok: report.smsRead.ok, bad: !report.smsRead.ok }"
        @click="onSmsReadClick"
      >
        <view class="check-left">
          <text class="check-emoji">📨</text>
          <view class="check-info">
            <text class="check-name">短信读取权限</text>
            <text class="check-detail">{{ report.smsRead.detail }}</text>
          </view>
        </view>
        <view class="check-status">
          <text>{{ report.smsRead.ok ? '✔ 正常' : '✘ 异常' }}</text>
          <text class="check-action">{{ report.smsRead.ok ? '' : '去设置 ›' }}</text>
        </view>
      </view>

      <view
        class="check-item"
        :class="{ ok: report.notification.ok, bad: !report.notification.ok }"
        @click="onNotificationClick"
      >
        <view class="check-left">
          <text class="check-emoji">🔔</text>
          <view class="check-info">
            <text class="check-name">通知权限</text>
            <text class="check-detail">{{ report.notification.detail }}</text>
          </view>
        </view>
        <view class="check-status">
          <text>{{ report.notification.ok ? '✔ 正常' : '✘ 异常' }}</text>
          <text class="check-action">{{ report.notification.ok ? '' : '去设置 ›' }}</text>
        </view>
      </view>

      <view
        class="check-item"
        :class="{ ok: report.storage.ok, bad: !report.storage.ok }"
        @click="onStorageClick"
      >
        <view class="check-left">
          <text class="check-emoji">💾</text>
          <view class="check-info">
            <text class="check-name">数据存储状态</text>
            <text class="check-detail">{{ report.storage.detail }}</text>
          </view>
        </view>
        <view class="check-status">
          <text>{{ report.storage.ok ? '✔ 正常' : '✘ 异常' }}</text>
        </view>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="footer-tip">
      <text class="tip-title">💡 提示</text>
      <text class="tip-text">• 「短信读取」需在应用信息 → 权限中开启</text>
      <text class="tip-text">• 「通知权限」用于快递到达和超时提醒</text>
	  <text class="tip-text" style="color: red;">• 「通知类短信权限」软件不会检测，需自行到权限管理-其他权限中开启</text>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import {
  runAppHealthCheck,
  requestSmsPermission,
  requestNotificationPermission
} from '@/utils/smsParser'

const lastCheckTime = ref('')

const report = reactive({
  allOk: true,
  smsRead: { ok: false, detail: '检测中...' },
  notification: { ok: false, detail: '检测中...' },
  storage: { ok: false, detail: '检测中...' }
})

onMounted(() => {
  refreshReport()
})

/**
 * 刷新自检报告
 */
function refreshReport() {
  uni.showLoading({ title: '正在检测...' })
  setTimeout(() => {
    const r = runAppHealthCheck()
    report.smsRead = { ...r.smsRead }
    report.notification = { ...r.notification }
    report.storage = { ...r.storage }
    report.allOk = r.smsRead.ok && r.notification.ok && r.storage.ok
    const now = new Date()
    lastCheckTime.value =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')} ` +
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    uni.hideLoading()
    uni.showToast({
      title: r.allOk ? '检测完成' : '检测完成，存在异常',
      icon: 'none'
    })
  }, 300)
}

/**
 * 短信读取权限点击
 * 优化：确保每次点击都有明确提示，不会静默失败
 */
async function onSmsReadClick() {
  if (report.smsRead.ok) {
    uni.showToast({ title: '短信读取权限已正常', icon: 'none' })
    return
  }
  uni.showModal({
    title: '短信读取权限',
    content:
      '应用需要「读取短信」权限，才能解析快递短信中的取件码。\n\n点击后会尝试申请权限，如未出现弹窗请在系统设置中手动开启。',
    confirmText: '去授权',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '授权中...' })
        try {
          const granted = await requestSmsPermission()
          uni.hideLoading()
          uni.showToast({
            title: granted ? '授权成功' : '请在系统设置中手动开启',
            icon: granted ? 'success' : 'none'
          })
          setTimeout(() => {
            refreshReport()
          }, 1000)
        } catch (e) {
          uni.hideLoading()
          uni.showToast({
            title: '授权失败，请在系统设置中手动开启',
            icon: 'none'
          })
        }
      }
    }
  })
}

/**
 * 通知权限点击
 * 优化：先尝试系统弹窗申请，失败则跳转到应用通知设置页
 */
async function onNotificationClick() {
  if (report.notification.ok) {
    uni.showToast({ title: '通知权限已正常', icon: 'none' })
    return
  }
  uni.showModal({
    title: '系统通知权限',
    content:
      '应用需要「显示通知」权限，才能在快递到达或超时时提醒您。\n\n点击后会先尝试申请权限，如未出现弹窗请在系统设置中手动开启。',
    confirmText: '去授权',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '授权中...' })
        try {
          const granted = await requestNotificationPermission()
          uni.hideLoading()
          uni.showToast({
            title: granted ? '授权成功' : '已跳转通知设置，请手动开启',
            icon: granted ? 'success' : 'none'
          })
          setTimeout(() => {
            refreshReport()
          }, 1000)
        } catch (e) {
          uni.hideLoading()
          uni.showToast({
            title: '授权失败，请在系统设置中手动开启',
            icon: 'none'
          })
        }
      }
    }
  })
}

/**
 * 存储状态点击
 */
function onStorageClick() {
  uni.showModal({
    title: '数据存储状态',
    content: report.storage.ok
      ? `✓ ${report.storage.detail}\n\n数据保存在设备本地，不会上传。`
      : '✘ 本地存储异常，应用无法正常保存数据。\n\n建议：\n1. 重启应用\n2. 检查设备存储空间\n3. 清理应用缓存后重启',
    showCancel: false,
    confirmText: '我知道了'
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16rpx 8rpx 28rpx;
}

.header-left {
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

.refresh-btn {
  padding: 16rpx 24rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.refresh-btn text {
  font-size: 26rpx;
  color: #1A2A4A;
  font-weight: 500;
}

.refresh-btn:active {
  transform: scale(0.96);
}

/* 总体状态卡 */
.health-summary {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 36rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 28rpx;
}

.health-summary.healthy {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}

.health-summary.unhealthy {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
}

.summary-icon {
  font-size: 64rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.summary-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.summary-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1A2A4A;
  margin-bottom: 8rpx;
}

.summary-desc {
  font-size: 26rpx;
  color: #5A6A7A;
  margin-bottom: 8rpx;
}

.summary-time {
  font-size: 22rpx;
  color: #8A8A8A;
  margin-top: 4rpx;
}

/* 检测项列表 */
.check-list {
  margin-bottom: 32rpx;
}

.check-item {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  transition: transform 0.15s ease;
}

.check-item:active {
  transform: scale(0.98);
}

.check-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.check-emoji {
  font-size: 44rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.check-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.check-name {
  font-size: 30rpx;
  color: #1A2A4A;
  font-weight: 600;
  margin-bottom: 6rpx;
}

.check-detail {
  font-size: 24rpx;
  color: #8A8A8A;
  line-height: 1.5;
}

.check-status {
  padding: 10rpx 20rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.check-item.ok .check-status {
  background: #E8F5E9;
}

.check-item.ok .check-status text {
  font-size: 26rpx;
  color: #2E7D32;
  font-weight: 600;
}

.check-item.bad .check-status {
  background: #FFEBEE;
}

.check-item.bad .check-status text {
  font-size: 26rpx;
  color: #C62828;
  font-weight: 600;
}

.check-action {
  font-size: 20rpx !important;
  margin-top: 6rpx !important;
  opacity: 0.85 !important;
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
