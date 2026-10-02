# Xiao · Vigil of the Azure Sky (dsh-xiao-theme)

An independent character theme plugin for DeepSeek Harness (Web and Desktop). It rebuilds the interface hierarchy in **jade, ink-teal and moon-white**, offers a choice of two character artworks in the same welcome/conversation slot, and adds a draggable Xiao companion, amplified wind traces and ambient motes, and optional official DeepSeek balance monitoring.

> All interface copy is original theme copy and is not presented as official character dialogue. Character artwork sources and licensing notes are in [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md).

## Features

- **Complete light and dark themes** built from roughly 80 semantic tokens. Light/dark follows DSH; the "minimal / balanced / immersive" presets only change decoration strength.
- **One visual language** across the sidebar brand, welcome page, conversation page and settings.
- **Two character artworks**: choose the standing illustration or birthday artwork; the selected image shares one welcome/conversation slot and its reversible, interruptible 700 ms transition.
- **Xiao companion**: idle float, hover, click-to-open status panel, drag with saved position, arrow-key movement (Shift to accelerate, Home to reset), and a temporary welcome-page dock that never overwrites the user's position. Its status and balance panel chooses a clear side from the companion's location.
- **Truthful session feedback**: sending, running, completed, ended, failed, stopped, unknown and awaiting-input, isolated per `sessionId` so background sessions cannot repaint the main view.
- **Optional official balance**: off by default. When enabled the Host reads `https://api.deepseek.com/user/balance`; the API key never reaches the client. Below CNY 10 the companion shows a local warning only.
- **Amplified motion system**: breathing, companion reactions, click wind traces, ambient motes and immersive parallax use three times their original amplitude, with bounded effects and reduced-motion support.
- **Durable settings**: serialized writes, visible failure feedback, position reset and full reset; disabling the plugin releases styles, listeners and timers.

## Install

```powershell
dsh plugin --profile web add "E:\Codex_workspace\dsh-Xiao-theme\dsh-xiao-theme-1.1.1.tgz"
dsh web
```

Remove:

```powershell
dsh plugin --profile web remove dsh-xiao-theme
```

Then open **Settings → General → Xiao theme**. The theme is enabled by default; the balance readout is off by default.

## Coexistence with other character themes

- `dsh-kinich-theme` may stay installed. This plugin never disables, edits or removes another plugin.
- For the first release, keep only one full character theme enabled per profile: both take over the sidebar brand slots and a set of theme tokens, so enabling two at once produces unpredictable visuals.

## Settings

| Group | Settings |
| --- | --- |
| Theme | Enable the Xiao theme |
| Visual intensity | Presentation (minimal / balanced / immersive), main illustration choice, conversation visibility and position, character visibility, breathing, welcome parallax |
| Xiao companion | Show companion, size, horizontal direction, idle animation, reset position |
| Session feedback | Converge decoration while running |
| Environment | Background ornament, ambient particles, click wind trace |
| Official balance | Show the official DeepSeek balance |
| Reset | Reset companion position, reset all settings (two-step confirm) |

## Development

```powershell
npm install
npm run assets    # python scripts/extract-assets.py (requires Pillow)
npm run build     # esbuild Host and Client bundles
npm run verify    # build + contract checks + all tests
```

```
assets/source/     untouched originals (excluded from the package)
assets/...         processed assets
src/host/          Host entry, settings schema, balance route
src/client/        theme, scene, companion, session, balance, motion, settings
scripts/           build, check, tests, asset pipeline
lib/               prebuilt distribution artifacts
docs/              design/motion, compatibility baseline, validation record
```

## Compatibility

- Verified on **DSH 0.2.0-rc.2** (Node v24.x): isolated profile install, composition, page manifest and the Host balance route.
- Declared range: `^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2` (inherited declaration; only 0.2.0-rc.2 was exercised).
- See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) and [docs/VALIDATION.md](docs/VALIDATION.md).

## License

Source code is licensed under [LICENSE](LICENSE). Character artwork is not covered by that grant; see [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md).
