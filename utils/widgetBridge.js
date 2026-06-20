/**
 * 原生桥接模块
 * 功能：系统通知推送（新快递到达 / 超时提醒）
 */

// 与原生 WidgetProvider 约定的广播 Action（必须与原生代码保持一致）
const WIDGET_UPDATE_ACTION = 'com.express.pickup.ACTION_UPDATE_WIDGET'
const WIDGET_EXTRA_KEY = 'pending_list_json'

/**
 * 将待取件列表同步到桌面小组件
 * @param {Array} pendingList 待取件快递列表
 */
export function updateWidget(pendingList) {
  // #ifndef APP-PLUS
  return
  // #endif

  // #ifdef APP-PLUS
  try {
    const slice = (pendingList || []).slice(0, 8).map(it => ({
      id: it.id,
      company: it.company,
      code: it.code,
      address: it.address || ''
    }))

    const jsonStr = JSON.stringify(slice)

    const main = plus.android.runtimeMainActivity()
    const Context = plus.android.importClass('android.content.Context')
    const prefs = main.getSharedPreferences('express_widget_prefs', Context.MODE_PRIVATE)
    plus.android.importClass(prefs)
    const editor = prefs.edit()
    plus.android.importClass(editor)
    editor.putString(WIDGET_EXTRA_KEY, jsonStr)
    editor.apply()

    const Intent = plus.android.importClass('android.content.Intent')
    const intent = new Intent(WIDGET_UPDATE_ACTION)
    intent.setPackage(main.getPackageName())
    main.sendBroadcast(intent)
  } catch (e) {
    // 静默失败，避免影响主流程
  }
  // #endif
}

/**
 * 新快递到达 -> 推送系统通知
 */
export function notifyNewExpress(item) {
  if (!item) return

  const prefs = getNotificationPrefs()
  if (!prefs.enabled) return

  // 应用内：加入消息记录
  if (prefs.showAppNotify) {
    addNotification({
      title: '📦 新快递到达',
      content: `${item.company} | 取件码：${item.code}`,
      company: item.company,
      code: item.code,
      type: 'express'
    })
  }

  // #ifndef APP-PLUS
  uni.showToast({
    title: `📦 ${item.company} ${item.code}`,
    icon: 'none',
    duration: 2500
  })
  return
  // #endif

  // #ifdef APP-PLUS
  if (!prefs.showSystemNotify) return
  _sendAndroidNotification({
    title: '📦 新快递到达',
    text: `${item.company} | 取件码：${item.code}`,
    channelId: 'express_channel',
    channelName: '取件码提醒',
    importance: 4, // HIGH
    notifId: Math.abs(_hashString(item.id || item.code)) % 10000,
    sound: prefs.sound,
    vibrate: prefs.vibrate
  })
  // #endif
}

/**
 * 快递超时未取 -> 推送系统通知
 * @param {number} count 超时数量
 * @param {Array} items 前3条超时快递
 */
export function notifyTimeout(count, items) {
  if (!count || count <= 0) return

  const prefs = getNotificationPrefs()
  if (!prefs.enabled) return

  const itemsText = (items || []).slice(0, 3)
    .map(it => `${it.company} ${it.code}`)
    .join('，')

  // #ifndef APP-PLUS
  uni.showToast({
    title: `⚠️ 您有 ${count} 个快递已超时 24 小时，请及时取件`,
    icon: 'none',
    duration: 3000
  })
  return
  // #endif

  // #ifdef APP-PLUS
  _sendAndroidNotification({
    title: `⚠️ 有 ${count} 个快递已超时 24 小时`,
    text: itemsText ? `${itemsText} 等，请及时取件` : '请及时取件，避免驿站收费或退回',
    channelId: 'express_timeout_channel',
    channelName: '超时提醒',
    importance: 5, // MAX
    notifId: 99999 + count, // 固定ID 避免多条重复
    sound: prefs.sound,
    vibrate: prefs.vibrate
  })
  // #endif
}

