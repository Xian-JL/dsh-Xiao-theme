# 兼容性与接口基线（docs/COMPATIBILITY.md）

本文件记录 `dsh-xiao-theme` 实际核实的 DSH 接口基线、继承的约定与未验证事项。开发接手者应先核对本文件，再假设其中任何数值仍然成立。

## 1. 本轮核实的环境

| 项目 | 实测值 | 核实方式 |
| --- | --- | --- |
| DSH 版本 | `0.2.0-rc.2` | `E:\Deepseek-harness\resources\runtime\cli\bin\dsh.cmd --version` |
| 应用内 Node | v24.18.1 | DSH CLI 运行时报错栈 |
| 开发用 Node / npm | v24.19.0 / 11.17.0 | 本机 `node -v`、`npm -v` |
| 目标 Profile（验收） | 隔离 profile `xiao-lab`（由 shipped `web` 模板初始化） | `dsh --profile xiao-lab --from-default-profile web --dump-config` |
| 既有 Profile（未改动） | `desktop`（已装 `dsh-kinich-theme@1.7.1`）、`web`（`dsh-kinich-theme@1.5.0`） | 读取 profile `package.json` |
| profile 根目录 | `%USERPROFILE%\.dsh\profiles\<name>` | 实测 |

**注意**：`E:\Deepseek-harness\resources\app.asar\dsh\` 是归档文件内部的路径，磁盘上不存在该目录。要读取 DSH 本体代码需先解包 `app.asar`，或通过 CLI 与 profile 的 `node_modules` 间接核实。

## 2. 使用的 DSH 接口

| 接口 | 用途 | 在本插件中的位置 |
| --- | --- | --- |
| `dsh.manifestVersion = 1`、`dsh.client.inject`、`dsh.bundle.patch` | 插件清单与客户端注入 | `package.json`、`cordis.patch.yml` |
| Host `name` / `Config` / `apply(ctx)` | Host 入口与实时配置 | `src/host/index.js` |
| `ctx.inject(["settings"], ctx => ctx.settings.register(ns, schema, { applies: "live" }))` | 注册设置命名空间 | `src/host/index.js` |
| `ctx.settings.configure({ auto: false }, ctx.fiber)` | 旧版 DSH 的 Config 呈现回退路径 | `src/host/index.js` |
| `ctx.inject(["connection", "settings", "credentials"], …)` | 认证型 Host 路由 | `src/host/balance-route.js` |
| `connection.fetch.register({ path, methods, requestBody, fetch })` | 注册 `/api/xiao-balance` | `src/host/balance-route.js` |
| `credentials.resolve(envName)` | Host 侧解析 API Key | `src/host/balance-route.js` |
| Client `inject = ["theme", "slots", "locale", "connection", "remote"]` | 声明的客户端服务 | `src/client/index.js` |
| `ctx.get("configForms")` / `ctx.get("settingsScope")` | 两代 DSH 的设置表单解析 | `src/client/settings/resolve.js` |
| `settings.mutate([{ op: "set", path: [field], value }])` / `settings.set(field, value)` | 原子或逐字段写入 | `src/client/settings/write.js` |
| `ctx.theme.overrideTokens(source, tokens)` | 明暗语义令牌覆盖 | `src/client/overlay/xiao-overlay.js` |
| `ctx.slots.inject(name, () => ctx.slots.register(def, Component))` | 插槽注入 | `src/client/index.js` |
| `ctx.locale.register(namespace, dictionaries)` | 中英文文案 | `src/client/index.js`、`src/client/locales.js` |
| `shell.overlay` 的 `useSessions` prop | 主视图会话选择 | `src/client/overlay/xiao-overlay.js` |
| `shell.overlay` 的 `t` prop | 文案取值 | 同上 |
| DSH `[data-phase='hero']` 标记 | 欢迎页阶段侦测 | `src/client/scene/phase-model.js` |
| `[class$='_headline']`、`[class$='_composerHero']` | 欢迎页原生排版的视觉让位 | `src/client/styles.css` |

### 已使用的插槽

| 插槽 | 条目 id | 说明 |
| --- | --- | --- |
| `sidebar.brand.mark` | — | 侧栏品牌标记 |
| `sidebar.brand.name` | — | 侧栏品牌名 |
| `conversation.hero.brand.mark` | — | 欢迎页品牌标记 |
| `conversation.composer.dock` | `xiao-session-state` | Session scope 的会话状态桥（不可见） |
| `shell.overlay` | `xiao-theme-decoration` | 场景、立绘、伙伴、动效层 |
| `settings.section` | `xiao-theme` | Settings → Xiao 独立设置页 |

## 3. 明确不依赖的接口

- 不注入 `@deepseek-ai/dsh-client-runtime`（已移除的包）。
- 不调用 `settingsNamespace()`、`installSettingsSection()` 等已移除 API：`scripts/check.mjs` 会断言其不存在。
- 不通过宿主全局变量读取会话内部状态；会话反馈只来自 `useSession` 选择器与按 `sessionId` 隔离的桥。

## 4. 会话状态字段的兼容策略

`src/client/session/compat.js` 会读取以下可能存在的字段，缺失时不影响运行：

- 错误：`promptError`、`openError`、`lastAgentError`、`error`、`lastError`
- 活跃：`awaitingFirstTurn`、`pendingSubmissions`、`running`
- 结束原因：`stopReason`、`lastStopReason`、`finishReason`、`endReason`、`completionStatus`、`lastCompletionStatus`、`stop_reason`、`finish_reason`
- 等待用户：`awaitingInput`、`awaitingUserInput`、`awaiting_input`、`pendingApproval`、`pendingPermission`、`pendingToolApproval`

在 0.2.0-rc.2 上实测：`running`、`awaitingFirstTurn` 与错误字段可用；**未观测到可靠的结束原因字段**。因此：

- `completed` 只在读到明确的成功原因值时发布；
- 其余「由运行变空闲」的情形一律发布中性的 `ended`（界面文案：已结束）；
- `awaiting-input` 仅在存在上述字段时出现，否则该状态不会触发。

## 5. 未验证事项（请勿据此假设）

1. **浏览器内的视觉与交互人工验收尚未执行。** 已完成的隔离验证覆盖：安装、profile 组合、页面清单包含 `dsh-xiao-theme/client.js`、Host 路由 200 返回真实快照。欢迎页转场、伙伴拖动、粒子与视差的观感需在真实浏览器中人工确认。
2. 窗口尺寸矩阵（1280×720 / 1440×900 / 1920×1080 / 2560×1440）与 100%–200% 缩放未逐项人工核对，布局规则按 CSS clamp 与断点编写。
3. `[class$='_headline']` / `[class$='_composerHero']` 依赖 DSH 的类名后缀约定；DSH 改版后需重新核对。
4. 0.1.5 / 0.1.6 / 0.1.7 的 `engines.dsh` 区间为继承自既有插件的声明，本轮**未**在那些版本上实测。
5. 与 `dsh-kinich-theme` 同时安装时的视觉冲突未做实测对比；按设计两者各自独立命名空间，不互相覆盖。

## 6. 与 Kinich 主题共存

- 允许同时安装；本插件**不会**自动禁用、修改或卸载其他主题。
- 首版建议同一 Profile 只启用一个完整角色主题；设置页「主题」区域包含常驻说明文案。
- 冲突已知点：两者都会接管侧栏品牌插槽与 `shell.overlay`（各自条目 id 不同），也都会覆盖一批 `--dsw-alias-*` 主题令牌；同时启用时后注册者胜出，视觉效果不可预期。这属于产品层面的互斥，不做样式优先级对抗。
