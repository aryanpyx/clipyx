---
name: clipyx
description: Complete creator operating system, offline DaVinci Resolve toolkit, video production planner (Planizo), procedural kinetic typography engine (Textizo), animated chart library (Graphizo with 17 chart Fuses), 319 curated Resolve expressions and node trees with 425 continuous 60fps MP4 motion loops, and local private Qwen3-ASR speech-to-text subtitling (Transcribe). Use whenever the user asks about video planning, content calendars, script breakdowns, DaVinci Resolve expressions/presets, animated charts, kinetic text, transcription, or running the Clipyx local web platform.
---

# Clipyx Creator AI Operating System & Toolkit Guide

Clipyx is an offline-first creator productivity ecosystem, automated motion graphics pipeline, and AI operating system engineered for video creators, editors, and autonomous AI agents.

This skill is installed universally in Antigravity (`~/.gemini/config/skills/clipyx/`) and provides instant access to the entire Clipyx platform from any workspace.

## Universal CLI Quick Reference
Because Clipyx is registered globally on `PATH`, you or the user can run `clipyx` from any shell:

```powershell
# Web Platform & Streaming Engine
clipyx serve --open                    # Launch local suite on http://localhost:8765/

# DaVinci Resolve Library (319 items + 425 MP4 motion loops)
clipyx library search "countdown"      # Search expressions, trees, and motion graphics
clipyx library get "count-up"          # Output full code and paste instructions

# Graphizo Animated Charts (17 Chart Fuses)
clipyx chart list                      # List all 21 built-in data chart presets
clipyx chart check <preset.setting>    # Validate timing and Fusion syntax
clipyx chart build <spec.json>         # Compile chart from JSON dataset
clipyx chart data <data.csv>           # Convert CSV/TSV table into chart input text

# Textizo Kinetic Typography
clipyx preset list                     # List all 22 kinetic text presets
clipyx preset check <preset.setting>   # Validate 14 follower rows & easing formulas
clipyx preset build <spec.json>        # Build .setting preset from JSON spec

# Planizo Creator Planning & Script Breakdown
clipyx plan script "script.md"         # Extract B-roll, on-screen text, and visual cues
```

---

## 1. Clipyx Web Platform & 60fps Streaming Video Engine

The Clipyx web platform features an electric blue (`#00a2ff`) cyber interface with an active node particle canvas, auto-cycling news ticker, asset store, interactive studio web tools, and full DaVinci Resolve library.

### Starting the Platform
Run the built-in streaming server:
```powershell
python scripts/serve_platform.py 8765
# Or globally:
clipyx serve --port 8765 --open
```

### Key Endpoints:
- **`http://localhost:8765/`** — Clipyx Homepage (Active particle grid, animated news ticker, springy typography)
- **`http://localhost:8765/library/`** — Clipyx Library (319 items, 425 continuous 60fps MP4 motion video loops)
- **`http://localhost:8765/store/`** — Creator Template & Asset Store
- **`http://localhost:8765/studio/`** — Interactive Studio Web Tools (Graphizo, Flowizo, Textizo, Animizo, Dashizo)
- **`http://localhost:8765/planizo/`** — Planizo Offline Creator Planning SPA

Detailed architecture notes are in [Clipyx Architecture](./references/Clipyx%20Architecture.md).

---

## 2. DaVinci Resolve Library (319 Curated Items & 425 Loops)

The offline database contains 319 code snippets, expressions, node trees, and Lua scripts:
- **76 Expressions:** Lua expressions for Text+ Styled Text, Transform, and modifiers.
- **197 Motion Graphics:** Overlays, countdowns, glitch effects, and badges with 60fps video loops.
- **34 Node Trees:** Complete multi-node Fusion compositions.
- **9 Lua Automation Scripts:** For batch processing inside DaVinci Resolve.

### Searching & Retrieving Assets:
```powershell
# Using the helper script inside the skill:
python scripts/search_library.py search "matrix"
python scripts/search_library.py get "vhs-tape"

# Or via CLI:
clipyx library search "title" --category "Titles"
clipyx library get "grid-reveal"
```

For the full catalog of categories and input targets, see [Library Catalog](./references/Library%20Catalog.md).

---

## 3. Graphizo Animated Charts Engine (17 Chart Fuses)

Graphizo enables automated, data-driven animated motion graphics inside DaVinci Resolve Fusion.

### Chart Types Supported:
- `BarChartRace` (Top N rank racing with smooth bar transitions)
- `AreaChart` (Cumulative trend visualizer with gradient fills)
- `LinePlot` (Multi-line trajectory comparisons with glow effects)
- `DonutChart` & `PieChart` (Proportional share with center readout)
- `WaterfallChart` (Financial bridge analysis: revenue, costs, EBITDA)
- `RadialProgress` & `LiveCounter` (Subscriber targets, countdowns, speedometer dials)
- `CandlestickChart`, `MatrixGrid`, `RadarChart`, `SalesFunnel`

### Authoring Rules & Specification:
Always consult [Graphizo AI Guide](./references/Graphizo%20AI%20Guide.md) when generating or validating chart presets.

---

## 4. Textizo Kinetic Typography Preset Engine

Textizo generates procedural animated text presets (`.setting` files) for DaVinci Resolve Fusion adhering strictly to [Textizo AI Guide](./references/Textizo%20AI%20Guide.md).

### Output Protocol:
When asked to author a Textizo preset, provide:
1. **Description:** 1-2 sentences stating the preset name (`Textizo-` + 2-digit number + capital letter, e.g. `Textizo-01A`).
2. **Preset Block:** Exactly **one** Lua code block containing the complete `.setting` node text.
3. **Usage Steps:** Short 3-step paste instructions for the Fusion Node Editor.

### Strict Checklist for Textizo Presets:
- [ ] **One Node Only:** `Textizo1 = Fuse.Textizo { Inputs = { ... } }` inside `{ Tools = ordered() { ... } }`.
- [ ] **Resolution Guard:** `Width = 1920`, `Height = 1080`, `UseFrameFormatSettings = 1`.
- [ ] **14 Animation Rows:** All 7 In rows and 7 Out rows declared with required follower curves.
- [ ] **Timing Math:** Entrance ends before exit starts:
  $$EndFrame = StartFrame + S + D \times (N - 1)$$
- [ ] **Shading Proxy Sync:** `ShadingProxy...` and `ShadingElement1...` must match identically.

---

## 5. Planizo Creator Planning Suite

Planizo is an offline-first productivity dashboard storing all state locally in the browser:
1. **Schedule (`/#/schedule`):** Hour-by-hour timeblocking.
2. **Calendar (`/#/calendar`):** Release calendar across YouTube, Shorts, TikTok, Instagram.
3. **Routine (`/#/routine`):** Daily creator checklist and prep habits.
4. **Whiteboards (`/#/whiteboard`):** Freeform canvas, Script Breakdown, Storyboard, Teleprompter.
5. **Content Pipeline (`/#/content`):** Video Kanban pipeline stages.

### Script Breakdown CLI:
```powershell
python scripts/analyze_script.py "my_script.md"
# Or:
clipyx plan script "my_script.md"
```

---

## 6. Transcribe: Local Offline Speech-to-Text

Located in `tools/transcribe/`, Transcribe runs the open-source **Alibaba Qwen3-ASR** model offline to produce millisecond-accurate `.srt` and `.vtt` subtitle tracks for DaVinci Resolve.

```powershell
cd tools\transcribe
.\transcribe.bat "input_video.mp4" --output "output\"
```
Import `output/*.srt` directly onto DaVinci Resolve **Subtitle Track 1**.
