package com.express.pickup.widget;

import android.app.Service;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.IBinder;

/**
 * 后台刷新服务（可选）
 * uni-app 端已经能够通过发送广播触发刷新，这里提供一个独立的 Service 入口，
 * 便于在某些机型/场景下，通过第三方定时任务或推送回调来触发刷新。
 *
 * 用法：startService(new Intent(context, WidgetUpdateService.class))
 */
public class WidgetUpdateService extends Service {

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Context context = getApplicationContext();
        AppWidgetManager awm = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, WidgetProvider.class);
        int[] ids = awm.getAppWidgetIds(cn);

        // 发送一次内部广播，复用 WidgetProvider 的刷新逻辑
        Intent broadcast = new Intent(WidgetProvider.ACTION_UPDATE_WIDGET);
        broadcast.setPackage(context.getPackageName());
        context.sendBroadcast(broadcast);

        // 通知 ListView 数据源变化
        awm.notifyAppWidgetViewDataChanged(ids, R.id.widget_list);

        stopSelf(startId);
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
