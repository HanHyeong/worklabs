# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install JS dependencies
npm install

# Run in development mode (Vite dev server + Rust hot-reload)
npm run dev

# Production build (Vite → dist/, then Tauri bundles to src-tauri/target/release/bundle/)
npm run build
```

There is no test suite or linter configured. Rust compilation errors surface during `npm run dev`.

## Architecture

WorkLaps is a **Tauri v2** desktop app (macOS/Windows). The stack is:

| Layer | Location | Role |
|---|---|---|
| Rust backend | `src-tauri/src/lib.rs` | Tauri commands, SQLite via `rusqlite`, tray icon, global shortcut |
| Main window | `src/main/` | React app — Gantt timeline, modals, drag-and-drop |
| Quick-add popup | `src/quick-add/` | React app — frameless floating window for fast lap entry |
| Shared | `src/shared/` | Constants, utils, Tauri wrappers, TagPicker component |

Vite builds both windows as separate entry points (`index.html`, `quick-add.html` at project root) into `dist/`. The `dist/` folder is gitignored; always run `npm run build` or `npm run vite:build` before committing build artifacts.

### Data model

All data lives in a local SQLite DB (`worklaps.db` in the OS app-data directory). Two tables:

- `laps(id TEXT PK, date TEXT, hour INTEGER, duration INTEGER, tag TEXT, text TEXT)`
- `custom_tags(id TEXT PK, label TEXT, color TEXT)`

The Rust side exposes seven `#[tauri::command]` functions (`get_laps`, `upsert_lap`, `delete_lap`, `get_custom_tags`, `upsert_custom_tag`, `delete_custom_tag`, `hide_quick_add`). The JS side calls them via `window.__TAURI__.core.invoke(...)`.

### Window management

Two Tauri windows are defined in `tauri.conf.json` — `main` and `quick-add`. Both start `visible: false` and are shown programmatically:

- **main**: shown after JS `init()` completes (`getCurrentWindow().show()`); close button hides rather than quits.
- **quick-add**: decorated=false, alwaysOnTop. Toggled by tray left-click or global shortcut (`Cmd+Shift+L` / `Ctrl+Shift+L`). Positioned at the center of the monitor under the cursor. Hiding is done through a Rust command (`hide_quick_add`) to work around WebKit permission restrictions. An `everFocused` guard prevents the blur→hide handler from firing before the window has been shown.

### Frontend state (index.html)

State is held in module-level variables: `currentDate`, `currentLaps` (in-memory cache for the selected date), `customTags`, `editingId`, `selectedTag`, and `dragState`.

The `render()` function fully rebuilds the timeline DOM on every state change (no virtual DOM). The Gantt layout uses two passes: pass 1 draws hour lines/labels/click-cells with absolute pixel positions (`ROW_HEIGHT = 60px`, hours 07–22); pass 2 runs `assignColumns()` to detect overlapping laps and places each `lap-block` in the correct column using CSS `calc()`.

Drag-and-drop uses mouse events (`mousedown`/`mousemove`/`mouseup` on `document`) rather than the HTML5 DnD API, because Tauri's WebKit backend does not support HTML5 drag events reliably.

### Inter-window communication

Custom tags created or deleted in either window emit a `tags-updated` Tauri event; the other window listens and refreshes. When a lap is saved from the quick-add popup, a `lap-added` event is emitted so the main window reloads today's laps without a manual refresh.

### DB migration

On first launch, `lib.rs` checks for data from the old app identifier (`com.worklaps.app`) and copies it to the new path (`com.worklaps.desktop`) if present.
