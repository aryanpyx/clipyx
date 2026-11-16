---
name: clipyx
description: Complete toolkit for Clipyx (https://clipyx.com/) and Planizo: manage video planning, content calendars, daily routines, whiteboards and script B-roll breakdowns in the local Planizo web app; query and inspect 319+ DaVinci Resolve Fusion expressions, motion graphics, node trees, and Lua scripts from the Clipyx Library; build, validate, and install Textizo animated text presets (.setting); and run local Qwen3-ASR speech-to-text and subtitle generation with Transcribe.
---

# Clipyx & Planizo Skill Guide

This skill provides complete integration with the **Clipyx** platform and **Planizo** video creator ecosystem, allowing AI agents and users to plan video productions, search DaVinci Resolve code/presets, generate procedural animated typography adhering to the official **Textizo AI Guide**, and transcribe audio/video locally.

## Workspace & Installation Roots
- **Primary Suite Root:** `c:\Users\aryan\Downloads\Clipyx`
- **Planizo Web App (Offline SPA):** `c:\Users\aryan\Downloads\Clipyx\app\planizo`
- **Library Database (319 items):** `c:\Users\aryan\Downloads\Clipyx\data\clipyx_library.json`
- **Textizo AI Kit (Presets & Validator):** `c:\Users\aryan\Downloads\Clipyx\tools\textizo`
- **Official Textizo AI Guide:** `c:\Users\aryan\Downloads\Clipyx\Textizo AI Guide.md`
- **Transcribe Toolkit:** `c:\Users\aryan\Downloads\Clipyx\tools\transcribe`
- **Unified CLI Launcher:** `c:\Users\aryan\Downloads\Clipyx\clipyx.bat` or `python clipyx.py`

---

## 1. Planizo: Video Creator Productivity & Planning App

Planizo is a local, client-side productivity app designed specifically for video editors, YouTubers, and content creators. It stores all data in browser `localStorage`.

### Launching Planizo Locally
Run the built-in HTTP server:
```powershell
# From the Clipyx workspace
python clipyx.py serve --port 5173 --open
# Or via batch file:
.\clipyx.bat serve --port 5173 --open
```
This serves `app/planizo` locally with relative asset resolution (CSS, JS chunks, SVG sprite, Inter fonts, and tags).

### Planizo Core Modules:
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

### Script & B-Roll Analysis Tool
Extract B-roll tags, visual cues, and on-screen text graphics directly from a script:
```powershell
python clipyx.py plan script "path\to\script.md"
```
Supports inline tags like `[B-roll: close-up of keyboard typing]`, `[Visual: zoom into chart]`, and `[Title: 5 Key Principles]`.

---

## 2. Clipyx DaVinci Resolve Library (319 Ready-Made Items)

The Clipyx Library contains 319 curated code snippets, expressions, node trees, and Lua scripts for DaVinci Resolve and Fusion.

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

## 3. Textizo AI Preset Authoring Rules (Official Guide Specification)

When an AI agent is asked to generate a Textizo preset for DaVinci Resolve, it **MUST** follow the protocol defined in `Textizo AI Guide.md`:

### Output Format (Strict 3-Part Reply)
1. **Description:** 1-2 sentences describing the animation, timing, and style. First line must state the name: `Textizo-` + 2-digit number + capital letter (e.g. `Textizo-01A`, `Textizo-02A`).
2. **Preset Block:** Exactly **one** code block marked `lua` containing the complete `.setting` format node, with no comments inside.
3. **Usage Steps:** Short 3-4 line instructions:
   - Copy the code block.
   - In Fusion Nodes area, press Ctrl+V (Mac: Cmd+V).
   - Connect Textizo to MediaOut1 or foreground of a Merge node.
   - Type your text in the Inspector.

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
python clipyx.py preset install resolve "my-presets\Textizo-01A.setting"
```

---

## 4. Transcribe: Local Speech Recognition & Subtitle Kit

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
