<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <SearchBar v-model="keyword" class="nav-search" placeholder="搜索快递/取件码/地址" />
      <!-- 消息中心入口 -->
      <view class="nav-btn" @click="goMessages">
        <view class="nav-icon-box">
          <text class="nav-icon-char">🔔</text>
          <view v-if="unreadCount > 0" class="nav-badge">
            <text>{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
          </view>
        </view>
      </view>
      <view class="nav-btn" @click="toggleBatch">
        <view class="nav-icon-box" :class="{ active: isBatch }">
          <text class="nav-icon-char">{{ isBatch ? '✕' : '☰' }}</text>
        </view>
      </view>
      <view class="nav-btn" @click="goSettings">
        <view class="nav-icon-box">
          <text class="nav-icon-char">⚙</text>
        </view>
      </view>
    </view>

    <!-- 批量模式顶部栏 -->
    <view v-if="isBatch" class="batch-bar">
      <view class="batch-info">
        <text class="batch-count">已选 {{ store.chosenCount }} 个</text>
      </view>
      <view class="batch-actions">
        <view class="batch-action" @click="toggleChooseAll">
          <text>{{ store.isAllChosen ? '取消全选' : '全选' }}</text>
        </view>
        <view
          class="batch-action primary"
          :class="{ disabled: store.chosenCount === 0 }"
          @click="confirmBatchPick"
        >
          <text>批量确认取件</text>
        </view>
      </view>
    </view>

    <!-- 红色超时横幅 -->
    <view
      v-if="!isBatch && store.timeoutCount > 0"
      class="timeout-banner"
      @click="showTimeoutList"
    >
      <text class="timeout-icon">⏰</text>
      <text class="timeout-text">
        您有 {{ store.timeoutCount }} 个快递已超时 24 小时未取件，
        可能产生驿站寄存费用或被退回，请尽快取件
      </text>
      <text class="timeout-arrow">›</text>
    </view>

    <!-- 无权限提示 -->
    <view v-if="noPermission && !isBatch" class="perm-bar" @click="retryPermission">
      <text class="perm-icon">📨</text>
      <text class="perm-text">未开启短信权限，将无法自动识别快递短信，点击授权</text>
    </view>

    <!-- 每日一言 -->
    <view v-if="!isBatch && dailySaying" class="saying-card">
      <text class="saying-quote">「</text>
      <text class="saying-text">{{ dailySaying }}</text>
      <text class="saying-quote">」</text>
    </view>

    <!-- 主体内容 -->
    <view class="content">
      <!-- 空状态 -->
      <view v-if="filteredList.length === 0" class="empty">
        <text class="empty-icon">📭</text>
        <text class="empty-title">{{ isBatch ? '没有可选择的快递' : '暂无待取快递' }}</text>
        <text class="empty-sub">
          {{ isBatch ? '请先添加快递' : (keyword ? '试试其他关键词' : '点击右下角按钮手动添加或识别截图') }}
        </text>
      </view>

      <!-- 两列流式网格 -->
      <view v-else class="grid">
        <ExpressCard
          v-for="item in filteredList"
          :key="item.id"
          :item="item"
          :isBatch="isBatch"
          :isSelected="store.chosenIds.includes(item.id)"
          @click="goDetail(item)"
          @pick="onPick(item)"
          @toggleChoose="onToggleChoose(item)"
        />
      </view>
    </view>

    <!-- FAB 悬浮按钮组（非批量模式） -->
    <view v-if="!isBatch" class="fab-group">
      <view class="fab fab-primary" @click="showAddForm">
        <text class="fab-plus">+</text>
        <text class="fab-label">手动添加</text>
      </view>
      <view class="fab fab-secondary" @click="goOcr">
        <text class="fab-plus">📷</text>
        <text class="fab-label">识别截图</text>
      </view>
    </view>

    <!-- 手动添加弹层 -->
    <view v-if="showForm" class="form-mask" @click="hideForm">
      <view class="form-panel" @click.stop>
        <view class="form-title">添加快递</view>

        <!-- 两种模式切换 -->
        <view class="mode-tabs">
          <view
            class="mode-tab"
            :class="{ active: formMode === 'auto' }"
            @click="switchFormMode('auto')"
          >
            <text>智能识别</text>
          </view>
          <view
            class="mode-tab"
            :class="{ active: formMode === 'manual' }"
            @click="switchFormMode('manual')"
          >
            <text>手动填写</text>
          </view>
        </view>

        <!-- 模式 1：智能识别 -->
        <view v-if="formMode === 'auto'" class="form-body">
          <view class="form-row">
            <text class="form-label">粘贴快递短信或消息</text>
            <textarea
              class="form-textarea"
              v-model="form.rawText"
              placeholder="例如：\n【菜鸟驿站】您的包裹已到达XX驿站，取件码 1-2-3456\n\n或直接粘贴任意包含取件码的文字，系统将自动识别快递类型与取件码。"
              auto-height
              :maxlength="500"
            />
          </view>
          <view v-if="form.company || form.code || form.address" class="preview-card">
            <view class="preview-title">
              <text>已识别内容</text>
              <text class="preview-hint">（可在「手动填写」中修改）</text>
            </view>
            <view class="preview-row">
              <text class="preview-label">快递类型：</text>
              <text class="preview-value">{{ form.company || '未识别' }}</text>
            </view>
            <view class="preview-row">
              <text class="preview-label">取件码：</text>
              <text class="preview-value">{{ form.code || '未识别' }}</text>
            </view>
            <view v-if="form.address" class="preview-row">
              <text class="preview-label">取件地址：</text>
              <text class="preview-value">{{ form.address }}</text>
            </view>
          </view>
          <view class="form-hint">
            <text>💡 提示：粘贴后将自动解析；若识别不完整，请切换到「手动填写」补充。</text>
          </view>
        </view>

        <!-- 模式 2：手动填写 -->
        <view v-else class="form-body">
          <view class="form-row">
            <text class="form-label">快递类型 *</text>
            <input
              class="form-input"
              v-model="form.company"
              placeholder="如：菜鸟驿站 / 顺丰速运 / 妈妈驿站"
            />
          </view>
          <view class="form-row">
            <text class="form-label">取件码 *</text>
            <input
              class="form-input"
              v-model="form.code"
              placeholder="如：1-2-3456 / A1B2-3456 / 06-0706"
            />
          </view>
          <view class="form-row">
            <text class="form-label">取件地址</text>
            <input
              class="form-input"
              v-model="form.address"
              placeholder="选填，如：XX路XX号"
            />
          </view>
        </view>

        <view class="form-actions">
          <view class="btn btn-cancel" @click="hideForm">取消</view>
          <view class="btn btn-confirm" @click="confirmAdd">确认添加</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { useExpressStore } from '@/stores/express'
import { checkAndLoadSms, parsePickupCode } from '@/utils/smsParser'
import { getUnreadCount, markAllRead } from '@/utils/widgetBridge'
import SearchBar from '@/components/SearchBar.vue'
import ExpressCard from '@/components/ExpressCard.vue'

const store = useExpressStore()
const keyword = ref('')
const noPermission = ref(false)
const showForm = ref(false)
const isBatch = ref(false)
const formMode = ref('auto')
const form = ref({ company: '', code: '', address: '', rawText: '' })
const dailySaying = ref('')
const hasShownPermissionTip = ref(false)
const unreadCount = ref(0)

/**
 * 监听 rawText 变化，自动解析快递信息
 */
watch(
  () => form.value.rawText,
  (text) => {
    if (!text || !text.trim()) {
      form.value.company = ''
      form.value.code = ''
      form.value.address = ''
      return
    }
    const parsed = parsePickupCode(text)
    if (parsed.company) form.value.company = parsed.company
    if (parsed.code) form.value.code = parsed.code
    if (parsed.address) form.value.address = parsed.address
  }
)

/**
 * 切换添加模式
 */
function switchFormMode(mode) {
  formMode.value = mode
}

/**
 * 打开手动添加弹层
 */
function showAddForm() {
  form.value = { company: '', code: '', address: '', rawText: '' }
  formMode.value = 'auto'
  showForm.value = true
}

function hideForm() {
  showForm.value = false
}

function confirmAdd() {
  if (!form.value.code.trim()) {
    uni.showToast({ title: '请填写取件码', icon: 'none' })
    return
  }
  if (!form.value.company.trim()) {
    uni.showToast({ title: '请填写快递类型', icon: 'none' })
    return
  }
  const item = {
    company: form.value.company.trim(),
    code: form.value.code.trim(),
    address: form.value.address.trim(),
    smsTime: Date.now(),
    status: 'pending',
    rawSms: form.value.rawText.trim() || '（手动添加）',
    remark: ''
  }
  const added = store.addItem(item, false)
  if (added) {
    uni.showToast({ title: '添加成功', icon: 'success' })
    hideForm()
  } else {
    uni.showToast({ title: '记录可能已存在', icon: 'none' })
  }
}

/**
 * 过滤后的列表：根据搜索关键词过滤
 */
const filteredList = computed(() => {
  const list = isBatch.value ? store.pendingList : store.sortedList
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(it =>
    it.company.toLowerCase().includes(kw) ||
    it.code.toLowerCase().includes(kw) ||
    (it.address || '').toLowerCase().includes(kw)
  )
})

/**
 * 进入/退出 批量模式
 */
function toggleBatch() {
  isBatch.value = !isBatch.value
  if (!isBatch.value) {
    store.clearChoices()
  }
}

/**
 * 切换某个项的选择状态
 */
function onToggleChoose(item) {
  store.toggleChoose(item.id)
}

/**
 * 全选 / 取消全选
 */
function toggleChooseAll() {
  if (store.isAllChosen) {
    store.clearChoices()
  } else {
    store.chooseAllPending()
  }
}

/**
 * 批量确认取件
 */
function confirmBatchPick() {
  if (store.chosenCount === 0) {
    uni.showToast({ title: '请先选择快递', icon: 'none' })
    return
  }
  uni.showModal({
    title: '批量确认取件',
    content: `确认已取到选中的 ${store.chosenCount} 个快递？`,
    confirmText: '确认',
    success: (res) => {
      if (res.confirm) {
        const count = store.pickBatch([...store.chosenIds])
        uni.showToast({ title: `已确认 ${count} 个快递`, icon: 'success' })
        isBatch.value = false
        store.clearChoices()
      }
    }
  })
}

/**
 * 单个确认取件
 */
function onPick(item) {
  uni.showModal({
    title: '确认取件？',
    content: `${item.company} ${item.code}`,
    confirmText: '已取件',
    success: (res) => {
      if (res.confirm) {
        store.pickItem(item.id)
        uni.showToast({ title: '已标记取件', icon: 'success' })
      }
    }
  })
}

/**
 * 跳转详情页
 */
function goDetail(item) {
  if (isBatch.value) {
    onToggleChoose(item)
    return
  }
  uni.navigateTo({ url: `/pages/detail/detail?id=${item.id}` })
}

/**
 * 跳转设置页
 */
function goSettings() {
  uni.navigateTo({ url: '/pages/settings/settings' })
}

/**
 * 打开消息中心
 */
function goMessages() {
  uni.showModal({
    title: '📨 消息中心',
    content: '这里显示历史提醒和快递通知（最近 100 条）。\n\n✅ 新快递到达提醒会自动保存到此处，方便回顾。',
    confirmText: '我知道了',
    showCancel: false
  })
  // 进入消息中心即标记为已读
  try {
    markAllRead()
    unreadCount.value = 0
  } catch (e) {
    console.warn('[index] 标记已读异常：', e)
  }
}

/**
 * 刷新未读计数
 */
function refreshUnread() {
  try {
    unreadCount.value = getUnreadCount()
  } catch (e) {
    unreadCount.value = 0
  }
}

/**
 * OCR 识别截图
 */
function goOcr() {
  uni.navigateTo({ url: '/pages/ocr/ocr' })
}

/**
 * 显示超时列表提示
 */
function showTimeoutList() {
  const timeoutItems = store.timeoutList.slice(0, 5)
  const text = timeoutItems.map(it => `${it.company} ${it.code}`).join('\n')
  uni.showModal({
    title: `超时 24 小时以上未取件`,
    content: text || '请尽快取件',
    showCancel: false,
    confirmText: '知道了'
  })
}

/**
 * 权限申请
 */
async function retryPermission() {
  const res = await checkAndLoadSms(true)
  if (res && res.noPerm) {
    uni.showToast({ title: '请在系统设置中开启权限', icon: 'none' })
  } else {
    noPermission.value = false
    uni.showToast({ title: '已扫描短信', icon: 'success' })
  }
}

/**
 * 展示启动时权限提醒弹窗
 * 增加"不再提醒"选项：点击取消按钮会记录到本地，下次启动不再弹出
 */
function showPermissionTip() {
  uni.showModal({
    title: '权限提醒',
    content: '为保证软件正常获取取件码，请务必确保授予以下权限：\n1. 读取短信 \n3. 接收短信 \n2. 通知类短信「权限管理-其他权限」',
    confirmText: '我知道了',
    cancelText: '不再提醒',
    success: (res) => {
      // 点击"不再提醒"，将标记存入本地存储
      if (!res.confirm) {
        try {
          uni.setStorageSync('noPermissionTip', 'true')
        } catch (e) {
          console.warn('写入权限提醒标记失败', e)
        }
      }
    }
  })
}

/**
 * 获取每日一言
 */
function fetchDailySaying() {
  try {
    uni.request({
      url: 'https://uapis.cn/api/v1/saying',
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        // 尝试多种数据结构
        const data = res.data
        let text = ''
        if (typeof data === 'string') {
          text = data
        } else if (data && typeof data === 'object') {
          text = data.data || data.content || data.text || data.saying || data.msg || ''
          if (!text && data.data && typeof data.data === 'object') {
            text = data.data.content || data.data.saying || data.data.text || ''
          }
        }
        if (text && text.trim()) {
          dailySaying.value = text.trim()
        } else {
          dailySaying.value = '生活明朗，万物可爱'
        }
      },
      fail: () => {
        dailySaying.value = '生活明朗，万物可爱'
      }
    })
  } catch (e) {
    dailySaying.value = '生活明朗，万物可爱'
  }
}

