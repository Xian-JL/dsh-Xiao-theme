# 设计与动效说明（docs/DESIGN_AND_MOTION.md）

## 1. 视觉方向

整体使用**青玉、墨青、月白**，辅以少量**旧金**与**紫色暗纹**。

| 元素 | 处理 |
| --- | --- |
| 深色界面 | 墨青背景（`#0A1214` / `#0E1B1E`），青玉强调色（`#35C4A6`），柔和月白文字（`#E8F1F0`） |
| 浅色界面 | 浅灰白背景（`#F2F6F5`），深青文字（`#10302C`），低饱和绿色表面（`#E7EFED`） |
| 主操作 | 青玉色，含 hover / press / focus 三态 |
| 辅助装饰 | 傩面局部、云纹、风痕线、局部紫色暗纹 |
| 角色呈现 | 欢迎页突出（不透明度 ≈ 0.98），会话页退至安全边缘（默认 0.32） |
| 正文与代码 | 只改语义令牌，不改业务状态色与语法色 |

明暗模式跟随 DSH；「简约 / 平衡 / 沉浸」只控制视觉强度，不建立第二套明暗模式。

### 语义令牌

`src/client/theme/tokens.js` 以 `token(light, dark)` 成对声明约 80 个 `--dsw-alias-*` / `--dsw-specific-*` 令牌，覆盖背景层级、边框、品牌色、按钮态、交互悬停、文本层级、Markdown 代码块、滚动条、业务状态与气泡/输入/侧栏专用色。装饰层另外派生局部变量：

```
--xiao-jade        = var(--dsw-alias-brand-primary)
--xiao-jade-deep   = color-mix(jade 72%, label-primary)   /* 明暗自适应 */
--xiao-gold        = #b8934a
--xiao-violet      = #8b7bd8
--xiao-line        = var(--dsw-alias-border-l3)
```

以 `color-mix(in srgb, ... var(--dsw-alias-label-primary))` 派生装饰色，可在不判断明暗模式的前提下自动获得对比度合理的深浅两套表现。

### 强度档位

| 档位 | 立绘 | 环境粒子 | 视差 | 装饰 |
| --- | --- | --- | --- | --- |
| 简约 minimal | 欢迎页保留，会话页隐藏 | ≤ 6 且可关 | 关闭 | 傩面/云纹隐藏，光晕减弱 |
| 平衡 balanced（默认） | 欢迎页主视觉 + 会话页边缘 0.32 | ≤ 18 | 关闭 | 云纹 + 风痕 + 傩面 |
| 沉浸 immersive | 同上，可见度更高 | ≤ 28 | ≤ 3.5 px | 全部层次 |

选择档位会同时套用 `XIAO_VISUAL_PRESETS` 中的相关开关，但**不会**改动总开关 `enabled`。

## 2. 页面布局

**欢迎页**：左侧（`left: clamp(310px, 21vw, 470px)`，`top: 26%`）为品牌标记与两行主题文案；右侧为放大的主立绘。原生输入框、工作区选择器、附件与发送操作全部保留，仅在欢迎阶段把原生 hero 标题让位、把 hero 输入区下移 108 px。伙伴停靠在右下侧下方，不遮挡操作。

**会话页**：立绘经 `transform` 回到右下角并缩小，不透明度降为设置值；环境效果降档；伙伴回到用户保存位置；正文、代码、表格与复制按钮所在的「禁装饰区」不放置任何装饰元素。

**侧栏**：品牌标记为伙伴头像 + 环 + 风弧；选中项使用青玉窄条（`inset 2px 0`）；悬停不改变列表高度；DSH 原生导航与菜单行为不变。

**响应式**：`≤1180px` 收敛立绘与文案宽度；`≤960px` 欢迎页改为 8vw 起排、立绘缩小；`≤720px` 隐藏云纹与部分风痕线、设置页预览改为单列；`max-height: 720px` 降低欢迎页立绘的抬升量。会话页立绘另按 `characterPosition`（corner / edge）与 `characterOpacity`（low / medium / high）微调。

## 3. 角色转场

欢迎页与会话页共用**同一个** `.xiao-hero-frame` 节点，只改变 `transform` 与 `opacity`，因此转场连续、可反向、可中途打断：

| 阶段 | transform | opacity |
| --- | --- | --- |
| conversation | `translate3d(parallax) scale(0.94)` | 0.32（按设置） |
| entering-hero / hero | `translate3d(parallax - 3vw, parallax - 34vh) scale(1.24)` | 0.98 |

