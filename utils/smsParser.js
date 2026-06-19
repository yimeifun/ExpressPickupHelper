/**
 * 短信解析工具
 * 功能：1. Android 原生短信读取  2. 取件码正则解析  3. 快递公司识别  4. 地址提取
 */

import { useExpressStore } from '@/stores/express'

/**
 * 快递公司关键词表
 * 按优先级排列：越靠前优先级越高
 */
const COMPANY_KEYWORDS = [
  // 驿站类（用户指定）
  { name: '菜鸟驿站', keys: ['菜鸟驿站取件', '菜鸟驿站', '菜鸟'], emoji: '' },
  { name: '妈妈驿站', keys: ['妈妈驿站', '妈妈驿'], emoji: '' },
  { name: '圆通速递', keys: ['圆通快递', '圆通速递', '圆通'], emoji: '' },
  { name: '兔喜生活', keys: ['兔喜生活', '兔喜超市', '兔喜'], emoji: '' },
  { name: '中通快递', keys: ['中通快递', '中通'], emoji: '' },
  { name: '韵达快递超市', keys: ['韵达快递超市', '韵达超市', '韵达'], emoji: '' },
  { name: '申通喵站', keys: ['申通快递', '申通喵站', '喵站', '申通'], emoji: '' },
  { name: '驿收发', keys: ['驿收发驿站', '驿收发'], emoji: '' },
  { name: '顺丰速运', keys: ['顺丰速运', '顺丰快递', '顺丰', 'SF'], emoji: '' },
  { name: '拼多多驿站', keys: ['拼多多驿站', '拼多多代收', '多多买菜', '拼多多'], emoji: '' },
  { name: '多多驿站', keys: ['多多驿站', '多多'], emoji: '' },
  { name: '快宝驿站', keys: ['快宝驿站', '快宝'], emoji: '' },
  { name: '熊猫快收', keys: ['熊猫快收'], emoji: '' },
  { name: '熊猫驿站', keys: ['熊猫驿站'], emoji: '' },
  { name: '小兵驿站', keys: ['小兵驿站', '小兵'], emoji: '' },
  { name: '蓝店', keys: ['蓝店快递', '蓝店'], emoji: '' },
  { name: '欢猫驿站', keys: ['欢猫驿站', '欢猫'], emoji: '' },
  // 补充其他常见驿站
  { name: '小象驿站', keys: ['小象驿站', '小象'], emoji: '' },
  { name: '邻里驿站', keys: ['邻里驿站', '邻里'], emoji: '' },
  { name: '喵柜', keys: ['申通喵柜', '喵柜'], emoji: '' },
  { name: '丰巢', keys: ['丰巢快递柜', '丰巢智能柜', '丰巢'], emoji: '' },
  { name: '速递易', keys: ['中邮速递易', '速递易'], emoji: '' },
  { name: '云柜', keys: ['江苏云柜', '云柜'], emoji: '' },
  { name: '富友', keys: ['富友快递柜', '富友收件宝', '富友'], emoji: '' },
  { name: '近邻宝', keys: ['近邻宝'], emoji: '' },
  // 电商平台 - 只在驿站上下文中识别
  { name: '京东快递服务站', keys: ['京东快递服务站', '京东代收点', '京东驿站'], emoji: '' },
  // 其他快递公司
  { name: '极兔速递', keys: ['极兔速递', '极兔快递', '极兔', 'J&T'], emoji: '' },
  { name: '中国邮政', keys: ['邮政快递包裹', '中国邮政', '邮政速递', '邮政', 'EMS'], emoji: '✉️' },
  { name: '百世快递', keys: ['百世快递', '百世汇通', '百世'], emoji: '' },
  { name: '德邦快递', keys: ['德邦快递', '德邦物流', '德邦'], emoji: '' },
  { name: '天天快递', keys: ['天天快递', '天天'], emoji: '' },
  { name: '优速快递', keys: ['优速快递', '优速'], emoji: '' },
  { name: '丹鸟', keys: ['丹鸟物流', '菜鸟直送', '丹鸟'], emoji: '' },
  { name: '安能快递', keys: ['安能快递', '安能物流', '安能'], emoji: '' },
  { name: '宅急送', keys: ['宅急送'], emoji: '' },
  { name: '苏宁快递', keys: ['苏宁快递', '苏宁物流', '苏宁'], emoji: '' }
]

/**
 * 驿站/代收点关键词表
 * 驿站是取件物理地点，不代表运单承运商（如「顺丰包裹已到驿收发」）
 * 当与快递公司关键词同时出现时，格式为「驿站（快递公司）」
 */
