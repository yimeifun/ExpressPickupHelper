<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="title">识别截图取件码</text>
      <text class="subtitle">从微信截图、淘宝物流页、短信截图中自动识别快递信息</text>
    </view>

    <!-- 图像预览区 -->
    <view class="preview-card">
      <view v-if="!imagePath" class="preview-empty">
        <text class="preview-icon">🖼️</text>
        <text class="preview-text">请先选择图片或粘贴文字</text>
      </view>
      <view v-else class="preview-wrap">
        <image
          :src="imagePath"
          class="preview-image"
          mode="aspectFit"
          @click="chooseImage"
        />
        <!-- 识别中遮罩 -->
        <view v-if="recognizing" class="preview-mask">
          <text class="preview-spinner">⏳</text>
          <text class="preview-mask-text">正在识别图片文字...</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮组 -->
    <view class="btn-group">
      <view class="btn-primary" @click="chooseImage">
        <text class="btn-icon">📷</text>
        <text class="btn-text">选择图片</text>
      </view>
      <view class="btn-secondary" @click="pasteText">
        <text class="btn-icon">📋</text>
        <text class="btn-text">粘贴文字</text>
      </view>
    </view>

    <!-- 识别到的文字 -->
    <view v-if="ocrText" class="result-section">
      <view class="result-header">
        <text class="result-title">识别到的文字</text>
        <view class="clear-btn" @click="clearText">
          <text>清空</text>
        </view>
      </view>
      <textarea
        class="result-textarea"
        v-model="ocrText"
        placeholder="识别结果会显示在这里，可以手动编辑"
        auto-height
      />
      <view class="parse-btn" @click="parseText">
        <text>🔍 解析快递信息</text>
      </view>
    </view>

    <!-- 解析结果区 -->
    <view v-if="parsedItems.length > 0" class="parse-section">
      <text class="parse-title">识别到 {{ parsedItems.length }} 个快递</text>
      <view
        v-for="(item, idx) in parsedItems"
        :key="idx"
        class="parse-card"
      >
        <view class="parse-header">
          <text class="parse-company">{{ item.company }}</text>
          <text class="parse-code">{{ item.code }}</text>
        </view>
        <view v-if="item.address" class="parse-address">
          <text>{{ item.address }}</text>
        </view>
        <view class="parse-actions">
          <view class="parse-action secondary" @click="editItem(idx)">
            <text>编辑</text>
          </view>
          <view class="parse-action primary" @click="saveItem(idx)">
            <text>添加到待取件</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提示信息 -->
    <view v-if="!ocrText && !imagePath" class="tips-section">
      <text class="tips-title">📝 使用提示</text>
      <text class="tips-item">1. 点击「选择图片」从相册选择快递/短信截图</text>
      <text class="tips-item">2. 点击「粘贴文字」直接粘贴短信内容</text>
      <text class="tips-item">3. 自动识别会提取快递类型和取件码（如 1-2-3456、A1B2-3456）</text>
      <text class="tips-item">4. 识别结果可手动编辑后添加</text>
    </view>

    <!-- 手动编辑弹层 -->
    <view v-if="showEditor" class="form-mask" @click="closeEditor">
      <view class="form-panel" @click.stop>
        <view class="form-title">确认快递信息</view>
        <view class="form-row">
          <text class="form-label">快递类型 *</text>
          <input
            class="form-input"
            v-model="editForm.company"
            placeholder="如：菜鸟驿站 / 顺丰速运 / 妈妈驿站"
          />
        </view>
        <view class="form-row">
          <text class="form-label">取件码 *</text>
          <input
            class="form-input"
            v-model="editForm.code"
            placeholder="如：1-2-3456 / A1B2-3456"
          />
        </view>
        <view class="form-row">
          <text class="form-label">取件地址</text>
          <input
            class="form-input"
            v-model="editForm.address"
            placeholder="选填"
          />
        </view>
        <view class="form-actions">
          <view class="btn btn-cancel" @click="closeEditor">取消</view>
          <view class="btn btn-confirm" @click="confirmSave">确认添加</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useExpressStore } from '@/stores/express'
