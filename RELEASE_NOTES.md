# Xiao Theme v1.3.0-rc.1 — acceptance candidate

Xiao and the accompanying **Kinich 2.0.3-rc.1** enforce one active character theme per Profile. Switching first disables the other theme and retains all its data. A failed disable aborts the switch; legacy startup conflicts keep Kinich. Brand slots and interaction effects are released when disabled.

Adds an independent background switch, completely hidden 0% backgrounds, solid dialogs/menus in both color modes, filtered page observation and pending-interaction session feedback. Existing artwork and motion remain available. Automatic accent uses the saved import sample independently of background visibility.

Declared host/settings range remains `>=0.2.0-rc.2 <0.3.0`. Isolated host startup/restart checks ran on the local **0.2.1-rc.2**, which is not a stable release. Desktop visual acceptance is pending. Distribute this candidate through GitHub prerelease and npm next, paired with Kinich 2.0.3-rc.1; latest stays on the existing stable release.

Install both exact candidates after fully exiting Desktop:

```powershell
dsh plugin --profile desktop add dsh-xiao-theme@1.3.0-rc.1 dsh-kinich-theme@2.0.3-rc.1 --save-exact
```