/**
 * 挂载时：加载历史 + 扫描短信 + 检查超时 + 获取每日一言 + 权限提醒
 */
onMounted(async () => {
  store.loadFromStorage()

  // 异步获取每日一言
  fetchDailySaying()

  // 检查并加载短信
  const res = await checkAndLoadSms(true)
  if (res && res.noPerm) {
    noPermission.value = true
  }

  // 启动时检查一次超时
  store.checkTimeout(false)

  // 刷新未读消息
  refreshUnread()

  // 启动时展示权限提醒（仅展示一次，且未选择"不再提醒"时才弹出）
  setTimeout(() => {
    let skipTip = false
    try {
      skipTip = uni.getStorageSync('noPermissionTip') === 'true'
    } catch (e) {
      skipTip = false
    }
    if (!hasShownPermissionTip.value && !skipTip) {
      hasShownPermissionTip.value = true
      showPermissionTip()
    }
  }, 800)
})

/**
 * 页面每次显示时：检查一次超时（轻量级）+ 刷新未读计数
 */
onShow(() => {
  if (store.list.length > 0) {
    store.checkTimeout(false)
  }
  refreshUnread()
})

/**
 * 下拉刷新：重新扫描短信
 */
function onPullDownRefreshHandler() {
  checkAndLoadSms(true).then(() => {
    uni.stopPullDownRefresh()
  }).catch(() => {
    uni.stopPullDownRefresh()
  })
}
onPullDownRefresh(onPullDownRefreshHandler)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 200rpx;
  background: #F5F6F8;
}