import { parsePickupCode } from '@/utils/smsParser'

const store = useExpressStore()
const imagePath = ref('')
const ocrText = ref('')
const parsedItems = ref([])
const showEditor = ref(false)
const editForm = reactive({ company: '', code: '', address: '' })
const editingIdx = ref(-1)
const recognizing = ref(false)

/**
 * 从相册/相机选择图片，并自动调用 OCR 识别
 */
function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        imagePath.value = res.tempFilePaths[0]
        performOnlineOcr(imagePath.value)
      }
    },
    fail: () => {
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}

/**
 * 真正可用的 OCR：调用免费在线识别 API（ocr.space）
 * - 无需集成 SDK，纯 HTTP 请求即可
 * - 支持中文 & 英文 & 数字
 * - 免注册测试 key：helloworld（有速率限制，日常识别完全够用）
 *
 * 流程：uni.uploadFile 上传图片 → 解析返回的 JSON → 提取文字
 */
function performOnlineOcr(filePath) {
  recognizing.value = true
  uni.showLoading({ title: '正在识别图片...' })

  // ocr.space 免费 API（支持中英文），测试 key：helloworld
  const OCR_API_KEY = 'helloworld'
  const OCR_API_URL = 'https://api.ocr.space/parse/image'

  uni.uploadFile({
    url: OCR_API_URL,
    filePath: filePath,
    name: 'file',
    formData: {
      language: 'chs', // 中文简体 = chs；英文可写 eng
      isOverlayRequired: 'false',
      OCREngine: '2',   // 引擎 2 对数字/字母识别更准
      scale: 'true',
      apikey: OCR_API_KEY
    },
    success: (uploadRes) => {
      try {
        const data = JSON.parse(uploadRes.data)
        if (data.IsErroredOnProcessing) {
          const errMsg = (data.ErrorMessage && data.ErrorMessage.length > 0)
            ? data.ErrorMessage.join('；')
            : '识别服务返回错误'
          throw new Error(errMsg)
        }
        const parsed = (data.ParsedResults && data.ParsedResults[0])
          ? data.ParsedResults[0].ParsedText || ''
          : ''

        if (parsed && parsed.trim().length > 0) {
          ocrText.value = parsed.trim()
          parseText()
          uni.showToast({ title: '识别成功', icon: 'success' })
        } else {
          // 图片无文字或识别为空 → 保留图片，让用户手动输入
          uni.showToast({
            title: '未识别到文字，请手动填写',
            icon: 'none',
            duration: 2500
          })
          // 自动打开手动编辑弹层，引导用户录入
          editingIdx.value = -1
          editForm.company = ''
          editForm.code = ''
          editForm.address = ''
          showEditor.value = true
        }
      } catch (err) {
        console.warn('[OCR] 解析响应失败：', err)
        uni.showToast({
          title: '识别失败，可手动粘贴文字',
          icon: 'none',
          duration: 2500
        })
      }
    },
    fail: (err) => {
      console.warn('[OCR] 上传失败：', err)
      // 网络失败 → 仍保留图片，让用户用「粘贴文字」或手动输入
      uni.showToast({
        title: '网络异常，可粘贴文字识别',
        icon: 'none',
        duration: 2500
      })
    },
    complete: () => {
      recognizing.value = false
      uni.hideLoading()
    }
  })
}

/**
 * 从剪贴板粘贴文字
 */
function pasteText() {
  uni.getClipboardData({
    success: (res) => {
      if (res.data && res.data.trim()) {
        ocrText.value = res.data
        uni.showToast({ title: '已粘贴', icon: 'success' })
        // 自动解析
        setTimeout(() => parseText(), 300)
      } else {
        uni.showToast({ title: '剪贴板为空', icon: 'none' })
      }
    },
    fail: () => {
      uni.showToast({ title: '读取剪贴板失败', icon: 'none' })
    }
  })
}

/**
 * 解析文字 - 查找其中的快递和取件码
 */
