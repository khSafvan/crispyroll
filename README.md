# Crispyroll (Linux HTPC Client)

Crispyroll is an unofficial, dedicated **Linux-only** HTPC client for Crunchyroll, packaged with Electron. It is optimized for Linux Desktop, Steam Deck, Bazzite, ChimeraOS, and Big Picture / Living Room setups. It is a fork of [aarron-lee/crunchyroll-linux](https://github.com/aarron-lee/crunchyroll-linux), originally derived from the [Unofficial Tizen Crunchyroll App](https://github.com/jhassan8/crunchyroll-tizen) by jhassan8.

![Crispyroll Interface](app.jpg)

![Crispyroll Layouts](layouts.gif)

### Features

- **Authentication & Profiles**: Full login workflow, session persistence, and multi-profile switching.
- **Browse & Discovery**: Home feed with hero banner, recommendations, categories, and watchlist rows.
- **Series & Episodes**: Series details, seasons selector with audio locale tags, and episode lists with watch progress indicators.
- **Video Player**: DASH stream playback with Widevine DRM support.
- **Audio & Subtitles**: In-player switching for multiple audio languages and hardsub subtitles.
- **Playback Controls**: Playback speed adjustment, aspect ratio toggling, and auto-next episode countdown.
- **Skip Events**: One-click Skip Intro and Skip Credits integration.
- **Search & History**: Full catalog search and synchronized watch history.
- **Navigation & Input**: Game controller / gamepad navigation, on-screen virtual keyboard, and physical keyboard support.

---

## Installation

### Quick Install (Recommended)

Run the following command in your terminal to download and install the latest release:

```bash
curl -fsSL https://raw.githubusercontent.com/khSafvan/crispyroll/master/install.sh | bash
```

### Manual Install (AppImage)

Alternatively, download the latest `.AppImage` from [Releases](https://github.com/khSafvan/crispyroll/releases) and manage it using an AppImage utility such as [GearLever](https://flathub.org/apps/it.mijorus.gearlever) or `AppImageLauncher`.

### Steam Deck / Bazzite / ChimeraOS Setup

1. Run the quick-install script in Desktop Mode, then add the installed AppImage to Steam as a non-Steam game.
2. **Resolution (Crucial)**: Open Game Properties in Steam and force the resolution to **1920x1080**. The interface is designed for 1080p and will not scale properly at other resolutions.
3. **Controller Configuration**:
   - *Native Controller Support*: Keep **Game Controller Support** enabled in the Crispyroll settings menu.
   - *Steam Input*: If you prefer Steam Input, disable **Game Controller Support** in Crispyroll settings, enable Steam Input in Steam, and map your layout (A to Enter, B to Escape, D-Pad to Keyboard Arrow keys).

---

## Development & Live-Reload Setup

### Prerequisites

- **Node.js** (v20+ or v22+ LTS recommended)
- **npm** (v9+)
- **CastLabs Electron**: Crispyroll requires the [castLabs/electron-releases](https://github.com/castlabs/electron-releases) fork (`v40.7.0+wvcus`) to enable Google Widevine CDM and proprietary video codecs for DRM-protected Crunchyroll streams on Linux. Standard vanilla Electron does not support Widevine CDM playback.

### Running the App

```bash
# Install dependencies
npm install

# Start the application
npm start
```

> **Live-Reload Limitation**: There is currently no built-in hot-reloading or live-reload. After making code changes to main or renderer files, you must restart the app process (`Ctrl+C` and `npm start`).
>
> **Enabling Live-Reload**: To enable automatic reloading during development without heavy toolchain rewrites, you can add `nodemon` to watch the source files and restart Electron:
> ```bash
> npm install --save-dev nodemon
> ```
> Add a dev script to `package.json`:
> ```json
> "scripts": {
>   "dev": "nodemon --watch src --watch index.html --ext js,html,css --exec electron ."
> }
> ```

### Building Packages

To build the Linux AppImage package:

```bash
npm run build
```

This will generate the packaged AppImage in the `dist/` directory.

### Troubleshooting

#### 1. GPU Process Launch Failed (`error_code=1002` / `GPU process isn't usable`)
On systems with virtualized GPUs, incompatible proprietary drivers, or headless/VM setups, Chromium's GPU hardware process may fail to initialize. You can disable hardware acceleration and run with software rendering via the `DISABLE_GPU` environment variable:

```bash
DISABLE_GPU=1 npm start
# Or for the packaged AppImage:
DISABLE_GPU=1 ./Crispyroll.AppImage
```

*(Note: Disabling GPU acceleration uses CPU software rasterization; video playback continues to work, though CPU utilization will be slightly higher).*

#### 2. Native Wayland Support & Display Server Glitches
Crispyroll auto-detects Wayland and X11 via Chromium's Ozone platform. To force native Wayland rendering:

```bash
ENABLE_WAYLAND=1 npm start
# Or:
OZONE_PLATFORM=wayland ./Crispyroll.AppImage
```

#### 3. Linux User Namespace / Sandbox Errors (`SIGTRAP` or zygote crash)
On Linux systems where unprivileged user namespaces are restricted, launch with `--no-sandbox`:

```bash
npm start # (Includes --no-sandbox by default)
# Or for AppImage:
./Crispyroll.AppImage --no-sandbox
```

#### 4. Widevine CDM Component Setup / DRM Playback
Crispyroll uses CastLabs Electron's Component Updater to load the Widevine Content Decryption Module (`libwidevinecdm.so`). Crispyroll automatically detects and links local system Widevine CDM installations (from Firefox, Chrome, Chromium, Brave, or Flatpak). If Widevine fails to download automatically on a fresh environment:

1. Ensure a browser with Widevine (e.g. Firefox or Chrome) has run once on the system, or
2. Manually place `libwidevinecdm.so` and `manifest.json` into `~/.config/crispyroll/WidevineCdm/<version>/`.

#### 5. Corrupted Session or Playback State
If video playback fails or session data becomes corrupted, clear the local application configuration directory:

```bash
rm -rf "$HOME/.config/crispyroll/"
```

### FAQ

**How do I toggle fullscreen?**
Press <kbd>F11</kbd> to toggle fullscreen mode, or launch with the environment variable:

```bash
FULL_SCREEN=1 npm start
```

**Can I run Crispyroll with Gamescope?**
Yes. To run at 1080p and scale to higher-resolution displays (e.g. 1440p):

```bash
gamescope -w 1920 -h 1080 -W 2560 -H 1440 -b -- ./Crispyroll.AppImage --no-sandbox
```

---

## License & Credits

- **Fork Origin**: Crispyroll is a fork of [aarron-lee/crunchyroll-linux](https://github.com/aarron-lee/crunchyroll-linux).
- **Original Tizen App**: Massive credit to [jhassan8](https://github.com/jhassan8) for developing the original [Unofficial Tizen Crunchyroll App](https://github.com/jhassan8/crunchyroll-tizen).
- **Linux Port**: Credit to [aarron-lee](https://github.com/aarron-lee) for the initial Electron Linux port.
- **Icon Credit**: Original app icon by [Enamo Studios on Flaticon](https://www.flaticon.com/free-icons/crunchyroll).
- **Branding TODO**: As this fork diverges under the name **Crispyroll**, dedicated standalone branding and custom app icons will be introduced in an upcoming release.
- **License**: This project is licensed under the [Apache License, Version 2.0](LICENSE). Derivative works and contributions remain under the Apache-2.0 terms.
