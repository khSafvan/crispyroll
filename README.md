# Crunchyroll for Linux

[![Downloads](https://img.shields.io/github/downloads/aarron-lee/crunchyroll-linux/total.svg)](https://github.com/aarron-lee/crunchyroll-linux/releases)

Unofficial Linux HTPC Frontend for Crunchyroll, packaged with Electron.

![App Screenshot](assets/images/logo-big.png)

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
  - [Manual Install (AppImage)](#manual-install-appimage)
  - [Quick Install Script](#quick-install-script)
  - [Steam Deck / Bazzite / ChimeraOS](#steam-deck--bazzite--chimeraos)
  - [Flatpak](#flatpak)
- [Development & Scripts](#development--scripts)
- [Controller Support](#controller-support)
- [Testing & Quality](#testing--quality)
- [FAQ & Troubleshooting](#faq--troubleshooting)
- [Attribution & License](#attribution--license)

---

## Description

This is an unofficial Linux HTPC client for Crunchyroll based on the [Unofficial Tizen Crunchyroll App](https://github.com/jhassan8/crunchyroll-tizen). Designed specifically for 1080p TV and controller/HTPC navigation on Linux desktops, Steam Deck, ChimeraOS, and Bazzite.

---

## Features

- [x] Full Crunchyroll OAuth authentication & session management
- [x] Multi-profile selection and switching
- [x] Home screen with featured hero banners, recommendations, and category rows
- [x] Anime series details and seasons/episodes modal browser
- [x] DASH DRM video player with Widevine support
- [x] Multi-language audio and hardsub subtitle selection inside player
- [x] Auto-next episode countdown and Skip Intro / Skip Credits support
- [x] Search catalog by anime title and movie listing
- [x] Watch history tracking and synchronization
- [x] Watchlist and custom lists management
- [x] Native Gamepad / Game Controller navigation & on-screen virtual keyboard
- [x] Fully customizable settings (audio language, subtitle language, video quality, mature content, controller toggle)

---

## Project Structure

```
├── assets/                   # Static binary assets (images, icons, fonts)
│   ├── fonts/                # Lato and FontAwesome webfonts
│   ├── icons/                # App desktop icons
│   └── images/               # App logos and placeholder assets
├── flatpak/                  # Flatpak manifest and metadata files
├── scripts/                  # Shell scripts (build, install, tag-release, verify)
├── src/
│   ├── main/                 # Electron main process (lifecycle & gamepad dispatch)
│   │   ├── index.js
│   │   └── gamepad.js
│   ├── preload/              # Electron context bridge
│   │   └── preload.js
│   └── renderer/             # Frontend UI application
│       ├── app.js            # Renderer initialization
│       ├── keys.js           # Keycode constants
│       ├── main.js           # Screen router & state coordinator
│       ├── core/             # API services, session, player, and mappers
│       ├── screens/          # Screen controllers (browse, home, video, etc.)
│       ├── electron/         # Gamepad renderer loop listener
│       ├── styles/           # CSS design tokens, base styles, and components
│       └── vendor/           # Third-party libraries (dash.js, jQuery, slick)
├── tests/                    # Unit tests & test runner
├── index.html                # Application window HTML template
└── package.json              # Electron & npm build configuration
```

---

## Installation

### Manual Install (AppImage)

1. Download the latest `.AppImage` release from [GitHub Releases](https://github.com/aarron-lee/crunchyroll-linux/releases).
2. Install and integrate it using an AppImage manager like [GearLever](https://flathub.org/apps/it.mijorus.gearlever) or `AppImageLauncher`.

### Quick Install Script

Run the following terminal command:

```bash
curl -fsSL https://github.com/aarron-lee/crunchyroll-linux/raw/master/install.sh | bash
```

### Steam Deck / Bazzite / ChimeraOS

1. Run the [Quick Install](#quick-install-script) command in Desktop mode.
2. Open Steam and choose **Add a Non-Steam Game to My Library...** -> Select **Crunchyroll**.
3. In Steam Game Properties, set the resolution to **1920x1080**.
4. Controller layout:
   - **Native**: Keep *Game Controller Support* enabled in Crunchyroll settings.
   - **Steam Input**: If you prefer Steam Input, disable *Game Controller Support* in the app settings and apply a standard gamepad layout (mapping Enter to A, Esc to B, and D-Pad to Keyboard arrow keys).

### Flatpak

For Flatpak packaging instructions and status, see the [Flathub repository](https://github.com/aarron-lee/flathub/tree/crunchyroll-linux).

---

## Development & Scripts

### Prerequisites

- Node.js (v18+) and npm / pnpm

### Commands

```bash
# Install dependencies
pnpm install

# Run the app locally
pnpm start

# Run unit tests
pnpm test

# Run ESLint & Prettier
pnpm run lint
pnpm run format

# Package Linux AppImage
pnpm run build

# Package unpacked directory
pnpm run flatpak:build-unpacked
```

---

## Testing & Quality

Unit tests verify core business logic:
- **Gamepad Event Mapping**: Verifies input simulation, key up/down mapping, and button assignments.
- **Localization Engine**: Verifies parameterized string replacement (`{season}`, `{episode}`) and language fallbacks.
- **Data Mappers**: Verifies Crunchyroll API response parsing and stream URL extraction.

Run tests:

```bash
npm test
```

---

## FAQ & Troubleshooting

### Fullscreen
Press <kbd>F11</kbd> to toggle fullscreen, or launch with environment variable:
```bash
FULL_SCREEN=1 npm start
```

### Video Playback Troubleshooting
If streams fail to load, clear the local config cache:
```bash
rm -rf "$HOME/.config/crunchyroll-linux"
```

---

## Attribution & License

- Original Crunchyroll Tizen Client: [jhassan8/crunchyroll-tizen](https://github.com/jhassan8/crunchyroll-tizen)
- Linux Port & Maintenance: [aarron-lee](https://github.com/aarron-lee)
- License: [ISC](LICENSE)
