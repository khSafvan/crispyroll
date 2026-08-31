# Crispyroll Application-Wide Layout, Alignment & Spacing Specification

This document defines the strict, authoritative layout rules, geometric constraints, spacing scale, alignment baselines, card aspect ratios, and typography standards applied across all screens of Crispyroll (Home/Landing, Search, Browse, Watchlist/MyList, History, Details, and Settings).

---

## 1. Global Viewport Geometry & Safe Margin Baselines

All screens are structured to fit within a fixed 100vw × 100vh viewport without body-level scrollbars or horizontal drift.

```
┌──────┬─────────────────────────────────────────────────────────────────┐
│ Edge │                                                                 │
│ Nav  │  ← Content Top Safe Margin: clamp(20px, 3.5vh, 40px)            │
│ 72px │                                                                 │
│      │  [ HERO BANNER / MASSIVE SEARCH INPUT / PAGE TITLE ]            │
│      │  ← Baseline: aligned exactly at var(--cr-content-pad-left)      │
│      │                                                                 │
│      │  [ SECTION CONTENT / HIGH-DENSITY TABLE / CARD RAILS ]          │
│      │                                                                 │
│      │  ← Content Bottom Safe Margin: clamp(28px, 4.5vh, 60px)         │
└──────┴─────────────────────────────────────────────────────────────────┘
```

### Authoritative Margin Tokens
- `--cr-rail-width: 72px;` — Monolithic edge sidebar fixed width.
- `--cr-content-pad-left: clamp(100px, 8vw, 128px);` — Shared X-baseline across all screens.
- `--cr-content-pad-right: clamp(24px, 4vw, 56px);` — Right edge safe boundary.
- `--cr-content-pad-top: clamp(20px, 3.5vh, 40px);` — Top boundary safe margin.
- `--cr-content-pad-bottom: clamp(28px, 4.5vh, 60px);` — Bottom boundary safe margin.

---

## 2. Spacing Scale (8pt Grid with 4pt Micro-Grid)

All margins, paddings, and flex/grid gaps must strictly map to this 8pt spacing rhythm:

| Token | Value | Standard Usage |
| :--- | :--- | :--- |
| `--space-2xs` | `4px` | Tag padding, micro gaps, chip inner margin |
| `--space-xs` | `8px` | Badge margins, button internal gap, table row vertical gap |
| `--space-sm` | `12px` | Pill padding, category icon gap, subtitle spacing |
| `--space-md` | `16px` | Grid gap between poster cards, chip group separation |
| `--space-lg` | `24px` | Row title bottom margin, section block separation |
| `--space-xl` | `32px` | Major section gap, pagination top margin |
| `--space-2xl` | `48px` | Hero banner bottom margin, search header bottom margin |
| `--space-3xl` | `64px` | End-of-scroll bottom breathing room |

---

## 3. Card Dimensions & Aspect Ratio Standards

Zero layout shifts are tolerated. All media containers must declare explicit, hardware-accelerated aspect ratios:

### A. Anime Series Poster Cards (2:3 Portrait)
- **Aspect Ratio**: `aspect-ratio: 2 / 3 !important;`
- **Width**: `clamp(130px, 12vw, 180px);`
- **Border Radius**: `var(--radius-sm, 6px);`
- **Image Fit**: `object-fit: cover; display: block;`
- **Title Overlay**: Inside poster at bottom with linear dark gradient (`rgba(0,0,0,0.85)` to `transparent`), 2 lines clamped (`-webkit-line-clamp: 2`).

### B. Episodes & Continue Watching Thumbnails (16:9 Landscape)
- **Aspect Ratio**: `aspect-ratio: 16 / 9 !important;`
- **Width**: `clamp(240px, 22vw, 320px);`
- **Border Radius**: `var(--radius-sm, 6px);`
- **Progress Bar**: Edge-anchored at bottom edge of thumbnail with `height: 3px; background: var(--cr-accent);`.

### C. Cinematic Hero Full Banner (3:1 Landscape)
- **Aspect Ratio**: `aspect-ratio: 3 / 1 !important;`
- **Width**: `100%;` (fills safe content width)
- **Border Radius**: `var(--radius-md, 12px);`
- **Typography**: Unboxed, pure white with soft ambient text shadow (`0 2px 12px rgba(0,0,0,0.60), 0 4px 24px rgba(0,0,0,0.45)`).

### D. High-Density Search & List Rows
- **Row Height**: `clamp(52px, 6vh, 64px);`
- **Row Padding**: `8px 16px;`
- **Grid Layout**: `56px 3fr 1.2fr 2fr 1fr;`
- **Border Radius**: `var(--radius-xs, 4px);`

---

## 4. Typography Scale & Visual Hierarchy

| Style / Element | Size Token | Weight | Line Height | Color |
| :--- | :--- | :--- | :--- | :--- |
| **Massive Page Title / Search Input** | `clamp(32px, 4.5vw, 56px)` | `800` | `1.15` | `#ffffff` |
| **Section / Category Heading** | `clamp(17px, 1.8vw, 22px)` | `800` | `1.25` | `var(--cr-text-primary)` |
| **Primary Card / Row Title** | `13px – 14px` | `700` | `1.3` | `var(--cr-text-primary)` |
| **Secondary Metadata / Subtitle** | `12px – 13px` | `600` | `1.3` | `var(--cr-text-secondary)` |
| **Eyebrow Label / Badge / Tag** | `10px – 11px` | `800` | `1.0` | `var(--cr-text-muted)` |

---

## 5. Score Badge Color Thresholds

Ratings and community score badges follow strict semantic tokens:
- `--score-high: #00e676;` — Scores $\ge 75\%$ or $\ge 7.5$ (Vibrant Emerald)
- `--score-mid: #ffc107;` — Scores $60\% - 74\%$ or $6.0 - 7.4$ (Warm Amber Gold)
- `--score-low: #ff3366;` — Scores $< 60\%$ or $< 6.0$ (Rose Crimson)

---

## 6. Focus & Interaction Affordance System

Crispyroll employs a unified dual-focus system across TV/HTPC controllers, keyboard D-pads, and mouse pointers:

1. **Text Lists, Chips, Pills & Menus (Color Inversion)**:
   - On focus/hover:
     `background: var(--cr-accent) !important; color: #000000 !important;`
   - Child titles, metadata, tags, and score badges invert to `#000000` with high legibility.

2. **Poster Cards & Media Tiles (Border + Outline Indicator)**:
   - On focus:
     `border-color: var(--cr-accent); outline: 2px solid #ffffff; outline-offset: 2px; transform: scale(1.03);`

3. **Massive Inputs**:
   - On focus:
     `border-bottom: 3px solid var(--cr-accent) !important;`

---

## 7. Application-Wide Alignment Rules Checklist

- [x] **Left Baseline**: Hero banner, Search massive input, Category rows, Watchlist headers, and Details views all align to `var(--cr-content-pad-left)`.
- [x] **Scrollbar Concealment**: Universal scrollbar suppression (`display: none !important;`) across all scroll containers.
- [x] **Card Aspect Ratios**: Strict `2:3` for series posters, `16:9` for episode thumbnails, `3:1` for hero banners.
- [x] **Pagination Controls**: Pinned footer bar at bottom with standard padding (`12px 16px`) and 8pt spacing.
- [x] **Safe-Zone Respect**: No interactive controls placed within 20px of any physical screen edge.
