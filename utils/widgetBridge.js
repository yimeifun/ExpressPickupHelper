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

  // #ifndef APP-PLUS
  uni.showToast({
    title: `📦 ${item.company} ${item.code}`,
    icon: 'none',
    duration: 2500
  })
  return
  // #endif

  // #ifdef APP-PLUS
  _sendAndroidNotification({
    title: '📦 新快递到达',
    text: `${item.company} | 取件码：${item.code}`,
    channelId: 'express_channel',
    channelName: '取件码提醒',
    importance: 4, // HIGH
    notifId: Math.abs(_hashString(item.id || item.code)) % 10000
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
    notifId: 99999 + count // 固定ID 避免多条重复
  })
  // #endif
}

/**
 * 内部：Android 系统通知统一发送实现
 */
function _sendAndroidNotification({
  title,
  text,
  channelId,
  channelName,
  importance,
  notifId
}) {
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

    // Android 8.0+ 必须创建通知渠道
    if (BuildVersion.SDK_INT >= 26) {
      const nm = main.getSystemService(Context.NOTIFICATION_SERVICE)
      const existingChannel = nm.getNotificationChannel(channelId)
      if (!existingChannel) {
        const NotificationChannel = plus.android.importClass('android.app.NotificationChannel')
        const channel = new NotificationChannel(channelId, channelName, importance || 4)
        channel.setDescription('快递取件码相关通知')
        nm.createNotificationChannel(channel)
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
      .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE)

    const notification = builder.build()
    const nm = main.getSystemService(Context.NOTIFICATION_SERVICE)
    nm.notify(notifId || Date.now() % 10000, notification)

    console.log('[widgetBridge] 已推送通知：', title, '|', text)
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
