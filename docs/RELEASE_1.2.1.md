# Xiao 1.2.1: npm distribution and complete host metadata

2026-10-16. npm is now the primary distribution source; GitHub Release remains a fallback. Package metadata includes version, repository/homepage/bugs, Node and React requirements, manifest/bundle/client declarations and matching DSH/settings-peer requirements: `>=0.2.0-rc.2 <0.3.0`.

The market's npm discovery supplies the version and host requirement that were unavailable while this package was GitHub-only. Market `installTargetFor` prioritizes a verified npm package over the existing fallback tarball, so removing that fallback from the upstream entry is unnecessary. PR #6404 is merged; catalog npm probes run separately.

Runtime behavior and default settings remain the accepted 1.2.0 implementation. Existing saved configuration is kept when changing installation source; the migration removes old local code/dependencies before registry installation and verifies source and version afterward.
