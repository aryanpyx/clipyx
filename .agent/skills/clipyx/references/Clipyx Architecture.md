# Clipyx Architecture & System Reference

## Overview
Clipyx is an offline-first creator operating system and automated motion graphics pipeline engineered for DaVinci Resolve Studio and Blackmagic Fusion.

## Subsystems

### 1. Clipyx Web Platform (`app/site`)
- **Port:** 8765
- **Endpoints:**
  - `/` — Homepage with interactive cyber canvas grid, news ticker, and platform features
  - `/library/` — 319 Resolve items, searchable and categorized, with 425 streaming 60fps MP4 loops
  - `/store/` — Asset packs, LUTs, and templates
  - `/studio/` — Interactive web tools (Graphizo, Flowizo, Textizo, Animizo, Dashizo)
  - `/planizo/` — Full offline creator planning SPA
- **Theme:** Electric cyber blue (`#00a2ff`, `#00e5ff`) with deep dark contrast (`#08080c`).
- **Streaming Engine:** Python `http.server` supporting `HTTP 206 Partial Content` and `Accept-Ranges: bytes` for instantaneous frame scrubbing in Chrome and Safari.

### 2. Planizo Creator Suite (`app/planizo`)
- Single-page application built with React + Vite.
- Zero backend dependencies; 100% private `localStorage` state hydration.
- Modules:
  - **Schedule:** Timeblocking & daily routine
  - **Calendar:** Multi-platform release scheduling
  - **Whiteboards:** Freeform canvas, Script Breakdown, Storyboard, Teleprompter, Image Annotator
  - **Content Pipeline:** Kanban tracking (Idea -> Script -> Record -> Edit -> Publish)

### 3. Graphizo Animated Charts (`tools/graphizo`)
- 17 native DaVinci Resolve Fusion Fuses for data-driven motion graphics:
  - Bar Chart Race, Area Plots, Donut Counters, Growth Lines, Waterfall Plots, Radial Gauges, etc.
- Ingests CSV/TSV or JSON datasets and renders keyframe-interpolated charts directly on the Resolve timeline.

### 4. Textizo Kinetic Typography (`tools/textizo`)
- Procedural compiler for DaVinci Resolve Fusion `.setting` presets.
- Enforces strict timing rules:
  $$EndFrame = StartFrame + S + D \times (N - 1)$$
  $$Stagger\% = 100 \times D / S$$
- Validates 14 animation follower rows and dual-synced shading proxy elements.

### 5. Transcribe ASR Engine (`tools/transcribe`)
- Offline, zero-cloud speech recognition running Alibaba Qwen3-ASR.
- Outputs millisecond-aligned `.srt`, `.vtt`, and `.txt` files directly importable to Resolve Subtitle Track 1.
