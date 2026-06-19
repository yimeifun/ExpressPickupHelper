<template>
  <view
    class="card"
    :class="{
      'is-picked': item.status === 'picked',
      'is-selected': isSelected,
      'is-batch': isBatch
    }"
    @click="onCardClick"
  >
    <!-- 批量模式：左上角勾选框 -->
    <view v-if="isBatch" class="batch-check" @click.stop="onToggleChoose">
      <view class="batch-check-inner">
        <text class="batch-check-icon" v-if="isSelected">✓</text>
      </view>
    </view>

    <!-- 快递名称 -->
    <view class="company-line">
      <text class="emoji">{{ emoji }}</text>
      <text class="company">{{ item.company }}</text>
      <!-- 超时徽标 -->
      <view v-if="item.status === 'pending' && isTimeout" class="timeout-badge">
        <text>超时</text>
      </view>
      <!-- 已取件标识 -->
      <view v-if="item.status === 'picked'" class="picked-tag">
        <text>已取件</text>
      </view>
    </view>

    <!-- 取件码 -->
    <view class="code" :class="{ 'code-picked': item.status === 'picked' }">
      {{ item.code }}
    </view>

    <!-- 操作按钮：pending 且 非批量 -->
    <view v-if="item.status === 'pending' && !isBatch" class="action-row">
      <view class="action-btn copy-btn" @click.stop="onCopy">
        <text>📋 复制</text>
      </view>
      <view class="action-btn pick-btn" @click.stop="onPickClick">
        <text>✓ 已取</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { getCompanyEmoji } from '@/utils/smsParser'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  isBatch: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['click', 'pick', 'copy', 'toggleChoose'])

const emoji = computed(() => getCompanyEmoji(props.item.company) || '📦')

const isTimeout = computed(() => {
  if (props.item.status !== 'pending') return false
  const smsTime = props.item.smsTime || 0
  return (Date.now() - smsTime) > 24 * 60 * 60 * 1000
})

function onCardClick() {
  emit('click', props.item)
}

function onPickClick() {
  emit('pick', props.item)
}

function onCopy() {
  if (!props.item.code) return
  uni.setClipboardData({
    data: props.item.code,
    success: () => {
      uni.showToast({ title: '已复制 ' + props.item.code, icon: 'none' })
    }
  })
}

function onToggleChoose() {
  emit('toggleChoose', props.item)
}
</script>

<style lang="scss" scoped>
.card {
  position: relative;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 3rpx 14rpx rgba(26, 42, 74, 0.06);
  padding: 24rpx 24rpx;
  min-height: 200rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
  transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}

.card:active {
  transform: scale(0.98);
}

/* 已取件状态 */
.card.is-picked {
  background: #F7F8FA;
  box-shadow: 0 2rpx 6rpx rgba(26, 42, 74, 0.03);
}

/* 批量选择中 */
.card.is-selected {
  border-color: #4A8DCC;
  background: #EAF2FB;
  box-shadow: 0 3rpx 14rpx rgba(74, 141, 204, 0.25);
}

.card.is-batch {
  padding-left: 56rpx;
}

/* 批量勾选框 */
.batch-check {
  position: absolute;
  left: 14rpx;
  top: 20rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 10rpx;
  background: #FFFFFF;
  border: 2rpx solid #C8C8D0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.batch-check-inner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card.is-selected .batch-check {
  background: #4A8DCC;
  border-color: #4A8DCC;
  box-shadow: 0 2rpx 8rpx rgba(74, 141, 204, 0.35);
}

.batch-check-icon {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 700;
  line-height: 1;
}

/* 公司名称行 */
.company-line {
  display: flex;
  align-items: center;
  margin-bottom: 14rpx;
  gap: 8rpx;
}

.emoji {
  font-size: 28rpx;
  margin-right: 4rpx;
  flex-shrink: 0;
}

.company {
  font-size: 24rpx;
  color: #6A7688;
  font-weight: 500;
  line-height: 1.2;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 已取件标签 */
.picked-tag {
  padding: 4rpx 12rpx;
  background: #E8EAED;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.picked-tag text {
  font-size: 20rpx;
  color: #8A8A8A;
  font-weight: 500;
}

/* 取件码 */
.code {
  font-size: 44rpx;
  font-weight: 700;
  color: #1A2A4A;
  font-family: 'SF Mono', 'Menlo', 'Courier New', monospace;
  letter-spacing: 1rpx;
  line-height: 1.3;
  margin-bottom: 14rpx;
}

.code.code-picked {
  color: #B0B5BD;
  text-decoration: line-through;
  text-decoration-thickness: 2rpx;
}

/* 超时警告徽标 */
.timeout-badge {
  padding: 4rpx 10rpx;
  background: #FFF0F0;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.timeout-badge text {
  font-size: 20rpx;
  color: #E74C3C;
  font-weight: 600;
}

/* 操作按钮行 */
.action-row {
  display: flex;
  gap: 16rpx;
  margin-top: 4rpx;
}

.action-btn {
  flex: 1;
  height: 60rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.action-btn:active {
  transform: scale(0.96);
}

.action-btn text {
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
}

/* 复制按钮 */
.copy-btn {
  background: #F0F2F5;
}
.copy-btn text {
  color: #5A6A7A;
}

/* 取件按钮 */
.pick-btn {
  background: #4A8DCC;
  box-shadow: 0 3rpx 10rpx rgba(74, 141, 204, 0.3);
}
.pick-btn text {
  color: #FFFFFF;
}
</style>
