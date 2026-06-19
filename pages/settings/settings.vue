<template>
  <view class="page">
    <!-- ========== 基础设置 ========== -->
    <view class="section">
      <view class="section-title">基础设置</view>
      <view class="link-item" @click="goBasicSettings">
        <view class="link-icon-box icon-blue">
          <text class="link-icon-text">📁</text>
        </view>
        <text class="link-label">数据管理</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- ========== 权限自检 / 运行状态（作为入口） ========== -->
    <view class="section">
      <view class="section-title">权限自检 · 运行状态</view>
      <view class="link-item" @click="goHealthCheck">
        <view class="link-icon-box icon-green">
          <text class="link-icon-text">🔍</text>
        </view>
        <text class="link-label">立即检测</text>
        <text class="link-value">3 项核心功能</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- ========== 信任与安全 ========== -->
    <view class="section">
      <view class="section-title">信任与安全</view>

      <view class="link-item" @click="goPrivacy('commitment')">
        <view class="link-icon-box icon-purple">
          <text class="link-icon-text">🔒</text>
        </view>
        <text class="link-label">隐私保护承诺</text>
        <text class="link-arrow">›</text>
      </view>

      <view class="link-item" @click="showPermissionExplain">
        <view class="link-icon-box icon-orange">
          <text class="link-icon-text">📋</text>
        </view>
        <text class="link-label">权限使用说明</text>
        <text class="link-arrow">›</text>
      </view>

      <view class="link-item" @click="goPrivacy('agreement')">
        <view class="link-icon-box icon-teal">
          <text class="link-icon-text">📜</text>
        </view>
        <text class="link-label">用户协议 · 隐私政策</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- ========== 联系与反馈 ========== -->
    <view class="section">
      <view class="section-title">联系与反馈</view>

      <view class="link-item" @click="copyEmail">
        <view class="link-icon-box icon-cyan">
          <text class="link-icon-text">✉️</text>
        </view>
        <text class="link-label">开发者邮箱</text>
        <text class="link-value">yimei@ymei.top</text>
        <text class="link-arrow">›</text>
      </view>

      <view class="link-item" @click="openContactLink">
        <view class="link-icon-box icon-pink">
          <text class="link-icon-text">💬</text>
        </view>
        <text class="link-label">联系开发者</text>
		<text class="link-value">亿槑</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- ========== 关于应用 ========== -->
    <view class="section">
      <view class="section-title">关于应用</view>

      <view class="link-item" @click="showChangelog">
        <view class="link-icon-box icon-yellow">
          <text class="link-icon-text">📝</text>
        </view>
        <text class="link-label">更新日志</text>
        <text class="link-arrow">›</text>
      </view>

      <view class="link-item" @click="openUpdateLink">
        <view class="link-icon-box icon-blue">
          <text class="link-icon-text">⬆️</text>
        </view>
        <text class="link-label">获取最新版</text>
        <text class="link-value">v {{ appVersion }}</text>
        <text class="link-arrow">›</text>
      </view>

      <view class="share-btn" @click="onShare">
        <text> 分享</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const appVersion = ref('1.0.0')

/**
 * 跳转到权限自检页面
 */
function goHealthCheck() {
  uni.navigateTo({ url: '/pages/healthcheck/healthcheck' })
}

/**
 * 跳转到基础设置页面
 */
function goBasicSettings() {
  uni.navigateTo({ url: '/pages/basic/basic' })
}

/**
 * 跳转到隐私/协议页面（通过参数区分内容）
 * @param {string} type - 'commitment'=隐私保护承诺; 'agreement'=用户协议与隐私政策
 */
function goPrivacy(type) {
  uni.navigateTo({ url: `/pages/privacy/privacy?type=${type}` })
}

/**
 * 权限使用说明（保持弹窗形式，内容较短无需新开页）
 */
function showPermissionExplain() {
  uni.showModal({
    title: ' 权限使用说明',
    content: '应用使用以下权限：\n\n 读取短信内容\n  → 解析短信中的取件码\n\n 系统通知\n  → 快递到达 / 超时时提醒您\n\n 本地存储\n  → 保存已解析的快递记录\n\n以上权限均可在系统设置中随时关闭。',
    showCancel: false,
    confirmText: '我知道了'
  })
}

/**
 * 复制邮箱
 */
function copyEmail() {
  uni.setClipboardData({
    data: 'yimei@ymei.top',
    success: () => {
      uni.showToast({ title: '邮箱已复制', icon: 'none' })
    }
  })
}