时长 700 ms（`cubic-bezier(.22,.68,.24,1)`）；`prefers-reduced-motion` 下降为 80 ms。阶段侦测只观察 DSH 的 `[data-phase='hero']` 标记，并带 700 ms 稳定窗口，初始加载不误播。

## 4. 魈伙伴

伙伴是主要交互入口；傩面不承担第二套浮标操作。

| 场景 | 行为 |
| --- | --- |
| 待机 | 3.6 s 周期漂浮 ±3 px，幅度 ≤ 1.01 缩放 |
| 悬停 | 环亮起，精灵轻微姿态变化 |
| 点击 | 打开状态面板（会话状态 + 可选余额） |
| 拖动 | `pointer` 捕获即时跟随，`requestAnimationFrame` 合并到单帧；释放后节流写回设置 |
| 点击/拖动判定 | 位移 ≤ 4 px 记为点击；超出即拖动，拖动结束不打开面板 |
| 键盘 | 伙伴自身聚焦时：方向键 8 px、Shift 32 px、Home 复位 |
| 发送反馈 | 虚线风环 + 火花 |
| 运行反馈 | 平稳旋转风环，无强闪烁 |
| 完成反馈 | 单次 420 ms 光环收束 + 轻跳 |
| 结束/停止 | 中性灰环 |
| 错误反馈 | 局部错误色环 + 明确的文字状态 |
| 欢迎页停靠 | 临时移动到 `{x:95, y:90}`，不覆盖用户保存位置；离开欢迎页自动复原 |
| 尺寸变化 | `ResizeObserver` + rAF 重新收敛到安全区域；不写回设置 |
| 低余额 | 仅伙伴环与文字变为旧金提示，整体不变红、不加速、不禁用任何交互 |

## 5. 动效参数

| 动效 | 参数 |
| --- | --- |
| 主立绘呼吸 | 6.5 s 循环，`scale 1 → 1.006`，位移 ≤ 1.5 px，不改布局 |
| 伙伴待机漂浮 | 3.6 s 循环，±3 px |
| 伙伴轻跳 | 900 ms（互动）/ 420 ms（完成） |
| 点击风痕 | 260 ms；节点池固定 6 个，每击 8 个碎片；半径上限 82 px |
| 环境光尘 | 14–26 s 非同步周期，`translate3d` + `opacity` |
| 运行状态环 | 2.4 s 线性旋转 |
| 完成光环收束 | 420 ms 单次 |
| 欢迎页视差 | 最大 3.5 px，仅沉浸档 + 页面稳定后启用 |
| 面板出现 | 180 ms |
| 导航选中脉冲 | 280 ms |
| 按压反馈 | 190 ms `filter: brightness(.96)`（不使用 transform，避免影响布局） |

## 6. 性能与生命周期预算

- 动画只使用 `transform` 与 `opacity`（按压反馈除外，为 `filter`）。
- 常驻动画元素上限：沉浸档 28 粒子 + 6 风痕节点 + 1 立绘 + 1 伙伴 ≈ 36，低于 40 的预算。
- 点击风痕使用固定节点池与 Web Animations API，**不使用 `setTimeout` 逐帧驱动**，连续点击不产生 DOM 分配。
- 流式回复不驱动装饰层：装饰只订阅会话状态枚举，不订阅 token 级变更。
- 页面隐藏时 `.xiao-overlay[data-hidden='true'] *` 统一 `animation-play-state: paused`，恢复时按当前状态继续，不补播。
- `prefers-reduced-motion: reduce` 时全部动画关闭、转场压缩到 80 ms、风痕与视差不启用（`data-reduced` 同时阻断 JS 侧调度）。
- 余额请求：自动 60 s、手动 15 s 下限、失败指数退避至 5 min、401/403 不重试；`useBalance(enabled)` 只在功能启用时才持有轮询。
- 插件关闭时释放：样式表、5 个宿主监听器、`MutationObserver`、rAF、定时器、风痕动画、视差变量、body 上的 `data-xiao-*` 属性。

## 7. 无障碍

- 伙伴为可聚焦按钮（`aria-label`、`aria-expanded`、`aria-haspopup="dialog"`、`aria-controls`、`aria-describedby`）。
- 面板 `role="dialog"`、`aria-modal="false"`、`aria-busy`；Escape 关闭并把焦点还给触发者；面板外指针按下即关闭。
- 会话反馈通过 `role="status"` + `aria-live="polite"` 播报。
- 欢迎页文案在可视层 `aria-hidden`，同时提供一条屏幕阅读器专用标题。
- 所有控件具备 `:focus-visible` 可见焦点。
