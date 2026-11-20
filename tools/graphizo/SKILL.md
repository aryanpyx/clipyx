---
name: graphizo-charts
description: Makes ready-to-use Graphizo animated chart presets (.setting files) for DaVinci Resolve's Fusion page from the user's numbers, a table or a CSV file and a plain description (for example "a neon bar chart of my monthly views", "a bar chart race of these channels", "a donut of our traffic sources for a Short"). It checks each preset and saves it where the user wants, including Resolve's own Settings folder. Use it whenever the user asks for a Graphizo chart, graph, data animation or chart look, or for changes to one.
---

# Graphizo charts

You make presets for **Graphizo**, an animated chart node for DaVinci Resolve (Fusion page). A preset is a small `.setting` text file holding one Graphizo node with its data, chart type, look and animation. The user pastes it into Fusion or loads it onto a Graphizo node.

## Before you start

- **Read `Graphizo AI Guide.md` completely, once per session.** It is the reference for:
  - the data rules (section 3) and which chart fits which data (section 4);
  - every control, its units and its default (section 12);
  - timing in frames (section 7) and value transitions (section 8);
  - the house style (section 11) and how users load presets (section 15).

  This file only adds the workflow for agents that can use files.
- **The helper** is `python tools/graphizo_preset.py` (use `python3` on Mac and Linux, or `py` on some Windows installs). It needs Python 3 and nothing else. It reads `reference/inputs.json`, the list of Graphizo's controls.
- **If Python is not available,** write the preset by hand from the guide's examples (sections 13 and 14) and go through the guide's checklist yourself.

## Workflow

1. **Understand the request.** Ask, in one message and only for what is missing:
   - the data: numbers with their labels, a table, or a file;
   - what the chart should say, if the chart type is not obvious;
   - the look or colours (optional);
   - the format: YouTube (16:9), Shorts or Reels (9:16), square;
   - the clip length and frame rate (default 10 s at 30 fps);
   - whether it goes over footage (then use a transparent background).

   Use the user's numbers exactly. Never invent data and present it as real; example numbers must be labelled "illustrative data" in the subtitle.
2. **Get the data into shape.** For a CSV or TSV file, `python tools/graphizo_preset.py data "<file>"` prints it as Graphizo data text and reports cells Graphizo cannot read (keep only the needed columns with `--columns "Month,Views"`; `--transpose` swaps rows and columns, for example to make a race from a table with years as rows). It warns about European numbers (`1.234,5`, which Graphizo would misread): convert them with `--decimal-comma`, and drop currency signs and units from value cells with `--clean` (then put the unit in `prefix` or `suffix`). For a spreadsheet or another format, read it with your own tools and write the table as text.
3. **Ask where to save** (once per session; remember the answer), unless the user already named a folder. Show the real paths from `python tools/graphizo_preset.py where`. The options:
   1. **Resolve's Settings folder** (recommended). Presets there appear in a Graphizo node's right-click **Settings** menu, and **Settings > Load…** opens that folder.
      - Windows: `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Settings`
      - Mac: `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Settings`
   2. **Downloads/Graphizo Presets.** Easy to find. The user drags a preset onto the Nodes area, or loads it with Settings > Load….
   3. **A folder the user names.**
   4. **Both 1 and 2.**
