# 📦 取件码助手（Express Pickup Helper）

一个基于 **uni-app + Vue 3** 的 Android 端应用，能够自动识别短信中的快递取件码，智能归类，支持手动确认、超时提醒和图片/OCR 识别。

> 所有数据均存储在本地，不会上传任何服务器，保障隐私安全。

---

## ✨ 功能特性

- **🔍 短信自动识别**：自动扫描手机短信，识别快递取件码、驿站信息
- **📋 批量确认取件**：支持勾选多个快递一键标记为已取
- **⏰ 超时智能提醒**：超过 24 小时未取件的快递会显示超时横幅
- **📷 图片/OCR 识别「测试」**：识别截图或图片中的取件码
- **✅ 权限自检**：一键检测短信读取、通知、存储等核心权限状态
- **🔒 本地存储**：所有数据仅在本机存储，隐私无泄露
- **📤 分享**：一键分享应用给朋友

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
