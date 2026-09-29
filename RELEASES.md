# Crispyroll Releases

This file maintains the array of all past and current releases. The version manager script (`scripts/version-manager.js`) parses this array and `PLANS.md` to compute progress and versioning without requiring AI.

```json
[
  {
    "version": "0.1.0-beta.4",
    "date": "2026-08-31",
    "type": "beta",
    "milestone": "0.1.0",
    "notes": "Automated progress build: 15/23 tasks (65%) completed towards v0.1.0."
  },
  {
    "version": "0.1.0-beta.3",
    "date": "2026-08-31",
    "type": "beta",
    "milestone": "0.1.0",
    "notes": "Automated progress build: 15/21 tasks (71%) completed towards v0.1.0."
  },
  {
    "version": "0.1.0-rc.1",
    "date": "2026-09-01",
    "type": "pre-release",
    "milestone": "0.1.0",
    "notes": "Release Candidate 1: UI overhaul, Vinyl Gallery layout, Widevine DRM, AniList tracker, and legal disclaimers."
  },
  {
    "version": "0.1.0-beta.1",
    "date": "2026-08-30",
    "type": "pre-release",
    "milestone": "0.1.0",
    "notes": "Beta 1: Migration from forked upstream, new layout engine, and multi-profile PIN support."
  }
]
```
