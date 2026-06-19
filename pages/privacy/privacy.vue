<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="header">
      <text class="header-title">{{ pageTitle }}</text>
      <text class="header-sub">{{ pageSubTitle }}</text>
    </view>

    <!-- 内容卡片 -->
    <view class="content-card">
      <!-- 隐私保护承诺 -->
      <block v-if="type === 'commitment'">
        <text class="section-title"> 我们对您的承诺</text>
        <text class="paragraph">取件码助手是一款纯本地工具应用，设计理念是最大限度保护用户隐私。</text>

        <text class="section-title"> 信息不采集</text>
        <text class="paragraph">• 不收集您的任何个人身份信息</text>
        <text class="paragraph">• 不上传短信内容到任何服务器</text>
        <text class="paragraph">• 不收集设备识别码（IMEI/Android ID 等）</text>
        <text class="paragraph">• 不收集位置、通讯录、相册等隐私数据</text>

        <text class="section-title"> 数据本地保存</text>
        <text class="paragraph">• 所有快递信息仅保存在您的设备本地</text>
        <text class="paragraph">• 解析后的取件码只存在您的手机上</text>
        <text class="paragraph">• 您可以随时在应用中一键清空所有数据</text>

        <text class="section-title"> 权限透明</text>
        <text class="paragraph">• 短信权限仅用于解析快递取件码</text>
        <text class="paragraph">• 通知权限仅用于快递到达/超时提醒</text>
        <text class="paragraph">• 存储权限仅用于保存本地快递记录</text>
        <text class="paragraph">• 所有权限均可在系统设置中随时关闭</text>

        <text class="section-title"> 无第三方追踪</text>
        <text class="paragraph">• 不使用任何第三方数据统计 SDK</text>
        <text class="paragraph">• 不使用任何广告 SDK</text>
        <text class="paragraph">• 不使用任何用户行为分析工具</text>
      </block>

      <!-- 用户协议与隐私政策 -->
      <block v-else-if="type === 'agreement'">
        <text class="section-title">《用户协议》</text>
        <text class="paragraph">欢迎使用「取件码助手」（以下简称「本应用」）。在使用本应用之前，请您仔细阅读本协议。</text>

        <text class="sub-title">一、服务内容</text>
        <text class="paragraph">本应用是一款纯本地工具，主要功能包括：</text>
        <text class="paragraph">• 自动识别短信中的快递取件码信息</text>
        <text class="paragraph">• 手动添加快递取件码记录</text>
        <text class="paragraph">• 通过图片/截图识别快递信息</text>
        <text class="paragraph">• 本地保存快递记录并提供提醒服务</text>

        <text class="sub-title">二、使用条件</text>
        <text class="paragraph">• 本应用为免费软件，您可以免费下载、安装和使用</text>
        <text class="paragraph">• 您需自行承担使用本应用造成的一切风险</text>
        <text class="paragraph">• 您应合法合规使用本应用，不得利用本应用从事任何违法活动</text>

        <text class="sub-title">三、免责声明</text>
        <text class="paragraph">• 本应用对快递信息的识别和提醒仅供参考，最终以实际收到的短信为准</text>
        <text class="paragraph">• 因运营商短信延迟或丢失导致的取件问题，本应用不承担责任</text>
        <text class="paragraph">• 本应用不对任何因使用或无法使用本应用造成的损失负责</text>

        <text class="section-title">《隐私政策》</text>
        <text class="paragraph">我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。</text>

        <text class="sub-title">一、信息收集</text>
        <text class="paragraph">• 本应用不收集、不存储、不上传任何个人信息</text>
        <text class="paragraph">• 所有快递识别和保存操作均在您的设备本地完成</text>
        <text class="paragraph">• 本应用不使用任何第三方统计或广告 SDK</text>

        <text class="sub-title">二、权限使用</text>
        <text class="paragraph">• 短信权限：读取短信内容，用于自动识别快递取件码。仅在本地解析，不向任何服务器传输。</text>
        <text class="paragraph">• 通知权限：发送快递到达提醒和超时提醒，提升使用体验。</text>
        <text class="paragraph">• 存储权限：在本地保存已解析的快递记录，便于您随时查看。</text>

        <text class="sub-title">三、数据安全</text>
        <text class="paragraph">• 所有数据仅存在于您的本地设备，应用无联网传输功能</text>
        <text class="paragraph">• 您可以在应用中随时手动删除或清空所有记录</text>
        <text class="paragraph">• 卸载应用将清除本地保存的全部快递数据</text>

        <text class="sub-title">四、政策更新</text>
        <text class="paragraph">如本协议/隐私政策有更新，我们会在应用内第一时间通知您。</text>
      </block>
    </view>

    <!-- 底部说明 -->
    <view class="footer">
      <text class="footer-text">最后更新：{{ lastUpdate }}</text>
      <text class="footer-text">如有疑问，请通过「联系开发者」反馈</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const type = ref('commitment')

const pageTitle = computed(() => {
  if (type.value === 'commitment') return '隐私保护承诺'
  if (type.value === 'agreement') return '用户协议与隐私政策'
  return '说明'
})

const pageSubTitle = computed(() => {
  if (type.value === 'commitment') return '了解我们如何保护您的隐私'
  if (type.value === 'agreement') return '请认真阅读以下内容'
  return ''
})

const lastUpdate = '2026-06-19'

// uni-app 页面生命周期 onLoad，接收路由参数
onLoad((options) => {
  if (options && options.type) {
    type.value = options.type
  }
})
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

/* 内容卡片 */
.content-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 36rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 28rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1A2A4A;
  margin-top: 28rpx;
  margin-bottom: 12rpx;
}

.section-title:first-child {
  margin-top: 0;
}

.sub-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2A3A5A;
  margin-top: 20rpx;
  margin-bottom: 8rpx;
}

.paragraph {
  font-size: 26rpx;
  color: #5A6A7A;
  line-height: 1.7;
  margin-bottom: 8rpx;
}

/* 底部 */
.footer {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.footer-text {
  font-size: 22rpx;
  color: #A0A0A0;
  margin-top: 4rpx;
}
</style>
