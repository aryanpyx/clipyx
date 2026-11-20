---
name: clipyx
description: Complete toolkit for Clipyx (https://clipyx.com/) and Planizo: manage video planning, content calendars, daily routines, whiteboards and script B-roll breakdowns in the local Planizo web app; query and inspect 319+ DaVinci Resolve Fusion expressions, motion graphics, node trees, and Lua scripts from the Clipyx Library with 425 continuous 60fps MP4 motion loops; build, validate, and install Graphizo animated chart Fuses (17 data-driven charts); build, validate, and install Textizo animated text presets (.setting); and run local Qwen3-ASR speech-to-text and subtitle generation with Transcribe.
---

# Clipyx Creator AI Operating System & Toolkit Guide

This skill provides complete integration with the **Clipyx** ecosystem, allowing AI agents and creators to plan video productions, query DaVinci Resolve expressions and node trees with live 60fps video loop previews, compile procedural kinetic typography with **Textizo**, build animated data-driven motion graphics with **Graphizo**, and transcribe audio/video locally with **Transcribe**.

## Workspace & Installation Roots
- **Primary Suite Root:** `c:\Users\aryan\Downloads\Clipyx`
- **Clipyx Web Platform:** `c:\Users\aryan\Downloads\Clipyx\app\site`
- **Planizo Web App (Offline SPA):** `c:\Users\aryan\Downloads\Clipyx\app\planizo`
- **Library Database (319 items & 425 MP4 loops):** `c:\Users\aryan\Downloads\Clipyx\data\clipyx_library.json`
- **Graphizo Chart Toolkit (17 Fuses & AST Guide):** `c:\Users\aryan\Downloads\Clipyx\tools\graphizo`
- **Textizo AI Kit (Presets & Validator):** `c:\Users\aryan\Downloads\Clipyx\tools\textizo`
- **Official Textizo AI Guide:** `c:\Users\aryan\Downloads\Clipyx\Textizo AI Guide.md`
- **Transcribe Toolkit (Qwen3-ASR):** `c:\Users\aryan\Downloads\Clipyx\tools\transcribe`
- **Production Dist Bundle:** `c:\Users\aryan\Downloads\Clipyx\dist`
- **Unified CLI Launcher:** `c:\Users\aryan\Downloads\Clipyx\clipyx.bat` or `python clipyx.py`

---

## 1. Clipyx Web Platform & 60fps Streaming Video Engine

The Clipyx web platform is an electric blue (`#00a2ff`) cyber interface featuring an interactive node signal grid, animated news ticker, store, studio, and library.

### Serving the Platform Locally
```powershell
# Serves the full suite on port 8765 with HTTP 206 Partial Content byte-range streaming:
python scripts/serve_planizo.py 8765
# Or via CLI launcher:
python clipyx.py serve --port 8765 --open
```

### Key Endpoints:
- `http://localhost:8765/` — Clipyx Homepage (Active particle grid, animated news ticker, springy typography)
- `http://localhost:8765/library/` — Clipyx Library (319 items, 425 continuous 60fps MP4 motion video loops)
- `http://localhost:8765/store/` — Creator Template & Asset Store
- `http://localhost:8765/studio/` — Interactive Studio Web Tools (Graphizo, Flowizo, Textizo, Animizo, Dashizo)
- `http://localhost:8765/planizo/` — Planizo Offline Creator Planning SPA

---

## 2. Planizo: Video Creator Productivity & Planning App

Planizo is an offline-first productivity app for video creators and editors, storing all state in browser `localStorage`.

### Core Modules:
1. **Daily Schedule (`/#/schedule`):** Hour-by-hour timeblocking, priority tasks, and creator routines.
2. **Calendar (`/#/calendar`):** Multi-platform video release calendar (YouTube, Shorts, TikTok, Instagram).
3. **Routine (`/#/routine`):** Daily creator habits, pre-production prep, and editing sessions.
4. **Whiteboards (`/#/whiteboard`):**
   - **Canvas / Freeform:** Drag-and-drop cards, frames, and visual brainstorming.
   - **Script Mode:** Scriptwriting with visual cues and B-roll annotations.
   - **Storyboard:** Sequential scene cards with descriptions, audio, and visual timing.
   - **Teleprompter:** Built-in scrolling prompter with speed control.
   - **Image Editor:** Crop, annotate, and prep thumbnails or assets.
5. **Content Tracker (`/#/content`):** Video production pipeline tracking stages:
   - *Idea* -> *Script* -> *Record* -> *Edit* -> *Thumbnail* -> *Publish*

### Script & B-Roll Analysis CLI
Extract B-roll tags, visual cues, and on-screen text graphics directly from a script:
```powershell
python clipyx.py plan script "path\to\script.md"
```
Supports inline tags like `[B-roll: close-up of keyboard typing]`, `[Visual: zoom into chart]`, and `[Title: 5 Key Principles]`.

---

## 3. Clipyx DaVinci Resolve Library (319 Items + 425 MP4 Loops)

The Clipyx Library contains 319 curated code snippets, expressions, node trees, and Lua scripts for DaVinci Resolve and Fusion, each accompanied by an inline 60fps MP4 motion loop.

### Searching the Library
```powershell
# Keyword search across titles, summaries, and inputs
python clipyx.py library search "countdown"

# Filter by item type (expression, motion, tree, script, ai)
python clipyx.py library search "blur" --type expression

# Filter by category (Text, Titles, Backgrounds, Looks, Effects, Loaders, Social, Interface, etc.)
python clipyx.py library search --category "Titles"
```

### Inspecting an Item & Paste Instructions
```powershell
python clipyx.py library get "count-up"
python clipyx.py library get "grid-reveal"
python clipyx.py library get "vhs-tape"
```

---

## 4. Graphizo: Animated Data Charts Engine (17 Chart Fuses)

Located in `tools/graphizo/`, Graphizo provides 17 native DaVinci Resolve Fusion Fuses for automated, animated data visualization:

### Included Fuses:
- `BarChartRace.fuse`, `AreaChart.fuse`, `LinePlot.fuse`, `DonutChart.fuse`
- `WaterfallChart.fuse`, `RadialProgress.fuse`, `LiveCounter.fuse`, `MatrixGrid.fuse`
- `CandlestickChart.fuse`, `PieChart.fuse`, `RadarChart.fuse`, `Histogram.fuse`, etc.

### Authoring Rules:
- Refer to `tools/graphizo/Graphizo AI Guide.md` for complete input schemas and animation keyframes.
- All chart Fuses support CSV/JSON data ingestion and customizable easing curves.

---

## 5. Textizo: Kinetic Typography Preset Engine

Located in `tools/textizo/`, Textizo generates procedural animated title presets (`.setting` files) for DaVinci Resolve Fusion adhering strictly to `Textizo AI Guide.md`.

### Strict Checklist for Generated Presets:
- [ ] **One Node Only:** Single node `Textizo1 = Fuse.Textizo { Inputs = { ... } }` inside `{ Tools = ordered() { ... } }`.
- [ ] **Required Format Flags:**
  - `StateVersion = 11`, `InEnable = 1`
  - `UseFrameFormatSettings = 1`, `Width = 1920`, `Height = 1080` (preventing 320x240 bug)
  - `StyledText = Input { Value = "...", }`, `TextEdited = Input { Value = 1, }`
  - All text properties set: `Font`, `Style`, `Size`, `Center`, `Tracking`, `LineSpacing`, `Alignment`, `Rotation`, `Red = 1`, `Green = 1`, `Blue = 1`, `Alpha = 1`.
- [ ] **All 14 Animation Rows Written:**
  - 7 In rows (`Inopacity`, `Inblur`, `Incenter`, `Insize`, `Intracking`, `Inrotation`, `Inexplosion`).
  - 7 Out rows (`Outopacity`, `Outblur`, `Outcenter`, `Outsize`, `Outtracking`, `Outrotation`, `Outexplosion`).
  - Every row has `...Enable` (0 or 1). Every active row has all required follower, frame, stagger, and curve IDs.
  - `Out` rows **NEVER** have `...StartValue`.
- [ ] **Timing Formulas:**
  - $EndFrame = StartFrame + S + D \times (N - 1)$
  - $Stagger\% = 100 \times D / S$
  - Entrance finishes before exit starts. Exit ends before the clip ends (default: 5s at 24 fps = frame 119).
- [ ] **Shading Proxy Rule:**
  - `ShadingActiveElement = FuID { "element_1" }`
  - Element 1 is written **TWICE**: once as `ShadingProxy...` and once as `ShadingElement1...` with **identical** values.
  - Elements 2 to 8 each have `Enable` set to 0, or their full block.
- [ ] **Safe Fonts:** Arial, Arial Black, Verdana, Tahoma, Trebuchet MS, Georgia, Times New Roman, Impact, Courier New.

### Preset CLI Commands:
```powershell
# List presets
python clipyx.py preset list

# Validate preset timing and syntax
python clipyx.py preset check "tools\textizo\presets\Textizo - Apple Reveal.setting"

# Get next name
python clipyx.py preset next-name

# Show installation paths
python clipyx.py preset where

# Install preset to Resolve's Fusion Settings directory
python clipyx.py preset install resolve "tools\textizo\presets\Textizo-01A.setting"
```

---

## 6. Transcribe: Local Speech Recognition & Subtitle Kit

Transcribe runs the open-source **Qwen3-ASR** model locally to generate video transcripts and synchronized subtitle files (`.srt`, `.vtt`).

### Running Transcribe
On Windows:
```powershell
cd tools\transcribe
.\transcribe.bat "path\to\recording.mp4" --output "output\"
```

Results are placed in `tools/transcribe/output/`:
- `*.srt`: SubRip subtitle file with millisecond timecodes, ready to import onto Resolve Subtitle Track 1.
- `*.vtt`: WebVTT format for web players.
- `*.txt`: Plain-text transcript.