/* 顶部导航 */
.nav-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #FFFFFF;
  border-bottom: 1rpx solid #F0F0F0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-search { flex: 1; }
.nav-btn {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 10rpx;
  border-radius: 16rpx;
  transition: background 0.15s ease;
}
.nav-btn:active { background: #F0F2F5; }

/* 图标容器：统一的圆角方块背景风格 */
.nav-icon-box {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: #F5F6F8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.nav-icon-box:active {
  background: #E8EAED;
  transform: scale(0.95);
}
.nav-icon-box.active {
  background: #4A8DCC;
}
.nav-icon-box.active .nav-icon-char {
  color: #FFFFFF;
}

.nav-icon-char {
  font-size: 30rpx;
  font-weight: 600;
  color: #3A4A6A;
  line-height: 1;
}

/* 消息徽章 */
.nav-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  background: #EF4444;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #FFFFFF;
}
.nav-badge text {
  font-size: 18rpx;
  color: #FFFFFF;
  font-weight: 600;
  line-height: 1;
}

/* 让图标容器可以放置绝对定位徽章 */
.nav-icon-box {
  position: relative;
}

/* 批量模式顶部操作栏 */
.batch-bar {
  display: flex;
  align-items: center;
  padding: 18rpx 24rpx;
  background: #4A8DCC;
  color: #FFFFFF;
}
.batch-info { flex: 1; }
.batch-count {
  font-size: 28rpx;
  font-weight: 600;
}
.batch-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.batch-action {
  padding: 14rpx 24rpx;
  border-radius: 12rpx;
  background: rgba(255,255,255,0.25);
  font-size: 26rpx;
}
.batch-action.primary {
  background: #FFFFFF;
  color: #4A8DCC;
  font-weight: 600;
}
.batch-action.primary text {
  color: #4A8DCC;
}
.batch-action.disabled {
  opacity: 0.4;
}