/**
 * 联系开发者（跳转 i.ymei.top）
 */
function openContactLink() {
  // #ifdef APP-PLUS
  plus.runtime.openURL('https://i.ymei.top')
  // #endif
  // #ifndef APP-PLUS
  uni.setClipboardData({
    data: 'https://i.ymei.top',
    success: () => {
      uni.showToast({ title: '链接已复制，可粘贴到浏览器访问', icon: 'none' })
    }
  })
  // #endif
}

/**
 * 更新日志
 */
function showChangelog() {
  uni.showModal({
    title: ' 更新日志',
    content: 'v1.0.0\n• 新增：自动识别短信中的快递取件码\n• 新增：批量确认取件\n• 新增：超时智能提醒「24小时」\n• 新增：截图/图片 OCR 识别\n• 新增：权限自检功能（短信/通知/存储）\n• 优化：驿站与快递名智能区分\n\n感谢您的使用！',
    showCancel: false,
    confirmText: '好的'
  })
}

/**
 * 获取最新版（跳转 https://github.com/yimeifun/PickupCodeHelper）
 */
function openUpdateLink() {
  // #ifdef APP-PLUS
  plus.runtime.openURL('https://github.com/yimeifun/PickupCodeHelper')
  // #endif
  // #ifndef APP-PLUS
  uni.setClipboardData({
    data: 'https://github.com/yimeifun/PickupCodeHelper',
    success: () => {
      uni.showToast({ title: '下载链接已复制，请在浏览器打开', icon: 'none' })
    }
  })
  // #endif
}

/**
 * 复制并分享
 * 先复制分享语到剪贴板 → 调起系统分享面板（微信/QQ/短信等）
 */
function onShare() {
  const shareText =
    '「取件码助手」自动识别快递取件码，驿站/快递智能区分，支持批量确认、超时提醒和截图识别。好用又省心！\n\n下载：https://github.com/yimeifun/PickupCodeHelper'

  // 第一步：复制文本到剪贴板
  uni.setClipboardData({
    data: shareText,
    success: () => {
      uni.showToast({ title: '分享语已复制，选择平台粘贴', icon: 'none' })
    }
  })

  // 第二步：调起系统分享面板（仅 APP-PLUS 环境可用）
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const intent = new Intent(Intent.ACTION_SEND)
    intent.setType('text/plain')
    intent.putExtra(Intent.EXTRA_TEXT, shareText)
    intent.putExtra(Intent.EXTRA_SUBJECT, '取件码助手')
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    const chooser = Intent.createChooser(intent, '分享到：')
    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    main.startActivity(chooser)
  } catch (e) {
    console.warn('[settings] 系统分享失败：', e)
  }
  // #endif
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #F5F6F8;
  padding: 24rpx;
}

.section {
  margin-bottom: 36rpx;
}

.section-title {
  font-size: 26rpx;
  color: #8A8A8A;
  padding: 0 8rpx 16rpx;
  font-weight: 500;
}

/* 链接条目 */
.link-item {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease;
}

.link-item:active {
  transform: scale(0.98);
}

/* 带彩色背景的图标容器 */
.link-icon-box {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.link-icon-text {
  font-size: 34rpx;
  line-height: 1;
}

/* 不同颜色的图标背景 */
.icon-blue {
  background: linear-gradient(135deg, #E8F0FA 0%, #D4E4F4 100%);
}
.icon-green {
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}
.icon-purple {
  background: linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%);
}
.icon-orange {
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
}
.icon-teal {
  background: linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%);
}
.icon-cyan {
  background: linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%);
}
.icon-pink {
  background: linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%);
}
.icon-yellow {
  background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%);
}

.link-label {
  flex: 1;
  font-size: 30rpx;
  color: #1A2A4A;
  font-weight: 500;
}

.link-value {
  font-size: 24rpx;
  color: #8A8A8A;
  margin-right: 16rpx;
}

.link-arrow {
  font-size: 36rpx;
  color: #C0C0C0;
  font-weight: 300;
  flex-shrink: 0;
}

/* 分享按钮 */
.share-btn {
  background: linear-gradient(135deg, #4A8DCC 0%, #6FA3DE 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  text-align: center;
  margin-top: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(74, 141, 204, 0.25);
}

.share-btn text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.share-btn:active {
  transform: scale(0.98);
}
</style>
