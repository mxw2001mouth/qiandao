# 签到管理系统

作者信息：时光微醉-mazh  
联系方式：18992880651

## 开发命令
- `npm run dev`：原生强制模式（浏览器将被拦截，用于真机阶段防误测）
- `npm run dev:web-preview`：显式开启浏览器 UI 预览模式
- `npm run dev:mobile`：局域网开发（供真机 Live Reload，原生强制）
- `npm run build`：原生强制模式构建（验收/真机）
- `npm run build:web-preview`：浏览器预览模式构建（演示）

## Capacitor / Android 命令
- `npm run cap:add:android`：初始化 Android 平台（首次）
- `npm run cap:sync:android`：同步 Web 资源到 Android
- `npm run cap:open:android`：打开 Android Studio

## 真机测试切换
- `npm run mobile:run:android`：Bundle 模式（推荐验收）
- `npm run mobile:live:url`：输出推荐 `CAP_SERVER_URL`
- `npm run mobile:live:android`：Live 模式（推荐联调）

详细审核文档见：
- `docs/REAL_DEVICE_TEST_PLAN.md`
