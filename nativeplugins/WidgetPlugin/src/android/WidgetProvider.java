package com.express.pickup.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * 桌面小组件 Provider
 * 支持 4x3 尺寸，以 ListView 方式渲染快递列表。
 *
 * 数据流程：
 *   1. uni-app 前端通过 plus.android 将 JSON 数据写入 SharedPreferences
 *      ("express_widget_prefs" / key "pending_list_json")
 *   2. uni-app 发送广播 ACTION_UPDATE_WIDGET
 *   3. WidgetProvider 接收广播，触发 onUpdate / 手动调用 notifyAppWidgetViewDataChanged
 *   4. WidgetService 基于最新 JSON 数据渲染每一项
 *
 * 点击某一项 -> 打开应用首页，并携带 EXTRA_ID 以便跳转到详情页。
 */
public class WidgetProvider extends AppWidgetProvider {

    public static final String ACTION_UPDATE_WIDGET = "com.express.pickup.ACTION_UPDATE_WIDGET";
    public static final String PREFS_NAME = "express_widget_prefs";
    public static final String EXTRA_ID = "extra_express_id";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (ACTION_UPDATE_WIDGET.equals(action) ||
                Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            // 收到更新广播 -> 主动刷新所有 widget
            AppWidgetManager awm = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, WidgetProvider.class);
            int[] ids = awm.getAppWidgetIds(cn);
            for (int id : ids) {
                updateAppWidget(context, awm, id);
            }
            // 通知 ListView 数据源变更
            awm.notifyAppWidgetViewDataChanged(ids, R.id.widget_list);
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        // 标题点击 -> 打开应用首页
        Intent launchIntent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = getImmutablePendingIntent(context, 0, launchIntent);
            views.setOnClickPendingIntent(R.id.widget_header, pi);
        }

        // 关联 RemoteViewsService 提供 ListView 数据
        Intent serviceIntent = new Intent(context, WidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        views.setRemoteAdapter(R.id.widget_list, serviceIntent);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);

        // 列表项点击 -> 使用 PendingIntent.FLAG_UPDATE_CURRENT 配合 fillInIntent
        Intent clickIntent = new Intent(context, WidgetProvider.class);
        clickIntent.setAction(Intent.ACTION_VIEW);
        PendingIntent clickPending = PendingIntent.getBroadcast(
                context,
                1001,
                clickIntent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        : PendingIntent.FLAG_UPDATE_CURRENT
        );
        views.setPendingIntentTemplate(R.id.widget_list, clickPending);

        // 更新空态文案的点击（打开应用）
        if (launchIntent != null) {
            PendingIntent emptyPi = getImmutablePendingIntent(context, 2002, launchIntent);
            views.setOnClickPendingIntent(R.id.widget_empty, emptyPi);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private PendingIntent getImmutablePendingIntent(Context context, int reqCode, Intent intent) {
        return PendingIntent.getActivity(
                context,
                reqCode,
                intent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        : PendingIntent.FLAG_UPDATE_CURRENT
        );
    }
}
