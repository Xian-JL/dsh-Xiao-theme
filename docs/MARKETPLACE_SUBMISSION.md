# 魈主题插件市场提交全流程

目标：向 `awesome-dsh-plugin/awesome-dsh-plugin` 提交魈主题条目，由其目录同步至 dsh-market 的主题页。插件仍采用 GitHub Release 分发，不发布 npm。

依据：上游 [contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)、[PR 模板](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/.github/pull_request_template.md) 和已合并的 [Kinich PR #5095](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/5095)。本轮市场基线为 `bb8496ec4cbb9217b33bf081ec4cdf06b51501e8`。

## 1. 当前基线

| 项目 | 状态 |
| --- | --- |
| 插件 | `dsh-xiao-theme@1.1.3` |
| 源码 | `https://github.com/Xian-JL/dsh-Xiao-theme`，目前私有 |
| Release | `v1.1.3`，已含预构建安装包 |
| 验证 | 300 条断言通过；旧版风痕边框问题已在实际 Chromium 中复现并做修复对照；用户已完成 Desktop 验收 |
| 分发 | GitHub Release，不发布 npm |
| 仓库创建时间 | `2026-10-02T05:52:28Z`，北京时间 2026-10-02 13:52:28 |
| 满 24 小时时间 | 北京时间 **2026-10-03 13:52:28** |

市场通过无作者权限的访问读取仓库清单与安装包，因此私有源码/Release 不能作为可安装的公开条目。改为公开会暴露当前代码、历史提交、原始及处理后图片、已有 Release；必须由仓库所有者明确确认。

第三方素材来源见 `THIRD_PARTY_ASSETS.md`。原作者及素材许可尚未全部核实；来源记录不能被写成授权证明。市场提交材料不得声称这些图片属于本项目代码许可或已获完整再分发许可。

## 2. 分发准备

1. 保留固定版本资产 `dsh-xiao-theme-1.1.3.tgz`。
2. 为同一 Release 增加字节完全相同的 `dsh-xiao-theme-latest.tgz`。
3. 增加 `SHA256SUMS.txt`，记录固定版本和 latest 两个包的 SHA-256。
4. 市场使用下列稳定链接：

   `https://github.com/Xian-JL/dsh-Xiao-theme/releases/latest/download/dsh-xiao-theme-latest.tgz`

`latest/download/` 会选择最新 Release，但文件名照字面匹配。以后每次发行都必须上传同名 latest 资产；不能把带版本号的文件名放在 latest URL 后面，否则下次发版会变成 404。

公开后验证安装包的匿名下载、文件摘要和 `package.json` 中的 `dsh.bundle.patch`。可安装命令：

```powershell
& 'E:\Deepseek-harness\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add 'https://github.com/Xian-JL/dsh-Xiao-theme/releases/latest/download/dsh-xiao-theme-latest.tgz'
```

Desktop 安装或更新前需完全退出客户端。市场 PR 的验证使用隔离 Profile，不把正式会话、凭据和设置作为测试材料。

## 3. 仓库元信息

- 设置清楚的 GitHub 仓库描述。
- 增加 `dsh-plugin` topic；可增加 `deepseek-harness`、`theme` 和 `xiao`。
- 保持根 `package.json` 的 `dsh.bundle`、`cordis.patch.yml` 和预构建 `lib/` 可读取。
- 截图可选。以后如需市场截图，在插件仓库根放 `screenshots.json`，列出 1–8 张干净演示图片；不在市场仓库追加 `data/screenshots.json`。已有验收截图包含用户会话内容，不作为市场展示图。

## 4. 市场条目

从最新上游 `main` 新建 `add-xiao-theme` 分支。本轮隔离工作目录：`E:\Codex_workspace\.xiao-market-pr`。

只新增 `data/plugins/Xian-JL__dsh-Xiao-theme.yml`：

```yaml
url: https://github.com/Xian-JL/dsh-Xiao-theme
name: Xian-JL/dsh-Xiao-theme
category: theme
description:
  en: "Xiao character theme for DeepSeek Harness Web and Desktop with light and dark palettes, selectable illustrations, a draggable companion, session-state feedback, and optional official DeepSeek balance display."
  zh: "面向 DeepSeek Harness Web 与 Desktop 的魈角色主题，提供明暗配色、可切换立绘、可拖动伙伴、会话状态反馈及可选的官方 DeepSeek 余额展示。"
tarball: https://github.com/Xian-JL/dsh-Xiao-theme/releases/latest/download/dsh-xiao-theme-latest.tgz
```

- `theme` 分类进入 dsh-market 主题页。
- `tarball` 为市场当前支持的安装源字段。
- npm 是可选项；不得添加无人读取的 `npm:` 字段。
- 只修改魈条目；不修改 Kinich 条目或其他插件。
- 市场 README 和站点由数据生成，不手工编辑。可以本地生成验证，但生成结果不进入本次单条目 PR。

## 5. 校验与提交

1. 安装市场仓库开发依赖：`npm ci --ignore-scripts`。
2. 通过 `scripts/lib/entries.mjs` 解析并校验 YAML，确认字段、分类、文件名与仓库 URL 一致且不重复。
3. 按上游 PR workflow 执行 README 生成、条目检查和站点构建；完成后撤销仅用于本地预览的生成文件改动。
4. 确认最终 PR diff 为 **新增 1 个 YAML，删除 0 个条目**。
5. 推送分支至 `Xian-JL/awesome-dsh-plugin:add-xiao-theme`。
6. 创建指向 `awesome-dsh-plugin/awesome-dsh-plugin:main` 的 PR，标题 `Add dsh-Xiao-theme`，正文说明实际功能、GitHub tarball 分发及验证结果。

只有仓库和安装包公开可访问后才提交 PR。如果仅仓库年龄未满，可在 PR 正文明确待通过的时间门槛，等待上游自动重检；不能勾选未完成项或宣称全部 CI 已通过。

## 6. CI、评审和合并

- CI 检查提交数量、YAML 格式、`dsh.bundle`、仓库年龄以及 README/站点构建。
- 仓库必须创建满 1 天。本轮最早达标时间为 2026-10-03 13:52:28（北京时间）。
- 当前 gate 用实际检查时间计算年龄；仅年龄不达标时，上游会定期重检，无需制造空提交、关闭或重复创建 PR。
- CI 通过后仍由维护者阅读源码、核对描述和决定是否合并。
- 需要修改时，在同一分支提交修正，PR 自动更新。
- 合并后市场目录和站点自动重建；客户端目录同步可能有延迟。检查公开条目、主题分类、安装链接和所展示版本，再确认收录完成。

## 7. 后续发版

每次新版本依次完成：代码与版本一致 → 构建/验证 → tag 和 GitHub Release → 固定版本 tgz → 同名 latest tgz → 更新 SHA256SUMS → 检查匿名下载和目录同步。

只更新版本与同名 latest 安装包时通常无需新市场 PR。条目描述、仓库 URL、分类或 tarball 字段发生变化时，才修改本条目并提交更新 PR。

## 8. 本轮执行结果

- 已从最新上游基线建立 `add-xiao-theme`，提交 `3d1f07ab2`。
- 分支已推送至用户 fork；[查看待提交差异](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare/main...Xian-JL:add-xiao-theme)。最终提交只新增一个 YAML。
- 目录解析校验通过：4413 条记录，魈条目恰好 1 条，字段校验错误为 0。
- 仓库描述和 `dsh-plugin` topic 已设置。
- v1.1.3 已增加 `dsh-xiao-theme-latest.tgz` 和 `SHA256SUMS.txt`。固定版本包与 latest 包的 SHA-256 均为 `e4a5e7fcaace4aa8c06680f11d00619f08d71e85461c59ced58ad386b2cc8ac7`。
- 当前仓库仍私有，公开转换等待仓库所有者确认，尚未创建市场 PR。
- README 生成校验通过。Windows 上运行 awesome-lint 时需显式使用相对路径：`npx awesome-lint README.md`；不带路径会把 Windows 盘符误认为 URL。
- 本地站点验证使用上游 PR workflow 的 `SKIP_PUBLISH_CHECKS=1`，用于不发布站点的 CI 预览；它不会改动市场线上发布规则。

PR 链接、公开状态、CI 与评审结果在实际完成后补充，不能将“已准备”当作“已提交”或“已合并”。
