<template>
  <view class="page">
    <view v-if="!item" class="empty">
      <text>未找到该快递记录</text>
    </view>

    <block v-else>
      <!-- 顶部大卡片 - 高亮取件码 -->
      <view class="hero-card">
        <view class="hero-top">
          <text class="hero-emoji">{{ emoji }}</text>
          <text class="hero-company">{{ item.company }}</text>
        </view>
        <view class="hero-code">{{ item.code }}</view>
        <view v-if="item.status === 'picked'" class="picked-badge">已取件</view>
      </view>

      <!-- 详细信息 -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">快递公司</text>
          <text class="info-value">{{ item.company }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">取件码</text>
          <text class="info-value highlight">{{ item.code }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">取件地址</text>
          <text class="info-value">{{ item.address || '（未解析到）' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">短信时间</text>
          <text class="info-value">{{ formatTime(item.smsTime) }}</text>
        </view>
        <view v-if="item.pickTime" class="info-row">
          <text class="info-label">取件时间</text>
          <text class="info-value">{{ formatTime(item.pickTime) }}</text>
        </view>
        <view class="info-row info-col">
          <text class="info-label">原始短信</text>
          <view class="raw-sms-wrap">
            <text class="info-value raw">{{ item.rawSms || '（无）' }}</text>
            <view class="copy-btn" @click="copyRawSms">
              <text>{{ copied ? '已复制 ✓' : '复制' }}</text>
            </view>
          </view>
        </view>
        <view class="info-row info-col">
          <text class="info-label">备注</text>
          <input
            class="remark-input"
            :value="item.remark"
            placeholder="点击添加备注"
            @blur="onRemarkBlur"
            @input="onRemarkInput"
          />
        </view>
      </view>

      <!-- 底部操作按钮 -->
      <view class="bottom-bar">
        <view class="action-btn danger" @click="onDelete">
          <text>删除</text>
        </view>
        <view
          v-if="item.status === 'pending'"
          class="action-btn confirm"
          @click="onPick"
        >
          <text>确认取件</text>
        </view>
        <view v-else class="action-btn disabled">
          <text>已取件</text>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useExpressStore } from '@/stores/express'
import { getCompanyEmoji } from '@/utils/smsParser'

const store = useExpressStore()
const targetId = ref('')
const item = computed(() => store.findById(targetId.value))
const emoji = computed(() => item.value ? getCompanyEmoji(item.value.company) : '📦')
const remarkDraft = ref('')
const copied = ref(false)

// 页面参数获取（uni-app Vue3 组合式 API）
onLoad((options) => {
  console.log('[detail] onLoad options:', options)
  if (options && options.id) {
    targetId.value = String(options.id)
  }
  // 尝试从页面栈获取
  if (!targetId.value) {
    try {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (currentPage?.options?.id) {
        targetId.value = String(currentPage.options.id)
      }
    } catch (e) {
      console.warn('[detail] 获取页面参数失败：', e)
    }
  }
  console.log('[detail] 最终 targetId:', targetId.value)
})

function onRemarkInput(e) {
  remarkDraft.value = e.detail.value
}
function onRemarkBlur() {
  if (!item.value) return
  if (remarkDraft.value !== item.value.remark) {
    store.updateRemark(item.value.id, remarkDraft.value)
  }
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(Number(ts))
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function onPick() {
  if (!item.value) return
  uni.showModal({
    title: '确认取件？',
    content: `确认已取到 ${item.value.company} 的 ${item.value.code} 快递？`,
    confirmText: '已取件',
    confirmColor: '#4CD964',
    success: (res) => {
      if (res.confirm) {
        store.pickItem(item.value.id)
        uni.showToast({ title: '已标记取件', icon: 'success' })
      }
    }
  })
}

function onDelete() {
  if (!item.value) return
  uni.showModal({
    title: '删除记录？',
    content: '仅删除本地记录，不影响原始短信',
    confirmColor: '#DD524D',
    success: (res) => {
      if (res.confirm) {
        store.deleteItem(item.value.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      }
    }
  })
}

/**
 * 复制完整原始短信到剪贴板
 */
function copyRawSms() {
  if (!item.value?.rawSms) return
  uni.setClipboardData({
    data: item.value.rawSms,
    success: () => {
      copied.value = true
      uni.showToast({ title: '已复制完整短信', icon: 'none' })
      setTimeout(() => { copied.value = false }, 2000)
    },
    fail: () => {
      uni.showToast({ title: '复制失败', icon: 'none' })
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx 24rpx 200rpx;
}

.empty {
  text-align: center;
  padding: 200rpx 40rpx;
  color: $text-placeholder;
  font-size: 30rpx;
}

/* Hero 卡片 */
.hero-card {
  background: linear-gradient(135deg, #1A2A4A 0%, #3A5A8A 100%);
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  margin-bottom: 24rpx;
  color: #FFFFFF;
  position: relative;
  box-shadow: 0 12rpx 36rpx rgba(26, 42, 74, 0.2);
}
.hero-top {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.hero-emoji {
  font-size: 44rpx;
  margin-right: 16rpx;
}
.hero-company {
  font-size: 30rpx;
  opacity: 0.9;
}
.hero-code {
  font-size: 96rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  font-family: 'SF Mono', 'Menlo', 'Courier New', monospace;
  line-height: 1.1;
}
.picked-badge {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  background: $accent-color;
  color: #FFFFFF;
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

/* 详情信息卡片 */
.info-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 8rpx 32rpx;
  box-shadow: $card-shadow;
}
.info-row {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $border-color;
}
.info-row:last-child {
  border-bottom: none;
}
.info-col {
  flex-direction: column;
}
.info-col .info-value,
.info-col .raw {
  margin-top: 12rpx;
  line-height: 1.6;
}
.info-label {
  width: 160rpx;
  font-size: 28rpx;
  color: $text-placeholder;
  flex-shrink: 0;
}
.info-value {
  flex: 1;
  font-size: 30rpx;
  color: $text-primary;
  word-break: break-all;
}
.info-value.highlight {
  color: $primary-color;
  font-weight: 700;
  font-size: 36rpx;
  font-family: 'SF Mono', 'Menlo', 'Courier New', monospace;
  letter-spacing: 2rpx;
}
.info-value.raw {
  color: $text-secondary;
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

/* 原始短信 + 复制按钮 */
.raw-sms-wrap {
  width: 100%;
  margin-top: 12rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.raw-sms-wrap .info-value.raw {
  flex: 1;
}
.copy-btn {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  background: $primary-color;
  color: #FFFFFF;
  border-radius: 12rpx;
  font-size: 24rpx;
  white-space: nowrap;
  height: 60rpx;
  line-height: 60rpx;
}

.remark-input {
  width: 100%;
  margin-top: 12rpx;
  height: 72rpx;
  background: #F4F5F7;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: $text-primary;
  box-sizing: border-box;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  display: flex;
  gap: 24rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.action-btn {
  flex: 1;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 16rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
}
.action-btn.confirm {
  background: $accent-color;
  color: #FFFFFF;
}
.action-btn.danger {
  background: #FFE8E8;
  color: $danger-color;
}
.action-btn.disabled {
  background: #E8EAF0;
  color: $text-placeholder;
}
</style>
