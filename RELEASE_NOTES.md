# Xiao 1.3.0-rc.3 — readability and lifecycle improvements

2026-10-23. Adds read-only light/dark palette previews drawn from the emitted theme tokens and repairs failing text/button contrast on opaque theme surfaces. Saved wallpaper samples, historical derived palettes, semantic status colours and existing motion remain intact.

Adds a 15-second client balance timeout, request cancellation and active-consumer gating. Credential changes while disabled only invalidate the old cache, and old transports no longer block a new account. Manual refresh feedback is guarded against stale results.

Paired candidates: Kinich 2.0.3-rc.3 / Xiao 1.3.0-rc.3. Distribute through GitHub prerelease and npm next without changing latest. No Desktop download or replacement is included. Full checks, 20,544 contrast pairs, controlled lifecycle cases and isolated DSH 0.2.1-rc.2 startup/restart checks support this candidate; they do not constitute a new user Desktop visual acceptance or whole-page WCAG claim over arbitrary wallpaper pixels. See docs/ECOSYSTEM_OPTIMIZATION_2026-10-23.md. Earlier notes below are historical snapshots.

# Xiao 1.3.0-rc.2 — settings section shortcuts

2026-10-19. Adds eight localized settings shortcuts with keyboard activation, target focus, wrapping layout and independent IDs per settings instance. Read-only settings remain navigable. Existing theme, background and companion behaviour is preserved.

Pairs with Kinich 2.0.3-rc.2. Distribute through npm next without changing latest. This publication does not replace the Desktop installation. The previously accepted rc.1 remains the baseline; the shortcuts have behaviour and isolated-host checks, without claiming a new Desktop visual acceptance. Earlier notes below are historical snapshots.

# Xiao Theme v1.3.0-rc.1 — acceptance candidate

Xiao and the accompanying **Kinich 2.0.3-rc.1** enforce one active character theme per Profile. Switching first disables the other theme and retains all its data. A failed disable aborts the switch; legacy startup conflicts keep Kinich. Brand slots and interaction effects are released when disabled.

Adds an independent background switch, completely hidden 0% backgrounds, solid dialogs/menus in both color modes, filtered page observation and pending-interaction session feedback. Existing artwork and motion remain available. Automatic accent uses the saved import sample independently of background visibility.

Declared host/settings range remains `>=0.2.0-rc.2 <0.3.0`. Isolated host startup/restart checks ran on the local **0.2.1-rc.2**, which is not a stable release. Desktop visual acceptance is pending. Distribute this candidate through GitHub prerelease and npm next, paired with Kinich 2.0.3-rc.1; latest stays on the existing stable release.

Install both exact candidates after fully exiting Desktop:

```powershell
dsh plugin --profile desktop add dsh-xiao-theme@1.3.0-rc.1 dsh-kinich-theme@2.0.3-rc.1 --save-exact
```
