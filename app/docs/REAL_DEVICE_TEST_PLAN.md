# 真机测试切换方案（审核稿）

## 1. 目标与约束
- 目标：在不改业务代码路径的前提下，让项目具备可重复的真机运行能力，并支持调试/验收两种模式切换。
- 约束：
  - 验收优先稳定性，默认使用打包资源模式（Bundle）。
  - 联调优先效率，可使用局域网 Live Reload 模式（Live）。
  - 切换必须可追溯、可回退、低误操作风险。

## 2. 双模式设计
- `Bundle`（默认，推荐验收）：
  - 不依赖电脑开发服务器。
  - 应用直接加载 `dist` 目录静态资源。
  - 配置：`CAP_PROFILE` 不设置或设为非 `live`。
- `Live`（推荐开发联调）：
  - 依赖局域网 `vite` 服务。
  - 真机加载 `CAP_SERVER_URL`，支持热更新。
  - 配置：`CAP_PROFILE=live` + `CAP_SERVER_URL=http://<LAN_IP>:5173`。

## 2.1 运行时边界（本次收口）
- 默认 `native` 模式开启 `VITE_REQUIRE_NATIVE=1`：
  - 浏览器启动时直接拦截，不再进入业务流程。
  - 数据库层禁止 `webDatabase(sql.js)` fallback。
  - 相机能力禁止 `mock://browser-photo` fallback。
- 仅 `web-preview` 模式（显式命令）允许浏览器预览，用于 UI 演示，不用于真机验收。

## 3. 已实现的切换控制点
- `capacitor.config.ts`
  - 新增 `CAP_PROFILE`、`CAP_SERVER_URL` 驱动的 `server` 配置。
  - `live` 时自动启用：
    - `androidScheme: 'http'`
    - `cleartext: true`
    - `url` 与 `allowNavigation`
  - `bundle` 时不注入 `url`，避免误连开发环境。
- `package.json` 脚本
  - `mobile:run:android`：Bundle 模式真机运行（推荐验收）。
  - `mobile:live:android`：Live 模式真机运行（推荐联调）。
  - `dev:mobile`：启动可被真机访问的 vite 服务。
  - `mobile:live:url`：输出推荐的 `CAP_SERVER_URL`。

## 4. 标准操作流程（SOP）
### 4.1 验收流程（Bundle）
1. `npm run mobile:run:android`
2. 在真机执行核心路径用例（登录、签到、拍照、导出、备份恢复）。
3. 记录版本号、机型、系统版本、执行时间和结果。

### 4.2 联调流程（Live）
1. 终端 A：`npm run dev:mobile`
2. 终端 B：`npm run mobile:live:android`
3. 确认真机和开发机在同一局域网，且端口 `5173` 可达。

## 5. 审核论证
- 可行性：
  - 当前项目已使用 Capacitor + SQLite 插件，具备原生容器能力。
  - 业务数据层已区分 web/native 平台，真机落地路径明确。
- 正确性：
  - Bundle 与 Live 使用同一套前端业务代码，仅入口资源加载方式不同，降低行为偏差风险。
  - 通过环境变量切换，不需要临时改代码，减少人为错误。
- 可回滚性：
  - 删除 `CAP_PROFILE/CAP_SERVER_URL` 即自动回到 Bundle 默认行为。
  - 所有脚本均为附加能力，不破坏原有 `dev/build` 流程。

## 5.1 审核门禁（通过标准）
- Gate A（构建门禁）：`npm run build` 必须通过。
- Gate B（同步门禁）：`npx cap sync android` 在 `bundle/live` 两种配置下均通过。
- Gate C（功能门禁）：真机覆盖核心链路：
  - 登录 -> 今日签到 -> 拍照 -> 提交 -> 历史查看
  - 数据导出 -> 备份 -> 恢复
- Gate D（回退门禁）：清除 Live 环境变量后能恢复 Bundle 启动。

## 6. 风险评估与边界
- 风险 R1：Live 模式网络不通导致白屏/连接失败。
  - 控制：验收阶段统一使用 Bundle；Live 仅用于联调。
- 风险 R2：误把 Live 配置带入验收或发布流程。
  - 控制：默认 profile 为 Bundle；验收脚本不设置 Live 环境变量。
- 风险 R3：HTTP 明文链路安全性不足（仅 Live）。
  - 控制：`cleartext` 仅在 `CAP_PROFILE=live` 时启用；禁止用于生产发布包。
- 风险 R4：设备/系统碎片化（权限、相机、存储差异）。
  - 控制：建立最小测试矩阵（Android 版本 x 厂商）并覆盖拍照与文件读写。

## 7. 边界声明
- 当前脚本重点保障 Android 真机测试；iOS 真机构建需 macOS + Xcode 环境另行执行。
- 本次改造不涉及后端服务与网络 API，不改变业务数据库结构。
- 若后续引入远程 API，需要追加环境分层（dev/staging/prod）和证书策略。
