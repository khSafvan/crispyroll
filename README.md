# Crispyroll

Crispyroll is an unofficial, dedicated **Linux-only** HTPC client for Crunchyroll, packaged with Electron. It is optimized for Linux Desktop, Steam Deck, Bazzite, ChimeraOS, and Big Picture / Living Room setups. It is a fork of [aarron-lee/crunchyroll-linux](https://github.com/aarron-lee/crunchyroll-linux), originally derived from the [Unofficial Tizen Crunchyroll App](https://github.com/jhassan8/crunchyroll-tizen) by jhassan8.

![Crispyroll Interface](app.jpg)

![Crispyroll Layouts](layouts.gif)

---

## Features

- **Authentication & Profiles**: Full login workflow, session persistence, and multi-profile switching.
- **Browse & Discovery**: Home feed with hero banner, recommendations, categories, and watchlist rows.
- **Series & Episodes**: Series details, seasons selector with audio locale tags, and episode lists with watch progress indicators.
- **Video Player**: Seamless DASH stream playback with Widevine DRM support.
- **Audio & Subtitles**: In-player switching for multiple audio languages and hardsub subtitles.
- **Playback Controls**: Playback speed adjustment, aspect ratio toggling, and auto-next episode countdown.
- **Skip Events**: One-click Skip Intro and Skip Credits integration.
- **Search & History**: Full catalog search and synchronized watch history.
- **Navigation & Input**: Full game controller / gamepad navigation, on-screen virtual keyboard, and physical keyboard support.

---

## Installation

### Quick Install (Recommended)

Run the following command in your terminal to automatically download and install the latest release:

```bash
curl -fsSL https://raw.githubusercontent.com/khSafvan/crispyroll/master/install.sh | bash
```

### Manual Install (AppImage)

Download the latest `.AppImage` from [Releases](https://github.com/khSafvan/crispyroll/releases) and manage it using an AppImage utility such as [GearLever](https://flathub.org/apps/it.mijorus.gearlever) or `AppImageLauncher`.

### Steam Deck / Bazzite / ChimeraOS Setup

1. Run the quick-install script in Desktop Mode, then add the installed AppImage to Steam as a non-Steam game.
2. **Display Resolution**: Crispyroll automatically detects your screen resolution and scales dynamically across Steam Deck native (1280x800), 1080p, 1440p, 4K, and Ultrawide monitors.

---

## Input & Navigation Support

Crispyroll supports seamless control via **Keyboard**, **Mouse**, and **Game Controller**:

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| <kbd>Arrow Keys</kbd> | Navigate menus, rows, carousel cards, and settings |
| <kbd>Enter</kbd> or <kbd>Space</kbd> | Select / Activate / Open item or details |
| <kbd>Esc</kbd> or <kbd>Backspace</kbd> | Back / Open navigation drawer / Exit modal |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | Focus traversal in login and search forms |
| <kbd>F11</kbd> or <kbd>F</kbd> | Toggle Fullscreen |

### Video Player Controls

| Control | Input |
| --- | --- |
| **Play / Pause** | <kbd>Space</kbd>, <kbd>K</kbd>, or Left-Click video surface |
| **Seek Forward / Backward (&plusmn;10s)** | <kbd>L</kbd> (+10s), <kbd>J</kbd> (-10s), or <kbd>Left</kbd> / <kbd>Right</kbd> |
| **Seek on Timeline** | Left-Click or Drag anywhere on the progress bar |
| **Volume Control** | <kbd>Up</kbd> / <kbd>Down</kbd> arrow keys or Mouse Scroll Wheel |
| **Mute / Unmute** | <kbd>M</kbd> |
| **Toggle Fullscreen** | <kbd>F</kbd>, <kbd>F11</kbd>, or Double-Click video surface |
| **OSD Visibility** | Hover mouse anywhere on screen |

### Mouse Support

* **Full Pointer Interaction**: Click any card, poster, menu item, or profile avatar directly.
* **Hover States**: Visual hover indicators highlight cards and buttons.
* **Direct Input Typing**: Click directly into search and login fields to type with your physical keyboard.
* **Scroll Wheel**: Smooth vertical scrolling across search results, watch history, and episode lists.

---

## Controller Support

* **Native Controller Support**: Keep **Game Controller Support** enabled in the Crispyroll settings menu for out-of-the-box gamepad navigation (A: Enter, B: Back/Escape, D-Pad: Navigation).
* **Steam Input**: If you prefer using Steam Input, disable **Game Controller Support** in Crispyroll settings, enable Steam Input in Steam, and map your layout (A to Enter, B to Escape, D-Pad to Keyboard Arrow keys).

---

## FAQ

**How do I toggle fullscreen?**
Press <kbd>F11</kbd> or <kbd>F</kbd> (in video player) to toggle fullscreen mode, or launch with the environment variable:
```bash
FULL_SCREEN=1 ./Crispyroll.AppImage
```

**Can I run Crispyroll with Gamescope?**
Yes. For handheld gaming or custom Gamescope sessions:
```bash
gamescope -w 1280 -h 800 -W 1920 -H 1080 -b -- ./Crispyroll.AppImage
```

---

## Troubleshooting

### Corrupted Session or Playback Cache
If video playback fails or session data becomes corrupted, clear the local application configuration directory:

```bash
rm -rf "$HOME/.config/crispyroll/"
```

---

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, build instructions, and contributing.

---

## License & Credits

- **Fork Origin**: Crispyroll is a fork of [aarron-lee/crunchyroll-linux](https://github.com/aarron-lee/crunchyroll-linux).
- **Original Tizen App**: Massive credit to [jhassan8](https://github.com/jhassan8) for developing the original [Unofficial Tizen Crunchyroll App](https://github.com/jhassan8/crunchyroll-tizen).
- **Linux Port**: Credit to [aarron-lee](https://github.com/aarron-lee) for the initial Electron Linux port.
- **Icon Credit**: Original app icon by [Enamo Studios on Flaticon](https://www.flaticon.com/free-icons/crunchyroll).
- **Branding TODO**: As this fork diverges under the name **Crispyroll**, dedicated standalone branding and custom app icons will be introduced in an upcoming release.
- **License**: This project is licensed under the [Apache License, Version 2.0](LICENSE). Derivative works and contributions remain under the Apache-2.0 terms.
