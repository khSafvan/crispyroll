# Crispyroll Development Plans & Page Status

This document tracks the current development milestone, screen implementation status, and checklist of tasks required before the next release.

---

## Milestone Target: `0.1.0`

### 🟢 Completed Pages & Core Subsystems
- [x] **Animated Splash Screen (`src/renderer/screens/loading.js`)**: Smooth animated SVG stroke-draw and fill logo with automated screen handoff.
- [x] **Split-Screen Authentication (`src/renderer/screens/login.js`)**: Fast TV device-code pairing (`crunchyroll.com/activate`) with live QR generation, alongside manual email/password auth with inline validation.
- [x] **Multi-Profile Switcher & Creator (`src/renderer/screens/profiles.js`)**: Circular profile avatars, dynamic avatar catalog picker, and state tear-down on switch.
- [x] **Dedicated PIN Security Screen (`src/renderer/screens/profiles.js`)**: 4-digit PIN verification with brute-force lockout and hold-to-clear input sweep.
- [x] **Vinyl Gallery Home Screen (`src/renderer/screens/home.js`)**: Full Cinematic Hero Banner, 80% desaturated monochrome idle cards $\rightarrow$ 100% full vibrant color on focus, top-right score badge (`⭐ 8.8`), and Continue Watching priority row.
- [x] **Infinite Edge Overlay Sidebar (`src/renderer/screens/menu.js`)**: 56px ultra-thin rail expanding to 280px overlay on focus/hover with zero layout shifts.
- [x] **Universal Search (`src/renderer/screens/search.js`)**: Alphabetical paginated catalog with 25 items/page and clean title sanitization.
- [x] **Watchlist / My List (`src/renderer/screens/mylist.js`)**: Grid view with dynamic status toggle and monochrome focus transitions.
- [x] **Watch History (`src/renderer/screens/history.js`)**: Synchronized playhead tracking and resumption.
- [x] **Video Player (`src/renderer/screens/video.js`)**: Widevine DRM decoding, customizable OSD, Auto-Next episode countdown, Skip Intro/Credits triggers, multi-audio/subtitle switching, playback speed, and aspect ratio controls.
- [x] **Settings & Account Screen (`src/renderer/screens/settings.js`)**: Language preferences, video resolution presets, gamepad support toggle, AniList tracker OAuth2 integration, and in-app legal disclaimer.
- [x] **Native Exit App Flow (`src/renderer/screens/exit.js`)**: Clean root ESC/Back confirmation dialog triggering Electron window termination.
- [x] **On-Screen Keyboard (`src/renderer/screens/keyboard.js`)**: D-Pad navigable virtual keyboard for search and login fields.
- [x] **Catalog Metadata Caching (`src/main/catalogCache.js`)**: Local disk cache with AniList community ratings enrichment and automated deduplication.
- [x] **Universal Title Sanitizer (`src/renderer/utils/sanitizeTitle.js`)**: Automated stripping of noisy dub/audio tokens without mangling anime subtitles.

### 🟡 Pages & Subsystems Requiring More Polish
- [ ] **Series Details & Overview (`src/renderer/screens/home-details.js`)**: Polish season grouping, audio locale tags, and background banner art.
- [ ] **Episodes Grid (`src/renderer/screens/home-episodes.js`)**: Polish episode thumbnail grid, title sanitization, and progress bars.
- [ ] **Category & Genre Browser (`src/renderer/screens/browse.js`)**: Expand genre filtering chips and sub-category carousels.

### 🔴 Pages & Features to Finalize Before First Release (v0.1.0)
- [ ] **Interactive Release Notes / What's New Viewer (`src/renderer/screens/changelog.js`)**: Rich modal displaying release highlights directly from `RELEASES.md`.
- [ ] **Tracker Connections (MyAnimeList & Kitsu)**: Completing the OAuth flows for MAL and Kitsu alongside AniList.
- [ ] **Network / Playback Diagnostics**: Connection testing & stream bitrate diagnostics overlay.
