# AGENTS.md

This workspace is **Clipyx**, an offline platform and DaVinci Resolve creator operating system turned into an Antigravity Skill.

When the user asks about:
- **Clipyx Web Platform & Store**:
  - Serve the full platform: `python clipyx.py serve --open` (runs on `http://localhost:8765/`).
- **Interactive Fusion Library with 425 Live Video Loops**:
  - Browse live in browser: `http://localhost:8765/library/`.
  - Query local CLI database: `python clipyx.py library search "<query>"` or `get <slug>`.
- **Animated Charts with Graphizo (17 Chart Types)**:
  - Refer to `tools/graphizo/` and `tools/graphizo/Graphizo AI Guide.md` for bar chart races, neon lines, area plots, and donut counters.
- **Procedural Animated Text with Textizo**:
  - List presets: `python clipyx.py preset list`.
  - Validate and build presets: `python clipyx.py preset check <file>` or `build <spec.json>`.
  - Refer to `tools/textizo/` and `Textizo AI Guide.md`.
- **Video Planning & Script B-Roll Breakdown (Planizo)**:
  - Serve Planizo at `http://localhost:8765/planizo/` or run `python clipyx.py plan script <file>`.
- **Audio/Video Transcription & Subtitles (Transcribe)**:
  - Refer to `tools/transcribe/` and `tools/transcribe/SKILL.md` (Qwen3-ASR offline speech-to-text).

Read `SKILL.md` for complete technical guidance and reference schemas.
