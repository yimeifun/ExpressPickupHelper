<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="header">
      <text class="title">识别截图取件码「测试」</text>
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
      <view class="btn-secondary" @click="editApiKey">
        <text class="btn-icon">🔑</text>
        <text class="btn-text">API Key</text>
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
 * - 测试 key：helloworld（有速率限制，日常识别完全够用）
 * - 正式使用建议替换为自己的 API key（可在设置页面配置）
 *
 * 流程：uni.uploadFile 上传图片 → 解析返回的 JSON → 提取文字
 */
function performOnlineOcr(filePath) {
  recognizing.value = true
  uni.showLoading({ title: '正在识别图片...' })

  // ocr.space 免费 API（支持中英文）
  // 默认 key：helloworld（公共测试 key，有速率限制）
  // 若用户在本地存储配置了自定义 key，则优先使用自定义 key
  let customKey = ''
  try {
    customKey = uni.getStorageSync('ocr_api_key') || ''
  } catch (e) {
    customKey = ''
  }
  const OCR_API_KEY = customKey.trim() || 'helloworld'
  const OCR_API_URL = 'https://api.ocr.space/parse/image'

  console.log('[OCR] 使用 API key：', OCR_API_KEY === 'helloworld' ? '公共测试 key (helloworld)' : '自定义 key')

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
 * 配置 OCR API key（ocr.space）
 * - 默认使用公共测试 key：helloworld（有速率限制）
 * - 用户可在 https://ocr.space/ocrapi 免费注册获得自己的 key
 * - 保存到本地存储，下次打开自动生效
 */
function editApiKey() {
  let currentKey = ''
  try {
    currentKey = uni.getStorageSync('ocr_api_key') || ''
  } catch (e) {
    currentKey = ''
  }

  uni.showModal({
    title: '设置 OCR API Key',
    content:
      '当前使用：' + (currentKey.trim() ? '自定义 Key（' + currentKey.trim().slice(0, 6) + '...）' : '公共测试 key（helloworld，有速率限制）') +
      '\n\n点击「确定」后在输入框粘贴您自己的 key，留空则恢复使用默认测试 key。\n\n免费申请：https://ocr.space/ocrapi',
    confirmText: '修改 Key',
    cancelText: '重置默认',
    success: (res) => {
      if (res.confirm) {
        // 弹第二个输入框让用户输入 key
        uni.showModal({
          title: '输入 API Key',
          editable: true,
          placeholderText: currentKey.trim() || 'helloworld',
          content: '',
          confirmText: '保存',
          cancelText: '取消',
          success: (res2) => {
            if (res2.confirm) {
              const newKey = (res2.content || '').trim()
              try {
                uni.setStorageSync('ocr_api_key', newKey)
                uni.showToast({
                  title: newKey ? '已保存自定义 Key' : '已恢复默认测试 key',
                  icon: 'success'
                })
              } catch (e) {
                uni.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          }
        })
      } else {
        // 点击"重置默认"
        try {
          uni.setStorageSync('ocr_api_key', '')
          uni.showToast({ title: '已恢复默认测试 key', icon: 'success' })
        } catch (e) {
          // ignore
        }
      }
    }
  })
}

/**
 * 解析文字 - 查找其中的快递和取件码
 *
 * 完整解析流程：
 *  ① OCR 预处理
 *  ② 文本分块（结构化拆分）
 *  ③ 分块级解析（获取驿站名/地址上下文）
 *  ④ 全文多码扫描（兜底，确保不漏码）
 *  ⑤ 合并去重入库
 */
function parseText() {
  if (!ocrText.value || !ocrText.value.trim()) {
    uni.showToast({ title: '请先输入或粘贴文字', icon: 'none' })
    return
  }

  // ========== ① OCR 预处理 ==========
  const raw = ocrText.value
  const cleaned = preprocessOcrText(raw)

  parsedItems.value = []
  const seenCodes = new Set()
  const allContexts = []

  // ========== ② 文本分块 ==========
  const blocks = splitIntoExpressBlocks(cleaned)

  // ========== ③ 分块级解析（为每个码收集上下文） ==========
  for (const block of blocks) {
    if (looksLikeNoise(block)) continue
    const parsed = parsePickupCode(block)
    if (parsed.code && isValidPickupCode(parsed.code, block)) {
      allContexts.push({
        code: parsed.code,
        company: parsed.company || '其他快递',
        address: parsed.address || '',
        raw: block.slice(0, 200)
      })
    }
  }

  // ========== ④ 全文多码扫描（关键兜底：无论分块是否成功，都扫描全文） ==========
  // 使用 exec 循环查找所有匹配，兼容所有设备
  // 覆盖多种 OCR 可能产生的格式变化：
  //   - 取件码 123 / 取件码：123 / 取件码　123（全角空格）/ 取件码123（直接相邻）
  //   - 凭123 / 凭 123 / 凭码123 / 请凭123 / 请到123
  //   - 码 123 / 码:123 / 码123
  // 四个捕获组分别对应不同格式族：
  //   [1] 取件码+分隔符+码 | [2] 凭族+分隔符+码 | [3] 直接相邻 | [4] 位置前缀+码+后缀
  const GLOBAL_CODE_REGEX =
    /(?:取件码|取货码|提货码|提取码)(?:[\s　]*[：:\uff1a]?[\s　]*|[\s　]+)([A-Za-z0-9-]{2,14})/g  // 取件码族
  let gMatch
  while ((gMatch = GLOBAL_CODE_REGEX.exec(cleaned)) !== null) {
    const rawCode = (gMatch[1] || '').trim()
    if (!rawCode || rawCode.length < 2) continue
    if (!isValidPickupCode(rawCode, cleaned)) continue

    const codeIndex = gMatch.index
    const beforeText = cleaned.substring(Math.max(0, codeIndex - 200), codeIndex)
    const parsed = parsePickupCode(beforeText + '取件码' + rawCode)

    allContexts.push({
      code: rawCode,
      company: parsed.company || '其他快递',
      address: parsed.address || '',
      raw: beforeText.slice(-80) + '...取件码' + rawCode
    })
  }

  // ④b 凭族扫描（请凭/凭/凭码/请到）
  const PREFIX_REGEX =
    /(?:凭|凭码|请凭|请凭码|请到)(?:[\s　]*[：:\uff1a]?[\s　]*|[\s　]+)([A-Za-z0-9-]{2,14})/g
  while ((gMatch = PREFIX_REGEX.exec(cleaned)) !== null) {
    const rawCode = (gMatch[1] || '').trim()
    if (!rawCode || rawCode.length < 2) continue
    if (!isValidPickupCode(rawCode, cleaned)) continue

    const codeIndex = gMatch.index
    const beforeText = cleaned.substring(Math.max(0, codeIndex - 200), codeIndex)
    const parsed = parsePickupCode(beforeText + '取件码' + rawCode)

    allContexts.push({
      code: rawCode,
      company: parsed.company || '其他快递',
      address: parsed.address || '',
      raw: beforeText.slice(-80) + '...取件码' + rawCode
    })
  }

  // ④c 直接相邻扫描（取件码123，无空格）
  const DIRECT_REGEX = /(?:取件码|取货码|凭|请凭)([A-Za-z0-9-]{3,14})(?![A-Za-z0-9-])/g
  while ((gMatch = DIRECT_REGEX.exec(cleaned)) !== null) {
    const rawCode = (gMatch[1] || '').trim()
    if (!rawCode || rawCode.length < 3) continue
    if (!isValidPickupCode(rawCode, cleaned)) continue

    const codeIndex = gMatch.index
    const beforeText = cleaned.substring(Math.max(0, codeIndex - 200), codeIndex)
    const parsed = parsePickupCode(beforeText + '取件码' + rawCode)

    allContexts.push({
      code: rawCode,
      company: parsed.company || '其他快递',
      address: parsed.address || '',
      raw: beforeText.slice(-80) + '...取件码' + rawCode
    })
  }

  // ========== ⑤ 合并去重入库 ==========
  for (const ctx of allContexts) {
    const normalized = ctx.code.replace(/-/g, '').toUpperCase()
    if (seenCodes.has(normalized)) continue
    seenCodes.add(normalized)

    parsedItems.value.push({
      company: ctx.company || '其他快递',
      code: ctx.code,
      address: ctx.address || '',
      raw: ctx.raw.slice(0, 200)
    })
  }

  // ========== ⑥ 结果反馈 ==========
  if (parsedItems.value.length === 0) {
    uni.showToast({ title: '未识别到取件码，请手动填写', icon: 'none' })
  } else {
    uni.showToast({
      title: `识别到 ${parsedItems.value.length} 个快递`,
      icon: 'success'
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ① OCR 文本预处理
// 目的：OCR 识别会产生字符混淆、换行碎片等，影响正则匹配
// ─────────────────────────────────────────────────────────────────────────────
function preprocessOcrText(text) {
  if (!text) return ''

  let t = text

  // 0) 清理中文引号和英文引号（包裹取件码的常见符号）
  //    例：凭取件码「62752647」 → 凭取件码62752647
  t = t.replace(/[「」『"'`]/g, '')

  // 1) 合并换行碎片：某行很短（< 8字符）且不以标点结尾，则与下一行合并
  //    例：「取件码\n4-1234」→「取件码 4-1234」
  t = t.replace(/(?<=[^\n，。、！？.!?,;:\s])\n(?=[^\n])/g, ' ')

  // 2) 统一全角/半角符号（避免 OCR 混淆）
  t = t.replace(/：/g, ':')
  t = t.replace(/【/g, '【')
  t = t.replace(/】/g, '】')

  // 3) 合并多余空白字符
  t = t.replace(/[ \t]+/g, ' ').trim()

  // 4) 移除 OCR 常见误识别字符（零宽字符、控制字符）
  t = t.replace(/[\u200B-\u200D\uFEFF\r]/g, '')

  return t
}

// ─────────────────────────────────────────────────────────────────────────────
// ② 文本分块：把 OCR 文本拆为多个快递信息块
//
// 策略（优先级递减）：
//   A. 有【】标记 → 按标记切片
//   B. 换行缩进结构（常见于微信/短信多行截图中）
//   C. 编号列表（1. / (1) / ① 等快递单元分隔符）
//   D. 时间戳分割（常见于聊天记录中不同时间发送的消息）
// ─────────────────────────────────────────────────────────────────────────────
function splitIntoExpressBlocks(text) {
  if (!text) return []

  // ── A：按【】标记拆分 ──
  const bracketBlocks = splitByBrackets(text)
  if (bracketBlocks.length > 0) {
    // 对每个块再递归拆分（处理块内嵌套【】的情况）
    const result = []
    for (const block of bracketBlocks) {
      if (!block || block.trim().length < 4) continue
      const sub = splitByBrackets(block)
      if (sub.length > 1) {
        sub.forEach(s => { if (s && s.trim().length >= 4) result.push(s.trim()) })
      } else {
        result.push(block.trim())
      }
    }
    return result.length > 0 ? result : bracketBlocks
  }

  // ── B：按换行缩进结构拆分 ──
  // 微信/短信中每条消息以换行开头，同一快递的信息连贯排列
  const lineBlocks = splitByLineIndent(text)
  if (lineBlocks.length > 1) return lineBlocks.filter(b => b.trim().length >= 8)

  // ── C：按编号列表拆分 ──
  const listBlocks = splitByListMarkers(text)
  if (listBlocks.length > 1) return listBlocks.filter(b => b.trim().length >= 8)

  // ── D：按时间戳拆分（聊天记录中常见） ──
  const timeBlocks = splitByTimestamps(text)
  if (timeBlocks.length > 1) return timeBlocks.filter(b => b.trim().length >= 8)

  // 无明显结构 → 整体返回
  return [text.trim()]
}

/**
 * A. 按【xxx驿站 / xxx快递 / xxx邮政】等标记拆分
 * 只识别具体品牌，排除泛化词（代收点/物流服务/物流）
 */
function splitByBrackets(text) {
  // 标记白名单：匹配【xxx驿站】【xxx快递】【xxx邮政】【xxx柜】【xxx生活】等
  const BRACKET_REGEX = /【([^】\n]{1,20}?(?:驿站|快递|速递|邮政|物流|快递柜|柜|快收|生活))】/g

  // 排除的泛化词（非具体驿站/快递品牌）
  const EXCLUDE_NAMES = new Set([
    '代收点', '物流服务', '物流', '服务站', '收件宝',
    '代收', '快递代收', '包裹代收'
  ])

  const positions = []
  let match
  while ((match = BRACKET_REGEX.exec(text)) !== null) {
    const name = match[1].trim()
    if (EXCLUDE_NAMES.has(name)) continue
    positions.push({ start: match.index, name })
  }

  if (positions.length === 0) return []

  const blocks = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start
    const end = (i + 1 < positions.length) ? positions[i + 1].start : text.length
    const block = text.substring(start, end).trim()
    if (block.length >= 4) blocks.push(block)
  }
  return blocks
}

/**
 * B. 按换行缩进结构拆分
 *
 * 识别模式：
 *   - 新行缩进量明显变化（同一快递连贯，换快递时缩进重置）
 *   - 多行合并成块的逻辑：连续行合并，直到出现新的【】标记或缩进重置
 *
 * 简化策略：检测段落中明显的空行/缩进变化作为分块信号
 */
function splitByLineIndent(text) {
  const lines = text.split('\n')
  const blocks = []
  let current = []

  for (const line of lines) {
    const trimmed = line.trim()
    // 空行 → 结束当前块
    if (!trimmed) {
      if (current.length > 0) {
        const joined = current.join(' ')
        if (joined.length >= 8) blocks.push(joined)
        current = []
      }
      continue
    }
    current.push(trimmed)
  }
  // 剩余
  if (current.length > 0) {
    const joined = current.join(' ')
    if (joined.length >= 8) blocks.push(joined)
  }

  // 只有当块数量 >= 2 且每块都含有快递关键词时才分块
  if (blocks.length < 2) return [text.trim()]
  // 过滤：确保每块至少含有一个快递相关关键词
  const expressKw = /取件|取货|快递|驿站|包裹|待取|已到|凭码|取码|货架|柜号|箱号/
  return blocks.filter(b => expressKw.test(b))
}

/**
 * C. 按编号列表分隔符拆分
 * 常见格式：1. / (1) / ① / 【1】/ No.1 等
 */
function splitByListMarkers(text) {
  // 匹配列表开头：行首编号（排除普通数字，如价格 12.5）
  const LIST_REGEX = /(?<=\n|^)[ \t]*(?:(?:\d+[.、])|(?:[（(]\d+[）)])|(?:[①-⑨\d]+[.、.．])|(?:【\d+】)|(?:No\.?\s*\d+)|(?:第\d+[条个号]))/g

  // 找到所有列表项起始位置
  const positions = []
  let match
  const regexCopy = new RegExp(LIST_REGEX.source, 'g')
  while ((match = regexCopy.exec(text)) !== null) {
    // 排除「12.5元」「3.5折」等价格格式（数字+小数点+数字）
    const afterMatch = text.substring(match.index, match.index + 20)
    if (/^\d+\.\d+/.test(afterMatch)) continue
    positions.push(match.index)
  }

  if (positions.length < 2) return [text.trim()]

  const blocks = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]
    const end = (i + 1 < positions.length) ? positions[i + 1] : text.length
    const block = text.substring(start, end).trim()
    if (block.length >= 8) blocks.push(block)
  }
  return blocks
}

/**
 * D. 按时间戳分割（聊天记录中常见）
 * 常见格式：12:30 / 上午10:00 / 2024-01-01 10:00 / 昨天 15:00
 */
function splitByTimestamps(text) {
  const TS_REGEX = /(?<=\n|^)[ \t]*(?:\d{1,2}:\d{2}(?::\d{2})?|上午\d{1,2}:\d{2}|下午\d{1,2}:\d{2}|凌晨\d{1,2}:\d{2}|(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}[ \t]+\d{1,2}:\d{2}))[ \t]*\n/g

  const positions = []
  let match
  const regexCopy = new RegExp(TS_REGEX.source, 'g')
  while ((match = regexCopy.exec(text)) !== null) {
    positions.push(match.index)
  }

  if (positions.length < 2) return [text.trim()]

  const blocks = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]
    const end = (i + 1 < positions.length) ? positions[i + 1] : text.length
    const block = text.substring(start, end).trim()
    if (block.length >= 8) blocks.push(block)
  }
  return blocks
}

// ─────────────────────────────────────────────────────────────────────────────
// ③ 噪声段落判断
// 返回 true = 整段明显不是快递信息，可跳过
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 判断某段文字是否为明显的广告/噪声，不值得作为快递去解析
 *
 * 策略：优先检测正面关键词（取件/快递相关）→ 存在则不是噪声
 *       再检测负面关键词（电商/广告/金融/生活服务等）→ 命中则判定噪声
 */
function looksLikeNoise(seg) {
  if (!seg || seg.length < 6) return true

  const s = seg

  // ── 正面：包含任何快递/取件相关关键词 → 不是噪声，继续解析 ──
  const EXPRESS_KW = new RegExp([
    '取件码', '取货码', '提货码', '提取码', '取件编号',
    '凭码', '凭取', '取件地', '取件地址', '货架号', '柜号', '箱号',
    '驿站', '快递', '包裹', '快件', '待取', '已到', '已存', '已放', '派送',
    '货架', '取货', '提件', '丰巢', '兔喜', '菜鸟', '妈妈驿', '圆通', '中通',
    '申通', '韵达', '顺丰', '极兔', '邮政', 'EMS', '百世', '德邦', '天天',
    '安能', '宅急送', '苏宁', '丹鸟', '优速', '蓝店', '熊猫快收', '快宝驿',
    '小兵驿', '欢猫驿', '小象驿', '邻里驿', '多多驿', '申通喵',
    '智能柜', '心甜', '新田', '快递柜'
  ].join('|'))
  if (EXPRESS_KW.test(s)) return false

  // ── 负面：命中以下任一关键词 → 直接判定噪声 ──
  const NOISE_PATTERNS = [
    // 电商/购物平台
    new RegExp(['抖音商城', '天猫超市', '淘宝店铺', '京东购物', '拼多多购物', '小红书', '唯品会', '得物',
      '官方旗舰', '品牌特卖', '优惠券', '满减', '返场', '下单成功', '立即购买', '加入购物车',
      '已购', '订单详情', '订单编号', '订单号', '订单金额', '实际付款', '待发货', '待收货'].join('|')),
    // 生活服务/餐饮外卖
    new RegExp(['美团', '饿了么', '外卖配送', '骑手', '送达地址', '收货人', '联系电话\\d{11}',
      '送达时间', '预计送达', '外卖小哥', '快餐', '美食', '餐饮'].join('|')),
    // 金融/支付
    new RegExp(['支付成功', '收款到账', '转账成功', '消费元', '余额元', '积分分',
      '银行卡', '信用卡', '花呗', '借呗', '账单日', '还款日', '还款金额'].join('|')),
    // 会员/订阅/积分
    new RegExp(['会员权益', '积分兑换', '免费领取', '订阅成功', '已订阅'].join('|')),
    // 验证码/安全
    new RegExp(['验证码\\d{4,6}', '动态密码', '登录验证码', '支付验证码', '安全验证'].join('|')),
    // 广告/营销
    new RegExp(['免费领', '限时抢', '抢购', '秒杀', '特惠价', '折扣', '爆款', '热卖', '新品上市',
      '正品保障', '官方正品', '假一赔', '品质保证', '急速发货'].join('|')),
    // 内容推荐/社交
    new RegExp(['朋友圈', '微信群', '扫码进群', '邀请好友', '分享得',
      '种草', '好物推荐', '达人推荐', '万人购买'].join('|')),
    // 天气/日历
    new RegExp(['今天天气', '明日天气', '穿衣指数', '感冒指数', '紫外线'].join('|')),
    // 其他非快递业务
    new RegExp(['预约成功', '排队号码', '排队号', '办理成功', '已开通', '已关闭'].join('|'))
  ]

  for (const pat of NOISE_PATTERNS) {
    if (pat.test(s)) return true
  }

  // ── 长度过短且不含快递关键词 → 噪声 ──
  if (s.length < 20 && !/取件|快递|驿站|包裹|待取/.test(s)) return true

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// ④ 取件码合理性验证
// 返回 true = 看起来像真实的取件码
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 判定一个「取件码」是否合理
 *
 * 过滤场景：
 *   - 手机号（11位，以1开头）
 *   - 运单号/订单号（13位+纯数字）
 *   - 身份证号（15/18位）
 *   - 日期/时间戳（2024xxx / 20250618 等）
 *   - 价格/金额（12.5 / ¥12 / 元）
 *   - 纯数字流水号（无上下文快递关键词）
 *   - 前缀为「订单/运单/编号/电话」等关键字
 *   - 前后缀为标点/序号格式（如「1」「2」「①」等孤立数字）
 */
function isValidPickupCode(code, context) {
  if (!code) return false
  const c = String(code).trim()
  if (!c || c.length < 2 || c.length > 16) return false

  // ── 格式基础过滤 ──
  // 1) 纯数字：11位（手机号）
  if (/^1\d{10}$/.test(c)) return false

  // 2) 纯数字：13位+（运单号）
  if (/^\d{13,}$/.test(c)) return false

  // 3) 身份证号
  if (/^\d{15}$/.test(c)) return false
  if (/^\d{17}[\dXx]$/.test(c)) return false

  // 4) 日期/时间戳过滤（改为更严格、只拒绝明显是日期的格式）
  //    规则：
  //    - 8 位纯数字且前 4 位是 2020-2099，且后 4 位看起来像 MMDD → 拒绝（如 20250620）
  //    - 6 位纯数字且前 4 位是 2020-2099，后 2 位是 01-12 → 拒绝（如 202506）
  //    - 6 位纯数字且前 2 位是 20-29，中间 2 位是 01-12 → 拒绝（如 250618）
  //    - 其他 4-8 位纯数字不拒绝（如 283471 是驿站取件码，不要误伤！）
  //    关键改进：如果代码紧邻 "取件码/取货码/提货码/凭" 前缀 → 不做日期判断
  if (context) {
    const idx2 = context.indexOf(c)
    if (idx2 >= 0) {
      const before2 = context.substring(Math.max(0, idx2 - 8), idx2)
      // 紧邻取件码/取货码/提货码/凭 → 100% 是取件码，直接跳过日期判断
      if (/取件码|取货码|提货码|提取码|凭码|凭|请凭/.test(before2)) {
        // 有明确取件码前缀 → 跳过日期/格式类过滤
        // 注意：仍会执行手机号/运单号等格式检查（在第 1-3、5-7 步）
        return c.length >= 2 && c.length <= 14
      }
    }
  }

  // 无明确取件码前缀 → 执行日期格式检查（更严格）
  if (/^\d{6,8}$/.test(c)) {
    // 8 位：YYYYMMDD
    if (c.length === 8) {
      const y8 = parseInt(c.substring(0, 4), 10)
      const m8 = parseInt(c.substring(4, 6), 10)
      const d8 = parseInt(c.substring(6, 8), 10)
      if (y8 >= 2020 && y8 <= 2099 && m8 >= 1 && m8 <= 12 && d8 >= 1 && d8 <= 31) return false
    }
    // 6 位：YYYYMM 或 YYMMDD
    if (c.length === 6) {
      const y6_1 = parseInt(c.substring(0, 4), 10) // YYYYMM
      const m6_1 = parseInt(c.substring(4, 6), 10)
      if (y6_1 >= 2020 && y6_1 <= 2099 && m6_1 >= 1 && m6_1 <= 12) return false
      const y6_2 = parseInt(c.substring(0, 2), 10) // YYMMDD
      const m6_2 = parseInt(c.substring(2, 4), 10)
      const d6_2 = parseInt(c.substring(4, 6), 10)
      if (y6_2 >= 20 && y6_2 <= 29 && m6_2 >= 1 && m6_2 <= 12 && d6_2 >= 1 && d6_2 <= 31) return false
    }
  }

  // 5) 4-5 位纯数字（如 2805、746）→ 上下文包含 "快递 NNNN" 或 "N 号" 的是干扰，需用上下文判断
  //    注意：实际取件码也可能是 4-6 位纯数字（如妈妈驿站的 1-686 被拆成 686），所以只在无上下文线索时放行
  //    （这部分不主动拒绝，交给前面的前缀判断处理）
  if (/^[\d.]+\s*[元$r$R]?$/.test(c)) return false
  if (/^[¥$]\s*\d+(\.\d{1,2})?$/.test(c)) return false

  // 6) 孤立序号（单个汉字或单个字母 → 不是取件码）
  if (c.length === 1 && /[a-zA-Z\u4e00-\u9fa5]/.test(c)) return false

  // 7) 以「#」「NO.」「N」开头 → 订单/流水号，拒绝
  if (/^(no\.?|n[o°]?\s*\d|#\d)/i.test(c)) return false

  // ── 上下文验证 ──
  if (context) {
    // 8) 前缀关键字：运单/订单/编号/手机/电话/联系/价格等
    const idx = context.indexOf(c)
    if (idx >= 0) {
      const before = context.substring(Math.max(0, idx - 15), idx)
      const after = context.substring(Math.min(context.length, idx + c.length), Math.min(context.length, idx + c.length + 10))

      // 排除：编码前缀
      if (/订单[编号号]|运单|快递单|单号|手机号?|电话|联系|价格|金额|编号[:：]|NO[:：.]|#/.test(before)) return false
      // 排除：编码后缀（价格单位、序号等）
      if (/^[号号.件]+$/.test(after)) return false
      // 排除：整段上下文是日期/金额类文本
      if (/日期|时间|金额|价格|收款|付款|充值|话费|流量/.test(context)) return false
    }

    // 9) 上下文本身不包含任何快递关键词 → 可能是误识别
    const expressKwInContext = /取件|取货|快递|驿站|包裹|待取|已到|凭.*[码号]|[0-9]{4}[码号]/.test(context)
    if (!expressKwInContext) {
      // 无快递关键词，但码包含字母/符号 → 降低置信度，保留（部分驿站短信无显式取件码关键词）
      // 无快递关键词，且纯数字 4-8 位 → 极可能误识别
      if (/^\d{4,8}$/.test(c) && !/[A-Za-z-]/.test(c)) return false
    }
  }

  return true
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
  background: linear-gradient(135deg, #4672ca 0%, #3e90c3 100%);
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
  background: linear-gradient(135deg, #3088d6 0%, #4292d8 100%);
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
