# Xiao 1.3.0-rc.1 验收候选

2026-10-18，Asia/Shanghai。正式目标仍为 1.3.0，当前使用显式 RC。用户已授权发布 GitHub prerelease、npm next，并在 registry 可下载后精确安装配套 RC；不覆盖 latest。

## 配套要求

- 配套 Kinich 为 **2.0.3-rc.1**，不再复用旧 2.0.2 版本号打包新增功能。
- 同一 Profile 同时安装但只能启用一个主题。开启前先关闭另一主题，失败时中止；旧冲突默认保留 Kinich。配置和素材保留。
- Kinich 原来没有主题总开关，因此完整双向切换需要同时升级配套包。旧包混装边界见升级规格。

## 本轮交付

- 主题关闭完整释放品牌、视觉和交互影响；新增 Kinich 总开关。
- 背景独立开关、真正隐藏的 0%、独立一次采色；弹窗、菜单与选择器不透明。
- 页面观察器过滤及新版 pending-interaction 会话状态适配。
- 保留所有已交付动效。详细行为由 UPGRADE_1.3.0_SPECIFICATION.md 约束。

## 分发规则

- 用户此前要求本机使用插件市场 npm 来源，默认不把 desktop 依赖改成 file:/link:。
- RC 如获发布授权，应使用 npm 的 next 标签及 GitHub prerelease，不覆盖 latest；安装时精确指定两项 RC 版本。
- 未经单独验收确认不将 Kinich 2.0.3 标记为 confirmed，不把 RC 称为稳定版。
- 本机宿主为 DSH 0.2.1-rc.2；未执行本轮 Computer Use，桌面视觉验收由用户完成。
