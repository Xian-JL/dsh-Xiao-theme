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
# 从 GitHub Release 的预构建安装包安装
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Xiao-theme/releases/latest/download/dsh-xiao-theme-latest.tgz
dsh web
```

卸载：

```powershell
dsh plugin --profile web remove dsh-xiao-theme
```

安装后打开 **Settings → 魈**。主题默认启用，余额展示默认关闭。

## 与 Kinich 主题共存

- 允许与 `dsh-kinich-theme` 同时安装；本插件不会自动禁用、修改或卸载任何其他插件。
- 首版建议同一 Profile 只启用一个完整角色主题。两者都会接管侧栏品牌插槽与一批主题令牌，同时启用时视觉效果不可预期。

## 设置项

在 DSH 中打开 **Settings → 魈**。选择本地背景后，可调整背景可见度与自动强调色。

| 分组 | 设置 |
| --- | --- |
| 主题 | 启用魈主题 |
| 视觉强度 | 界面表现（简约 / 平衡 / 沉浸）、主立绘样式、会话页可见度与位置、立绘显示、立绘呼吸、欢迎页视差 |
| 魈伙伴 | 显示伙伴、伙伴大小、水平方向、待机动画、复位伙伴位置 |
| 会话反馈 | 工作时收敛环境 |
| 环境与装饰 | 背景纹饰、环境粒子、点击风痕 |
| 自定义背景 | 本地图片、背景可见度、自动匹配强调色 |
| 官方余额 | 显示官方 DeepSeek 余额 |
| 复位 | 伙伴位置复位、全部设置复位（二次点击确认） |

## 开发

市场提交与后续发行步骤见 [插件市场提交全流程](docs/MARKETPLACE_SUBMISSION.md)。本插件通过 GitHub Release 分发，无需发布 npm。

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

- 已实测：**DSH 0.2.0-rc.2**（Node v24.x），隔离 Profile 安装、组合、页面清单与 Host 余额路由。
- 声明区间：`^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2`（继承自既有插件的声明，仅 0.2.0-rc.2 实测）。
- 详见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) 与 [docs/VALIDATION.md](docs/VALIDATION.md)。

## 许可

源代码按 [LICENSE](LICENSE) 授权。角色图像不属于该授权范围，见 [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md)。