/**
 * 内部：Android 系统通知统一发送实现
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.text
 * @param {string} [opts.channelId='express_channel']
 * @param {string} [opts.channelName='取件码助手消息']
 * @param {number} [opts.importance=4]
 * @param {number} [opts.notifId]
 * @param {boolean} [opts.sound=true] 是否播放声音
 * @param {boolean} [opts.vibrate=true] 是否震动
 */
function _sendAndroidNotification(opts) {
  const {
    title,
    text,
    channelId = 'express_channel',
    channelName = '取件码助手消息',
    importance = 4,
    notifId,
    sound = true,
    vibrate = true
  } = opts || {}

  try {
    const main = plus.android.runtimeMainActivity()
    const Context = plus.android.importClass('android.content.Context')
    const Intent = plus.android.importClass('android.content.Intent')
    const PendingIntent = plus.android.importClass('android.app.PendingIntent')
    const NotificationManager = plus.android.importClass('android.app.NotificationManager')
    const Notification = plus.android.importClass('android.app.Notification')
    const BuildVersion = plus.android.importClass('android.os.Build$VERSION')

    // 点击通知 -> 打开应用首页
    const launchIntent = main.getPackageManager().getLaunchIntentForPackage(main.getPackageName())
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
    const pi = PendingIntent.getActivity(
      main,
      0,
      launchIntent,
      BuildVersion.SDK_INT >= 23
        ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        : PendingIntent.FLAG_UPDATE_CURRENT
    )

    // Android 8.0+ 必须创建通知渠道（渠道上设置是否有声/震动）
    let nm = null
    if (BuildVersion.SDK_INT >= 26) {
      nm = main.getSystemService(Context.NOTIFICATION_SERVICE)
      const existingChannel = nm.getNotificationChannel(channelId)
      if (!existingChannel) {
        const NotificationChannel = plus.android.importClass('android.app.NotificationChannel')
        const channel = new NotificationChannel(channelId, channelName, importance || 4)
        channel.setDescription('快递取件码相关通知')
        channel.enableLights(true)
        if (sound) {
          channel.enableVibration(true)
          channel.setVibrationPattern([0, 200, 100, 200])
        } else {
          channel.enableVibration(false)
          channel.setVibrationPattern([0])
        }
        // 注意：通知渠道声音一旦创建就不可动态修改，只能通过新建渠道或用户手动切换
        if (!sound) {
          // 不设置默认声音，使用静音
          try {
            channel.setSound(null, null)
          } catch (err) {
            // ignore
          }
        }
        nm.createNotificationChannel(channel)
      } else {
        // 已存在渠道时也更新声音/震动状态（部分ROM支持重新设置）
        try {
          existingChannel.enableVibration(!!vibrate)
          if (!sound) {
            existingChannel.setSound(null, null)
          }
        } catch (err) {
          // ignore
        }
      }
    }

    const Builder = plus.android.importClass('android.app.Notification$Builder')
    const builder = BuildVersion.SDK_INT >= 26
      ? new Builder(main, channelId)
      : new Builder(main)

    builder.setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(plus.android.importClass('android.R$drawable').stat_notify_info || 17301624)
      .setAutoCancel(true)
      .setContentIntent(pi)

    // 低版本直接使用 defaults 控制声音与震动
    if (BuildVersion.SDK_INT < 26) {
      let defaults = 0
      if (sound) defaults |= Notification.DEFAULT_SOUND
      if (vibrate) defaults |= Notification.DEFAULT_VIBRATE
      defaults |= Notification.DEFAULT_LIGHTS
      if (defaults !== 0) {
        builder.setDefaults(defaults)
      }
    }

    const notification = builder.build()
    if (!nm) nm = main.getSystemService(Context.NOTIFICATION_SERVICE)
    nm.notify(notifId || Date.now() % 10000, notification)

    console.log('[widgetBridge] 已推送通知：', title, '|', text, '| sound=', sound, '| vibrate=', vibrate)
  } catch (e) {
    console.warn('[widgetBridge] 推送通知失败：', e)
    uni.showToast({ title: text, icon: 'none', duration: 2500 })
  }
}