/* 红色超时横幅 */
.timeout-banner {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #FFF5F5;
  border-bottom: 1rpx solid #FCE0E0;
}
.timeout-icon {
  font-size: 30rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.timeout-text {
  flex: 1;
  font-size: 26rpx;
  color: #E74C3C;
  line-height: 1.5;
}
.timeout-arrow {
  font-size: 32rpx;
  color: #E74C3C;
  margin-left: 8rpx;
}

/* 权限提示栏 */
.perm-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #FFF8EA;
  border-bottom: 1rpx solid #F5E4B5;
}
.perm-icon { font-size: 28rpx; margin-right: 12rpx; }
.perm-text {
  flex: 1;
  font-size: 26rpx;
  color: #8B6B1F;
  line-height: 1.5;
}

/* 每日一言卡片 */
.saying-card {
  margin: 20rpx 24rpx 10rpx;
  padding: 28rpx 32rpx;
  background: linear-gradient(135deg, #E8F0FA 0%, #F0F4F8 100%);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(26, 42, 74, 0.06);
}
.saying-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  bottom: 20%;
  width: 6rpx;
  background: #4A8DCC;
  border-radius: 3rpx;
  margin-left: 12rpx;
}
.saying-quote {
  font-size: 36rpx;
  color: #8A9AAA;
  font-weight: 700;
  line-height: 1;
  margin: 0 8rpx;
}
.saying-text {
  flex: 1;
  font-size: 26rpx;
  color: #3A4A6A;
  line-height: 1.6;
  font-style: italic;
  text-align: center;
}

