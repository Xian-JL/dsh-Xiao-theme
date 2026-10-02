## Plugin

- Repository: https://github.com/Xian-JL/dsh-Xiao-theme
- Category: `theme`
- Package: `dsh-xiao-theme`, current release `v1.1.3`
- Distribution: prebuilt GitHub Release tarball; no npm publication

Xiao character theme for DeepSeek Harness Web and Desktop with light/dark palettes, selectable character illustrations, a draggable companion, session-state feedback, and optional official DeepSeek balance display. This is a separate Xiao theme from the existing Kinich entry.

## Installation

```sh
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Xiao-theme/releases/latest/download/dsh-xiao-theme-latest.tgz
```

## Validation

- `npm run verify` passes with 300 assertions.
- The author has completed local Desktop acceptance on DSH `0.2.0-rc.2`.
- The submission adds only `data/plugins/Xian-JL__dsh-Xiao-theme.yml` under `theme` and leaves existing entries unchanged.
- Entry-schema validation, generated README checks, awesome-lint with upstream repository context, 18 upstream tests, and the CI-mode site build pass locally.
- Character-art sources and processing are documented in `THIRD_PARTY_ASSETS.md`; the code license excludes third-party art.

## Checklist

- [x] One plugin YAML entry
- [x] `package.json` declares `dsh.bundle` and includes `cordis.patch.yml`
- [x] Accurate descriptions and `theme` category
- [ ] Public repository and anonymously downloadable Release asset
- [ ] Repository is at least one day old: eligible from `2026-10-03T05:52:28Z`
- [x] `dsh-plugin` topic

This submission is prepared for review. Pending publication and repository-age items will be updated when they actually pass.