/**
 * 简单字符串哈希（用于生成稳定的通知 ID）
 */
function _hashString(s) {
  if (!s) return 1
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i)
    hash |= 0
  }
  return hash
}

// ============================================================
// 消息中心（应用内通知记录）
// ============================================================

const MESSAGE_KEY = 'express_notifications'
const PREF_KEY = 'notification_prefs'

/**
 * 通知配置（持久化）
 * @returns {{ enabled: boolean, sound: boolean, vibrate: boolean, showAppNotify: boolean, showSystemNotify: boolean }}
 */
export function getNotificationPrefs() {
  try {
    const raw = uni.getStorageSync(PREF_KEY)
    if (raw && typeof raw === 'object') {
      return Object.assign({
        enabled: true,
        sound: true,
        vibrate: true,
        showAppNotify: true,
        showSystemNotify: true
      }, raw)
    }
  } catch (e) {
    // ignore
  }
  return { enabled: true, sound: true, vibrate: true, showAppNotify: true, showSystemNotify: true }
}

export function setNotificationPrefs(prefs) {
  try {
    uni.setStorageSync(PREF_KEY, Object.assign(getNotificationPrefs(), prefs || {}))
  } catch (e) {
    // ignore
  }
}

/**
 * 向本地读取通知消息
 */
export function getNotificationList() {
  try {
    const raw = uni.getStorageSync(MESSAGE_KEY)
    if (raw && Array.isArray(raw)) return raw
  } catch (e) {
    // ignore
  }
  return []
}

/**
 * 新增一条通知消息
 * @param {{ title: string, content: string, company: string, code: string, type: string }} message
 */
export function addNotification(message) {
  try {
    const list = getNotificationList()
    const newItem = Object.assign({
      id: 'N' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      time: Date.now(),
      title: '',
      content: '',
      company: '',
      code: '',
      type: 'express',
      read: false
    }, message)

    // 去重（如果时间和标题完全一致）
    const exists = list.some(n => n.company === newItem.company && n.code === newItem.code && Date.now() - n.time < 60 * 60 * 1000)
    if (exists) return
    list.unshift(newItem)
    // 只保留最近 100 条
    while (list.length > 100) list.pop()
    uni.setStorageSync(MESSAGE_KEY, list)
  } catch (e) {
    // ignore
  }
}

export function clearNotifications() {
  try {
    uni.setStorageSync(MESSAGE_KEY, [])
  } catch (e) {
    // ignore
  }
}

export function markAllRead() {
  try {
    const list = getNotificationList().map(n => Object.assign({}, n, { read: true }))
    uni.setStorageSync(MESSAGE_KEY, list)
  } catch (e) {
    // ignore
  }
}

export function getUnreadCount() {
  return getNotificationList().filter(n => !n.read).length
}

/**
 * 通用系统通知发送工具
 * @param {{ title: string, content: string, code?: string, company?: string, channelId?: string, channelName?: string }} params
 */
export function sendNotification(params) {
  if (!params || !params.title) return
  const prefs = getNotificationPrefs()
  if (!prefs.enabled) return

  // 1) 应用内：加入消息记录
  if (prefs.showAppNotify) {
    addNotification(params)
  }

  // 2) 系统通知：如果是 Android 环境，推送系统通知（带声音/震动控制）
  // #ifdef APP-PLUS
  if (!prefs.showSystemNotify) {
    console.log('[widgetBridge] 用户关闭了系统通知，跳过推送')
    return
  }
  _sendAndroidNotification({
    title: params.title,
    text: params.content,
    channelId: params.channelId || 'express_channel',
    channelName: params.channelName || '取件码助手消息',
    importance: 4,
    notifId: params.notifId || Math.floor(Math.random() * 10000),
    sound: prefs.sound,
    vibrate: prefs.vibrate
  })
  // #endif

  console.log('[widgetBridge] 已发送通知：', params.title)
}
