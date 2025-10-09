# Crispyroll Development Guide

This document contains instructions for setting up the development environment, running from source, building Linux packages, understanding the architecture, and diagnosing development-specific issues.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup & Running in Dev Mode](#setup--running-in-dev-mode)
- [Live-Reload Workflow](#live-reload-workflow)
- [Testing](#testing)
- [Building Packages](#building-packages)
- [Architecture Overview](#architecture-overview)
- [Developer Troubleshooting & Flags](#developer-troubleshooting--flags)
  - [1. Linux Sandbox & Zygote Execution](#1-linux-sandbox--zygote-execution)
  - [2. GPU Acceleration & Headless / VM Fallback](#2-gpu-acceleration--headless--vm-fallback)
  - [3. Wayland / Ozone Display Server Configuration](#3-wayland--ozone-display-server-configuration)
  - [4. Widevine CDM Component Discovery & Cache](#4-widevine-cdm-component-discovery--cache)
  - [5. Wayland Color Management Protocol Errors](#5-wayland-color-management-protocol-errors)
- [Contributing](#contributing)
- [License & Credits](#license--credits)

---

## Prerequisites

- **Node.js**: `v20.0.0+` or `v22.0.0+` (Node 22 LTS recommended)
- **npm**: `v9.0.0+`
- **CastLabs Electron**: Crispyroll requires the [castlabs/electron-releases](https://github.com/castlabs/electron-releases) fork (`v40.7.0+wvcus`) to enable Google Widevine CDM and proprietary video codecs for DRM-protected Crunchyroll streams on Linux. Standard vanilla npm Electron cannot decrypt Widevine streams.

---

## Setup & Running in Dev Mode

```bash
# 1. Clone the repository
git clone https://github.com/khSafvan/crispyroll.git
cd crispyroll

# 2. Install dependencies
npm install

# 3. Start the application
npm start
```

The `start` script runs `electron --no-sandbox --no-zygote .` to ensure compatibility across modern Linux kernels and user namespaces.

---

## Live-Reload Workflow

Crispyroll uses standard vanilla JavaScript without a bundler. To enable automatic process reloading when modifying source files:

1. Install `nodemon` as a development dependency:
   ```bash
   npm install --save-dev nodemon
   ```
2. Add a `dev` script to your local `package.json`:
   ```json
   "scripts": {
     "dev": "nodemon --watch src --watch index.html --ext js,html,css --exec electron --no-sandbox --no-zygote ."
   }
   ```
3. Run the live-reload watcher:
   ```bash
   npm run dev
   ```

---

## Testing

Crispyroll includes a standalone Node.js test suite for gamepad mappings, data mappers, the translation engine, and Widevine discovery.

Run all tests:
```bash
npm test
```

To run linting or format code:
```bash
# Lint codebase
npm run lint

# Auto-format codebase with Prettier
npm run format
```

---

## Building Packages

### 1. Build Linux AppImage

```bash
npm run build
```
This compiles and packages the Linux AppImage in the `dist/` directory (e.g. `dist/Crispyroll_v1.1.6_linux.AppImage`).

### 2. Build Unpacked Directory (for Flatpak / Testing)

```bash
npm run build:dir
```
Outputs the unpacked Linux x64 binary and runtime resources to `dist/linux-unpacked/`.

---

## Architecture Overview

* **Main Process (`src/main/index.js`)**:
  * Initializes the `BrowserWindow` (dynamic display resolution detection via `screen.getPrimaryDisplay()`, resizable window with `minWidth: 800, minHeight: 480`, custom TV User-Agent, preload script).
  * Manages Linux hardware acceleration, Wayland Ozone flags, and process arguments (`--no-sandbox`, `--no-zygote`).
  * Coordinates Widevine CDM component initialization via `electron.components.whenReady()`.
  * Receives gamepad IPC events from `src/main/gamepad.js` and dispatches simulated navigation keystrokes to the renderer.

* **Widevine CDM Manager (`src/main/widevine.js`)**:
  * Auto-discovers local Widevine CDM libraries (`libwidevinecdm.so`, `manifest.json`) across host browsers (Firefox, Chrome, Chromium, Brave, Flatpak).
  * Pre-populates the `<userData>/WidevineCdm/<version>/` directory so CastLabs Electron activates CDM playback without requiring live remote component updater downloads.

* **Preload Script (`src/preload/preload.js`)**:
  * Securely bridges IPC channels (`electronUtilsRender`) using `contextBridge` to expose gamepad button dispatching and application exit calls.

* **Renderer Process (`index.html`, `src/renderer/`)**:
  * Pure vanilla JavaScript architecture loaded via modular screen scripts (`src/renderer/screens/`).
  * Uses vendored static libraries in `src/renderer/vendor/`:
    * `jquery.min.js` (DOM manipulation)
    * `dash.min.js` (MPEG-DASH stream playback with Widevine CDM support)
    * `slick.min.js` (Carousel navigation)
    * `font-awesome.min.css` (UI iconography)

---

## Developer Troubleshooting & Flags

### 1. Linux Sandbox & Zygote Execution

If you encounter `SIGTRAP`, unprivileged user namespace errors, or `render-process-gone: { reason: 'launch-failed', exitCode: 1002 }`, ensure child helper processes bypass the zygote fork model:

```bash
electron --no-sandbox --no-zygote .
```

### 2. GPU Acceleration & Headless / VM Fallback

On virtual machines, headless setups, or environments with incompatible proprietary GPU drivers:

```bash
DISABLE_GPU=1 npm start
```
This invokes `app.disableHardwareAcceleration()` and appends `--disable-gpu`, cleanly falling back to CPU software rasterization (SwiftShader).

### 3. Wayland / Ozone Display Server Configuration

Crispyroll defaults to auto-detecting Wayland vs X11 (`ozone-platform-hint=auto`). To force native Wayland rendering:

```bash
ENABLE_WAYLAND=1 npm start
# Or:
OZONE_PLATFORM=wayland npm start
```

### 4. Widevine CDM Component Discovery & Cache

If Widevine CDM fails to load or download:
1. Ensure a browser with Widevine (e.g. Firefox or Chrome) has run on the system, or
2. Manually copy `libwidevinecdm.so` and `manifest.json` into:
   ```bash
   ~/.config/crispyroll/WidevineCdm/<version>/
   # And into:
   ~/.config/crispyroll/WidevineCdm/<version>/_platform_specific/linux_x64/
   ```

### 5. Wayland Color Management Protocol Errors

* **Symptom**: Console logs repeated errors from Chromium's Wayland Ozone backend:
  ```text
  ERROR:ui/ozone/platform/wayland/host/wayland_wp_color_manager.cc:296] Unable to set image transfer function.
  ERROR:ui/ozone/platform/wayland/host/wayland_wp_color_manager.cc:214] Failed to populate image description for color space...
  ERROR:ui/ozone/platform/wayland/host/wayland_wp_color_management_surface.cc:63] Failed to get image description for color space.
  ```
* **Cause**: The host Wayland compositor advertises the experimental `wp_color_management_v1` protocol extension, but the color space / image transfer function (sRGB / BT.709) handshake does not match Chromium's expectations.
* **Fix**: Crispyroll appends `--disable-features=WaylandColorManagement,WaylandColorManagerV1,WaylandColorManager` at startup in `src/main/index.js`, silencing the error spam while keeping native Wayland surface rendering and fractional scaling fully active.

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`).
2. Verify all tests pass (`npm test`).
3. Ensure formatting is clean (`npm run format`).
4. Commit your changes and open a Pull Request.

---

## License & Credits

- **Fork Origin**: Crispyroll is a fork of [aarron-lee/crunchyroll-linux](https://github.com/aarron-lee/crunchyroll-linux).
- **Original Tizen Client**: Created by [jhassan8](https://github.com/jhassan8) ([Unofficial Tizen Crunchyroll App](https://github.com/jhassan8/crunchyroll-tizen)).
- **Linux Port**: Credit to [aarron-lee](https://github.com/aarron-lee).
- **Icon Credit**: Original icon by [Enamo Studios on Flaticon](https://www.flaticon.com/free-icons/crunchyroll).
- **License**: Licensed under the [Apache License, Version 2.0](LICENSE).