/**
 * 多快递 OCR 文本解析：
 * 核心策略：先按【xxx驿站】/【xxx快递】等标记，将文本拆分为「独立快递块」
 * 每个快递块独立调用 parsePickupCode 解析，保证驿站名、取件码、地址属于同一快递。
 *
 * 对用户文本的处理效果：
 *   【妈妈驿站】取货码1-686 ... 746号
 *   【中国邮政】您的快递2805已暂存 ... 取件码283471
 *   → 被拆成 2 个块，分别解析：
 *     块1：妈妈驿站 + 取货码1-686 + 大同镇花棚子746号
 *     块2：中国邮政 + 取件码283471 + 四川省宁南县大同邮政所
 */
function parseText() {
  if (!ocrText.value || !ocrText.value.trim()) {
    uni.showToast({ title: '请先输入或粘贴文字', icon: 'none' })
    return
  }
  const text = ocrText.value
  parsedItems.value = []

  // ================== 第一步：按【xxx驿站 / xxx快递 / xxx邮政】拆分为独立快递块 ==================
  const blocks = splitIntoExpressBlocks(text)

  for (const block of blocks) {
    const parsed = parsePickupCode(block)
    if (!parsed.code) continue
    if (!isValidPickupCode(parsed.code, block)) continue
    // 避免重复（同一取件码只收录一次）
    if (parsedItems.value.some(it => it.code === parsed.code)) continue

    parsedItems.value.push({
      company: parsed.company || '其他快递',
      code: parsed.code,
      address: parsed.address || '',
      raw: block.slice(0, 200)
    })
  }

  // ================== 第二步：若拆分方式没找到（无【】标记的单快递），回退为整体解析 ==================
  if (parsedItems.value.length === 0) {
    const parsed = parsePickupCode(text)
    if (parsed.code && isValidPickupCode(parsed.code, text)) {
      parsedItems.value.push({
        company: parsed.company || '其他快递',
        code: parsed.code,
        address: parsed.address || '',
        raw: text.slice(0, 200)
      })
    }
  }

  // ================== 第三步：兜底（仅在前两步一无所获时启用） ==================
  if (parsedItems.value.length === 0) {
    const m1 = text.match(/取件码[：:\s]*([A-Za-z0-9-]{3,14})/)
    if (m1 && isValidPickupCode(m1[1], text)) {
      const parsed = parsePickupCode(text)
      parsedItems.value.push({
        company: parsed.company || '其他快递',
        code: m1[1],
        address: parsed.address || '',
        raw: text.slice(0, 200)
      })
    } else {
      const m2 = text.match(/凭\s*([A-Za-z0-9-]{3,14})\s*[取到]/)
      if (m2 && isValidPickupCode(m2[1], text)) {
        const parsed = parsePickupCode(text)
        parsedItems.value.push({
          company: parsed.company || '其他快递',
          code: m2[1],
          address: parsed.address || '',
          raw: text.slice(0, 200)
        })
      }
    }
  }

  if (parsedItems.value.length === 0) {
    uni.showToast({ title: '未识别到取件码，请手动填写', icon: 'none' })
  } else {
    uni.showToast({
      title: `识别到 ${parsedItems.value.length} 个快递`,
      icon: 'success'
    })
  }
}

/**
 * 将 OCR 文本按「【xxx驿站】【xxx快递】【xxx邮政】等标记拆成多个快递块。
 *
 * 关键改进：
 * - 排除过于泛化的标记（如「代收点」「服务站」），只识别具体的驿站/快递品牌名
 * - 商品详情段落（抖音/淘宝等）以特定关键字开头，排除其干扰
 *
 * 输入示例：
 *   【妈妈驿站】取货码1-686，您有\n圆通快递包裹，已到大同镇花棚子\n746号\n
 *   【中国邮政】您的快递2805已暂存...取件码\n283471
 *
 * 输出示例（2 个 block）：
 *   [
 *     "妈妈驿站】取货码1-686，您有圆通快递包裹，已到大同镇花棚子746号",
 *     "中国邮政】您的快递2805已暂存四川省宁南县大同邮政所，取件码283471"
 *   ]
 */
