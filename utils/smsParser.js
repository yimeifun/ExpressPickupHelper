/**
 * 短信解析工具
 * 功能：1. Android 原生短信读取  2. 取件码正则解析  3. 快递公司识别  4. 地址提取
 */

import { useExpressStore } from '@/stores/express'
import { sendNotification, getNotificationPrefs } from '@/utils/widgetBridge'

/**
 * 快递公司关键词表
 * 按优先级排列：越靠前优先级越高
 */
const COMPANY_KEYWORDS = [
  // 驿站类（用户指定）
  { name: '心甜智能柜', keys: ['心甜智能柜', '新田智能柜', '心甜', '新田'], emoji: '' },
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
  // 心甜智能柜（邮政旗下智能快递柜品牌，优先识别为驿站）
  { name: '心甜智能柜', keys: ['心甜智能柜', '新田智能柜', '心甜', '新田'], emoji: '' },
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
  // 核心取件相关（注意：不含「通知」——避免被运营商营销短信误触发）
  '取件', '快递', '包裹', '驿站', '丰巢', '菜鸟',
  '取货', '提货', '派件', '入库', '到货',
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
 * 地址提取正则（按优先级从高到低排列）
 * 优化策略：
 *   - 前 3 项匹配「明确标注地址」的格式（准确率最高）
 *   - 中间项匹配「驿站式指令」（在xxx / 已到xxx / 已存放xxx 等）
 *   - 后段匹配「导航式指令」（到xxx取 / 前往xxx / 请到xxx）
 *   - 最后是地理关键词兜底（xxx路 / xxx街 / xxx号 / xxx小区 等）
 */
const ADDRESS_PATTERNS = [
  // ============================================================
  // 最高优先级：明确标注地址
  // ============================================================
  /取件地址[：:\s]([^\n，。,\.；;]{3,80})/,
  /取件位置[：:\s]([^\n，。,\.；;]{3,80})/,
  /取件点[：:\s]([^\n，。,\.；;]{3,80})/,
  /收件地址[：:\s]([^\n，。,\.；;]{3,80})/,
  /取件地点[：:\s]([^\n，。,\.；;]{3,80})/,

  // ============================================================
  // 高优先级：驿站式格式「在xxx」「存放xxx」「已到xxx」「已暂存xxx」
  // ============================================================
  // 【驿站名】已到xxx，请凭xxx
  /已到(.+?)[\s，,]请凭/,
  // 【驿站名】已到达xxx
  /已到达(.+?)[\s，,]/,
  // 【驿站名】已存放xxx
  /已存放(.+?)[\s，,]/,
  // 存放xxx，取件码
  /存放(.+?)[\s，,]取件码/,
  /存放(.+?)[\s，,]/,
  // 【驿站名】已暂存xxx
  /已暂存(.+?)[\s，,]/,
  // 暂存xxx，取件码
  /暂存(.+?)[\s，,]取件码/,
  /暂存(.+?)[\s，,]/,
  // 在xxx取件 / 在xxx取货 / 在xxx取包
  /在(.+?)[\s，,]取件/,
  /在(.+?)[\s，,]取货/,
  /在(.+?)[\s，,]取包/,
  /在(.+?)[\s，,]取/,
  /放置在(.+?)[\s，,]/,
  // 包裹已放在xxx / 您的包裹已存放在xxx（智能柜短信常见格式）
  /包裹已放在(.+?)[\s，,]/,
  /包裹已存放于(.+?)[\s，,]/,
  /包裹已到(.+?)[\s，,]/,
  /您的包裹已到(.+?)[\s，,]/,

  // ============================================================
  // 中优先级：导航式指令「到xxx取」「前往xxx」「请到xxx」
  // 特别处理「到xxx取您的包裹」「到xxx领取」等智能柜常见格式
  // ============================================================
  // 「请到xxx取件」（最常见格式）
  /请到(.+?)[\s，,]取件/,
  /请到(.+?)[\s，,]领取/,
  /请到(.+?)[\s，,]取包/,
  /请到(.+?)[\s，,]取/,
  /请到(.+?)[\s，,]/,
  // 「前往xxx」
  /前往(.+?)[\s，,]取件/,
  /前往(.+?)[\s，,]/,
  // 「到xxx取件」「到xxx取您的包裹」「到xxx领取」
  /到(.+?)[\s，,]取您的包裹/,
  /到(.+?)[\s，,]取件/,
  /到(.+?)[\s，,]领取/,
  /到(.+?)[\s，,]取包/,
  /到(.+?)[\s，,]取/,
  // 「到xxx」后面紧跟驿站/柜名时（无标点分隔）
  /到([^\n，。,\.；;]{3,40}?(?:驿站|快递柜|智能柜|柜|代收点|菜鸟|妈妈驿|丰巢|兔喜|快宝|门店|门市))/,

  // ============================================================
  // 低优先级：由xxx保管 / 由xxx代收
  // ============================================================
  /由(.+?)保管/,
  /由(.+?)代收/,
  /由(.+?)暂存/,

  // ============================================================
  // 地理关键词兜底（当所有指令格式都失败时使用）
  // 识别形如「xx路xx号」「xx街xx号」「xx小区」「xx村组」「xx栋xx单元」
  // ============================================================
  /([^\n，。,\.；;\s]{2,40}?(?:(?:路|街|巷|弄|道|大道|大街|胡同|小区|广场|公寓|大厦|大厦|商贸城|农贸市场|花园|苑|园|村|组|乡|镇|市|区|号楼|栋|幢|单元|室|驿站|快递柜|智能柜|柜|代收点|门店|门市)\S{0,20})?[^\n，。,\.；;]{0,15}?(?:号|房|\d+号|\d+栋|\d+幢|\d+单元|\d+室))/,
  // 「xx街xx号」「xx小区xx店」模式
  /([^\n，。,\.；;\s]{2,40}?[路街道巷弄大道大街][^\n，。,\.；;]{0,20}?号)/,
  // 「xx快递柜」「xx驿站」「xx代收点」（单独出现时也算地址）
  /([^\n，。,\.；;]{2,40}?(?:快递柜|智能柜|驿站|代收点|菜鸟驿站|妈妈驿站|丰巢|兔喜|快宝|欢猫|邻里|熊猫|小兵|小象|多多|申通喵|邮政|速递易|云柜|富友|近邻宝|喵柜|门店|门市))/,

  // ============================================================
  // 最后兜底：「地址：xxx」格式
  // ============================================================
  /地址[：:\s]([^\n，。,\.；;]{3,80})/,

  // ============================================================
  // 驿站品牌后缀（驿站式地址最后的兜底）
  // ============================================================
  /驿站(.+?)[\s，,]/,
  /菜鸟驿站(.+?)[\s，,]/,
  /妈妈驿站(.+?)[\s，,]/,
  /兔喜生活(.+?)[\s，,]/,
  /丰巢柜(.+?)[\s，,]/,
  /丰巢(.+?)[\s，,]/
]

/**
 * 清洗提取出的地址字符串
 * - 移除末尾的标点、括号内容
 * - 去掉包含"取件码/请凭"等快递指令的残余
 * - 限制最大长度
 */
function _cleanAddress(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let addr = raw.trim()
  // 移除末尾的取件码/请凭等指令残留
  addr = addr.replace(/[\s,，,]*请凭.*$/, '')
  addr = addr.replace(/[\s,，,]*取件码.*$/, '')
  addr = addr.replace(/[\s,，,]*取件.*$/, '')
  addr = addr.replace(/[\s,，,]*凭码.*$/, '')
  addr = addr.replace(/[\s,，,]*货架.*$/, '')
  // 移除末尾标点
  addr = addr.replace(/[，,。.、;；:：\s]+$/, '')
  // 限制长度（太长通常是误提取的段落）
  if (addr.length > 80) addr = addr.slice(0, 80)
  return addr.trim()
}

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

  // 0.0 前置黑名单检查：运营商营销/话费/验证码类短信直接返回空
  // （与 isExpressSms 中的黑名单保持一致，双重保险）
  const PRE_BLACKLIST = [
    '订购提醒', '成功订购', '已订购', '已成功订购', '订购成功',
    '流量日包', '流量包', '话费', '话费余额', '话费充值',
    '充值成功', '已充值', '已续费', '续费成功',
    '资费', '套餐', '流量不可结转', '流量不可共享', '流量不可转赠',
    '剩余流量', '国内通用流量', '流量分钟',
    '10086', '10010', '10000', '10011',
    '中国移动', '中国联通', '中国电信', '中国广电',
    '心级服务', '让爱连接',
    '银行', '信用卡', '还款', '转账成功', '消费提醒', '账单',
    '验证码', '您的验证码', '验证码为',
    '退订', '回T退', '回复TD', '回T', '请勿回复',
    '积分兑换', '抽奖', '中奖', '获奖'
  ]
  const hasHardBlock = PRE_BLACKLIST.some(k => body.includes(k))
  if (hasHardBlock) {
    return { company: '其他快递', code: null, address: '', emoji: '' }
  }

  // 0. 预处理：统一全角符号，清理中文引号（「」『』"''`）等
  //    例：凭取件码「62752647」 → 凭取件码62752647
  const normalized = body
    .replace(/：/g, ':')
    .replace(/【/g, '【')
    .replace(/】/g, '】')
    .replace(/[「」『"'`]/g, '')  // 清理中文引号和英文引号
    .replace(/[ \t]{2,}/g, ' ')   // 多个空白合并为一个

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
  // 策略：
  //   A) 先尝试明确指令格式（到xxx取 / 已到xxx / 前往xxx 等）
  //   B) 若失败，做智能提取：从最后一个「到/前往/请到/在」开始，
  //      到「取/取件/取货/领取/！/。」为止的内容作为地址
  //   C) 再回退到地理关键词兜底（xx路xx号 / xx小区 / xx驿站 等）
  //   D) 最后在前文（beforeCode）中再找一遍
  let address = ''

  // 4-A) 先按顺序尝试明确指令格式（ADDRESS_PATTERNS 中前半部分）
  //      但去掉对 [\s，,] 分隔符的强依赖，改用更宽的「到…取」模式
  if (afterCode) {
    // 智能模式1：查找最后一个「到/前往/请到/在」+「取件/取您的包裹/领取/取/」
    // 例如：「到白鹤滩秋兰街43号你的邮政包裹到白鹤滩二号街邮政快递柜门市取您的包裹」
    const smartAddress1 = _extractSmartAddress(afterCode)
    if (smartAddress1) {
      address = smartAddress1
    }

    // 4-B) 智能模式未命中 → 按常规正则逐个尝试
    if (!address) {
      for (const reg of ADDRESS_PATTERNS) {
        const m = afterCode.match(reg)
        if (m && m[1]) {
          address = _cleanAddress(m[1])
          if (address) break
        }
      }
    }
  }

  // 4-C) 后文无结果 → 在前文或全文中再找一遍（地理关键词兜底）
  if (!address) {
    for (const reg of ADDRESS_PATTERNS) {
      const m = beforeCode.match(reg)
      if (m && m[1]) {
        address = _cleanAddress(m[1])
        if (address) break
      }
    }
  }

  // 4-D) 仍然失败 → 在整段 normalized 中找地理关键词兜底
  if (!address) {
    for (const reg of ADDRESS_PATTERNS) {
      const m = normalized.match(reg)
      if (m && m[1]) {
        address = _cleanAddress(m[1])
        if (address) break
      }
    }
  }

  return { company, code, address, emoji }
}

/**
 * 智能地址提取：从 afterCode 中用「最后一个导航词→取件动作」的方式提取地址
 * 解决中文连写无标点的场景，例如：
 *   「到白鹤滩秋兰街43号你的邮政包裹到白鹤滩二号街邮政快递柜门市取您的包裹！」
 *   应提取为「白鹤滩二号街邮政快递柜门市」
 *
 * 策略：
 *   1) 找到所有导航词（到/前往/请到/在/到达）的位置
 *   2) 对每个位置，截取从导航词后到「取件/取您的包裹/领取/！/。/」为止的内容
 *   3) 从这些候选中选含地理关键词（街/路/号/小区/门市/驿站/柜 等）且长度最合适的一个
 *
 * @param {string} text - 取件码之后的文本
 * @returns {string} - 提取到的地址（清洗后），空字符串表示未找到
 */
function _extractSmartAddress(text) {
  if (!text || text.length < 3) return ''

  // 导航起始词（用于定位地址可能的起点）
  const NAV_START = ['前往', '请到', '到达', '抵达', '到']
  // 地址结束词（用于定位地址的终点，出现这些词说明已离开地址描述）
  const ADDRESS_END = ['取件', '取您', '取货', '取包', '领取', '来取', '取', '！', '!', '。', '.', '，', ',', '；']
  // 地理关键词（含这些词才认为是真的地址，避免误提取整段噪声）
  const GEO_KW = ['街', '路', '巷', '弄', '号', '村', '镇', '区', '市', '小区', '广场', '大厦', '公寓', '花园', '号楼', '栋', '幢', '单元', '室', '驿站', '快递柜', '智能柜', '柜', '代收点', '菜鸟', '妈妈驿', '丰巢', '兔喜', '快宝', '欢猫', '邻里', '熊猫', '小兵', '小象', '多多', '申通喵', '邮政', '速递易', '云柜', '富友', '近邻宝', '喵柜', '门店', '门市', '胡同', '大街', '大道', '苑', '园', '商贸城', '农贸市场', '组', '乡']

  // 步骤 1) 找出所有导航词的起始位置（从后往前找，优先靠后的「到」）
  const candidates = []
  for (const navWord of NAV_START) {
    let searchFrom = 0
    while (true) {
      const idx = text.indexOf(navWord, searchFrom)
      if (idx < 0) break
      searchFrom = idx + navWord.length

      // 步骤 2) 以导航词结尾为起点，找最近的地址结束词
      const start = idx + navWord.length
      // 找最短结束位置
      let end = -1
      for (const endWord of ADDRESS_END) {
        const e = text.indexOf(endWord, start)
        if (e > 0 && (end < 0 || e < end)) {
          end = e
        }
      }
      if (end < 0 || end <= start) {
        // 没找到明确结束词 → 使用剩余文本（最长 60 字符）
        end = Math.min(start + 60, text.length)
      }

      let raw = text.substring(start, end).trim()
      // 去掉首尾噪声
      raw = raw.replace(/^[\s，,。.！!？?；;:：、]+/, '')
      raw = raw.replace(/[\s，,。.！!？?；;:：、]+$/, '')

      if (raw.length < 3 || raw.length > 60) continue

      // 步骤 3) 必须包含地理关键词（防止误取整段无关文字）
      const hasGeoKw = GEO_KW.some(kw => raw.includes(kw))
      if (!hasGeoKw) continue

      // 步骤 4) 避免提取出太长或包含整句指令的内容
      // 去除「您的包裹」「你的包裹」等干扰词
      raw = raw.replace(/您的[包裹快递件码]{1,6}/g, '').trim()
      raw = raw.replace(/你的[包裹快递件码]{1,6}/g, '').trim()

      candidates.push({
        raw,
        geoScore: GEO_KW.reduce((sum, kw) => sum + (raw.includes(kw) ? 1 : 0), 0), // 地理关键词越多越可信
        pos: idx,
        length: raw.length
      })
    }
  }

  if (candidates.length === 0) return ''

  // 步骤 5) 选择最佳候选：地理关键词最多 + 位置靠后（更接近取件动作）
  // 排序优先级：地理关键词得分 → 位置靠后（后出现的「到」更可能是真实取件点）→ 长度适中
  candidates.sort((a, b) => {
    if (b.geoScore !== a.geoScore) return b.geoScore - a.geoScore
    if (b.pos !== a.pos) return b.pos - a.pos // 位置靠后优先
    return a.length - b.length
  })

  // 对最终地址做二次清洗：
  //   - 取最后一个「到/在/前往」后面的部分（避免包含导航中间信息）
  let finalAddress = candidates[0].raw
  // 如果内部还包含「到」「在」等导航词，取最后一段
  const lastIdxOfNav = Math.max(
    finalAddress.lastIndexOf('到'),
    finalAddress.lastIndexOf('前往'),
    finalAddress.lastIndexOf('请到'),
    finalAddress.lastIndexOf('在')
  )
  if (lastIdxOfNav > 0 && lastIdxOfNav < finalAddress.length - 2) {
    finalAddress = finalAddress.substring(lastIdxOfNav + 1).trim()
  }

  return _cleanAddress(finalAddress)
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

  // 地址关键词（仅保留通用的地址结构词，不硬编码具体地名）
  // 说明：之前版本硬编码了"花棚子/白鹤滩/宁南/大同"等具体地名，
  //       会导致其他地区用户的地址被误过滤/漏识别，因此这里只保留：
  //       - 地址通用词（路/街/巷/号/村/镇 等）
  //       - 方向/位置词（对面/旁边/前往 等）
  //       - 正则用于识别"X路Y号"等典型地址结构
  const ADDRESS_KEYWORDS = [
    '路', '街', '巷', '弄', '栋', '幢', '楼', '单元', '室',
    '村', '镇', '乡', '县', '区', '市', '省',
    '对面', '旁边', '下行', '上行', '前行', '进来', '进去', '往前走',
    '花园', '广场', '公寓', '小区', '大厦', '商业', '步行街',
    '大道', '大街', '胡同', '里', '坊', '园', '苑', '阁',
    '快递柜', '暂存'
  ]

  let station = null
  let courier = null

  // 判断一段前缀是否为典型地址片段（统一规则，避免两处重复逻辑）
  function looksLikeAddress(prefix) {
    if (!prefix) return false
    // 规则1：包含地址关键词
    if (ADDRESS_KEYWORDS.some(ak => prefix.includes(ak))) return true
    // 规则2：形如 "X路Y号" / "XX号" / "X栋" / "X单元"
    if (/[路街巷弄道]\S{0,8}[号栋楼室]$/.test(prefix)) return true
    if (/\d{1,5}[号栋单元]$/.test(prefix)) return true
    return false
  }

  // 第一步：在 text 中搜索驿站关键词
  for (const entry of STATION_KEYWORDS) {
    for (const key of entry.keys) {
      if (!text.includes(key)) continue

      // 地址过滤（仅在 filterAddress=true 时生效，用于「取件码之前的前缀」判断）
      if (filterAddress) {
        const idx = text.indexOf(key)
        const before = text.substring(Math.max(0, idx - 15), idx)
        if (looksLikeAddress(before)) continue
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
      const before = text.substring(Math.max(0, idx - 15), idx)
      if (looksLikeAddress(before)) continue

      courier = { name: entry.name, emoji: entry.emoji }
      break
    }
    if (courier) break
  }

  // 第三步：组合返回
  if (station && courier) {
    return { name: `${station.name}（${courier.name}）`, emoji: station.emoji }
  }
  if (station) return station
  if (courier) return courier

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

  // ============================================================
  // 第一步：黑名单检测——明确排除非快递短信
  // ============================================================

  // 强黑名单：出现则直接判定为非快递短信（不管其他关键词）
  const HARD_BLOCK_KEYWORDS = [
    // 运营商营销/订购/话费/流量
    '订购提醒', '成功订购', '已订购', '已成功订购', '订购成功',
    '流量日包', '流量包', '话费', '话费余额', '话费充值',
    '充值成功', '已充值', '已续费', '续费成功',
    '资费', '套餐', '流量不可结转', '流量不可共享', '流量不可转赠',
    '剩余流量', '国内通用流量', '流量分钟',
    // 运营商专属词（带短号码或运营商名）
    '10086', '10010', '10000', '10011',
    '中国移动', '中国联通', '中国电信', '中国广电',
    '心级服务', '让爱连接',
    // 银行金融
    '银行', '信用卡', '还款', '转账成功', '消费提醒', '账单',
    // 验证码/安全类
    '验证码', '登录验证码', '支付验证码', '交易验证码', '安全验证码',
    '动态验证码', '短信验证码', '您的验证码', '验证码为',
    // 其他明确非快递
    '退订', '回T退', '回复TD', '回T', '请勿回复',
    '积分兑换', '抽奖', '中奖', '获奖',
    '账号异常', '账号冻结', '银行卡号'
  ]

  // 弱黑名单：若同时出现「弱黑名单词 + 无快递关键词」则排除
  const SOFT_BLOCK_KEYWORDS = [
    '温馨提示', '温馨提醒', '感谢您的', '尊敬的客户',
    '营业厅', '客服热线', '客户服务', '人工服务',
    '登录中国移动', '登录中国联通', '登录中国电信'
  ]

  // 1. 检查强黑名单：命中任何一个直接返回 false
  for (const k of HARD_BLOCK_KEYWORDS) {
    if (body.includes(k)) {
      return false
    }
  }

  // 2. 检查弱黑名单：命中但没有明确的快递关键词 → 排除
  const hasSoftBlock = SOFT_BLOCK_KEYWORDS.some(k => body.includes(k))
  const hasClearExpress = SMS_CONTEXT_KEYWORDS.some(k => body.includes(k))
  if (hasSoftBlock && !hasClearExpress) {
    return false
  }

  // ============================================================
  // 第二步：检查是否有明确的快递上下文关键词
  // ============================================================
  return hasClearExpress
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
          // 新快递到达 -> 发送通知（系统通知 + 应用内消息中心）
          if (triggerNotify) {
            try {
              sendNotification({
                title: '📦 新快递到达',
                content: `${item.company} | 取件码：${item.code}`,
                company: item.company,
                code: item.code,
                type: 'express',
                smsId: item.smsId || null
              })
            } catch (notifyErr) {
              console.warn('[smsParser] 通知发送异常：', notifyErr)
            }
          }
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
