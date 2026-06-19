package com.express.pickup.widget;

import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * RemoteViewsService：为桌面小组件 ListView 提供每项数据。
 * 数据来源：SharedPreferences (express_widget_prefs / pending_list_json)
 *          由 uni-app 前端通过 plus.android 写入。
 */
public class WidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetRemoteViewsFactory(this.getApplicationContext(), intent);
    }

    private static class WidgetRemoteViewsFactory implements RemoteViewsFactory {

        private final Context context;
        private final int appWidgetId;
        private final List<ExpressItem> items = new ArrayList<>();

        WidgetRemoteViewsFactory(Context context, Intent intent) {
            this.context = context;
            this.appWidgetId = intent.getIntExtra(
                    android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,
                    android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }

        @Override
        public void onCreate() { /* no-op */ }

        @Override
        public void onDataSetChanged() {
            // 从 SharedPreferences 读取最新 JSON 列表
            items.clear();
            try {
                String json = context.getSharedPreferences(WidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                        .getString("pending_list_json", "[]");
                if (json == null || json.isEmpty()) json = "[]";
                JSONArray arr = new JSONArray(json);
                // 限制最多展示 8 条
                int limit = Math.min(arr.length(), 8);
                for (int i = 0; i < limit; i++) {
                    JSONObject obj = arr.optJSONObject(i);
                    if (obj == null) continue;
                    ExpressItem item = new ExpressItem();
                    item.id = obj.optString("id", String.valueOf(i));
                    item.company = obj.optString("company", "快递");
                    item.code = obj.optString("code", "");
                    item.address = obj.optString("address", "");
                    items.add(item);
                }
            } catch (Exception e) {
                // 解析失败时保持空列表
                e.printStackTrace();
            }
        }

        @Override
        public void onDestroy() { items.clear(); }

        @Override
        public int getCount() { return items.size(); }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= items.size()) return null;
            ExpressItem item = items.get(position);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_item);
            // 快递类型 + 简易 emoji
            views.setTextViewText(R.id.item_company, item.company);
            // 取件码 - 加粗高亮
            views.setTextViewText(R.id.item_code, item.code);
            // 地址若存在则展示，否则隐藏
            if (item.address != null && !item.address.isEmpty()) {
                views.setTextViewText(R.id.item_address, item.address);
                views.setViewVisibility(R.id.item_address, android.view.View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.item_address, android.view.View.GONE);
            }

            // 点击意图：通过 fillInIntent 补全数据
            Intent fillIn = new Intent();
            fillIn.putExtra(WidgetProvider.EXTRA_ID, item.id);
            // 启动应用首页
            Intent launch = context.getPackageManager()
                    .getLaunchIntentForPackage(context.getPackageName());
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                launch.putExtra(WidgetProvider.EXTRA_ID, item.id);
                fillIn.fillIn(launch, Intent.FILL_IN_ACTION);
            }
            views.setOnClickFillInIntent(R.id.item_root, fillIn);

            return views;
        }

        @Override
        public RemoteViews getLoadingView() { return null; }

        @Override
        public int getViewTypeCount() { return 1; }

        @Override
        public long getItemId(int position) { return position; }

        @Override
        public boolean hasStableIds() { return true; }
    }

    private static class ExpressItem {
        String id;
        String company;
        String code;
        String address;
    }
}
