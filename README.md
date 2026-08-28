# Snipick

A Lightroom-style photo culling and sorting desktop app for macOS and Windows. Open a folder of photos, flag each one into custom categories with keyboard shortcuts, then apply the sort — Snipick creates one folder per category and moves the files in.

Built with Electron, React, and TypeScript.

## Features

- **Loupe & Grid views** — browse photos one at a time, or scan a whole folder as a thumbnail grid with click/shift-click/drag multi-select
- **Configurable sort categories** — not just Pick/Reject: add up to 6 categories, each with its own name, color, and keyboard shortcut
- **RAW support** — CR2, CR3, NEF, ARW, RW2, ORF, DNG, PEF, RAF, alongside JPG/PNG, with fast embedded-preview extraction (no full RAW decode)
- **Zoom & pan** — scroll or pinch to zoom, drag to pan, with EXIF-aware auto-rotation for portrait shots
- **EXIF overlay** — ISO, aperture, shutter speed, camera, shown live on each photo (toggleable)
- **Filters** — jump straight to Pick-only, Reject-only, or Unflagged photos
- **Session auto-save** — flags persist per-folder and restore automatically if you close and reopen the app mid-cull
- **Safe apply** — moving files is logged to a manifest, with collision-safe renaming and one-click undo
- **Bilingual UI** — Indonesian and English, switchable anytime

## Install

Download the latest installer for your OS from the [Releases page](https://github.com/Pewcell/Snipick/releases):

- **macOS**: `Snipick-x.x.x-arm64.dmg` — open it, drag Snipick into Applications
- **Windows**: `Snipick Setup x.x.x.exe` — run the installer

Since these builds aren't code-signed, your OS will warn you on first launch:

- **macOS**: right-click the app → **Open** → **Open** again in the confirmation dialog
- **Windows**: click **More info** → **Run anyway** in the SmartScreen prompt

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Letter/number assigned per category (default `P` / `X`) | Flag current photo with that category |
| `U` | Unflag |
| `←` / `→` / `Space` | Previous / next photo |
| `G` | Toggle Grid / Loupe view |
| Scroll / pinch | Zoom |
| Drag | Pan (when zoomed) |

Category shortcuts are configurable from the gear icon in the app.

## Development

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run typecheck   # TypeScript, no emit
npm run test        # vitest
npm run build        # compile main/preload/renderer
npm run dist:mac     # build + package a macOS .dmg
```

macOS and Windows installers are built via the `release` job in [`.github/workflows/build.yml`](.github/workflows/build.yml) — push a `v*` tag to trigger a build for both platforms, published as a draft GitHub Release.

## Tech stack

Electron · React · TypeScript · Vite (via `electron-vite`) · `exifr` for EXIF/RAW preview extraction · `electron-builder` for packaging.

## License / credits

Personal project, source available for reference — no open-source license is granted. The **Maintanker** display font used in the UI is personal-use-only (not for commercial or large-scale redistribution); see [salamahtype.com](https://salamahtype.com) for a commercial license if you plan to reuse it elsewhere.

Made by [@sijooyy](https://instagram.com/sijooyy).