.content {
  padding: 20rpx 24rpx 24rpx;
}

.empty {
  padding: 160rpx 40rpx;
  text-align: center;
}
.empty-icon {
  font-size: 120rpx;
  display: block;
  margin-bottom: 32rpx;
  opacity: 0.5;
}
.empty-title {
  font-size: 32rpx;
  color: #6A7688;
  display: block;
  margin-bottom: 16rpx;
  font-weight: 500;
}
.empty-sub { font-size: 26rpx; color: #999999; }

/* 两列网格 */
.grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20rpx 0;
}
.grid > * {
  width: calc(50% - 10rpx);
  box-sizing: border-box;
}

/* FAB 悬浮按钮组 */
.fab-group {
  position: fixed;
  right: 24rpx;
  bottom: 60rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  z-index: 999;
}
.fab {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  border-radius: 48rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.15);
  background: #FFFFFF;
}
.fab-primary {
  background: linear-gradient(135deg, #4A8DCC 0%, #6FA3DE 100%);
}
.fab-primary .fab-plus,
.fab-primary .fab-label { color: #FFFFFF; }

.fab-plus {
  font-size: 40rpx;
  font-weight: 600;
  line-height: 1;
  margin-right: 8rpx;
}
.fab-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #333333;
  white-space: nowrap;
}

/* 表单弹层 */
.form-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}
.form-panel {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
}
.form-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A2A4A;
  text-align: center;
  margin-bottom: 32rpx;
}
.form-row { margin-bottom: 24rpx; }
.form-label {
  display: block;
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 12rpx;
}
.form-input {
  width: 100%;
  height: 80rpx;
  background: #F4F5F7;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: #1A2A4A;
  box-sizing: border-box;
}
.mode-tabs {
  display: flex;
  background: #F4F5F7;
  border-radius: 16rpx;
  padding: 6rpx;
  margin-bottom: 28rpx;
}
.mode-tab {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #666666;
  font-weight: 500;
  transition: all 0.2s ease;
}
.mode-tab.active {
  background: #FFFFFF;
  color: #1A2A4A;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.form-body {
  max-height: 60vh;
  overflow-y: auto;
}
.form-textarea {
  width: 100%;
  min-height: 200rpx;
  background: #F4F5F7;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #1A2A4A;
  line-height: 1.6;
  box-sizing: border-box;
}
.preview-card {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #F0F7FF;
  border-radius: 16rpx;
  border: 2rpx dashed #A8C8E8;
}
.preview-title {
  display: flex;
  align-items: baseline;
  margin-bottom: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #1A2A4A;
}
.preview-hint {
  font-size: 22rpx;
  font-weight: 400;
  color: #666666;
  margin-left: 10rpx;
}
.preview-row {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  line-height: 1.5;
}
.preview-label {
  color: #666666;
  flex-shrink: 0;
}
.preview-value {
  color: #1A2A4A;
  font-weight: 500;
  word-break: break-all;
}
.form-hint {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: #FFFBF0;
  border-radius: 12rpx;
}
.form-hint text {
  font-size: 24rpx;
  color: #8B6B1F;
  line-height: 1.5;
}
.form-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
}
.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 500;
}
.btn-cancel { background: #F4F5F7; color: #666666; }
.btn-confirm { background: #4A8DCC; color: #FFFFFF; }
</style>