const STATION_KEYWORDS = [
  { name: '菜鸟驿站', keys: ['菜鸟驿站', '菜鸟驿'], emoji: '' },
  { name: '妈妈驿站', keys: ['妈妈驿站', '妈妈驿'], emoji: '' },
  { name: '兔喜生活', keys: ['兔喜生活', '兔喜'], emoji: '' },
  { name: '快宝驿站', keys: ['快宝驿站', '快宝驿'], emoji: '' },
  { name: '驿收发', keys: ['驿收发驿站', '驿收发'], emoji: '' },
  { name: '熊猫快收', keys: ['熊猫快收'], emoji: '' },
  { name: '熊猫驿站', keys: ['熊猫驿站'], emoji: '' },
  { name: '小兵驿站', keys: ['小兵驿站', '小兵'], emoji: '' },
  { name: '蓝店', keys: ['蓝店'], emoji: '' },
  { name: '欢猫驿站', keys: ['欢猫驿站', '欢猫驿'], emoji: '' },
  { name: '小象驿站', keys: ['小象驿站', '小象'], emoji: '' },
  { name: '邻里驿站', keys: ['邻里驿站', '邻里'], emoji: '' },
  { name: '多多驿站', keys: ['多多驿站'], emoji: '' },
  { name: '拼多多驿站', keys: ['拼多多驿站', '拼多多'], emoji: '' },
  { name: '申通喵站', keys: ['申通喵站', '喵站'], emoji: '' },
  { name: '喵柜', keys: ['喵柜', '喵'], emoji: '' },
  { name: '丰巢', keys: ['丰巢柜', '丰巢'], emoji: '' },
  { name: '速递易', keys: ['速递易'], emoji: '' },
  { name: '云柜', keys: ['云柜'], emoji: '' },
  { name: '富友', keys: ['富友'], emoji: '' },
  { name: '近邻宝', keys: ['近邻宝'], emoji: '' },
  { name: '韵达快递超市', keys: ['韵达快递超市', '韵达超市'], emoji: '' }
]

/**
 * 快递公司关键词表（运单承运商）
 * 当与驿站关键词同时出现时，作为括号内的补充说明
 */
const COURIER_KEYWORDS = [
  { name: '顺丰速运', keys: ['顺丰速运', '顺丰快递', '顺丰'], emoji: '' },
  { name: '中通快递', keys: ['中通快递', '中通'], emoji: '' },
  { name: '圆通速递', keys: ['圆通速递', '圆通'], emoji: '' },
  { name: '韵达快递', keys: ['韵达快递', '韵达'], emoji: '' },
  { name: '申通快递', keys: ['申通快递', '申通'], emoji: '' },
  { name: '极兔速递', keys: ['极兔速递', '极兔', 'J&T'], emoji: '' },
  { name: '中国邮政', keys: ['中国邮政', 'EMS', '邮政快递包裹', '邮政'], emoji: '✉️' },
  { name: '百世快递', keys: ['百世快递', '百世'], emoji: '' },
  { name: '德邦快递', keys: ['德邦快递', '德邦'], emoji: '' },
  { name: '天天快递', keys: ['天天快递', '天天'], emoji: '' },
  { name: '优速快递', keys: ['优速快递', '优速'], emoji: '' },
  { name: '丹鸟', keys: ['丹鸟', '菜鸟直送'], emoji: '' },
  { name: '安能快递', keys: ['安能快递', '安能'], emoji: '' },
  { name: '宅急送', keys: ['宅急送'], emoji: '' },
  { name: '苏宁快递', keys: ['苏宁快递', '苏宁'], emoji: '' },
  { name: '京东快递', keys: ['京东快递', '京东'], emoji: '' }
]

/**
 * 取件码正则（按优先级逐个匹配）
 * 支持：取件码/提取码/取货码/提货码/验证码/货架号/柜号/箱号/英文 等
 * 支持取件码中包含 "-" 符号
 */