4. **Pick a short name.** Presets are named `Graphizo-` plus a two-digit number and a capital letter, for example `Graphizo-07A`.
   - The number is the chart. Get the next free one with `python tools/graphizo_preset.py next-name --to resolve` (use the user's folder choice).
   - The letter is a variation of that chart. Get the next letter with `next-name --to resolve --variant 7`, which gives `Graphizo-07B`.
   - Use no spaces and no descriptive words in the name. Describe the chart in your message instead.
5. **Write a spec.** Copy the closest file from `specs/` (one for each preset in `presets/`, covering all 17 chart types) to `my-presets/<short name>.json`, then edit it. The format is below. Set `name` to the short name; the file becomes `Graphizo-07A.setting`.
6. **Build and check:**
   ```
   python tools/graphizo_preset.py build "my-presets/Graphizo-07A.json" --frames <clip length in frames>
   ```
   This writes `my-presets/Graphizo-07A.setting`, a complete preset (every control written out, so loading it onto an existing node gives exactly this chart). Rebuilding replaces files in `my-presets/` without asking: it is the kit's work folder. Files in the folder the user chose are never replaced without asking (step 7).

   The report shows the chart, the data it read (rows, series, range), the timing and any keyed values. It also estimates the layout: long titles, labels that get shortened, text that is hard to read. You cannot see the render, so take its warnings seriously.
   - Fix every **ERROR**.
   - Fix every **WARNING** unless the user asked for that.
   - **NOTES** are house-style hints (guide section 11); follow them unless the request says otherwise.
7. **Install:**
   ```
   python tools/graphizo_preset.py install "my-presets/Graphizo-07A.setting" --to resolve
   ```
   Use `--to downloads` or `--to "<folder>"` for the other choices. The command refuses to overwrite an existing file; ask the user whether to replace it (`--overwrite`) or use the next free name.
8. **Tell the user:**
   - the preset's short name and what the chart shows and how it moves;
   - where the file is;
   - how to use it (guide section 15): drag it onto the Nodes area or use Settings > Load…, then connect it to MediaOut1 or through a Merge;
   - where to edit the numbers later (Controls > Data Fields).

   They have the file, so do not paste the preset text unless they ask for it. You cannot see the animation, so describe it, and never claim you have tested it in Resolve.
9. **Change it on feedback.** A fix to the same chart keeps its name: edit the spec, rebuild, and reinstall with `--overwrite`. When the user wants to keep both versions, give the new one the next letter.

You can also start from an existing preset or a node the user saved from Resolve: `python tools/graphizo_preset.py to-spec "<file.setting>" my-presets/Graphizo-07A.json`.

For a chat answer (no files), `build --compact` writes only what differs from Graphizo's defaults, like the guide's examples. Compact presets are for pasting as a new node.

## Spec format

```json
{
  "name": "Graphizo-07A",
  "chart": "bar",
  "orientation": "horizontal",
  "look": "midnight",
  "canvas": "youtube",
  "data": "Category,Views\nScience,280000\nTechnology,340000\nHistory,190000",
  "title": "WHAT PEOPLE WATCH",
  "subtitle": "Average views per upload | illustrative data",
  "source": "Source: example data",
  "sort": "descending",
  "highlight": 2,
  "values": true,
  "number_style": "compact",
  "decimals": 1,
  "animation": {"playback": "entrance", "duration": 45, "ease": "ease_out", "stagger": 0.35, "count_up": true}
}
```

**Chart and canvas:**

- `chart`: `bar`, `grouped_bar`, `stacked_bar`, `line`, `area`, `scatter`, `pie`, `donut`, `rose`, `radar`, `parliament`, `race`, `waterfall`, `gauge`, `funnel`, `heatmap` or `bubble` (guide section 4). Leave it out for a style preset that keeps the node's chart type.
- `orientation`: `vertical` or `horizontal` (Bar, Grouped Bar, Stacked Bar).
- `look`: `midnight`, `studio_lime`, `editorial_paper`, `neon`, `sunset` or `custom` (guide section 5).
- `canvas`: `youtube` (1920x1080), `shorts` (1080x1920), `square` (1080x1080), `4k`, or `[width, height]`.
- `transparent`: `true` for a chart over footage. `follow_input`: Auto Resolution.

**Data** (give one of the two, or neither for a style preset that keeps the node's data):

- `data`: the table as text (`"Month,Views\nJan,120\nFeb,180"`), as rows (`[["Month","Views"],["Jan",120]]`) or as `{"columns": [...], "rows": [[...]]}`. Guide section 3 has the rules: first column labels, a header line, plain numbers.
- `fields`: 1 to 16 items, each `["Label", value]` or `{"label": "Label", "keys": {"0": 120, "75": 180}}` for a value that changes during the clip (guide section 8). Keys are Fusion frames. By default each key holds the previous value until the frame before it (`"keys_mode": "step"`), so the chart springs to the new value; `"keys_mode": "linear"` ramps between keys instead.

**Text and numbers:**

- `title`: text, or an object: `"title": {"text": "TOP 5 VIDEOS", "scale": 1.3, "align": "left"}` (`align`: `center` or `left`). `subtitle`, `source`: text.
- `labels`, `values`: `true` or `false` (category labels, value labels).
- `value_format`: `"value"` or `"percent"`. `number_style`: `"plain"`, `"compact"` or `"thousands"`. `decimals`: 0 to 4. `prefix`, `suffix`: text such as `"$"` or `" min"`.
- `legend`: `"outside"` (labels around radial charts), `"legend"` or `"none"`.
- `font`: a font name, or `{"family": "Arial", "style": "Bold"}`; `font_style`: a style name such as `"Bold"`. `font_scale`: 1 to 12 (default 4). `text_color`: a colour (look `custom` only).
- `typography`: per text role (`category`, `value`, `axis`, `legend`, `title`, `subtitle`, `source`, `target`, `donut_total`, `donut_caption`, `race_time`, `rank`), for example `"typography": {"title": {"font": "Georgia", "style": "Bold", "size": 1.1, "tracking": 0.5, "x": 0, "y": -10, "align": "left"}}`. All keys are optional; `x` and `y` are pixels.

**Story and scale:**

- `sort`: `"none"`, `"ascending"` or `"descending"`. `highlight`: the row (or series) number to highlight, from 1; `dim`: the others' opacity (0 to 1).
- `target`: a number, or `{"value": 100000, "label": "Goal", "show_value": false}` (Bar, Line, Area, Scatter, Waterfall).
- `y_range`: `[0, 100]` or `"auto"`.

**Colours and depth** (colours are `"#RRGGBB"` or `[r, g, b]` from 0 to 1):

- `background`, `text_color`: colours, used with look `custom`.
- `colors`: 1 to 6 colours for the bars or slices, in order, like `["#FF5A36", "#2EC4B6"]` (turns Auto Palette off, also with a creator look). Or `"palette": {"hue": 210, "spread": 300, "saturation": 0.72, "lightness": 0.55}` for automatic hues.
- `grid`, `axis`: `true` or `false`, or `"grid": {"show": true, "color": "#333A44", "fade": 12, "width": 1.5}` and `"axis": {"show": true, "color": "#8C919E"}`.
- `depth`: `{"shadow": 0.35, "softness": 16, "distance": 6, "glow": 0.6, "glow_size": 20}` (shadow and glow 0 to 1; the rest in pixels).
- `bars`: `{"width": 0.62, "corner_radius": 10}`. `lines`: `{"width": 5, "smooth": true, "marker": "circle", "marker_size": 12, "area_opacity": 0.35}` (`marker`: `none`, `circle`, `square` or `diamond`).
- `radial`: `{"start_angle": -90, "direction": "clockwise", "inner_radius": 0.55, "slice_gap": 2, "center_total": true, "center_caption": "TOTAL"}` (`direction`: `clockwise` or `counter_clockwise`).
- `waterfall`: `{"total": true, "total_label": "Net"}`. `parliament`: `{"rows": 8, "seat_shape": "circle", "seat_size": 1, "inner_radius": 0.35}` (`seat_shape`: `circle`, `rounded` or `square`).
- `padding` (pixels), `chart_offset` (`[x, y]` pixels), `opacity` (0 to 1).

**Animation** (all times in frames):

- `animation`: for example `{"playback": "in_out", "start": 0, "duration": 40, "hold": 150, "exit": 20, "gap": 15, "build": "auto", "ease": "back_out", "stagger": 0.5, "order": "first_to_last", "count_up": true, "draw_head": false}`.
  - `playback`: `manual`, `entrance` (the builder's default), `in_out` or `loop`. With `manual`, `progress` (0 to 1) is the build state.
  - `build`: `auto`, `grow`, `sweep`, `draw` or `fade`. `ease`: `linear`, `smooth`, `ease_out`, `back_out`, `bounce_out` or `elastic_out`. `order`: `first_to_last`, `last_to_first` or `center_out`. `origin`: `comp` (from the clip's first frame, the default) or `absolute`.
- `transitions`: `"spring"`, or `{"mode": "spring", "frames": 18}` (`mode`: `instant`, `smooth`, `spring` or `bouncy`).
- `race`: `{"auto": true, "start": 30, "duration": 240, "ranks": 8, "show_time": true, "show_ranks": true, "tracks": true}`; with `"auto": false`, `"position"` (0 to 1) is the place in the timeline.

**Other:**

- `frames`: the clip length, used by the check (the same as `--frames`). `notes`: ignored; use it for your own comments.
- `inputs`: raw overrides, like `{"ShowTarget": 1, "TargetValue": 50}`: a number, text or `true`/`false` per ID. Use only IDs whose `role` is `public` in `reference/inputs.json`.

## Other commands

```
python tools/graphizo_preset.py build "<spec.json>" ["<out.setting>"] [--frames N] [--compact] [--overwrite]
python tools/graphizo_preset.py check "<file.setting>" [--frames N]
python tools/graphizo_preset.py data "<file.csv>" [--columns "Month,Views"] [--transpose] [--clean] [--decimal-comma]
python tools/graphizo_preset.py to-spec "<file.setting>" [out.json]
python tools/graphizo_preset.py where
python tools/graphizo_preset.py next-name --to resolve [--variant 7]
```

`build` with an output path outside `my-presets/` refuses to replace an existing file unless you pass `--overwrite`.

## Rules

- **Only write to `my-presets/` and the folder the user chose.** Never delete files. Outside `my-presets/`, never overwrite a file without asking.
- **Leave the kit unchanged** (`presets/`, `specs/`, `reference/`, `tools/`, the guide, this file) unless the user asks.
- **Use short names:** `Graphizo-07A.setting`, with a new number for each chart and a new letter for each variation. Never use spaces or descriptive words in the name.
- **Never guess input IDs.** Use the guide, or `reference/inputs.json` with `role: public`.
- **Keep the user's data honest:** their numbers, their labels, their units. Say when a number had to be changed to fit (for example a cell Graphizo cannot read).
- **If a new preset does not appear in the right-click Settings menu**, tell the user to use Settings > Load… (or restart Resolve).
