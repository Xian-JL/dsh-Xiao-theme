# 验证记录（docs/VALIDATION.md）

记录 `dsh-xiao-theme@1.0.0` 的验证环境、执行内容与结果。**未执行的项目单独列出，不作推断。**

验证日期：2026-10-02（Asia/Shanghai）

## 1. 环境

| 项目 | 值 |
| --- | --- |
| 操作系统 | Windows（本机 DSH Desktop 安装目录 `E:\Deepseek-harness`） |
| DSH CLI 版本 | `0.2.0-rc.2` |
| 应用内 Node | v24.18.1 |
| 开发 Node / npm | v24.19.0 / 11.17.0 |
| 开发目录 | `E:\Codex_workspace\dsh-Xiao-theme` |
| 隔离验收 Profile | `xiao-lab`（由 shipped `web` 模板初始化，`%USERPROFILE%\.dsh\profiles\xiao-lab`） |
| 未改动的 Profile | `desktop`（内含 `dsh-kinich-theme@1.7.1`）、`web`（内含 `dsh-kinich-theme@1.5.0`） |

## 2. 自动化验证

命令：`npm run verify`（= build → check → 7 个测试套件）

```
Built the dsh-xiao-theme Host and Client bundles with esbuild.
Xiao verification passed.
settings passed (24 assertions).
session state passed (46 assertions).
companion geometry passed (27 assertions).
motion passed (45 assertions).
balance passed (56 assertions).
lifecycle passed (43 assertions).
built bundles passed (47 assertions).
```

合计 **288 条断言全部通过**，退出码 0。

| 套件 | 覆盖内容 |
| --- | --- |
| `check.mjs` | 包清单、命名空间隔离（不出现 kinich 标识）、6 个插槽、5 个服务、17 个设置字段、会话机器关键字、动效上限、无远程资源、无明文密钥、素材是否进入 bundle |
| `test-settings` | 默认值合并、旧配置缺字段回退、非法值拒绝、默认对象不被共享、预设不包含总开关、**并发写入串行化与最后一次生效**、写入失败回滚与 `partial` 标记 |
| `test-session-state` | 活跃相位推导、结束原因读取、**「无信号即 ended」**、错误优先于完成、sessionId 解析与主视图选择、状态存储按会话隔离、重复写入不重复通知、取消订阅、终态自动收敛 |
| `test-companion` | 尺寸解析、位置夹取、安全区、拖动坐标映射、拖动越界、键盘 8/32 px、Home 复位、**点击/拖动判定阈值**、欢迎页停靠与复原 |
| `test-motion` | 粒子数量上限与收敛减半、粒子样式确定性与边界、风痕节点池回绕、风痕时长、fragment 分布、视差 ≤3.5 px 与窄屏禁用、相位模型与 700/80 ms 时长 |
| `test-balance` | CNY 10 阈值边界（9.99 / 10 / 10.00 / 10.01 / 前导零 / 非 CNY / 非法值）、限流分钟数、Host 限流常量、缓存决策、**失败指数退避上限**、凭据指纹不可逆且不含明文、官方端点白名单、**旧凭据的迟到响应被丢弃**、网络失败降级 |
| `test-lifecycle` | 监听器成对增删、observer 断开、定时器与 rAF 清理、样式表挂载/移除、隐藏与减少动态门控、无视差越权、无远程资源、**所有 className 在样式表中存在** |
| `test-bundles` | 加载**构建产物**：Client 模块 id 与 `inject` 数组、6 个插槽注册、语言字典中英键一致（缺键 0 个）、设置命名空间绑定与解码器、样式表挂载与移除、宿主 5 个监听器成对增删；Host 模块 `name`/`Config`/`apply`、设置命名空间与 `applies: "live"`、余额路由路径与方法、无凭据时返回 `unbound`、有凭据时**只**请求 `https://api.deepseek.com/user/balance` 且响应不含密钥 |

## 3. 隔离环境安装验收