function splitIntoExpressBlocks(text) {
  if (!text) return []

  // 标记白名单：只识别具体的快递/驿站品牌，「代收点」「服务站」等泛化词排除
  const markerRegex = /【([^】\n]{1,20}?(?:驿站|快递|速递|邮政|物流|快递柜|快收|生活))】/g

  // 排除的商品/广告段落开头关键字（这些段落虽含"取件码"，但不是快递驿站信息）
  const PRODUCT_SECTION_KEYWORDS = [
    '已通过虚拟号码发货', '号码保护', '隐私提醒',
    '抖音商城', '抖音', '淘宝', '天猫', '京东', '拼多多',
    '企业店', '简约活页', '活页本', '小时达', '超值购',
    '灵', '萌小年', '号码保护中', '号码保护'
  ]

  const positions = []
  let match
  while ((match = markerRegex.exec(text)) !== null) {
    const name = match[1].trim()
    // 过滤掉「代收点」「物流服务」等泛化词（不是具体驿站名）
    if (['代收点', '物流服务', '物流'].includes(name)) continue
    positions.push({ start: match.index, name })
  }

  // 无任何有效【】标记：过滤商品段落后返回单个块
  if (positions.length === 0) {
    // 过滤掉商品详情段落（抖音/淘宝/京东等）中的「收件人+商品+价格」等干扰内容
    const filtered = filterOutProductSection(text, PRODUCT_SECTION_KEYWORDS)
    return filtered ? [filtered] : []
  }

  // 有有效【】标记：按相邻标记的位置切片
  for (let i = 0; i < positions.length; i++) {
    const startIdx = positions[i].start
    const endIdx = (i + 1 < positions.length)
      ? positions[i + 1].start
      : text.length
    const block = text.substring(startIdx, endIdx).trim()
    if (block.length > 5) blocks.push(block)
  }

  return blocks
}

/**
 * 过滤掉商品详情段落，避免商品中的「取件码」混入物流解析
 * 例如：快递物流信息（待取件 + 取件码）与 商品评价信息（收货人+花棚子568号）混在一起
 */
function filterOutProductSection(text, productKeywords) {
  // 找到文本中所有商品关键词出现的位置
  let earliestProductIdx = text.length

  for (const kw of productKeywords) {
    const idx = text.indexOf(kw)
    if (idx >= 0 && idx < earliestProductIdx) {
      earliestProductIdx = idx
    }
  }

  // 如果商品关键词在取件码标记之前出现，则截断商品段落
  // 物流信息通常以「取件码/待取件/快递员」等结尾，商品段以「号码保护中/已通过虚拟号码」开头
  if (earliestProductIdx < text.length) {
    // 找到「取件码」关键字的位置（如果有的话，在商品关键词之前）
    const pickupCodeIdx = text.indexOf('取件码')
    const toRemoveIdx = text.indexOf('号码保护中')
    const copyIdx = text.indexOf('联系驿站')

    // 商品段落通常包含"联系驿站"之后的内容（驿站/快递员信息）和商品详情
    // 驿站信息截止到"联系驿站"之前，商品详情从"号码保护中"开始
    if (toRemoveIdx >= 0) {
      // 找到「联系驿站」或「联系快递员」的位置，商品段在这之后
      const linkIdx = Math.max(
        text.lastIndexOf('联系驿站', toRemoveIdx),
        text.lastIndexOf('物流客服', toRemoveIdx)
      )
      if (linkIdx >= 0) {
        // 驿站物流信息截止到「联系驿站」前；商品详情从「号码保护中」起
        return text.substring(0, toRemoveIdx).trim()
      }
      return text.substring(0, toRemoveIdx).trim()
    }
  }
  return text
}

/**
 * 判定一个「取件码」是否合理：
 * - 不是很长的订单号/运单号（> 12 位纯数字的不认可）
 * - 不是手机号（11 位纯数字，且以 1 开头）
 * - 不是身份证号（15/18 位，末位可能有 X）
 * - 前缀不是「订单编号/订单号/运单号/快递单号/手机号」等关键字
 */
