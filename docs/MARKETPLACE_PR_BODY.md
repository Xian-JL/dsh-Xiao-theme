## Plugin

- Repository: https://github.com/Xian-JL/dsh-Xiao-theme
- Category: `theme`
- Package: `dsh-xiao-theme`, current release `v1.2.0`
- Distribution: prebuilt GitHub Release tarball; no npm publication

Xiao character theme for DeepSeek Harness with light/dark palettes, selectable character illustrations, a draggable companion, session-state feedback, optional official DeepSeek balance display, and profile-local custom backgrounds with an adjustable visibility control. Xiao's complete preferences have a dedicated Settings section. This is a separate Xiao theme from the existing Kinich entry.

## Installation

```sh
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Xiao-theme/releases/latest/download/dsh-xiao-theme-latest.tgz
```

## Validation

- `npm run verify` passes, including the 1.2.0 background, palette, and settings-section coverage.
- The author has completed local Desktop acceptance on DSH `0.2.0-rc.2`.
- The submission adds only `data/plugins/Xian-JL__dsh-Xiao-theme.yml` under `theme` and leaves existing entries unchanged.
- Entry-schema validation, generated README checks, awesome-lint with upstream repository context, 18 upstream tests, and the CI-mode site build pass locally.
- Character-art sources and processing are documented in `THIRD_PARTY_ASSETS.md`; the code license excludes third-party art.

## Checklist

- [x] One plugin YAML entry
- [x] `package.json` declares `dsh.bundle` and includes `cordis.patch.yml`
- [x] Accurate descriptions and `theme` category
- [x] Public repository and anonymously downloadable Release asset
- [ ] Repository is at least one day old: eligible from `2026-10-03T05:52:28Z`
- [x] `dsh-plugin` topic

The repository is public and the Release tarball has been downloaded anonymously and verified against its SHA-256. The repository-age gate is pending until `2026-10-03T05:52:28Z`; the gate rechecks age automatically. The age item will be marked complete only after it passes.