在**干净**的隔离 Profile 上完成「安装 → 启用 → 验证 → 卸载」全流程，未触碰 `desktop` / `web` Profile。

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 初始化隔离 Profile | `dsh --profile xiao-lab --from-default-profile web --dump-config` | Profile 创建成功，组合为 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app` |
| 安装 | `dsh plugin --profile xiao-lab add <tgz>` | `Packages: +4, done`；bundle 列表新增 `dsh-xiao-theme`；依赖为 `file:...dsh-xiao-theme-1.0.0.tgz` |
| 组合确认 | `dsh --profile xiao-lab --dump-config` | 输出包含 `# == dsh-xiao-theme` 与 `- id: dsh-xiao-theme` |
| 启动 | `dsh --profile xiao-lab --no-open --port 19588` | 打印 `dsh web: http://127.0.0.1:19588/?token=…`，未在浏览器打开 |
| 页面清单 | `GET /?token=…` | 200，35,273 字节；插件清单包含 `dsh-xiao-theme/client.js` |
| Host 余额路由 | `GET /api/xiao-balance` | 200，`{"status":"ready","currency":"CNY","bindingId":"deepseek-b8c001a15529bdea","stale":false,…}`；响应中不含 `sk-` 明文 |
| 卸载 | `dsh plugin --profile xiao-lab remove dsh-xiao-theme` | `Done`；bundle 列表回到 `dsh-base` + `dsh-web-app`；`node_modules/dsh-xiao-theme` 已移除 |

说明：

- 页面清单包含 `dsh-xiao-theme/client.js` 说明 DSH 已发现并注册客户端 bundle；Host 余额路由返回真实快照说明 Host 侧注册、凭据解析与官方端点请求链路均已生效。
- 验收过程中出现的 `crashpad … TransactNamedPipe` 与 `fs.Stats constructor is deprecated` 来自 DSH CLI/Chromium 包装层，与本插件无关，在安装、启动与卸载三个步骤中均出现。
- Web 临时 token 仅在该次请求中使用，未写入源码、日志或发布包。
- 隔离 Profile `xiao-lab` 在卸载后保留为空骨架（仅 base + web-app），便于后续复验。

## 4. 发布包检查

| 检查 | 结果 |
| --- | --- |
| `npm pack` | `dsh-xiao-theme-1.0.0.tgz`，约 0.42 MB |
| 包内文件 | `lib/index.js`、`lib/client.js`、`cordis.patch.yml`、`package.json`、`LICENSE`、`README.md`、`README.zh-CN.md`、`CHANGELOG.md`、`THIRD_PARTY_ASSETS.md`、`docs/*.md` |
| 原始工作文件 | **不在包内**（`assets/` 与四张原图被 `files` 白名单排除） |
| 敏感信息扫描 | 对解包后的全部文件匹配 `sk-…`、`DEEPSEEK_API_KEY=…`、`npm_…`、`ghp_…`：**0 命中** |
| 远程资源 | bundle 与样式表内无远程图片、字体或 CDN 引用（`check.mjs` 与 `test-lifecycle` 断言） |

## 5. 未执行的验证（需要人工或真实浏览器）

以下项目**尚未执行**，不应视为已通过：

1. **浏览器内视觉与交互人工验收**：欢迎页与会话页转场观感、立绘与文案排版、伙伴拖动手感、点击风痕、粒子与视差、状态面板语义与焦点行为。自动化只验证到构建产物的注册、路由与几何/状态模型层面。
2. **窗口尺寸与缩放矩阵**：1280×720 / 1440×900 / 1920×1080 / 2560×1440，100% / 125% / 150% / 200%。布局按 clamp 与断点编写，但未逐项目视核对。
3. **性能实测**：未在真实会话中采集帧率、主线程占用与内存；预算值由设计约束给出（粒子 ≤28、节点池 6、视差 ≤3.5 px、仅 transform/opacity）。
4. **与 Kinich 主题同时启用**的对照观察；按设计两者互不引用，但未做同屏对比。
5. **`engines.dsh` 声明的 0.1.5 / 0.1.6 / 0.1.7 区间**：仅 0.2.0-rc.2 实测。
6. **真实会话的端到端状态流**：会话状态机由合成快照测试覆盖；0.2.0-rc.2 上未观察到可靠的结束原因字段，因此「已完成」只会在存在该字段时出现，其余情形显示中性的「已结束」。
7. **公开发布**（npm / GitHub Release）与正式 Desktop 安装：按计划作为后续独立步骤，未执行。

## 6. 复现方式

```powershell
cd E:\Codex_workspace\dsh-Xiao-theme
npm install
npm run assets      # 需要 Pillow；重建 assets/ 下的处理后素材
npm run verify      # 288 条断言
npm pack            # 产出可安装 tgz
```