function isValidPickupCode(code, context) {
  if (!code) return false
  const c = String(code).trim()
  if (!c) return false

  // 1) 11 位纯数字且以 1 开头 → 手机号，拒绝
  if (/^1\d{10}$/.test(c)) return false

  // 2) 13 位以上的纯数字 → 运单号/长订单号，拒绝（取件码通常 4-8 位，最多 2-14 位且带 -）
  if (/^\d{13,}$/.test(c)) return false

  // 3) 身份证号格式 → 拒绝
  if (/^\d{15}$/.test(c) || /^\d{17}[\dXx]$/.test(c)) return false

  // 4) 如果紧邻前缀包含「订单编号/订单号/运单号/快递单号/手机号」等关键字 → 拒绝
  //    在 context 中寻找 pattern，检查其前后 10 个字符
  const idx = context ? context.indexOf(c) : -1
  if (idx >= 0) {
    const before = context.substring(Math.max(0, idx - 12), idx)
    if (/订单编号|订单号|运单号|快递单号|手机号|电话|联系/.test(before)) {
      return false
    }
  }

  // 5) 长度校验：正常取件码 2-14 位（含 -）
  if (c.length < 2 || c.length > 14) return false

  return true
}

/**
 * 判断某段文字是否为明显的广告/噪声，不值得作为快递去解析
 * 只返回 true 当这段文字主要由噪声关键词构成，且没有任何取件码相关标识
 */
function looksLikeNoise(seg) {
  // 取件码相关关键字（一旦包含就不是噪声，过滤会继续）
  if (/取件码|取货码|提货码|凭\s*\d|驿站|待取件|快件|包裹|快递员|代收点|邮政快递|快递包裹/.test(seg)) {
    return false
  }

  // 典型广告/业务关键字（命中 1 个即认为整段不是快递信息）
  const noiseKeywords = [
    '优惠券', '返场', '满减', '下单', '官方旗舰', '旗舰店', '品牌',
    '订单编号', '运单号', '订单号', '收货地址',
    '拨打电话', '订阅', '导航',
    '种草', '正品', '万人', '步步生香', '留香', '持久',
    '中华人民共和国', '官方', 'BASE', 'scent',
    '万人种草', 'booster', '虚拟号码', '隐私提醒',
    '抖音商城', '小时达', '超值购', '灵'
  ]
  for (const kw of noiseKeywords) {
    if (seg.includes(kw)) return true
  }
  return false
}

/**
 * 清空文字
 */
function clearText() {
  ocrText.value = ''
  parsedItems.value = []
}

/**
 * 编辑某个项
 */
function editItem(idx) {
  const it = parsedItems.value[idx]
  editingIdx.value = idx
  editForm.company = it.company
  editForm.code = it.code
  editForm.address = it.address || ''
  showEditor.value = true
}

/**
 * 保存某个项到 store
 */
function saveItem(idx) {
  const it = parsedItems.value[idx]
  if (!it.code || !it.code.trim()) {
    uni.showToast({ title: '取件码为空', icon: 'none' })
    return
  }
  const added = store.addItem({
    company: it.company || '其他快递',
    code: it.code.trim(),
    address: it.address || '',
    smsTime: Date.now(),
    status: 'pending',
    rawSms: '（OCR识别）' + it.raw,
    remark: ''
  }, false)
  if (added) {
    uni.showToast({ title: '已添加，快去取件！', icon: 'success' })
    // 从待选列表移除（避免重复添加）
    parsedItems.value.splice(idx, 1)
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } else {
    uni.showToast({ title: '记录可能已存在', icon: 'none' })
  }
}

/**
 * 关闭编辑弹层
 */
function closeEditor() {
  showEditor.value = false
  editingIdx.value = -1
}

/**
 * 确认保存（从编辑弹层）
 */
