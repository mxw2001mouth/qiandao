# 培训机构签到管理 APP — APK 构建说明

## 前置要求

| 工具 | 版本要求 | 用途 |
|---|---|---|
| Node.js | v18+ | 前端构建 |
| npm | v9+ | 包管理 |
| Android Studio | 最新稳定版（Hedgehog 或更高） | Android 编译打包 |
| JDK | 17+ | Android 编译依赖 |
| Android SDK | API 33+（Android 13） | 目标平台 |

确保 Android Studio 已安装以下 SDK 组件（通过 SDK Manager）：
- Android SDK Platform 33 或更高
- Android SDK Build-Tools 33+
- Android SDK Platform-Tools

## 构建步骤

### 步骤 1：安装依赖

```bash
cd app
npm install
```

### 步骤 2：构建前端产物

```bash
npm run build
```

构建产物输出到 `app/dist/` 目录。

### 步骤 3：同步到 Android 项目

```bash
npx cap sync android
```

此命令会将 `dist/` 中的 Web 资源复制到 Android 项目的 `assets` 目录，并同步原生插件配置。

### 步骤 4：在 Android Studio 中打开

```bash
npx cap open android
```

这会自动打开 Android Studio 并加载 `android/` 目录下的项目。

首次打开时，Android Studio 可能需要下载 Gradle 依赖，请等待同步完成。

### 步骤 5：生成 APK

#### Debug APK（调试版，无需签名）

1. 在 Android Studio 顶部菜单选择 **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. 等待构建完成
3. 点击通知栏中的 **locate** 链接，或手动找到文件

Debug APK 位置：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release APK（正式版，需要签名）

1. 菜单 **Build > Generate Signed Bundle / APK...**
2. 选择 **APK**，点击 Next
3. 配置 Keystore：
   - 如首次构建，点击 **Create new...** 创建新的 keystore
   - 填写 keystore 路径、密码、别名等信息
   - 妥善保管 keystore 文件和密码
4. 选择 **release** 构建类型
5. 点击 **Finish** 开始构建

Release APK 位置：
```
android/app/build/outputs/apk/release/app-release.apk
```

## 安装到手机

### 方法一：USB 直连安装

1. 手机开启 **开发者选项 > USB 调试**
2. 用 USB 数据线连接电脑
3. 在 Android Studio 顶部选择目标设备，点击运行按钮（绿色三角）

### 方法二：APK 文件安装

1. 将生成的 APK 文件传输到手机（微信/QQ发送、USB 拷贝等）
2. 在手机上点击 APK 文件
3. 如提示"不允许安装未知来源"，前往设置开启权限
4. 按提示完成安装

## 常见问题

### Q: `npx cap sync` 报错

确认已正确执行 `npm run build` 且 `dist/` 目录存在。如果 android 目录不存在，先执行：
```bash
npx cap add android
```

### Q: Android Studio Gradle 同步失败

- 确认 JDK 版本为 17+（File > Project Structure > SDK Location）
- 检查网络连接（Gradle 需要下载依赖）
- 尝试 File > Invalidate Caches / Restart

### Q: 构建时报 SDK 版本错误

打开 `android/app/build.gradle`，确认 `compileSdkVersion` 和 `targetSdkVersion` 与已安装的 SDK 版本匹配。

### Q: APK 安装后闪退

- 检查 Logcat 日志（Android Studio > Logcat）
- 确保 `npx cap sync android` 已执行
- 确认 `capacitor.config.ts` 中 `webDir` 指向 `dist`

### Q: SQLite 数据库权限问题

@capacitor-community/sqlite 插件在 Android 上使用内部存储，无需额外权限申请。如果使用文件系统导出/备份功能，Android 10+ 使用 Scoped Storage，由 @capacitor/filesystem 自动处理。

## 默认账号

| 角色 | PIN 码 |
|---|---|
| 管理员 | 1234 |
| 老师 | 5678 |

## 技术栈

- 前端：Vue 3 + TypeScript + Tailwind CSS + Pinia
- 图表：ECharts 6
- 原生壳：Capacitor 7
- 数据库：SQLite（@capacitor-community/sqlite）
- 导出：SheetJS (xlsx)
