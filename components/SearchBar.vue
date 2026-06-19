<template>
  <!-- 顶部搜索栏组件：输入内容后对列表进行实时前端过滤 -->
  <view class="search-bar">
    <view class="search-icon">🔍</view>
    <input
      class="search-input"
      type="text"
      v-model="keyword"
      placeholder="搜索快递类型或取件码"
      placeholder-class="search-placeholder"
      confirm-type="search"
      @input="onInput"
    />
    <view v-if="keyword" class="clear-btn" @click="clearKeyword">✕</view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['update:modelValue', 'search'])

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const keyword = ref(props.modelValue)

watch(() => props.modelValue, v => { keyword.value = v })

function onInput() {
  emit('update:modelValue', keyword.value)
  emit('search', keyword.value)
}

function clearKeyword() {
  keyword.value = ''
  emit('update:modelValue', '')
  emit('search', '')
}
</script>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #FFFFFF;
  border-bottom: 1rpx solid $border-color;
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  height: 64rpx;
  background: #F4F5F7;
  border-radius: 32rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: $text-primary;
}

.search-placeholder {
  color: $text-placeholder;
  font-size: 28rpx;
}

.clear-btn {
  margin-left: 20rpx;
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  font-size: 28rpx;
  color: $text-placeholder;
  background: #E8EAF0;
  border-radius: 50%;
}
</style>
