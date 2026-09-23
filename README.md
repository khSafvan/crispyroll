# Crispyroll

> [!WARNING]
> ### Legal Disclaimer & Trademark Notice
> **Crispyroll is an unofficial, independent, community-driven open-source project.**
> - It is **not affiliated with, endorsed by, funded by, sponsored by, or associated in any way** with Crunchyroll, LLC, Sony Pictures Entertainment, or any of their parent companies, subsidiaries, or affiliates.
> - "Crunchyroll", the Crunchyroll logo, and any related brand names, logos, characters, and trademarks are the registered intellectual property of Crunchyroll, LLC and their respective copyright holders.
> - This application does **not** host, distribute, stream, modify, or archive copyrighted media files, nor does it bypass subscription paywalls or copy protection. All stream playback requires a valid, user-authenticated account and relies strictly on standard, unmodified Widevine DRM decryption.

Crispyroll is an unofficial, dedicated **Linux-only** HTPC client for Crunchyroll, packaged with Electron. It is designed and optimized for Linux Desktop, Steam Deck, Bazzite, ChimeraOS, and Big Picture / Living Room setups with full game controller, remote, and keyboard/mouse support.

---

## Features

- **Fast TV & Manual Login**: Instant QR / Device-Code authorization (`crunchyroll.com/activate`) alongside standard manual email/password login with live error validation.
- **Multi-Profile Management**: Multi-profile selector with circular avatars, live avatar catalog picker, and progressive Create Profile workflow (custom name, avatar selection, mature content filtering, and PIN protection).
- **Secure PIN Lock Protection**: Dedicated full-screen PIN entry with active slot indicator boxes, input debouncing, physical key mirroring, hold-to-clear sweep, and brute-force lockout protection.
- **"Vinyl Gallery" Home Experience**:
  - **Floating Pill Sidebar**: Detached navigation pill (`80px` collapsed $\rightarrow$ `280px` overlay on focus/hover) with zero layout shifting.
  - **1:1 Big Square Hero Carousel**: Rotating featured spotlight series with automatic advance, indicator dots, and zero-friction Continue Watching priority.
  - **Curated Category Feeds**: Dedicated 16:9 Continue Watching rows and 2:3 vertical poster category carousels with smooth vertical scrolling.
- **Series & Episodes**: Complete series details, seasons selector with audio locale tags, and episode lists with watch progress indicators.
- **Video Player**: Seamless DASH stream playback with Widevine DRM support, multi-audio/subtitle switching, playback speed adjustment, and auto-next episode countdown.
- **Skip Events**: One-click Skip Intro and Skip Credits integration.
- **Search & History**: Full catalog search with virtual/physical keyboard and synchronized watch history.
- **Input & Navigation**: Full game controller / gamepad navigation, on-screen virtual keyboard, mouse click/hover, and keyboard shortcuts.

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

| Key                                    | Action                                             |
| -------------------------------------- | -------------------------------------------------- |
| <kbd>Arrow Keys</kbd>                  | Navigate menus, rows, carousel cards, and settings |
| <kbd>Enter</kbd> or <kbd>Space</kbd>   | Select / Activate / Open item or details           |
| <kbd>Esc</kbd> or <kbd>Backspace</kbd> | Back / Open navigation drawer / Dismiss modal      |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd>  | Focus traversal in login and search forms          |
| <kbd>F11</kbd> or <kbd>F</kbd>         | Toggle Fullscreen                                  |

### Video Player Controls

| Control                                   | Input                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| **Play / Pause**                          | <kbd>Space</kbd>, <kbd>K</kbd>, or Left-Click video surface                       |
| **Seek Forward / Backward (&plusmn;10s)** | <kbd>L</kbd> (+10s), <kbd>J</kbd> (-10s), or <kbd>Left</kbd> / <kbd>Right</kbd>   |
| **Seek on Timeline**                      | Left-Click or Drag anywhere on the progress bar                                   |
| **Volume Control**                        | <kbd>Up</kbd> / <kbd>Down</kbd> arrow keys or Mouse Scroll Wheel                  |
| **Mute / Unmute**                         | <kbd>M</kbd>                                                                      |
| **Toggle Fullscreen**                     | <kbd>F</kbd>, <kbd>F11</kbd>, or Double-Click video surface                       |
| **OSD Visibility**                        | Hover mouse anywhere on screen                                                    |

### Mouse Support

- **Full Pointer Interaction**: Click any card, poster, menu item, or profile avatar directly.
- **Hover States**: Visual hover indicators highlight cards and buttons without altering featured hero content.
- **Direct Input Typing**: Click directly into search and login fields to type with your physical keyboard.
- **Scroll Wheel**: Smooth vertical scrolling across the home feed, search results, watch history, and episode lists.

---

## Controller Support

- **Native Controller Support**: Keep **Game Controller Support** enabled in the Crispyroll settings menu for out-of-the-box gamepad navigation (A: Enter / Confirm, B: Back / Escape, D-Pad: Navigation).
- **Steam Input**: If you prefer using Steam Input, disable **Game Controller Support** in Crispyroll settings, enable Steam Input in Steam, and map your layout (A to Enter, B to Escape, D-Pad to Keyboard Arrow keys).

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

## Content Protection & DRM Compliance

Crispyroll functions strictly as an unofficial client-side interface and media player wrapper:
1. **Requires Legitimate User Authentication**: Access to all media streams, watchlists, and user profiles is gated behind official OAuth2 and device-code authorization flows using the user's own active Crunchyroll account.
2. **No Circumvention of Access Controls (DMCA § 1201 Compliance)**: The application does not strip, decrypt, convert, or circumvent Digital Rights Management (DRM). Protected streams are played back strictly using standard Widevine Content Decryption Modules (CDM) provided and signed by Google and CastLabs Electron.
3. **No Direct Content Hosting or Redistribution**: Crispyroll hosts zero media files, proxy streams, or scraped binaries. All DASH manifests and media chunks are requested directly from official Content Delivery Networks (CDNs) authorized by Crunchyroll, LLC.

---

## Troubleshooting

### Corrupted Session or Playback Cache

If video playback fails or session data becomes corrupted, clear the local application configuration directory:

```bash
rm -rf "$HOME/.config/crispyroll/"
```

---

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, build instructions, architectural notes, and contributing guidelines.

---

## License & Attribution

- **License**: Crispyroll is licensed under the [Apache License, Version 2.0](LICENSE).
- **Historical Attribution**:
  - Original Tizen application architecture by [jhassan8](https://github.com/jhassan8/crunchyroll-tizen).
  - Initial Linux Electron port by [aarron-lee](https://github.com/aarron-lee/crunchyroll-linux).
- **Icons**: Phosphor Icons (MIT), Carbon Icons (Apache-2.0), Radix Icons (MIT).
- **Disclaimer**: This project is independent open-source software and is not affiliated with Crunchyroll, LLC or Sony Pictures Entertainment.