function confirmSave() {
  if (!editForm.company.trim()) {
    uni.showToast({ title: '请填写快递类型', icon: 'none' })
    return
  }
  if (!editForm.code.trim()) {
    uni.showToast({ title: '请填写取件码', icon: 'none' })
    return
  }
  const added = store.addItem({
    company: editForm.company.trim(),
    code: editForm.code.trim(),
    address: editForm.address.trim(),
    smsTime: Date.now(),
    status: 'pending',
    rawSms: '（OCR识别）' + ocrText.value,
    remark: ''
  }, false)
  if (added) {
    uni.showToast({ title: '已添加，快去取件！', icon: 'success' })
    closeEditor()
    setTimeout(() => uni.navigateBack(), 800)
  } else {
    uni.showToast({ title: '记录可能已存在', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 200rpx;
  background: #F5F6F8;
}

.header {
  padding: 32rpx 24rpx;
  background: linear-gradient(135deg, #1A2A4A 0%, #3A5A8A 100%);
  border-radius: 24rpx;
  margin-bottom: 24rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
  margin-bottom: 12rpx;
}
.subtitle {
  font-size: 26rpx;
  color: rgba(255,255,255,0.85);
  line-height: 1.5;
}

.preview-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}
.preview-icon { font-size: 80rpx; margin-bottom: 24rpx; opacity: 0.5; }
.preview-text { font-size: 28rpx; color: $text-placeholder; }
.preview-wrap {
  position: relative;
  width: 100%;
}
.preview-image {
  width: 100%;
  max-height: 500rpx;
  border-radius: 16rpx;
}
/* 识别中半透明遮罩 */
.preview-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 42, 74, 0.55);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.preview-spinner {
  font-size: 60rpx;
  margin-bottom: 16rpx;
  animation: pulse 1.2s ease-in-out infinite;
}
.preview-mask-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.15); }
}

.btn-group {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}
.btn-primary, .btn-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  border-radius: 20rpx;
}
.btn-primary {
  background: linear-gradient(135deg, #1A2A4A 0%, #3A5A8A 100%);
}
.btn-secondary {
  background: #FFFFFF;
  border: 2rpx solid #E5E7EB;
}
.btn-icon { font-size: 32rpx; margin-right: 12rpx; }
.btn-text {
  font-size: 30rpx;
  font-weight: 600;
}
.btn-primary .btn-text { color: #FFFFFF; }
.btn-secondary .btn-text { color: $text-primary; }

.result-section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.result-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}
.result-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}
.clear-btn {
  padding: 8rpx 20rpx;
  background: #F4F5F7;
  border-radius: 12rpx;
}
.clear-btn text {
  font-size: 24rpx;
  color: $text-secondary;
}
.result-textarea {
  width: 100%;
  min-height: 200rpx;
  background: #F4F5F7;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: $text-primary;
  line-height: 1.6;
  box-sizing: border-box;
  margin-bottom: 20rpx;
}
.parse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  background: #4CD964;
  border-radius: 16rpx;
}
.parse-btn text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.parse-section {
  margin-top: 24rpx;
}
.parse-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 20rpx;
}
.parse-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
  border-left: 6rpx solid $primary-color;
}
.parse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.parse-company {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
}
.parse-code {
  font-size: 36rpx;
  font-weight: 700;
  color: $primary-color;
  font-family: 'SF Mono', 'Menlo', monospace;
}
.parse-address {
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: $text-secondary;
  line-height: 1.5;
}
.parse-actions {
  display: flex;
  gap: 16rpx;
}
.parse-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  border-radius: 12rpx;
}
.parse-action.primary {
  background: $primary-color;
}
.parse-action.primary text {
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 500;
}
.parse-action.secondary {
  background: #F4F5F7;
}
.parse-action.secondary text {
  color: $text-secondary;
  font-size: 26rpx;
}

.tips-section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-top: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 20rpx;
}
.tips-item {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 2;
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
  color: $text-primary;
  text-align: center;
  margin-bottom: 32rpx;
}
.form-row { margin-bottom: 24rpx; }
.form-label {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  margin-bottom: 12rpx;
}
.form-input {
  width: 100%;
  height: 80rpx;
  background: #F4F5F7;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: $text-primary;
  box-sizing: border-box;
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
.btn-cancel { background: #F4F5F7; color: $text-secondary; }
.btn-confirm { background: $primary-color; color: #FFFFFF; }
</style>