const CODE_PATTERNS = [
  // ============================================================
  // 最高优先级：明确的"请凭取件码/凭取件码"格式
  // 示例：【快宝驿站】凭取件码480979...
  // 示例：【喵柜】请凭取件码207406到...
  // ============================================================
  /请凭取件码\s*([A-Za-z0-9-]{2,14})/,
  /凭取件码\s*([A-Za-z0-9-]{2,14})/,
  /请凭码\s*([A-Za-z0-9-]{2,14})/,

  // ============================================================
  // 高优先级：请凭xxx取件 / 请凭xxx领取 / 请凭xxx到
  // 示例：【欢猫驿站】请凭0614-056取件
  // 示例：【邻里驿站】请凭H-01485领取
  // 示例：【邮政快递包裹】请凭0202-0047到...
  // ============================================================
  /请凭\s*([A-Za-z0-9-]{2,14})\s*来取/,
  /请凭\s*([A-Za-z0-9-]{2,14})\s*取件/,
  /请凭\s*([A-Za-z0-9-]{2,14})\s*领取/,
  /请凭\s*([A-Za-z0-9-]{2,14})\s*到/,
  /请凭\s*([A-Za-z0-9-]{2,14})/,

  // ============================================================
  // 高优先级：凭xxx到 / 凭xxx来取 / 凭xxx领取
  // 示例：【申通快递】凭0616-0049到...
  // ============================================================
  /凭\s*([A-Za-z0-9-]{2,14})\s*到/,
  /凭\s*([A-Za-z0-9-]{2,14})\s*来取/,
  /凭\s*([A-Za-z0-9-]{2,14})\s*领取/,
  /凭\s*([A-Za-z0-9-]{2,14})\s*取件/,

  // ============================================================
  // 标准格式：取件码xxx / 取件码为xxx
  // 示例：【申通快递】取件码06-0706
  // 示例：【兔喜生活】取件码为A22368
  // ============================================================
  /取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /取件码为\s*([A-Za-z0-9-]{2,14})/,
  /取件码是\s*([A-Za-z0-9-]{2,14})/,
  /取件编号\s*([A-Za-z0-9-]{2,14})/,

  /提取码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /取货码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /提货码[：:：]?\s*([A-Za-z0-9-]{2,14})/,

  // ============================================================
  // 各驿站特殊格式
  // ============================================================
  /妈妈驿站[^\n]*取货码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /妈妈驿站[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /妈妈驿站[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /驿收发[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /快宝驿站[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /快宝驿站[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /欢猫驿站[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /欢猫驿站[^\n]*取货码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /欢猫驿站[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /兔喜生活[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /兔喜生活[^\n]*取货码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /邻里驿站[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /邻里驿站[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /喵柜[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /喵柜[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,

  // ============================================================
  // 各快递公司特殊格式
  // ============================================================
  /申通快递[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /申通快递[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /中通快递[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /中通快递[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /圆通速递[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /圆通速递[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /韵达快递[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /韵达快递[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /顺丰[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /顺丰速运[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /丰巢[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /丰巢[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /邮政快递包裹[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /邮政快递包裹[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /中国邮政[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /极兔速递[^\n]*取件码[：:：]?\s*([A-Za-z0-9-]{2,14})/,
  /极兔速递[^\n]*码[：:：]\s*([A-Za-z0-9-]{2,14})/,

  // ============================================================
  // 通用简化：码xxx / 凭xxx
  // ============================================================
  /码[：:：]\s*([A-Za-z0-9-]{2,14})/,
  /码\s+([A-Za-z0-9-]{2,14})/,
  /凭\s*([A-Za-z0-9-]{2,14})/,

  // ============================================================
  // 货架/柜子/箱号格式
  // ============================================================
  /货架号[：:]\s*([A-Za-z0-9-]{2,14})/,
  /货架[：:]\s*([A-Za-z0-9-]{2,14})/,
  /柜号[：:]\s*([A-Za-z0-9-]{2,14})/,
  /柜子号[：:]\s*([A-Za-z0-9-]{2,14})/,
  /箱号[：:]\s*([A-Za-z0-9-]{2,14})/,
  /编号[：:]\s*([A-Za-z0-9-]{2,14})/,

  // ============================================================
  // 带括号的格式
  // ============================================================
  /取件码\s*\(\s*([A-Za-z0-9-]{2,14})\s*\)/,
  /码\s*\(\s*([A-Za-z0-9-]{2,14})\s*\)/,

  // ============================================================
  // 英文格式
  // ============================================================
  /code[：:]\s*([A-Za-z0-9-]{2,14})/i,
  /pickup[：:]\s*([A-Za-z0-9-]{2,14})/i,

  // ============================================================
  // 纯数字简短码（3-6位，丰巢柜子常见）
  // ============================================================
  /[柜柜子][^\d\n]*(\d{3,6})/
]

/**
 * 独立 6 位纯数字兜底
 */
const FALLBACK_SIX_DIGIT = /(?:^|[^\d])(\d{6})(?=[^\d]|$)/

/**
 * 快递相关上下文关键词（判断是否属于快递短信）
 * 扩充至常见的各类取件通知关键词
 */
const SMS_CONTEXT_KEYWORDS = [
  // 核心取件相关
  '取件', '快递', '包裹', '驿站', '丰巢', '菜鸟',
  '取货', '提货', '派件', '入库', '到货', '通知',
  '货架', '柜子', '取货码', '取件码', '自提', '提件',
  // 地点相关
  '收发室', '物管', '物业', '前台', '门卫',
  '快递柜', '自提点', '代收点', '存放点', '取货点',
  '服务站', '网点', '门店', '超市', '便利店',
  // 运单号相关
  '单号', '运单', '快递员', '配送', '揽收',
  '签收', '已送达', '待取', '待签收', '已投递',
  // 快递柜品牌
  '速递易', '云柜', '富友', '近邻宝', '熊猫快收', '蓝店',
  '喵柜', '邻里驿站', '快宝驿站', '妈妈驿站', '欢猫驿站',
  '兔喜生活', '菜鸟驿站', '申通喵站', '驿收发',
  // 电商平台
  '天猫', '淘宝', '京东', '拼多多', '苏宁',
  // 快递公司
  '顺丰', '申通', '中通', '圆通', '韵达', '极兔', '邮政',
  '百世', '德邦', '天天', 'EMS', 'J&T',
  // 动词
  '送达', '投递', '派送', '到达', '放置', '存放', '前往',
  '保管', '暂时保管', '已到', '已存', '已放'
]

/**
 * 地址提取正则（只提取完整地址，避免与取件码混淆）
 * 注意：取件码在 parsePickupCode 中会先被提取，地址只是辅助信息
 */
const ADDRESS_PATTERNS = [
  // 明确标注地址
  /取件地址[：:：]([^\n，。,\.；;]{3,60})/,
  /收件地址[：:：]([^\n，。,\.；;]{3,60})/,
  /地址[：:：]([^\n，。,\.；;]{3,60})/,
  // 已到/到达格式
  /已到(.+?)[，,]请凭/,           // 【欢猫驿站】已到xxx，请凭xxx
  /已到达(.+?)[，,]/,             // 【兔喜生活】您有包裹已到达xxx
  /到达(.+?)[，,]/,               // 到达xxx
  // 存放格式
  /已存放(.+?)[，,]/,             // 【申通快递】已存放xxx
  /存放(.+?)[，,]取件码/,          // 存放xxx，取件码
  /存放(.+?)[，,]/,                // 存放xxx
  // 暂存格式（邮政/驿站常见）
  /已暂存(.+?)[，,]/,             // 【中国邮政】您的快递已暂存xxx
  /暂存(.+?)[，,]/,                // 暂存xxx，取件码
  // 前往/到格式
  /前往(.+?)[，,]/,               // 【快宝驿站】前往xxx
  /到(.+?)取/,                    // 凭xxx到xxx取
  /到(.+?)[，,]/,                 // 到xxx
  // 由/保管格式
  /由(.+?)暂时保管/,              // 【邻里驿站】已由xxx暂时保管
  /由(.+?)保管/,
  // 在/放置格式
  /在(.+?)取件码/,                // 在xxx取件码
  /放置在(.+?)[，,]/,             // 放置在xxx
  // 驿站相关
  /驿站(.+?)[，,]/,               // xxx驿站xxx
  /菜鸟驿站(.+?)[，,]/,           // 菜鸟驿站xxx
  /妈妈驿站(.+?)[，,]/            // 妈妈驿站xxx
]

/**
 * 扫描时间窗口：30 天（扩大范围）
 */
const SMS_TIME_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 解析单条短信，提取取件码 + 快递公司 + 地址
 *
 * 核心策略（解决地址文字干扰公司识别的问题）：
 * 1. 先找到取件码在文本中的位置
 * 2. 公司名：只看「取件码前面」的文本，避免地址末尾的"邮政/驿站"干扰
 * 3. 地址：只看「取件码后面」的文本，地址通常在取件码之后
 * 4. 使用地址关键词过滤，避免地址中的文字（如"花棚子邮政"）被误识别为公司
 */
export function parsePickupCode(body) {
  if (!body || typeof body !== 'string') {
    return { company: '其他快递', code: null, address: '', emoji: '' }
  }

  // 0. 预处理：统一全角符号，减少因 OCR 识别差异导致的匹配失败
  const normalized = body
    .replace(/：/g, ':')
    .replace(/【/g, '【')
    .replace(/】/g, '】')

  // 1. 匹配取件码（按优先级）
  let code = null
  for (const reg of CODE_PATTERNS) {
    const m = normalized.match(reg)
    if (m && m[1]) {
      code = m[1].trim()
      break
    }
  }

  // 兜底：独立 6 位数字（且短信与快递相关）
  if (!code) {
    const m = normalized.match(FALLBACK_SIX_DIGIT)
    if (m && m[1]) {
      const hasCtx = SMS_CONTEXT_KEYWORDS.some(k => normalized.includes(k))
      if (hasCtx) code = m[1]
    }
  }

  // 2. 以取件码位置为界，切分为「前文」和「后文」
  //    公司名看前文，地址看后文，避免互相干扰
  let beforeCode = normalized
  let afterCode = ''
  if (code) {
    const idx = normalized.indexOf(code)
    if (idx >= 0) {
      beforeCode = normalized.substring(0, idx)
      afterCode = normalized.substring(idx + code.length)
    }
  }

  // 3. 匹配快递公司（前文优先，防止地址文字干扰）
  let company = '其他快递'
  let emoji = ''

  // 策略 A：查找【xxx驿站 / 【xxx快递 / 【xxx邮政】等显式标记（最高优先级）
  // 这些标记位于前文时，可靠性最高
  const explicitMarker = beforeCode.match(/【([^】\n]{1,20}?(?:驿站|快递|速递|邮政|物流|服务站|快递柜|代收点|快收|生活))】/)
  if (explicitMarker) {
    const markerName = explicitMarker[1]
    const hit = findCompanyByMarker(markerName)
    if (hit) {
      company = hit.name
      emoji = hit.emoji
    }
  }

  // 策略 B：前文关键词匹配（公司类型必须出现在取件码之前）
  if (company === '其他快递') {
    const beforeHit = findCompanyInText(beforeCode, true)
    if (beforeHit) {
      company = beforeHit.name
      emoji = beforeHit.emoji
    }
  }

  // 策略 C：若前文无匹配（快递信息块内无显式驿站名），回退到全文匹配
  if (company === '其他快递') {
    const fullHit = findCompanyInText(normalized, false)
    if (fullHit) {
      company = fullHit.name
      emoji = fullHit.emoji
    }
  }

  // 4. 提取地址（后文优先，前文兜底）
  let address = ''
  for (const reg of ADDRESS_PATTERNS) {
    const m = afterCode.match(reg)
    if (m && m[1]) {
      address = m[1].replace(/\s+/g, ' ').trim().slice(0, 80)
      break
    }
  }
  // 后文无结果则尝试在前文找
  if (!address) {
    for (const reg of ADDRESS_PATTERNS) {
      const m = beforeCode.match(reg)
      if (m && m[1]) {
        address = m[1].replace(/\s+/g, ' ').trim().slice(0, 80)
        break
      }
    }
  }

  return { company, code, address, emoji }
}

/**
 * 根据【】标记中的内容，匹配快递公司
 *
 * 核心规则：
 * - 驿站关键词优先 → 作为公司名
 * - 快递公司关键词 → 作为括号内补充（仅当驿站也存在时）
 * - 仅快递公司 → 直接返回快递公司名
 *
 * 例如：【邮政快递包裹】 → 中国邮政
 *       【妈妈驿站】     → 妈妈驿站
 *       【驿收发】(顺丰包裹...) → 驿收发（顺丰）
 */
function findCompanyByMarker(marker) {
  if (!marker) return null
  return findStationAndCourier(marker)
}

/**
 * 在文本中匹配快递公司（带地址过滤）
 *
 * 核心规则：
 * 1) 先找驿站关键词（驿收发、妈妈驿站等）→ 驿站优先
 * 2) 再找快递公司关键词 → 作为括号补充
 * 3) 驿站+快递公司 → 「驿站（快递公司）」
 * 4) 仅驿站 → 驿站名
 * 5) 仅快递公司 → 快递公司名
 *
 * @param {string} text - 搜索文本
 * @param {boolean} filterAddress - 是否过滤地址关键词（前文搜索时启用）
 */
function findCompanyInText(text, filterAddress) {
  if (!text) return null
  return findStationAndCourier(text, filterAddress)
}

/**
 * 统一的「驿站 + 快递公司」识别函数
 * 核心：驿站作为公司名，快递公司作为括号补充
 *
 * @param {string} text - 搜索文本
 * @param {boolean} filterAddress - 是否过滤地址关键词
 */
function findStationAndCourier(text, filterAddress = false) {
  if (!text) return null

  // 地址关键词列表（用于过滤地址文字中的假公司名）
  const ADDRESS_KEYWORDS = [
    '路', '街', '巷', '号', '弄', '栋', '幢', '楼', '单元', '室',
    '村', '镇', '乡', '县', '区', '市', '省',
    '对面', '旁边', '下行', '上行', '前行', '进来', '进去', '往前走',
    '花棚子', '白鹤滩', '南丝路', '宁南', '大同'
  ]

  let station = null
  let courier = null

  // 第一步：在 text 中搜索驿站关键词
  for (const entry of STATION_KEYWORDS) {
    for (const key of entry.keys) {
      if (!text.includes(key)) continue

      // 地址过滤
      if (filterAddress) {
        const idx = text.indexOf(key)
        const before = text.substring(Math.max(0, idx - 12), idx)
        const isAddressFragment = ADDRESS_KEYWORDS.some(ak =>
          before.includes(ak) ||
          /[路街巷弄]\S{0,6}[号]$/.test(before) ||
          /\d+号?\S{0,4}$/.test(before)
        )
        if (isAddressFragment) continue
      }

      station = { name: entry.name, emoji: entry.emoji }
      break
    }
    if (station) break
  }

  // 第二步：在 text 中搜索快递公司关键词（驿站存在时才记录）
  // 快递公司本身在地址前后均可能，过滤规则同驿站
  for (const entry of COURIER_KEYWORDS) {
    for (const key of entry.keys) {
      if (!text.includes(key)) continue

      // 地址过滤（尤其重要，防止"路X号邮政"中的"邮政"被误识别）
      const idx = text.indexOf(key)
      const before = text.substring(Math.max(0, idx - 12), idx)
      const isAddressFragment = ADDRESS_KEYWORDS.some(ak =>
        before.includes(ak) ||
        /[路街巷弄]\S{0,6}[号]$/.test(before) ||
        /\d+号?\S{0,4}$/.test(before)
      )
      if (isAddressFragment) continue

      courier = { name: entry.name, emoji: entry.emoji }
      break
    }
    if (courier) break
  }

  // 第三步：组合返回
  // 驿站 + 快递公司 → 「驿站（快递公司）」
  if (station && courier) {
    return { name: `${station.name}（${courier.name}）`, emoji: station.emoji }
  }
  // 仅驿站
  if (station) {
    return station
  }
  // 仅快递公司
  if (courier) {
    return courier
  }

  return null
}

/**
 * 获取公司 emoji
 * 支持「驿站（快递公司）」格式：优先取驿站的 emoji
 */
export function getCompanyEmoji(company) {
  if (!company) return ''

  // 精确匹配
  const exact = COMPANY_KEYWORDS.find(c => c.name === company)
  if (exact) return exact.emoji

  // 「驿收发（顺丰）」格式：取括号前驿站的 emoji
  const stationMatch = company.match(/^([^（]+)（/)
  if (stationMatch) {
    const stationName = stationMatch[1].trim()
    const stationEntry = COMPANY_KEYWORDS.find(c => c.name === stationName)
    return stationEntry ? stationEntry.emoji : ''
  }

  return ''
}

/**
 * 判断短信是否属于快递相关
 * 排除：验证码、银行卡、支付等非快递短信
 */
function isExpressSms(body) {
  if (!body) return false

  // 排除关键词（这些"验证码"/非快递短信）
  const EXCLUDE_KEYWORDS = [
    '验证码', '登录验证码', '支付验证码', '交易验证码', '安全验证码',
    '银行卡号', '信用卡', '账号异常', '账号冻结',
    '积分兑换', '抽奖', '中奖', '获奖',
    '转账成功', '还款提醒', '账单提醒', '消费提醒'
  ]
  if (EXCLUDE_KEYWORDS.some(k => body.includes(k))) {
    return false
  }

  return SMS_CONTEXT_KEYWORDS.some(k => body.includes(k))
}

/**
 * 申请短信读取权限
 * 策略：先尝试系统弹窗申请（若成功直接返回），否则立即跳转到系统应用设置页
 */
export function requestSmsPermission() {
  return new Promise(resolve => {
    // #ifndef APP-PLUS
    resolve(true)
    return
    // #endif

    // #ifdef APP-PLUS
    try {
      const main = plus.android.runtimeMainActivity()
      const PackageManager = plus.android.importClass('android.content.pm.PackageManager')
      const ActivityCompat = plus.android.importClass('androidx.core.app.ActivityCompat')

      const READ_SMS = 'android.permission.READ_SMS'

      // 已授权则直接返回
      if (main.checkSelfPermission(READ_SMS) === PackageManager.PERMISSION_GRANTED) {
        console.log('[权限] READ_SMS 已授权')
        resolve(true)
        return
      }

      // 先尝试系统弹窗申请（部分 ROM 会直接弹窗）
      console.log('[权限] 尝试通过 requestPermissions 申请 READ_SMS')
      ActivityCompat.requestPermissions(main, [READ_SMS], 10087)

      // 弹窗可能出现也可能不出现（ROM差异），延迟检查结果
      setTimeout(() => {
        const granted = main.checkSelfPermission(READ_SMS) === PackageManager.PERMISSION_GRANTED
        console.log('[权限] requestPermissions 结果：', granted ? '已授权' : '未授权')

        if (granted) {
          resolve(true)
        } else {
          // 弹窗未出现或用户拒绝 → 立即跳转到系统应用设置页
          console.log('[权限] 跳转系统应用设置页')
          openAppPermissionsPage()
          resolve(false)
        }
      }, 1500)
    } catch (e) {
      console.warn('[权限] 申请异常：', e)
      // 异常时也跳转设置页
      openAppPermissionsPage()
      resolve(false)
    }
    // #endif
  })
}

/**
 * 打开系统「应用信息 → 权限」页面
 * 优先跳转到权限管理页（ACTION_APP_OPS_SETTINGS 或 ACTION_MANAGE_OVERLAY_PERMISSION），
 * 失败时回退到应用信息详情页
 */
function openAppPermissionsPage() {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const Settings = plus.android.importClass('android.provider.Settings')
    const Uri = plus.android.importClass('android.net.Uri')

    const pkgName = main.getPackageName()
    let intent = null
    let success = false

    // 尝试方式1：跳转到应用通知设置（Android 8+），用于通知权限跳转
    // 方式2：应用信息页（最稳定），用户需要手动找到"权限"或"其他权限"
    intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    intent.setData(Uri.fromParts('package', pkgName, null))
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    try {
      main.startActivity(intent)
      success = true
    } catch (innerE) {
      console.warn('[权限] 跳转应用信息页失败：', innerE)
    }

    if (!success) {
      console.warn('[权限] 所有跳转方式均失败，无法打开系统设置')
    }
  } catch (e) {
    console.warn('[权限] 跳转设置页异常：', e)
  }
  // #endif
}

/**
 * 打开系统「通知设置」页面（Android 8+ 有专用入口）
 * 点击后用户可直接开启/关闭通知权限，不用手动一层层找
 */
function openNotificationSettingsPage() {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const Settings = plus.android.importClass('android.provider.Settings')
    const Uri = plus.android.importClass('android.net.Uri')
    const BuildVersion = plus.android.importClass('android.os.Build$VERSION')

    const pkgName = main.getPackageName()

    // Android 8+ (API 26) 有专用通知设置入口
    // ACTION_APP_NOTIFICATION_SETTINGS = "android.settings.APP_NOTIFICATION_SETTINGS"
    if (BuildVersion.SDK_INT >= 26) {
      try {
        const intent = new Intent('android.settings.APP_NOTIFICATION_SETTINGS')
        intent.putExtra('android.provider.extra.APP_PACKAGE', pkgName)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        main.startActivity(intent)
        console.log('[权限] 已跳转到应用通知设置页')
        return
      } catch (innerE) {
        console.warn('[权限] 跳转通知设置页失败，回退到应用信息页：', innerE)
      }
    }

    // 回退：应用信息页
    const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    intent.setData(Uri.fromParts('package', pkgName, null))
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    main.startActivity(intent)
  } catch (e) {
    console.warn('[权限] 跳转通知设置页异常：', e)
  }
  // #endif
}

/**
 * 权限自检工具 - 检查核心功能的健康状态
 * 返回值：每个检查项 { ok: boolean, text: string, detail?: string }
 * 四个检查维度：
 *   smsReceive: 通知类短信权限（能否收到短信）
 *   smsRead:    短信读取权限（能否读取短信内容）
 *   notification: 通知权限（能否推送系统通知）
 *   storage:    数据存储状态（能否读写本地存储）
 */

/**
 * 检查 Android 权限（内部工具函数）
 * @param {string} perm - Android Manifest 权限字符串
 * @returns {boolean} 是否已授权
 */
function _checkAndroidPermission(perm) {
  // #ifndef APP-PLUS
  return null // 非 Android 环境，返回 null 表示不适用
  // #endif

  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const PackageManager = plus.android.importClass('android.content.pm.PackageManager')
    const result = main.checkSelfPermission(perm)
    return result === PackageManager.PERMISSION_GRANTED
  } catch (e) {
    console.warn(`[health] 检查权限 ${perm} 失败：`, e)
    return false
  }
  // #endif
}

/**
 * 检查 通知类短信权限（android.permission.RECEIVE_SMS）
 * 说明：这是 Android 的一个「其他权限」，位于系统权限管理的「其他权限」中，
 *       用于接收短信广播，无此权限时应用无法实时感知新到的快递短信
 */
export function checkSmsReceivePermission() {
  // #ifndef APP-PLUS
  return { ok: true, text: '当前环境已授权', detail: '非 Android 环境不适用' }
  // #endif

  // #ifdef APP-PLUS
  const perm = 'android.permission.RECEIVE_SMS'
  const granted = _checkAndroidPermission(perm)
  if (granted === null) {
    return { ok: true, text: '当前环境已授权', detail: '非 Android 环境不适用' }
  }
  if (granted) {
    return { ok: true, text: '已授权', detail: '通知类短信权限已开启，可实时接收快递短信' }
  }
  return { ok: false, text: '未授权', detail: '请在「系统权限管理 → 其他权限」中开启通知类短信' }
  // #endif
}

/**
 * 检查 短信读取权限（android.permission.READ_SMS）
 * 用于读取短信收件箱中的快递信息，是核心功能
 */
export function checkSmsReadPermission() {
  // #ifndef APP-PLUS
  return { ok: true, text: '当前环境已授权', detail: '非 Android 环境不适用' }
  // #endif

  // #ifdef APP-PLUS
  const perm = 'android.permission.READ_SMS'
  const granted = _checkAndroidPermission(perm)
  if (granted === null) {
    return { ok: true, text: '当前环境已授权', detail: '非 Android 环境不适用' }
  }
  if (granted) {
    return { ok: true, text: '已授权', detail: '可以读取短信中的快递信息' }
  }
  return { ok: false, text: '未授权', detail: '无法读取短信，请在系统设置中授予读取权限' }
  // #endif
}

/**
 * 检查 通知权限（Android 13+ 需 POST_NOTIFICATIONS，低版本系统默认已有）
 */
export function checkNotificationPermission() {
  // #ifndef APP-PLUS
  return { ok: true, text: '当前环境已授权', detail: '非 Android 环境不适用' }
  // #endif

  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const BuildVersion = plus.android.importClass('android.os.Build$VERSION')

    // Android 13 以下版本（SDK_INT < 33）：通知权限默认授予
    if (BuildVersion.SDK_INT < 33) {
      return { ok: true, text: '已授权', detail: `Android ${BuildVersion.SDK_INT} 版本默认具有通知权限` }
    }

    // Android 13+：必须检查 POST_NOTIFICATIONS
    const perm = 'android.permission.POST_NOTIFICATIONS'
    const granted = _checkAndroidPermission(perm)
    if (granted) {
      return { ok: true, text: '已授权', detail: '可以推送快递到达、超时提醒等通知' }
    }
    return { ok: false, text: '未授权', detail: '无法推送系统通知，请在系统设置中打开通知权限' }
  } catch (e) {
    console.warn('[health] 检查通知权限异常：', e)
    return { ok: false, text: '检查失败', detail: '无法确定通知权限状态' }
  }
  // #endif
}

/**
 * 检查 数据存储状态（uni.getStorage/setStorage 是否可用）
 * 用于验证本地存储是否正常，以及当前存储大小
 */
export function checkStorageHealth() {
  try {
    // 1. 写入测试
    const testKey = '__app_health_check__'
    uni.setStorageSync(testKey, { ok: true, time: Date.now() })

    // 2. 读取测试
    const data = uni.getStorageSync(testKey)
    if (!data || !data.ok) {
      return { ok: false, text: '存储异常', detail: '读写测试失败，本地存储不可用' }
    }

    // 3. 清理测试数据
    uni.removeStorageSync(testKey)

    // 4. 尝试获取应用数据（统计存储大小）
    let storedCount = 0
    try {
      // 尝试从快递 store 中读取列表数量
      const savedData = uni.getStorageSync('expressList') || []
      storedCount = Array.isArray(savedData) ? savedData.length : 0
    } catch (e) {
      // 非关键数据，忽略
    }

    return {
      ok: true,
      text: '运行正常',
      detail: storedCount > 0
        ? `已保存 ${storedCount} 条快递数据，本地存储健康`
        : '本地存储健康，暂无快递数据'
    }
  } catch (e) {
    console.warn('[health] 存储检查异常：', e)
    return { ok: false, text: '存储异常', detail: '本地存储读写失败，请检查应用权限或设备空间' }
  }
}

/**
 * 一键执行所有权限自检，返回完整的健康报告
 * @returns {Object} 健康报告 { smsReceive, smsRead, notification, storage, allOk }
 */
export function runAppHealthCheck() {
  const smsRead = checkSmsReadPermission()
  const notification = checkNotificationPermission()
  const storage = checkStorageHealth()

  return {
    smsRead,
    notification,
    storage,
    allOk: smsRead.ok && notification.ok && storage.ok
  }
}

/**
 * 申请通知类短信权限
 * 说明：通知类短信属于 Android 的「其他权限」，
 *       无法通过系统弹窗申请，跳转到应用信息页后用户手动找到"其他权限"开启
 *       路径：设置 → 应用 → 本应用 → 权限管理 → 其他权限 → 通知类短信
 */
export async function requestSmsReceivePermission() {
  // #ifndef APP-PLUS
  return true
  // #endif

  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const PackageManager = plus.android.importClass('android.content.pm.PackageManager')
    const perm = 'android.permission.RECEIVE_SMS'

    // 若已授权，直接返回
    if (main.checkSelfPermission(perm) === PackageManager.PERMISSION_GRANTED) {
      return true
    }

    // 未授权 → 跳转到系统应用信息页，用户需要手动找到"其他权限"
    console.log('[权限] 通知类短信未授权，跳转到系统设置')
    openAppPermissionsPage()
    return false
  } catch (e) {
    console.warn('[health] 申请通知类短信权限异常：', e)
    return false
  }
  // #endif
}

/**
 * 申请通知权限（Android 13+）
 * 策略：先尝试系统弹窗申请，失败则跳转到应用通知设置页
 */
export async function requestNotificationPermission() {
  // #ifndef APP-PLUS
  return true
  // #endif

  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const PackageManager = plus.android.importClass('android.content.pm.PackageManager')
    const ActivityCompat = plus.android.importClass('androidx.core.app.ActivityCompat')
    const BuildVersion = plus.android.importClass('android.os.Build$VERSION')

    if (BuildVersion.SDK_INT < 33) {
      return true
    }

    const perm = 'android.permission.POST_NOTIFICATIONS'
    if (main.checkSelfPermission(perm) === PackageManager.PERMISSION_GRANTED) {
      return true
    }

    // 先尝试系统弹窗申请
    console.log('[权限] 尝试通过 requestPermissions 申请 POST_NOTIFICATIONS')
    ActivityCompat.requestPermissions(main, [perm], 10089)

    // 延迟检查结果
    return new Promise(resolve => {
      setTimeout(() => {
        const granted = main.checkSelfPermission(perm) === PackageManager.PERMISSION_GRANTED
        if (granted) {
          console.log('[权限] 通知权限已授权')
          resolve(true)
        } else {
          // 弹窗未出现或用户拒绝 → 跳转到应用通知设置页
          console.log('[权限] 通知权限未授权，跳转到通知设置页')
          openNotificationSettingsPage()
          resolve(false)
        }
      }, 2000)
    })
  } catch (e) {
    console.warn('[权限] 申请通知权限异常：', e)
    // 异常时也跳转通知设置页
    openNotificationSettingsPage()
    return false
  }
  // #endif
}

/**
 * 读取短信并解析入库
 */
export async function checkAndLoadSms(triggerNotify = true) {
  // #ifndef APP-PLUS
  console.log('[smsParser] 非 Android 环境，跳过')
  return { count: 0, news: 0 }
  // #endif

  // #ifdef APP-PLUS
  let hasPerm = false
  try {
    hasPerm = await requestSmsPermission()
  } catch (e) {
    console.warn('[smsParser] 权限检查失败：', e)
  }

  if (!hasPerm) {
    console.warn('[smsParser] 无 READ_SMS 权限')
    return { count: 0, news: 0, noPerm: true }
  }

  try {
    const store = useExpressStore()
    // 每次扫描前清空会话集，确保新短信能入库
    store.beginScanSession()

    const Uri = plus.android.importClass('android.net.Uri')
    const main = plus.android.runtimeMainActivity()
    const resolver = main.getContentResolver()
    plus.android.importClass(resolver)

    // 短信收件箱
    const smsUri = Uri.parse('content://sms/inbox')
    const now = Date.now()
    const minTime = String(now - SMS_TIME_WINDOW_MS)

    // 查询条件：最近 30 天，按时间倒序
    // 使用完整的列名数组，确保返回所有需要的字段
    const projection = ['_id', 'body', 'date', 'address', 'read']
    const cursor = resolver.query(
      smsUri,
      projection,
      'date > ?',
      [minTime],
      'date DESC'
    )

    if (!cursor) {
      console.warn('[smsParser] cursor 为空')
      return { count: 0, news: 0 }
    }

    let total = 0
    let newItems = 0
    const debugLogs = []

    try {
      // 获取列索引（使用 plus.android.invoke 方式）
      const idIndex = plus.android.invoke(cursor, 'getColumnIndex', '_id')
      const bodyIndex = plus.android.invoke(cursor, 'getColumnIndex', 'body')
      const dateIndex = plus.android.invoke(cursor, 'getColumnIndex', 'date')

      console.log('[smsParser] 列索引：', idIndex, bodyIndex, dateIndex)

      // 循环读取（使用 plus.android.invoke 方式）
      while (plus.android.invoke(cursor, 'moveToNext')) {
        total++
        
        // 使用 invoke 方式获取字段值
        const id = plus.android.invoke(cursor, 'getString', idIndex)
        const body = plus.android.invoke(cursor, 'getString', bodyIndex)
        const date = plus.android.invoke(cursor, 'getLong', dateIndex)

        console.log('[smsParser] 读取短信：', 'ID=' + id, '时间=' + date, '内容长度=' + (body ? body.length : 0))

        // 跳过空短信
        if (!body || body.length < 10) {
          debugLogs.push({ id, reason: '短信内容过短' })
          continue
        }

        // 必须有快递上下文
        if (!isExpressSms(body)) {
          debugLogs.push({ id, body: body.slice(0, 30), reason: '无快递上下文' })
          continue
        }

        // 解析取件码
        const parsed = parsePickupCode(body)
        if (!parsed.code) {
          // 调试：打印前3条未识别到取件码的短信内容
          if (debugLogs.length < 5) {
            console.log('[smsParser] 未识别到取件码的短信示例：', body.slice(0, 100))
          }
          debugLogs.push({ id, body: body.slice(0, 30), reason: '未识别到取件码' })
          continue
        }

        const item = {
          smsId: String(id),
          company: parsed.company,
          code: parsed.code,
          address: parsed.address,
          smsTime: Number(date) || Date.now(),
          status: 'pending',
          rawSms: String(body),
          remark: ''
        }

        const added = store.addItem(item, triggerNotify)
        if (added) {
          newItems++
          console.log('[smsParser] ✅ 新增：', parsed.company, parsed.code, '|', body.slice(0, 50))
        } else {
          debugLogs.push({ id, code: parsed.code, reason: '可能被去重或已存在' })
        }
      }
    } catch (e) {
      console.error('[smsParser] 读取循环异常：', e)
    } finally {
      // 使用 invoke 方式关闭 cursor（修复 cursor.close is not a function）
      try {
        plus.android.invoke(cursor, 'close')
        console.log('[smsParser] Cursor 已关闭')
      } catch (closeErr) {
        console.warn('[smsParser] 关闭 Cursor 异常：', closeErr)
      }
    }

    console.log(`[smsParser] 扫描完成：共扫描 ${total} 条短信，识别到快递相关 ${newItems + debugLogs.length} 条，新增 ${newItems} 条`)
    if (debugLogs.length > 0 && debugLogs.length < 20) {
      console.log('[smsParser] 未入库原因：', debugLogs)
    } else if (debugLogs.length >= 20) {
      console.log('[smsParser] 未入库原因（前20条）：', debugLogs.slice(0, 20))
    }

    return { count: total, news: newItems }
  } catch (e) {
    console.error('[smsParser] 扫描异常：', e)
    return { count: 0, news: 0, error: String(e) }
  }
  // #endif
}
