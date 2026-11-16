# AGENTS.md

This workspace is **Clipyx**, an offline copy of the Clipyx and Planizo platforms turned into an Antigravity Skill.

When the user asks about:
- Video planning, content scheduling, script B-roll breakdown, or opening Planizo:
  - Serve Planizo using `python clipyx.py serve` or run `python clipyx.py plan script <file>`.
- DaVinci Resolve Fusion expressions, motion graphics, node trees, or Lua scripts:
  - Query the local database: `python clipyx.py library search "<query>"`.
  - Fetch item details & tips: `python clipyx.py library get <slug>`.
- Animated text presets (.setting files):
  - List presets: `python clipyx.py preset list`.
  - Validate and build presets: `python clipyx.py preset check <file>` or `build <spec.json>`.
- Audio/video transcription or subtitle generation:
  - Refer to `tools/transcribe/` and `tools/transcribe/SKILL.md`.

Read `SKILL.md` for complete technical guidance and reference schemas.
