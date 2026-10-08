# dsh-xiao-theme 1.2.0

Xiao 1.2.0 adds a profile-local custom background and moves Xiao's full preferences to a dedicated DSH Settings section.

## Changes

- Select a local PNG, JPEG, or WebP background. The client scales and encodes it as bounded WebP, stores it in the active DSH Profile, and never uploads the source image.
- Adjust background visibility from 0–100% (default 75%). The value changes Xiao surface transparency in light and dark themes, rather than tinting the image; the maximum still leaves surfaces opaque enough for readable content.
- Optionally derive Xiao's accent colors from the image while preserving semantic success, warning, and error colors.
- Open the full Xiao controls from **Settings → Xiao**, separate from General settings.
- Existing session feedback, motion, balance behavior, and artwork are preserved.

## Validation

- `npm run verify` passes, including tests for bounds, profile defaults and recovery, dominant-color extraction, light/dark contrast, and the 0%, 75%, and 100% surface-opacity values.
- DSH Desktop CLI `0.2.0-rc.2` installs the packed candidate into an isolated profile; the installed bundle contains the `settings.section` registration and custom-background controls.
- No Web UI acceptance was performed for this release.

## Distribution

- Version: `1.2.0`
- Channel: GitHub Release, with a versioned tarball, a byte-identical `dsh-xiao-theme-latest.tgz`, and `SHA256SUMS.txt`.
- This release is not published to npm.
- SHA-256 for both tarballs: `559989234c1b6118a902b75a03452d23af41826fe8bccff4eb52f3638a700acd`.
