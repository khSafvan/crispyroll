# Crispyroll Development Guide

This document contains instructions for setting up the development environment, running from source, building Linux packages, understanding the architecture, design system conventions, and diagnosing development-specific issues.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup & Running in Dev Mode](#setup--running-in-dev-mode)
- [Tier 1 Tooling & Developer Workflow](#tier-1-tooling--developer-workflow)
  - [1. Live-Reload with Nodemon (`npm run dev`)](#1-live-reload-with-nodemon-npm-run-dev)
  - [2. ESBuild Bundler (`npm run bundle`)](#2-esbuild-bundler-npm-run-bundle)
  - [3. Structured File Logging (`electron-log`)](#3-structured-file-logging-electron-log)
  - [4. Encrypted Configuration Store (`electron-store`)](#4-encrypted-configuration-store-electron-store)
  - [5. Unhandled Error Trapping (`electron-unhandled`)](#5-unhandled-error-trapping-electron-unhandled)
  - [6. Linting & Formatting (`eslint`, `prettier`)](#6-linting--formatting-eslint-prettier)
- [Testing](#testing)
- [Building Packages](#building-packages)
- [Architecture Overview](#architecture-overview)
- [Design System: Onyx & Ember](#design-system-onyx--ember)
- [Crunchyroll API Architecture](#crunchyroll-api-architecture)
- [Developer Troubleshooting & Environment Flags](#developer-troubleshooting--environment-flags)
  - [1. Linux Sandbox & Zygote Execution](#1-linux-sandbox--zygote-execution)
  - [2. GPU Acceleration & Headless / VM Fallback](#2-gpu-acceleration--headless--vm-fallback)
  - [3. Wayland / Ozone Display Server Configuration](#3-wayland--ozone-display-server-configuration)
  - [4. Widevine CDM Component Discovery & Cache](#4-widevine-cdm-component-discovery--cache)
  - [5. Wayland Color Management Protocol Warnings](#5-wayland-color-management-protocol-warnings)
- [Resolved Bug Fixes Archive](#resolved-bug-fixes-archive)
- [Contributing](#contributing)
- [License & Credits](#license--credits)

---

## Prerequisites

- **Node.js**: `v20.0.0+` or `v22.0.0+` (Node 22 LTS recommended)
- **npm**: `v9.0.0+`
- **CastLabs Electron**: Crispyroll requires the [castlabs/electron-releases](https://github.com/castlabs/electron-releases) fork (`v40.7.0+wvcus`) to enable Google Widevine CDM and proprietary video codecs for DRM-protected Crunchyroll streams on Linux. Standard vanilla npm Electron cannot decrypt Widevine streams.

---

## Setup & Running in Dev Mode

### Quick Setup (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/khSafvan/crispyroll.git
cd crispyroll

# 2. One-command setup (installs clean deps, builds bundles, runs verification)
make setup

# 3. Launch live-reload development server
make dev
```

### Manual Setup

```bash
cp .env.example .env
npm install
npm run bundle
npm start
```

The `start` and `dev` commands run `electron --no-sandbox --no-zygote .` with automatic pre-bundling to ensure compatibility across modern Linux kernels and user namespaces.

---

## Tier 1 Tooling & Developer Workflow

### 1. Live-Reload with Nodemon (`npm run dev`)

Crispyroll includes `nodemon` configured to watch `src/` and `index.html`. Modifying any renderer script, main process module, or stylesheet automatically relaunches the Electron process:

```bash
npm run dev
```

### 2. ESBuild Bundler (`npm run bundle`)

Modern ES modules and third-party renderer dependencies (e.g. `qrcode`, DOM utilities) are bundled via `esbuild`:

```bash
npm run bundle
```

- **Entry Point**: `src/renderer/index-module.js`
- **Output**: `src/renderer/bundle.js` (IIFE format, sourcemaps enabled)
- **Script**: `scripts/bundle.js`

### 3. Structured File Logging (`electron-log`)

Logs from both Main and Renderer processes are formatted and rotated automatically using `electron-log`:

- **Log File Location**: `~/.config/crispyroll/logs/main.log`
- Used for tracking startup lifecycle, Widevine discovery, auth status, and network error reporting.

### 4. Encrypted Configuration Store (`electron-store`)

User preferences and persistent application flags are stored with AES-256 encryption via `src/main/store.js`:

- **Config Path**: `~/.config/crispyroll/config.json`
- Stores UI preferences, player settings, and controller mappings safely on disk.

### 5. Unhandled Error Trapping (`electron-unhandled`)

Uncaught exceptions and unhandled promise rejections in both main and renderer processes are caught, logged to `main.log`, and prevented from causing silent UI freezes.

### 6. Linting & Formatting (`eslint`, `prettier`)

Pinned ESLint 9 (Flat Config) and Prettier enforce code quality:

```bash
# Check for lint errors
npm run lint

# Auto-format all files
npm run format
```

---

## Testing

Crispyroll includes an automated standalone test runner with 19 unit test suites covering pure utilities, gamepad mappings, translation, data mappers, Widevine discovery, encrypted store, video contracts, PIN lock verification, auth flows, Phosphor icons, sidebar restructure, search engine, catalog cache, and DOM layout integrity.

```bash
npm test
```

Test files reside in `tests/` and execute in pure Node.js without requiring a display server.

---

## Building Packages

### 1. Build Linux AppImage

```bash
npm run build
```

Compiles and packages the Linux AppImage in the `dist/` directory (e.g. `dist/Crispyroll_0.1.0-beta.4_linux.AppImage`).

### 2. Build Unpacked Directory (for Flatpak / Testing)

```bash
npm run build:dir
```

Outputs the unpacked Linux x64 binary and runtime resources to `dist/linux-unpacked/`.

---

## Architecture Overview

```
crispyroll/
├── src/
│   ├── main/                  # Electron Main Process
│   │   ├── index.js           # App lifecycle, window management, flags, IPC
│   │   ├── gamepad.js         # Gamepad IPC to keystroke event translator
│   │   ├── store.js           # Encrypted configuration store (AES-256)
│   │   └── widevine.js        # Host Widevine CDM discovery & cache
│   ├── preload/
│   │   └── preload.js         # Context-isolated IPC bridge (electronUtilsRender)
│   └── renderer/              # Renderer Process (UI / Presentation)
│       ├── core/              # Core abstractions (DOM, session, service, mappers)
│       ├── electron/          # Renderer IPC listeners (controller-listener.js)
│       ├── screens/           # Screen controllers (home, login, profiles, video, etc.)
│       ├── styles/            # CSS design system (variables, base, components/)
│       ├── utils/             # Pure utilities (timing, colorExtractor, formatters, sanitizeTitle, domUtils)
│       └── vendor/            # Vendored libraries (dash.js, jquery, slick, font-awesome)
├── scripts/                   # Build, bundle, and version automation (bundle.js, version-manager.js)
└── tests/                     # 19 Standalone Node.js unit test suites
```

---

## Design System: Onyx & Ember

All interface styles are defined in `src/renderer/styles/variables.css` and use the **Onyx & Ember** palette.

### Flat Design Principles

1. **No Drop Shadows or Glows**: Avoid `box-shadow`, `text-shadow`, and glow filters (`box-shadow: none !important`).
2. **Surface Step Hierarchy**: Depth is achieved strictly through flat surface-color steps:
   - Canvas: `--cr-canvas` (`#0d0d11`)
   - Surface 1: `--cr-surface-1` (`#16161d`)
   - Surface 2: `--cr-surface-2` (`#1f1f28`)
   - Hairline Borders: `--cr-border` (`#2a2a36`)
3. **Dual Focus Indicator**: Focused interactive elements use an Ember Orange border (`--cr-accent`, `#ff6600`) plus a crisp white outer ring (`--cr-focus-indicator`, `#ffffff`) with `scale(1.03-1.05)`.
4. **Spatial Navigation**: All elements must support 2D directional navigation with full wrapping and focus trapping when overlays are open.

---

## Crunchyroll API Architecture

High-level overview of the API endpoints used by the service layer:

- **OAuth Device Authorization**:
  - `POST /auth/v1/device/code`: Requests a user code (`USER_CODE`) and QR URL for TV activation.
  - `POST /auth/v1/device/token`: Polls for authorization (returns HTTP 204 while pending).
- **Password Grant Authentication**:
  - `POST /auth/v1/token`: Authenticates username/password credentials.
- **Multi-Profile Switching & PIN Verification**:
  - `POST /accounts/v1/me/multiprofile/{profile_id}/switch`: Switches profile context. For PIN-protected profiles, sends `{ pin: "1234" }` payload for real API validation.
- **Avatar Catalog**:
  - `GET /assets/v2/{locale}/avatar`: Returns official Crunchyroll profile avatars.
- **Discover / Home Feed**:
  - `GET /content/v2/discover/{locale}/home_feed`: Returns curated category rows and promotional spotlight panels.
- **Playback & DRM Streams**:
  - `GET /content/v2/cms/objects/{id}/playback`: Retrieves DASH manifest URL and Widevine DRM licensing ticket.

---

## Developer Troubleshooting & Environment Flags

### 1. Linux Sandbox & Zygote Execution

If you encounter `SIGTRAP`, user namespace errors, or `exitCode: 1002`, ensure the process bypasses the zygote fork model:

```bash
electron --no-sandbox --no-zygote .
```

### 2. GPU Acceleration & Headless / VM Fallback

On virtual machines or systems with unsupported proprietary GPU drivers:

```bash
DISABLE_GPU=1 npm start
```

### 3. Wayland / Ozone Display Server Configuration

Crispyroll defaults to auto-detecting Wayland vs X11 (`ozone-platform-hint=auto`). To force native Wayland:

```bash
ENABLE_WAYLAND=1 npm start
# Or:
OZONE_PLATFORM=wayland npm start
```

### 4. Widevine CDM Component Discovery & Cache

`src/main/widevine.js` automatically searches for `libwidevinecdm.so` across installed host browsers (Firefox, Chrome, Chromium, Brave, Flatpak). If auto-discovery fails:

```bash
mkdir -p ~/.config/crispyroll/WidevineCdm/4.10.3050.0/
cp /path/to/libwidevinecdm.so ~/.config/crispyroll/WidevineCdm/4.10.3050.0/
```

### 5. Wayland Color Management Protocol Warnings

To prevent repetitive compositor handshake warnings (`Unable to set image transfer function`), Crispyroll automatically passes `--disable-features=WaylandColorManagement,WaylandColorManagerV1,WaylandColorManager` at startup.

---

## Resolved Bug Fixes Archive

1. **Profile Fetching & Auth Error Propagation**:
   - **Root Cause**: `service.token` did not check `res.ok` before invoking `request.success`, causing HTTP 400/401 payloads to be passed to `session.start` and navigating to profiles with undefined tokens.
   - **Fix**: Added strict status and error inspection to `service.token` and `session.start`, displaying inline error banners and preventing erroneous screen navigation.
2. **Vinyl Gallery Home Flow & Non-Sticky Hero**:
   - **Root Cause**: Vertical slick container on `.rows` clipped poster heights, and `mouseover` events mutated the hero with hovered card metadata.
   - **Fix**: Replaced with unified smooth page scrolling and converted the hero to a self-contained multi-item carousel with Continue Watching priority.
3. **Full-Screen PIN Lock Hardening**:
   - Active slot box paradigm (64px-88px), hardware numpad mirroring, 150ms input debounce, 600ms hold-to-clear sweep, and 5-attempt lockout timer.
4. **Avatar Picker Catalog**:
   - Added recursive catalog extraction supporting grouped, flat, and fallback avatars with instant image preview.
5. **Logout Modal Layering**:
   - Elevated `#exit-screen` to `z-index: 10000;` and implemented clean screen destruction on session reset.

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`).
2. Verify all 19 test suites pass (`npm test`).
3. Ensure formatting and linter are clean (`npm run lint` && `npm run format`).
4. Commit your changes and open a Pull Request.

---

## License & Credits

- **License**: Crispyroll is licensed under the [Apache License, Version 2.0](LICENSE).
- **Historical Attribution**:
  - Original Tizen application architecture by [jhassan8](https://github.com/jhassan8/crunchyroll-tizen).
  - Initial Linux Electron port by [aarron-lee](https://github.com/aarron-lee/crunchyroll-linux).
- **Disclaimer**: This project is independent community-driven open-source software and is not affiliated with Crunchyroll, LLC or Sony Pictures Entertainment.
