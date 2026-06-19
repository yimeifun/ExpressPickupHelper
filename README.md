# 📦 取件码助手（Express Pickup Helper）

一个基于 **uni-app + Vue 3** 的 Android 端应用，能够自动识别短信中的快递取件码，智能归类，支持手动确认、超时提醒和图片/OCR 识别。

> 所有数据均存储在本地，不会上传任何服务器，保障隐私安全。

---

## ✨ 功能特性

- **🔍 短信自动识别**：自动扫描手机短信，识别快递取件码、驿站信息
- **📋 批量确认取件**：支持勾选多个快递一键标记为已取
- **⏰ 超时智能提醒**：超过 24 小时未取件的快递会显示超时横幅
- **📷 图片/OCR 识别**：识别截图或图片中的取件码
- **✅ 权限自检**：一键检测短信读取、通知、存储等核心权限状态
- **🔒 本地存储**：所有数据仅在本机存储，隐私无泄露
- **📤 分享**：一键分享应用下载信息给朋友

---

## 🛠 技术栈

| 领域 | 技术 |
|------|------|
| 应用框架 | [uni-app](https://uniapp.dcloud.net.cn/)（跨端开发框架） |
| 前端框架 | **Vue 3** (Composition API) |
| 状态管理 | **Pinia** |
| 样式预处理器 | **Sass / SCSS** |
| 构建工具 | **Vite** |
| 原生桥接 | `plus.android.*`（Android 原生 API 调用） |
| 目标平台 | **Android** (App-Plus) |

---

## 🚀 快速开始

### 环境要求

- Node.js **>= 16**
- HBuilderX（推荐，用于 Android 打包）或 VS Code
- Android 手机或模拟器（系统 **>= 4.4**，建议 **Android 8.0+** 以获得全部功能）

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm / yarn
pnpm install
```

### 开发与运行

```bash
# H5 模式开发（用于界面调试，部分原生功能不可用）
npm run dev:h5

# APP 模式开发（推荐，需要 HBuilderX 连接手机）
npm run dev:app

# 打包发布
npm run build:app
```

> **使用 HBuilderX 打包推荐流程**：
> 1. HBuilderX 打开项目 → 菜单「发行 → 原生App-云打包」
> 2. 选择 Android → 打包成 apk
> 3. 安装到手机即可使用

### 目录权限

首次启动应用时，请授予以下权限以获得完整体验：

- **读取短信**（`READ_SMS`）→ 识别快递信息
- **接收短信**（`RECEIVE_SMS`）→ 实时接收新快递短信
- **显示通知**（`POST_NOTIFICATIONS`，Android 13+）→ 超时提醒推送

---

## 📂 项目目录结构

```
取件码/
├── components/              # 可复用组件
│   ├── ExpressCard.vue       # 快递卡片（首页列表项）
│   └── SearchBar.vue         # 搜索栏
├── nativeplugins/           # 原生插件目录（可选小组件）
│   └── WidgetPlugin/        # Android 桌面小组件原生实现
│       ├── package.json     # 插件声明文件
│       └── src/android/
│           ├── AndroidManifest.xml
│           ├── WidgetProvider.java    # AppWidgetProvider 实现
│           ├── WidgetService.java     # Widget 数据服务
│           ├── WidgetUpdateService.java # Widget 更新服务
│           └── res/                    # Android 资源
│               ├── drawable/widget_bg.xml
│               ├── layout/widget_item.xml
│               ├── layout/widget_layout.xml
│               ├── values/colors.xml
│               ├── values/strings.xml
│               └── xml/widget_info.xml
├── pages/                  # 页面目录
│   ├── index/index.vue     # ⭐ 主页（快递列表 + 搜索 + 批量操作）
│   ├── detail/detail.vue   # 快递详情页（单条记录查看、编辑）
│   ├── ocr/ocr.vue         # OCR 识别页（截图/图片识别取件码）
│   ├── healthcheck/healthcheck.vue  # 权限自检（短信/通知/存储三项检测）
│   ├── settings/settings.vue        # 设置中心（协议、分享、关于等）
│   ├── basic/basic.vue              # 基础设置/数据管理（清理、导出等）
│   └── privacy/privacy.vue          # 隐私协议与政策展示（通过 type 参数区分）
├── stores/                 # Pinia 状态管理
│   └── express.js          # ⭐ 快递数据 Store（核心数据层）
├── utils/                  # 工具函数
│   ├── smsParser.js        # ⭐ 短信解析 & 权限检查核心模块
│   └── widgetBridge.js     # 系统通知/桌面小组件桥接（Android 原生调用）
├── static/                 # 静态资源
│   ├── logo.png
│   └── logo.svg
├── App.vue                 # 应用入口组件
├── main.js                 # 应用入口脚本（初始化 Vue、Pinia）
├── pages.json              # ⭐ 页面路由配置（uni-app 页面注册）
├── manifest.json           # ⭐ 应用配置（权限、打包信息、图标）
├── uni.scss                # 全局 SCSS 变量
├── index.html              # HTML 入口模板
├── package.json            # 项目依赖 & 脚本
└── .gitignore              # Git 忽略规则
```

---

## 📖 核心模块详解

### 1. `pages/index/index.vue` - 主页

**职责**：展示所有快递列表、搜索、批量选择、添加入口、权限提醒、每日一言展示。

**关键功能**：
- `onLoad` 时调用 `checkAndLoadSms()` 扫描短信
- `onPullDownRefresh` 下拉刷新重新扫描
- `filteredList` 按搜索关键词过滤
- `confirmBatchPick` 批量确认取件
- 超时快递红色横幅提示
- 点击「+ 添加」打开添加弹层，支持粘贴文本智能解析

**数据流**：

```
短信扫描 → parsePickupCode() → store.addItem()
    ↓
列表渲染（filteredList）→ 卡片组件 ExpressCard
    ↓
用户操作（标记取件/批量选）→ store 状态更新
    ↓
持久化（uni.setStorageSync）+ updateWidget() 同步数据
```

---

### 2. `stores/express.js` - 数据层（核心）

**数据结构（每条 Express Item）**：

```js
{
  id: String,           // 唯一标识（基于时间戳）
  company: String,      // 驿站名称 / 快递类型
  code: String,         // 取件码
  address: String,      // 地址（可为空）
  smsTime: Number,      // 短信/添加时间（时间戳，ms）
  pickTime: Number,     // 取件时间（时间戳，status='picked' 时才有）
  status: 'pending' | 'picked',
  rawSms: String,       // 原始短信文本（便于二次解析）
  remark: String        // 用户备注
}
```

**核心属性**：
- `list` → 全部历史记录
- `pendingList` → 待取件列表
- `pickedList` → 已取件列表
- `timeoutList` → 超时（>24 小时）待取件
- `chosenIds` → 批量模式下选中的 ID
- `isAllChosen` → 是否全选当前可见待取件

**关键方法**：

| 方法 | 功能 | 持久化 |
|------|------|--------|
| `addItem(item, fromSms)` | 添加一条快递 | ✅ |
| `pickItem(id)` | 标记为已取件 | ✅ |
| `pickBatch(ids)` | 批量标记已取件 | ✅ |
| `toggleChoose(id)` | 切换某个项的批量选择状态 | - |
| `clearChoices()` | 清空批量选择 | - |
| `chooseAllPending()` | 全选当前待取件 | - |
| `checkTimeout(silent)` | 检查超时，推送通知 | - |
| `removeItem(id)` | 删除单条记录 | ✅ |
| `clearPicked()` | 清空已取件记录 | ✅ |
| `loadFromStorage()` | 从本地恢复数据 | ✅ |
| `saveToStorage()` | 保存到本地 | ✅ |

**如何扩展**：想新增字段（例如：货架号）只需：
1. 在 `addItem` / `parsePickupCode` 里补充解析
2. 在 `ExpressCard` 展示该字段
3. 在 `detail.vue` 详情页展示并允许编辑

---

### 3. `utils/smsParser.js` - 短信解析 & 权限检查

**这是应用的核心模块**，承担两大功能：**解析短信文本** 和 **检查系统权限**。

#### (1) 短信解析 API

```js
import { parsePickupCode, getCompanyEmoji, checkAndLoadSms } from '@/utils/smsParser'
```

**`parsePickupCode(body)`** → `{ company, code, address, raw }`

- 入参：短信原文（或用户粘贴的任意文本）
- 出参：解析后的结构化数据
- 解析策略：
  1. **关键词匹配**：检测菜鸟驿站/丰巢/京东/妈妈驿站等 20+ 个驿站关键词
  2. **取件码规则识别**：按优先级匹配：
     - `数字-数字-数字`（如：`1-2-3456`）
     - `字母+数字-数字`（如：`A1B2-3456`）
     - `两位数字-四位数字`（如：`06-0706`）
     - `长数字串 6-8 位`（纯数字码）
     - `纯数字 4-6 位`（fallback）
  3. **地址提取**：通过正则提取「地址：」「位于：」等位置信息

**`getCompanyEmoji(company)`** → `String`
- 根据驿站类型返回对应的 emoji 图标
- 扩展方式：在 `companyKeywords` 对象中添加新的关键词 → emoji 映射

**`checkAndLoadSms(showToast)`** → `Promise<{ total, new: n, noPerm: boolean }>`
- 在 Android 平台上读取短信收件箱，调用 `parsePickupCode` 逐条解析
- 通过 `store.addItem` 自动去重（基于 `company + code` 判断）
- 返回新增条数，供首页展示提示

#### (2) 权限检查 API

```js
// 单项检查 → { ok, text, detail }
checkSmsReadPermission()       // 检查短信读取权限
checkNotificationPermission()   // 检查通知权限（Android 13+ POST_NOTIFICATIONS）
checkStorageHealth()            // 检查本地存储是否正常

// 整体自检
runAppHealthCheck() → { smsRead, notification, storage, allOk }

// 请求权限（带 Toast 提示 + 失败时跳转系统设置）
requestSmsPermission()          // 申请读取短信权限
requestNotificationPermission()  // 申请显示通知权限
```

**权限检查原理**：使用 `plus.android.importClass` 导入 `android.content.pm.PackageManager`，通过 `checkSelfPermission()` 与系统权限常量比较。

**📌 二次开发要点**：
- 添加新权限时：新增 `checkXxxPermission()` + 在 `runAppHealthCheck()` 注册
- 注意 uni-app 的条件编译：`#ifdef APP-PLUS` 才执行 Android 原生调用，H5 环境会直接返回 `ok:true`

---

### 4. `utils/widgetBridge.js` - 系统通知 & 数据同步

**主要暴露方法**：

| 方法 | 功能 |
|------|------|
| `updateWidget(pendingList)` | 把待取件列表同步写入 Android `SharedPreferences`，并发送广播 `com.express.pickup.ACTION_UPDATE_WIDGET`（供桌面小组件/原生插件监听） |
| `notifyNewExpress(item)` | 新快递到达时推送系统通知 |
| `notifyTimeout(count, items)` | 超过 N 条快递超时未取件时推送提醒 |

**原生调用流程**（了解即可）：

```
JS 层 widgetBridge
    ↓ plus.android.importClass()
    ↓ NotificationManager.notify()
Android 系统层
    ↓ 用户点击通知
应用首页 onShow → 重新渲染
```

---

### 5. `components/ExpressCard.vue` - 快递卡片

**Props**：
- `item`: Object（快递数据对象）
- `isBatch`: Boolean（是否批量选择模式）
- `isSelected`: Boolean（当前是否被选中）

**功能**：
- 单行展示快递类型 + 取件码
- 已取件状态：卡片背景变浅、取件码划线删除
- 超时徽标：红色文字标签 + 顶部整体红色横幅
- 点击卡片 → 跳转详情页（批量模式下则切换选择）
- 提供"复制取件码"快捷按钮
- 提供"已取"快捷按钮

---

### 6. `components/SearchBar.vue` - 搜索栏

- 实时响应搜索文本
- 通过 `filteredList` 过滤 `company / code / address`
- 支持一键清空搜索框

---

## 📄 页面路由详解（pages.json）

`pages.json` 是 **uni-app 的核心配置文件**，注册所有页面路由。

**当前注册页面**：

| 路径 | 导航标题 | 功能 |
|------|---------|------|
| `pages/index/index` | 取件码 | 主页（默认首页，`pages[0]`）|
| `pages/detail/detail` | 快递详情 | 单条记录查看/编辑/删除 |
| `pages/settings/settings` | 设置 | 设置中心 |
| `pages/ocr/ocr` | 识别取件码 | 图片/OCR 识别 |
| `pages/healthcheck/healthcheck` | 权限自检 | 权限/运行状态检测 |
| `pages/privacy/privacy` | 隐私与协议 | 隐私承诺 / 用户协议（通过 URL 传参 `type` 切换）|
| `pages/basic/basic` | 基础设置 | 数据管理/清理 |

**如何新增一个页面**：
1. 在 `pages/xxx/xxx.vue` 创建组件
2. 在 `pages.json` 的 `pages` 数组中添加一条 `{ path, style }` 配置
3. 通过 `uni.navigateTo({ url: '/pages/xxx/xxx' })` 跳转

---

## 📱 Android 权限清单（manifest.json）

| 权限 | 用途 | 系统要求 |
|------|------|---------|
| `READ_SMS` | 读取短信收件箱，识别快递取件码 | Android 所有版本 |
| `RECEIVE_SMS` | 接收新短信的广播 | Android 所有版本 |
| `POST_NOTIFICATIONS` | 推送应用通知 | **Android 13+** |
| `VIBRATE` | 通知震动提示 | 所有版本 |
| `ACCESS_WIFI_STATE` | 网络状态（预留） | 所有版本 |
| `ACCESS_NETWORK_STATE` | 网络状态（预留） | 所有版本 |
| `WAKE_LOCK` | 防止系统休眠（推送） | 所有版本 |

**修改位置**：`manifest.json` → `app-plus.distribute.android.permissions`

---

## 🔌 原生插件（桌面小组件，可选）

目录 `nativeplugins/WidgetPlugin/` 中提供了 **Android 原生桌面小组件实现**（AppWidgetProvider）。

**文件说明**：

| 文件 | 功能 |
|------|------|
| `WidgetProvider.java` | AppWidgetProvider 实现，接收 `UPDATE_WIDGET` 广播后刷新 UI |
| `WidgetService.java` | 从 `SharedPreferences` 读取 JS 层写入的待取件 JSON 数据 |
| `WidgetUpdateService.java` | 更新 Widget 的辅助服务 |
| `res/xml/widget_info.xml` | Widget 的元信息（尺寸、预览图、更新间隔） |
| `res/layout/widget_layout.xml` | Widget 主布局 |
| `res/layout/widget_item.xml` | Widget 单条快递项布局 |
| `res/drawable/widget_bg.xml` | Widget 背景（圆角蓝色渐变） |
| `AndroidManifest.xml` | 声明 `AppWidgetProvider` 和 `IntentFilter` |

**数据通路（JS → 原生）**：

```
JS 层 stores/express.js 中执行 addItem/pickItem 等操作
    ↓
updateWidget(pendingList)
    ↓
SharedPreferences 写入 JSON：key = pending_list_json
    ↓
发送广播：com.express.pickup.ACTION_UPDATE_WIDGET
    ↓
WidgetProvider.onReceive() 触发 → onUpdate()
    ↓
桌面小组件重新渲染
```

**在 HBuilderX 中启用插件**：
1. 打开 `manifest.json` → `App原生插件配置`
2. 勾选本地插件 `WidgetPlugin`
3. 重新打包自定义基座即可生效

> 💡 如果你不需要桌面小组件，可以忽略 `nativeplugins/` 目录，它不会参与默认打包，不会影响应用体积。

---

## 🎨 UI 与主题

### 颜色体系（`#1A2A4A` 深蓝 → `#4A8DCC` 淡蓝）

| 用途 | 色值 |
|------|------|
| 主题色/按钮 | `#4A8DCC`（淡蓝）|
| 文字主色 | `#1A2A4A`（深蓝）|
| 文字次色 | `#8A8A8A` / `#6A7688` |
| 页面背景 | `#F5F6F8` |
| 卡片背景 | `#FFFFFF` |
| 错误/警告 | `#E74C3C`（红色） |
| 成功/正常 | `#2E7D32`（绿色） |
| 已取件背景 | `#E8EAED` / `#F7F8FA` |

### 全局样式

- `uni.scss` 定义 uni-app 全局样式变量（可自定义）
- 各页面使用 **scoped scss**，不会互相污染
- 卡片统一圆角 `20rpx`、阴影 `0 3rpx 14rpx rgba(26,42,74,0.06)`

---

## 🔧 二次开发指南

### 场景 A：新增一个新的驿站类型识别

修改 [utils/smsParser.js](file:///c:/Users/yimei/Desktop/取件码/utils/smsParser.js)

1. 在 `companyKeywords` 对象中添加新关键词：
   ```js
   { keyword: '你的新驿站', emoji: '📬' }
   ```
2. 保存后，主页识别会自动生效

### 场景 B：新增一个自定义页面

1. 在 `pages/` 下创建 `yourpage/yourpage.vue`
2. 在 [pages.json](file:///c:/Users/yimei/Desktop/取件码/pages.json) 注册
3. 在 [settings.vue](file:///c:/Users/yimei/Desktop/取件码/pages/settings/settings.vue) 或首页添加跳转入口

### 场景 C：修改应用主题色

- 修改所有页面的 SCSS 中 `#4A8DCC` / `#1A2A4A` 为你的色值
- 推荐：在 `uni.scss` 中定义 `$primary-color` 统一引用

### 场景 D：扩展桌面小组件样式

编辑 `nativeplugins/WidgetPlugin/src/android/res/` 下的 XML 布局文件，然后重新打包自定义基座。

### 场景 E：接入云同步

在 `stores/express.js` 的 `saveToStorage()` 中新增云端上传即可。建议：
- 使用 JSON Web Token（JWT）用户认证
- 所有同步数据加密上传（例如 AES-CBC），保护隐私

### 场景 F：添加新的权限自检项

1. 在 `utils/smsParser.js` 中新增 `checkXxxPermission()`
2. 在 `runAppHealthCheck()` 返回值中注册
3. 在 `pages/healthcheck/healthcheck.vue` 的 `<template>` 中添加一个卡片项
4. 添加对应的点击处理函数（跳转系统设置或申请权限）

---

## 🐛 常见问题 FAQ

**Q1: 为什么短信识别不到？**

A：请依次检查：
1. 「设置 → 权限自检」→ 短信读取权限是否正常
2. 短信原文格式是否标准（是否包含 取件码 / 驿站名称）
3. 可在主页点击「+ 添加」→「粘贴短信原文」试试手动解析

**Q2: 为什么 Android 13+ 收不到通知？**

A：Android 13 引入了 `POST_NOTIFICATIONS` 运行时权限。请在「权限自检 → 通知权限」中点击检测，按指引授予。

**Q3: 如何备份我的数据？**

A：进入「设置 → 基础设置」，可执行导出/清理操作。应用所有数据存储在 `uni.setStorageSync('express_list', ...)` 中。

**Q4: H5 模式下功能不全？**

A：本应用 **主要为 Android 设计**，H5 模式仅用于 UI 调试。短信读取、通知推送、文件管理等原生功能，必须在 App 模式（真机）下才能完整体验。

---

## 📝 更新日志

### v1.0.0（当前版本）

- ✨ 自动识别短信中的快递取件码
- ✨ 批量确认取件
- ✨ 超时智能提醒（24 小时）
- ✨ 截图/图片 OCR 识别
- ✨ 权限自检功能（短信/通知/存储三项）
- ✨ 桌面小组件原生插件（可选启用）
- ✨ 驿站与快递名智能区分

---

## 📄 开源协议

**MIT License**

你可以自由地：
- ✅ 使用（个人/商业）
- ✅ 修改
- ✅ 分发
- ✅ 私有使用

**但需要**：
- 保留版权声明 & 许可证声明

---

## 🙏 致谢

本项目基于 [uni-app](https://uniapp.dcloud.net.cn/) 框架开发，感谢 DCloud 提供的优秀跨端框架。

感谢每一位贡献者，以及所有使用本应用的用户。

---

## 📮 联系方式

- 开发者邮箱：`yimei@ymei.top`
- 项目地址：请在 GitHub 搜索本项目

欢迎提交 Issue 和 Pull Request！
