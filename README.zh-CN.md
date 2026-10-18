# 魈 · 青霄守夜（dsh-xiao-theme）

面向 DeepSeek Harness（DSH）Web 与 Desktop 的独立角色主题插件。以**青玉、墨青、月白**重构界面层次，可在静立立绘与生日贺图间切换，并提供可拖动的「魈伙伴」、强化风痕与环境粒子、可选的官方 DeepSeek 余额展示，以及可靠的设置保存。

> 本插件的界面文案为原创主题文案，不标注为官方角色台词。角色图像来源与授权说明见 [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md)。

## 功能

- **完整明暗主题**：约 80 个语义令牌，明暗跟随 DSH；「简约 / 平衡 / 沉浸」只控制装饰强度，不建立第二套明暗模式。
- **统一页面设计**：侧栏品牌、欢迎页、会话页与设置页共用同一套视觉语言。
- **双立绘连续转场**：可在静立立绘与生日贺图间切换；所选立绘在欢迎页与会话页复用同一位置，并以 700 ms 可反向、可打断的过渡呈现。
- **魈伙伴**：待机漂浮、悬停、点击打开状态面板、拖动跟随并保存位置、方向键移动（Shift 加速、Home 复位）、欢迎页临时停靠且不覆盖用户位置；余额面板依据伙伴位置自动选择不遮挡的一侧。
- **真实会话状态**：区分发送中、运行中、已完成、已结束、失败、已停止、状态未知与等待用户操作，并按 `sessionId` 隔离，后台会话不污染主视图。
- **可选官方余额**：默认关闭；启用后由 Host 侧读取 `https://api.deepseek.com/user/balance`，API Key 不进入客户端；CNY 10 以下只在伙伴处给出局部提示。
- **强化动效系统**：呼吸、伙伴动作、点击风痕、环境粒子和沉浸视差均为原来的三倍幅度；保留数量上限并遵守减少动态效果设置。
- **可靠设置**：串行化写入、失败可见反馈、位置复位与全部设置复位；关闭插件后完整释放样式、监听器与定时器。
- **自定义本地背景**：选择图片、调整背景可见度并可选自动匹配魈主题强调色；设置只保存在当前 DSH Profile。

## 安装

```powershell
# 从 npm 安装；桌面端把 web 替换为 desktop，并先完全退出客户端
dsh plugin --profile web add dsh-xiao-theme@latest
dsh web
```

卸载：

```powershell
dsh plugin --profile web remove dsh-xiao-theme
```

安装后打开 **Settings → 魈**。主题默认启用，余额展示默认关闭。

## 与 Kinich 主题共存

- 1.3.0 与配套 Kinich 可以同时安装，但同一 Profile 内**强制只能开启一个**。
- 开启任一主题时先关闭另一个，仅改变对方主题总开关，保留其全部图片、壁纸历史、位置与动效参数。关闭失败就停止切换。
- 旧配置两者都开启时固定保留 Kinich；以后开启哪一个就切换到哪一个。也允许两个都关闭。
- 配套 Kinich 增加了主题总开关；若仍使用没有该开关的旧版本，必须升级它或在市场停用后再开启 Xiao。
- 以上行为属于 **1.3.0-rc.1** 候选版，配套 Kinich **2.0.3-rc.1**。RC 使用 npm `next`，不覆盖 `latest`；完整规则与验收边界见 [1.3.0 升级规格](docs/UPGRADE_1.3.0_SPECIFICATION.md)。

## 设置项

在 DSH 中打开 **Settings → 魈**。选择本地背景后，可调整背景可见度与自动强调色。

| 分组 | 设置 |
| --- | --- |
| 主题 | 启用魈主题 |
| 视觉强度 | 界面表现（简约 / 平衡 / 沉浸）、主立绘样式、会话页可见度与位置、立绘显示、立绘呼吸、欢迎页视差 |
| 魈伙伴 | 显示伙伴、伙伴大小、水平方向、待机动画、复位伙伴位置 |
| 会话反馈 | 工作时收敛环境 |
| 环境与装饰 | 背景纹饰、环境粒子、点击风痕 |
| 自定义背景 | 本地图片、显示开关、背景可见度、独立自动强调色；关闭/0% 保留素材与参数 |
| 官方余额 | 显示官方 DeepSeek 余额 |
| 复位 | 伙伴位置复位、全部设置复位（二次点击确认） |

## 开发

市场提交与后续发行步骤见 [插件市场提交全流程](docs/MARKETPLACE_SUBMISSION.md)。1.2.1 起以 npm 为优先分发来源，GitHub Release 保留为后备。市场目录重新探测 npm 后可展示版本与宿主要求；本地安装来源以实际依赖和 lockfile 为准。

```powershell
npm install
npm run assets    # 由 python scripts/extract-assets.py 生成处理后素材（需要 Pillow）
npm run build     # esbuild 打包 Host 与 Client
npm run verify    # 构建 + 契约检查 + 全部测试
```

目录结构：

```
assets/source/      四张原始素材（不进入发布包）
assets/{character,companion,ornaments,showcase}/  处理后素材
src/host/           Host 入口、设置 schema、余额路由
src/client/         主题、场景、伙伴、会话、余额、动效、设置
scripts/            构建、检查、测试、素材处理
lib/                预构建分发产物（Host + Client bundle）
docs/               设计动效、兼容基线、验证记录
```

## 兼容性

- 历史实测：**DSH 0.2.0-rc.2**；本次新增 **0.2.1-rc.2** 隔离宿主启动、旧冲突修复、单主题选择与重启持久化、客户端清单检查。未进行本轮桌面视觉验收。
- DSH 与 settings peer 声明：`>=0.2.0-rc.2 <0.3.0`（保持本机兼容，0.1.x 不再列入支持范围；实测基线仍为 0.2.0-rc.2）。
- 详见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) 与 [docs/VALIDATION.md](docs/VALIDATION.md)。

## 许可

源代码按 [LICENSE](LICENSE) 授权。角色图像不属于该授权范围，见 [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md)。
