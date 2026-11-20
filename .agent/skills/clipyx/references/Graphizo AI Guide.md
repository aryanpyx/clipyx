# Graphizo AI Guide

For **Graphizo** (Clipizo), the animated chart generator for DaVinci Resolve's Fusion page. Give this file to any AI chat, such as ChatGPT, Claude, Gemini or Copilot, and it can turn your numbers into a ready-to-use animated chart. Graphizo is available at clipizo.com.

---

## Quick start (for you)

1. **Give this file to your AI.** Open the chat and attach this file (or paste all of its text). Then say what you want and give your numbers. For example: *"Make a Graphizo chart: a bar chart of my views per month, Jan 12000, Feb 18500, Mar 26000, Apr 31000, neon look, bars pop in. My clip is 8 seconds at 30 fps."* You can also paste a table from a spreadsheet.
2. **Copy the code.** The AI answers with one block of code. Copy all of it; most chats have a Copy button on the block.
3. **Paste it into Resolve.** On the Fusion page, click an empty spot in the **Nodes** area and press **Ctrl+V** (Mac: **Cmd+V**). A new Graphizo node appears with your chart.
4. **Connect it.**
   - For a chart on its own, connect the Graphizo node to **MediaOut1**.
   - For a chart over a video clip, ask the AI for a **transparent background**. Then add a **Merge** node: connect MediaIn1 to the Merge's yellow background input, Graphizo to its green foreground input, and the Merge to MediaOut1.

You can change the numbers, labels and titles in the Inspector at any time.

**To keep a chart for later**, ask the AI for a `.setting` file, or save the code in a plain text file with the short name the AI gave it, for example `Graphizo-01A.setting`. Put that file in Resolve's Settings folder (see section 15). After that, you can apply it to any Graphizo node: right-click the node, then choose **Settings > Load…**.

---

## Instructions for the AI

You are making a **preset for the Graphizo node**: plain text in Fusion's settings format that the user pastes into Resolve's Fusion page or saves as a `.setting` file. Everything you need is in this guide. **Only use input names (IDs) that appear in this guide, and do not guess others.** A misspelled ID, or an ID in the wrong capitals, is silently ignored by Resolve.

**How to answer:**

1. **Ask only if something essential is missing,** and ask everything in one short message. The things you may need are:
   - the numbers and their labels (or a table);
   - what the chart should show, if the chart type is not obvious;
   - the look or colours (optional);
   - the format: YouTube (16:9), Shorts or Reels (9:16) or square;
   - how long the clip is and its frame rate.

   Only the numbers are worth a question. For anything else, reuse what the user said earlier in the conversation, or use these defaults: 30 fps, a 10-second clip (300 frames), the YouTube canvas (unless they mention Shorts, Reels, TikTok or vertical), the Midnight look and an Auto Entrance. Say in your reply which defaults you used.
2. **Never invent data and present it as real.** Use the user's numbers exactly. If you must show example numbers, say so in your reply and put "illustrative data" in the subtitle.
3. **Pick the chart from the data** (section 4) and start from the closest example (sections 13 and 14). Add a short title and a subtitle (what, unit, period) unless the user asks for none. Follow every rule in the checklist below.
4. **Reply in three parts:**
   - one or two sentences describing the chart and its animation, starting with the preset's short name in bold, like **Graphizo-01A**;
   - the whole preset in **one** code block marked `lua`, with nothing else in it;
   - the usage steps from section 15 (paste, connect, edit the numbers), in 3 or 4 short lines.
5. **Give every preset a short name:** `Graphizo-` followed by a two-digit number and a capital letter, for example `Graphizo-01A`.
   - Each new chart gets the next number (`Graphizo-01A`, `Graphizo-02A`, …).
   - A variation of a chart keeps its number and takes the next letter (`Graphizo-01B`, `Graphizo-01C`).
   - Use no spaces and no descriptive words in the name; describe the chart in your reply instead.
   - If the user mentions presets they already have, continue after their highest number.

   If your chat can attach files, also attach the preset as a file named after it, for example `Graphizo-01A.setting`. If it cannot, add one line telling the user they can save the code in a text file with that name to keep it.
6. **When the user asks for changes,** send the whole preset again, not just the changed lines.

**Checklist (check every item before you answer):**

- [ ] **One node, written exactly like the examples.** The file is `{ Tools = ordered() { ... } }` with exactly one node, `Graphizo1 = Fuse.Graphizo { Inputs = { ... } }`. The only other nodes allowed are `BezierSpline` keyframe nodes for keyed Field values (section 8). No comments.
- [ ] **Required inputs:** `GraphType`, `CreatorLook`, `OutputPreset`, `DataSource` and `MotionMode` are always written.
- [ ] **Data:**
  - with `DataSource` 1 (Text), `Data` holds the table: a header line, then one `Label,Value,...` line per row, written as one text with `\n` between lines;
  - with `DataSource` 0 (Fields), `FieldCount` is set and every field up to it has `FieldLabelN` and `FieldValueN`;
  - numbers are plain: digits, one `.` for decimals, an optional `-`, and no units in the cells (use `ValuePrefix` / `ValueSuffix`);
  - the data has the shape the chart needs (section 4), and stays inside the limits (64 rows; 6 value columns, 16 for a Heatmap, 128 for a race).
- [ ] **Title:** to show a title, write `ShowTitle` 1 and `TitleText`. `Subtitle` and `SourceText` show whenever they are not empty.
- [ ] **Colours:** a creator look (`CreatorLook` 1 to 5) sets the background, text, grid, axis and palette. To keep a look but use your own background, text, grid or axis colour, give `background`, `text_color`, `grid.color` or `axis.color` in the spec (the helper switches on `CustomBg`, `CustomText`, `CustomGrid` or `CustomAxis`); `CreatorLook` 0 uses all your own colours. To use your own bar colours, set `AutoPalette` 0 and write `Custom1R`/`G`/`B` and so on (0 to 1 each).
- [ ] **Timing:** frames are worked out with section 7, and every animation ends before the clip's last frame.
- [ ] **Values are in range:** checkboxes are 0 or 1, dropdowns use the numbers in the control tables (section 12), and decimals use a dot.
- [ ] **Each ID once.** Do not write the same input twice.
- [ ] **Name:** the preset has a short name like `Graphizo-01A` (step 5 above).

---

## 1. How Graphizo works

Graphizo is a generator node: it draws a chart image from data, so it needs no input. Its Inspector has four pages:

- **Controls:** chart type, creator look, data, canvas size, value range and sorting.
- **Style:** background, depth and glow, grid and axis, labels and numbers, title, storytelling (highlight, target line), line, radial, waterfall and parliament settings, and typography for each kind of text.
- **Animation:** playback (entrance, exit, loop), build, ease and stagger, value transitions, and bar chart race playback.
- **Colors:** automatic palette or six custom colours.

There are two ways to give it data (`DataSource`):

- **Text** (1): a table pasted into `Data`. Use it for most charts, for several series, and for races.
- **Fields** (0): up to 16 label and value pairs. Each value is a normal Inspector control, so it can be keyframed. When a keyed value changes, the chart springs to the new value (section 8).

Graphizo animates by itself: with `MotionMode` set to Auto Entrance, the chart builds when the clip starts and then holds. It draws with Fusion's own vector renderer, so it plays back in real time.

## 2. The preset file

A preset is Fusion settings text. Every input is written like this:

```
                <InputID> = Input { Value = <value>, },
```

Value formats:

| Kind | Write it as | Example |
|---|---|---|
| number | plain decimal number (use a dot, not a comma) | `2.4`, `-90`, `0` |
| checkbox | 0 or 1 | `1` |
| dropdown | the option's number, from 0 (section 12) | `GraphType = Input { Value = 7, },` is a Donut |
| text | in double quotes. Write a new line as `\n`, a quote as `\"`, and a backslash as `\\` | `"Month,Views\nJan,120"` |
| colour | three inputs, red, green and blue, from 0 to 1 | `BgR`, `BgG`, `BgB` |

The order of the inputs does not matter.

**What happens to inputs you leave out:**

- A preset **pasted as a new node** takes Graphizo's defaults (section 12) for anything you leave out. That is how the examples are written: they list only what differs from the defaults, plus the required inputs.
- A preset **loaded onto an existing node** (Settings > Load) keeps that node's old values for anything you leave out. If the user wants to load your preset onto a node they already styled, write out every setting you care about.

A **style preset** is a preset without data: leave out `DataSource`, `Data`, `FieldCount` and the fields (and `GraphType` if it should work on any chart). Loaded onto a node, it changes the look and keeps the node's data.

## 3. Data

### Text tables (`DataSource` 1)

The `Data` text is a small table, one row per line:

```
Month,Views,Subscribers
Jan,125000,8500
Feb,180000,12000
Mar,240000,17500
```

- **The first column is the label** of each row (a category, a month, a party). The other columns are **series** (value columns).
- **The header line** names the series. It is any first line whose cells are not numbers, or a line whose first cell is exactly `#`, like `#,Views,Subscribers`. A first line of years above rows that are not years (`Country,2021,2022,2023`) is a header too; the `#` form (`#,2021,2022,2023`) always works.
- **Columns** are separated by commas, tabs or semicolons (Graphizo uses whichever the first line has most of). A cell with a comma in it is quoted: `"Atlas, Inc.",420`. A quote inside a quoted cell is doubled: `""`.
- **Numbers:** Graphizo ignores spaces, `$`, `€`, `£`, `¥`, `%` and apostrophes in a cell, and reads `(12)` as -12. Thousands marks and decimal marks are both understood: `1,250.5`, `1.250,5`, `1 250` and `1'250` all work, and in a semicolon table (European CSV) `1,5` is 1.5. Anything else that is not a number, such as `12 kg` or `n/a`, counts as **0**: put units in `ValuePrefix` and `ValueSuffix`. Empty cells are 0. In your own presets, write plain numbers with a `.` for decimals.
- **A line that starts with `#` and has no numbers** (like `# note`) is a comment; `#1 Song,50` is a data row. Empty lines, and rows whose cells are all empty (like `,,,` from a spreadsheet), are skipped.
- **Labels, titles, prefixes and suffixes** can use any characters the font has, such as `€`, `£` or `é`. Each text is one line, written left to right (no right-to-left shaping). Write units the way the user does: `€` as a prefix or ` €` as a suffix.
- **Limits:** 64 rows; 6 value columns (16 for a Heatmap, 128 snapshots for a Bar Chart Race). Extra rows and columns are ignored.
- **In the preset**, the whole table is one text value with `\n` between lines: `Data = Input { Value = "Month,Views\nJan,120\nFeb,180", },`.

### Fields (`DataSource` 0)

`FieldCount` (1 to 16) sets how many label and value pairs are used. Each has `FieldLabelN` (text) and `FieldValueN` (a number), for N from 1 to `FieldCount`. Fields give **one series**, so they suit Bar, Line, Area, Pie, Donut, Rose, Funnel, Gauge, Parliament and Waterfall (without subtotals). Use them when values should change during the clip (section 8).

### Which to use

- A table, several series, a race, a heatmap, a scatter or bubble chart: **Text**.
- Up to 16 values that change over time (a live counter, a poll, a score): **Fields** with keyframes.
- Otherwise either works; Text is easier to edit as one block.

## 4. Chart types

`GraphType` picks the chart:

| GraphType | Chart | Data it needs | Good for |
|---|---|---|---|
| 0 | Bar | labels + 1 value column (more columns are ignored) | comparing categories, rankings (`Orientation` 1 for horizontal bars) |
| 1 | Grouped Bar | labels + 2 to 6 value columns | comparing a few series per category; turn on the legend |
| 2 | Stacked Bar | labels + 2 to 6 value columns | parts of a whole per category |
| 3 | Line | labels + 1 to 6 value columns | change over time |
| 4 | Area | labels + 1 to 6 value columns | trends with weight; the soft areas overlap (`AreaOpacity`) |
| 5 | Scatter | labels + X column + Y column | two measures per item (the points have no name labels) |
| 6 | Pie | labels + 1 value column | shares of a whole, 2 to 7 slices |
| 7 | Donut | labels + 1 value column | shares, with a total in the middle (`DonutTotal`) |
| 8 | Rose | labels + 1 value column | cycles such as months; petal length follows the value |
| 9 | Radar | 3 or more rows (axes) + 1 to 6 value columns | comparing profiles on the same scale |
| 10 | Parliament | party labels + seats (whole numbers, 1500 at most) | seat counts |
| 11 | Bar Chart Race | rows are categories, columns are snapshots in time | rankings that change over time (section 9) |
| 12 | Waterfall | step labels + the change at each step | how a start value becomes an end value |
| 13 | Gauge | up to 4 rows + 1 value column | progress to a goal, percentages |
| 14 | Funnel | stage labels + 1 value column, largest first | conversion steps |
| 15 | Heatmap | row labels + up to 16 value columns | patterns in a grid, such as day x hour |
| 16 | Bubble | labels + X + Y + size columns | three measures per item |

Chart notes:

- **Bar** (0) uses `Orientation` (0 vertical, 1 horizontal). Long labels fit better on horizontal bars. `SortMode` (0 none, 1 ascending, 2 descending) sorts by the first series (not on a Waterfall, whose steps keep their order).
- **Grouped and Stacked Bar:** with `ShowValues` 1, Grouped labels every bar (with `ValueMode` 1, its share of its own series) and Stacked labels each stack's total at its outer end (with `ValueMode` 1, its share of all stacks).
- **Waterfall:** a row whose label starts with `=`, with nothing after it, is a **subtotal bar**: `=Gross` draws a bar named Gross at the running total. `WaterfallTotal` 1 adds a final total bar named `WaterfallTotalLabel`. Increases are green, decreases red, totals use colour 1.
- **Gauge:** each row is a 270-degree ring, from the outside in; the first row's value is the big number in the middle and the rows' names are listed below. The scale runs from 0 to a rounded maximum, or set `AutoY` 0 with `YMin` and `YMax` (for example 0 and 100 with `ValueSuffix` `%`). `InnerRadius` sets the ring thickness.
- **Funnel:** stages narrow by size and connect with soft bands. `ValueMode` 1 shows each stage as a percentage of the first.
- **Heatmap:** cells shade from a faint tint (the lowest value) to colour 1 (the highest). The header names the columns.
- **Scatter and Bubble:** the first value column is X (across), the second is Y (up), and for Bubble the third is the bubble size. `MarkerSize` sets the dot or bubble size. `AutoY` 0 with `YMin`/`YMax` zooms the Y axis.
- **Pie, Donut, Rose:** `LegendMode` 0 puts labels around the chart (cut to 12 characters), 1 puts a legend at the side (best for long names), 2 shows none. With `ShowValues` 1 each label gets its value underneath (or after the name in the legend); with `ValueMode` 1 it is a percentage. `SliceGap` (degrees, 1 to 2 looks clean) separates slices; `StartAngle` (-90 is 12 o'clock) and `SweepDir` set where and which way they go. `SortMode` orders the slices too.
- **Donut total:** `DonutTotal` 1 shows the sum of all slices in the middle, styled by `NumberStyle` and the prefix and suffix, with the caption `DonutLabel` under it; it counts up with `CountUp` 1.
- **Radar:** rows are the axes around the circle; each value column is one shape. Use the same scale for every axis (`AutoY` 0, `YMin` 0, `YMax` 10, for example).
- **Parliament:** the seats of all rows add up to the chamber. `ParlRows` sets the rows of seats, `SeatShape` and `SeatSize` the dots. The legend lists each party with its seats unless `LegendMode` is 2.

## 5. Looks and colours

`CreatorLook` sets a coordinated background, text colour, grid and six-colour palette:

| CreatorLook | Look | Background, text |
|---|---|---|
| 0 | Custom | your own `Bg`, `Label`, `Grid` and `Axis` colours |
| 1 | Midnight | deep navy, white text; cyan, violet, orange, mint, pink, blue |
| 2 | Studio Lime | near black, warm white text; lime, sky blue, orange, purple, teal, yellow |
| 3 | Editorial Paper | cream paper, dark ink text; blue, red, green, purple, ochre, teal |
| 4 | Neon | black violet, white text; magenta, cyan, pink, violet, yellow-green, blue |
| 5 | Sunset | dark plum, cream text; coral, gold, rose, purple, teal, sand |

**Your own colours:**

- With `CreatorLook` 0, set the background with `BgR`, `BgG`, `BgB`, the text with `LabelR`, `LabelG`, `LabelB`, and the grid and axis with `GridR`/`G`/`B` and `AxisR`/`G`/`B`. All are 0 to 1 (divide 0-255 values by 255). Keep text readable: light text on a dark background or the other way round.
- With a creator look, those colours apply only when their switch is 1: `CustomBg`, `CustomText`, `CustomGrid`, `CustomAxis` (the look keeps everything else). In a spec, writing `background`, `text_color`, `grid.color` or `axis.color` next to a `look` turns the switch on for you.
- **Bar and slice colours:** `AutoPalette` 1 (the default) uses the look's palette, or with Custom an even spread of hues (`PaletteHue`, `PaletteSpread`, `PaletteSat`, `PaletteLight`). `AutoPalette` 0 uses `Custom1` to `Custom6` (each as R, G, B), even with a creator look. Colour 1 goes to the first row for one-series charts and to the first series for multi-series charts; more rows than six reuse the colours in order. Three charts use one colour: the Heatmap and the Waterfall's total bars use Colour 1 (waterfall steps are always green up and red down), and XY Scatter points use Colour 2.
- **`TransparentBg` 1** leaves out the background, for charts over footage. The look still sets the text and palette.

**Depth and glow:** `Shadow` (0 to 1, default 0.35) puts a soft drop shadow under the data; `ShadowSoftness` and `ShadowDistance` are in pixels. `Glow` (0 to 1) adds a coloured glow around bars, slices, points and lines, and `GlowSize` sets its reach in pixels. Glow suits the Neon look (0.5 to 0.8).

**Shapes:** `CornerRadius` rounds the value end of bars (pixels). `BarWidth` is the share of each slot a bar fills (0.05 to 1). `ChartLineWidth` is the line thickness for Line, Area and Radar charts; `LineWidth` is the grid line thickness.

## 6. Labels, numbers and titles

**Labels:** `ShowLabels` shows category names and axis numbers. `ShowValues` writes each value on its bar, point or slice. `LegendMode` 1 shows a legend: it names the series of multi-series charts, and puts the slices' names and values at the side of radial charts.

**Numbers:**

- `NumberStyle`: 0 plain (`1250000`), 1 compact (`1.3M`, with K, M, B, T), 2 thousands separators (`1,250,000`).
- `Decimals` (0 to 4) rounds; trailing zeros are dropped. With `NumberStyle` 1 the rounding happens after dividing: 268,500 shows as `268K` or `269K` at 0 decimals (an exact half can go either way) and `268.5K` at 1. Tell the user when rounding hides detail they gave you.
- `ValuePrefix` and `ValueSuffix` add units: `$` and `K` give `$12K`; a suffix ` min` (with a space) gives `95 min`.
- `ValueMode` 1 (Percent) shows each value as a share of the first series' total (for a Funnel, of the first stage). Prefix and suffix are not added to percentages.
- These also style the axis numbers and the donut total.

**Title and credits:** `ShowTitle` 1 shows `TitleText` at the top; `TitleScale` sizes it (default 1.5) and `TitleAlign` places it (0 centre, 1 left). Long titles shrink to fit. `Subtitle` sits under the title and `SourceText` at the bottom left (both are cut short if they are too long for the frame). Creator looks read well with short titles in capitals.

**Text size and fonts:** `LabelScale` (Font Scale, 1 to 12, default 4) sizes all text: each unit is about 7 pixels of font size on a 1080p canvas, so the default 4 gives labels about 29 pixels in size; the title is drawn at Font Scale x `TitleScale` x 2. `FontFamily` and `FontStyle` pick an installed font and one of its styles by name, such as `"Arial"` and `"Bold"`. The font must be installed on the computer that renders; if it is missing, Graphizo uses an installed one. Safe choices: Arial, Arial Black, Verdana, Tahoma, Trebuchet MS, Georgia, Times New Roman, Impact. The style name must exist for that font (Arial has Regular, Bold, Italic and Bold Italic; Arial Black has only Regular).

**Per-text typography:** each kind of text can have its own font, size, spacing, offset and alignment. Each role (for example `Title` or `Category`) has `UseMainFont`, `FontFamily`, `FontStyle`, `Size`, `Tracking`, `OffsetX`, `OffsetY` and `TextAlign` after its prefix, such as `TitleUseMainFont`. Set `<Role>UseMainFont` 0 to use the role's own font. Offsets are in output pixels (positive X right, positive Y down). The roles are listed in section 12.

**Storytelling:**

- `FocusItem` highlights one row (its number in the original data, from 1) on one-series charts, races, waterfalls, scatter and bubble points, or one series on multi-series charts; `FocusDim` is the other items' opacity (default 0.25). 0 highlights nothing.
- `ShowTarget` 1 draws a dashed reference line at `TargetValue` on Bar, Line, Area, Scatter and Waterfall charts, with the caption `TargetLabel`. `TargetShowValue` 1 adds the formatted number.
- `AutoY` 0 fixes the value axis to `YMin` and `YMax`. Use it to compare several charts on one scale, or to zoom in.

## 7. Animation

**Playback** (`MotionMode`):

| MotionMode | Playback | What happens |
|---|---|---|
| 0 | Manual Progress | the chart shows `Progress` (0 to 1). Keyframe `Progress` yourself, or leave it at 1 for a still chart |
| 1 | Auto Entrance | builds over `MotionDuration` frames from `MotionStart`, then holds |
| 2 | Auto In + Out | builds, holds for `MotionHold` frames, then fades out over `MotionExit` frames |
| 3 | Loop | entrance, hold, exit and a blank gap of `MotionGap` frames, repeated |

All timing is in **frames**, counted from the clip's first frame (`TimeOrigin` 0). `TimeOrigin` 1 counts absolute Fusion frames instead. The title and grid fade in during the first 12 frames of the entrance, just ahead of the data.

**Working out the frames.** One second is as many frames as the frame rate: 30 at 30 fps, 25 at 25 fps, 24 at 24 fps, 60 at 60 fps. A clip of S seconds has frames 0 to S x fps - 1. The frame counts suggested in this guide are for 30 fps; at other rates multiply them by fps / 30 (25 fps: x 0.83, 24 fps: x 0.8, 60 fps: x 2).

```
entrance ends   = MotionStart + MotionDuration
exit starts     = MotionStart + MotionDuration + MotionHold
exit ends       = exit starts + MotionExit           (keep this a few frames before the clip's last frame)
```

For example, an 8-second clip at 30 fps has frames 0 to 239. With `MotionStart` 0, `MotionDuration` 40 and `MotionExit` 20, a `MotionHold` of 170 ends the exit on frame 230. With `MotionMode` 1 there is no exit: the chart holds from the end of the entrance to the end of the clip.

Give viewers about 3 seconds of hold to read the chart. In a clip shorter than about 5 seconds, keep the entrance near 1 second and leave out the exit (`MotionMode` 1) so the hold stays long enough.

**Build** (how the data appears): `BuildMode` 0 (labelled None in the Inspector) lets Graphizo pick a good build for the chart during automatic playback: bars and points grow, lines and areas draw on, pies, donuts, roses and gauges sweep. 1 Grow, 2 Sweep, 3 Draw and 4 Fade force one.

- `BuildEase`: 0 Linear, 1 Smooth, 2 Ease Out (default), 3 Back Out (a small overshoot), 4 Bounce Out, 5 Elastic Out.
- `Stagger` (0 to 1): 0 builds every bar at once, 1 builds them strictly one after another; 0.3 to 0.6 is a pleasant overlapping cascade. It applies to bars, points, funnel stages, heatmap cells and gauge rings; a pie, donut or rose sweeps as one. The timing, for N items over an entrance of D frames: with s = Stagger x (N - 1) / N, each item moves for (1 - s) x D frames, and item k (counting from 0) starts s x k / (N - 1) x D frames into the entrance. For example 5 bars, D = 45, Stagger 0.6: each bar moves for about 23 frames and the next starts about 5 frames later. `BuildOrder`: 0 first to last, 1 last to first, 2 centre out.
- `CountUp` 1 makes value labels count up with the build.
- `DrawHead` 1 puts a moving dot at the tip of a line while it draws on.

Good durations at 30 fps: 30 to 50 frames for bars, 60 to 100 for lines that draw on, 45 to 60 for sweeps.

## 8. Value transitions and keyframes

When a **Field value** changes during the clip, the chart moves to the new value instead of jumping: bars, slices, points, gauge rings and the value axis all follow. `TransitionMode` sets the motion (0 Instant, 1 Smooth, 2 Spring with a small overshoot, the default, 3 Bouncy) and `TransitionFrames` how long it takes to settle (default 18). It is calculated from the keyframes themselves, so exports always show the same frame.

To key a value in a preset, connect `FieldValueN` to a `BezierSpline` node with one key per frame. For a clean change, hold the old value until the frame before the new one:

```
{
	Tools = ordered() {
		Graphizo1FieldValue1 = BezierSpline {
			SplineColor = { Red = 191, Green = 255, Blue = 0 },
			KeyFrames = {
				[0] = { 120, Flags = { Linear = true } },
				[74] = { 120, Flags = { Linear = true } },
				[75] = { 180, Flags = { Linear = true } },
			}
		},
		Graphizo1 = Fuse.Graphizo {
			Inputs = {
				-- ... the rest of the preset ...
				FieldValue1 = Input { SourceOp = "Graphizo1FieldValue1", Source = "Value", },
			},
		},
	},
}
```

- Key frames are Fusion frames: 0 is the clip's first frame on the Fusion page.
- Only Fields values get transitions; a Text table does not.
- With `AutoY` 1 the value axis rescales as the values grow. Set `AutoY` 0 with a `YMax` above the largest value for a steady axis.
- Example 2 (section 14) is a complete keyed preset.

## 9. Bar chart races

Set `GraphType` 11 and give a Text table where **each row is a category and each value column is a snapshot** in time. The header names the snapshots; numbers like years are shown as the timeline caption and count smoothly between snapshots.

```
#,2020,2021,2022,2023
Atlas,420000,610000,850000,1300000
Nova,680000,760000,980000,1200000
Pulse,180000,320000,700000,1400000
```

- Up to 64 categories and 128 snapshots. Values below 0 count as 0.
- `RaceAuto` 1 plays the race from `RaceStart` over `RaceDuration` frames. With `RaceAuto` 0, `RacePosition` (0 to 1) is the place in the timeline, for keyframing by hand.
- `RaceTopN` (1 to 16) is how many ranks show. `RaceShowTime`, `RaceShowRanks` and `RaceTracks` show the timeline caption, the rank numbers and the faint track behind each bar.
- A good recipe: a 30-frame entrance (`MotionMode` 1, `MotionDuration` 30), in which the first snapshot's bars grow in, then the race from frame 30. Make `RaceDuration` end the race 2 to 3 seconds before the clip ends, so the final ranking holds. With `MotionMode` 2, keep the exit after the race ends.
- Value labels need `ShowValues` 1; they follow `NumberStyle` and `Decimals` while they count between snapshots. With fewer categories than `RaceTopN`, all of them show.
- With `AutoY` 1 the scale is fixed from the largest value in the whole table, so bar lengths stay comparable over time.

## 10. Canvas and compositing

`OutputPreset` sets the image size: 1 YouTube 1920 x 1080, 2 Shorts 1080 x 1920, 3 Square 1080 x 1080, 4 YouTube 4K 3840 x 2160, or 0 Custom with `OutputWidth` and `OutputHeight`. With a preset size, text, padding and line widths scale with the canvas; with Custom they are in pixels. If an image is connected to the node's input and `AutoResolution` is 1, the chart takes that image's size instead.

- `Padding` (pixels at 1080p) is the margin around the chart.
- `ChartOffsetX` and `ChartOffsetY` move the plot, axes and labels together (the title stays put).
- `MasterOpacity` fades the whole chart.
- For a chart over footage, set `TransparentBg` 1 and composite it with a Merge node (Quick start, step 4).

## 11. What looks good

- **One message per chart.** Say it in the title (short, in capitals for the creator looks) and give context in the subtitle: the unit, the period, and "illustrative data" when it is not real.
- **Few items.** About 3 to 8 bars or slices; group small ones as "Other". Use horizontal bars when labels are long or there are many rows.
- **Sort rankings** (`SortMode` 2) and **highlight** the item the story is about (`FocusItem`, `FocusDim` 0.25 to 0.35).
- **Readable numbers:** `NumberStyle` 1 for large values (`1.3M`), units as a prefix or suffix, and `ShowValues` 1 when there are about 12 bars or fewer.
- **Motion:** Ease Out or Back Out with a `Stagger` of 0.3 to 0.6 for bars; Draw with `DrawHead` for lines; Sweep for pies, donuts and gauges; `CountUp` 1 when values are shown. Keep the entrance under 2 seconds and hold at least 3 seconds.
- **Looks:** Midnight is a safe default, Neon with `Glow` 0.5 to 0.8 for energetic videos, Editorial Paper for documentary topics, Studio Lime and Sunset for creator branding.
- **Vertical videos:** `OutputPreset` 2, horizontal bars, `LabelScale` 5 or 6, short labels, and a short title (about 12 characters) with `TitleScale` 1.2 to 1.35. Longer titles shrink to fit by themselves.
- **Over footage:** `TransparentBg` 1, light text, `Shadow` 0.5 to 0.7 for separation, and `GridShow` 0 / `AxisShow` 0 for a clean overlay.

## 12. Control reference

Every control a preset can set, with its default. Dropdowns list their numbers. Controls not listed here are internal: leave them out.

<!-- controls -->
**Controls page**

| ID | Label (section) | Default | Values |
|---|---|---|---|
| `GraphType` | Graph Type (Graph) | 0 | 0 Bar, 1 Grouped Bar, 2 Stacked Bar, 3 Line, 4 Area, 5 Scatter, 6 Pie, 7 Donut, 8 Rose, 9 Radar, 10 Parliament, 11 Bar Chart Race, 12 Waterfall, 13 Gauge, 14 Funnel, 15 Heatmap, 16 Bubble |
| `Orientation` | Orientation (Bars) (Graph) | 0 | 0 Vertical, 1 Horizontal |
| `CreatorLook` | Creator Look (Graph) | 0 | 0 Custom, 1 Midnight, 2 Studio Lime, 3 Editorial Paper, 4 Neon, 5 Sunset |
| `DataSource` | Data Source (Data Fields) | 0 | 0 Fields, 1 Text |
| `FieldCount` | Field Count (Data Fields) | 4 | whole number 1 to 16 |
| `FieldLabel1` to `FieldLabel16` | Label 1 to 16 (Data Fields) | "Q1", "Q2", "Q3", "Q4", then "F5" to "F16" | text |
| `FieldValue1` to `FieldValue16` | Value 1 to 16 (Data Fields) | 120, 90, 60, 40, 30, 20, 10, 5, 50, 45, 40, 35, 30, 25, 20, 15 | 0 to 1000 (slider; more can be typed) |
| `Data` | Data (Label,Value,...) (Data Fields) | "#,Sales,Costs\nQ1,120,90..." | text |
| `AutoResolution` | Auto Resolution (Follow Input) (Image) | 1 | 0 off, 1 on |
| `OutputPreset` | Canvas (Image) | 0 | 0 Custom, 1 YouTube 1920 x 1080, 2 Shorts 1080 x 1920, 3 Square 1080 x 1080, 4 YouTube 4K 3840 x 2160 |
| `OutputWidth` | Output Width (Image) | 1920 | whole number 16 to 8192 |
| `OutputHeight` | Output Height (Image) | 1080 | whole number 16 to 8192 |
| `AutoY` | Auto Y Range (Scale And Sorting) | 1 | 0 off, 1 on |
| `YMin` | Y Min (Scale And Sorting) | 0 | -100000 to 100000 (slider; more can be typed) |
| `YMax` | Y Max (Scale And Sorting) | 100 | -100000 to 100000 (slider; more can be typed) |
| `SortMode` | Sort (First Series) (Scale And Sorting) | 0 | 0 None, 1 Ascending, 2 Descending |

**Style page**

| ID | Label (section) | Default | Values |
|---|---|---|---|
| `TransparentBg` | Transparent Background (Style) | 0 | 0 off, 1 on |
| `CustomBg` | Custom Background (Style) | 0 | 0 off, 1 on |
| `BgR`, `BgG`, `BgB` | Background (Style) | 0.07, 0.07, 0.09 | red, green, blue, 0 to 1 each |
| `MasterOpacity` | Master Opacity (Style) | 1 | 0 to 1 (slider; more can be typed) |
| `Padding` | Padding (Style) | 60 | whole number 0 to 400 (slider; more can be typed) |
| `ChartOffsetX` | Chart X Offset (px) (Style) | 0 | -1000 to 1000 (slider; more can be typed) |
| `ChartOffsetY` | Chart Y Offset (px) (Style) | 0 | -1000 to 1000 (slider; more can be typed) |
| `LineWidth` | Grid Line Width (Style) | 1.5 | 0.5 to 8 (slider; more can be typed) |
| `CornerRadius` | Corner Radius (Style) | 10 | whole number 0 to 50 (slider; more can be typed) |
| `BarWidth` | Bar Width (Style) | 0.62 | 0.05 to 1 (slider; more can be typed) |
| `Shadow` | Shadow (Depth And Glow) | 0.35 | 0 to 1 (slider; more can be typed) |
| `ShadowSoftness` | Shadow Softness (Depth And Glow) | 16 | 0 to 80 (slider; more can be typed) |
| `ShadowDistance` | Shadow Distance (Depth And Glow) | 6 | -40 to 40 (slider; more can be typed) |
| `Glow` | Glow (Depth And Glow) | 0 | 0 to 1 (slider; more can be typed) |
| `GlowSize` | Glow Size (Depth And Glow) | 18 | 2 to 80 (slider; more can be typed) |
| `GridShow` | Show Grid (Grid And Axis) | 1 | 0 off, 1 on |
| `GridFade` | Grid Fade (Frames) (Grid And Axis) | 12 | whole number 0 to 60 |
| `CustomGrid` | Custom Grid Color (Grid And Axis) | 0 | 0 off, 1 on |
| `GridR`, `GridG`, `GridB` | Grid (Grid And Axis) | 0.22, 0.24, 0.29 | red, green, blue, 0 to 1 each |
| `AxisShow` | Show Axis (Grid And Axis) | 1 | 0 off, 1 on |
| `CustomAxis` | Custom Axis Color (Grid And Axis) | 0 | 0 off, 1 on |
| `AxisR`, `AxisG`, `AxisB` | Axis (Grid And Axis) | 0.55, 0.57, 0.62 | red, green, blue, 0 to 1 each |
| `FontFamily` | Font (Labels) | "Arial" | text |
| `FontStyle` | Weight / Style (Labels) | "Regular" | text |
| `LabelScale` | Font Scale (Labels) | 4 | whole number 1 to 12 (slider; more can be typed) |
| `CustomText` | Custom Text Color (Labels) | 0 | 0 off, 1 on |
| `LabelR`, `LabelG`, `LabelB` | Text (Labels) | 0.92, 0.93, 0.95 | red, green, blue, 0 to 1 each |
| `ShowLabels` | Show Labels (Labels) | 1 | 0 off, 1 on |
| `ShowValues` | Show Values (Labels) | 0 | 0 off, 1 on |
| `ValueMode` | Value Format (Labels) | 0 | 0 Value, 1 Percent |
| `NumberStyle` | Number Style (Labels) | 0 | 0 Plain, 1 Compact (K / M / B / T), 2 Thousands Separators |
| `ValuePrefix` | Value Prefix (Labels) | "" | text |
| `ValueSuffix` | Value Suffix (Labels) | "" | text |
| `Decimals` | Decimals (Labels) | 0 | whole number 0 to 4 (slider; more can be typed) |
| `LegendMode` | Legend (Labels) | 0 | 0 Outside (Radial), 1 Legend, 2 None |
| `ShowTitle` | Show Title (Title) | 0 | 0 off, 1 on |
| `TitleText` | Title (Title) | "Graphizo" | text |
| `TitleScale` | Title Scale (Title) | 1.5 | 0.5 to 6 (slider; more can be typed) |
| `TitleAlign` | Title Alignment (Title) | 0 | 0 Center, 1 Left |
| `Subtitle` | Subtitle (Title) | "" | text |
| `SourceText` | Source / Credit (Title) | "" | text |
| `FocusItem` | Highlight Item (0 = All) (Storytelling) | 0 | whole number 0 to 64 (slider; more can be typed) |
| `FocusDim` | Other Items Opacity (Storytelling) | 0.25 | 0 to 1 (slider; more can be typed) |
| `ShowTarget` | Show Target Line (Storytelling) | 0 | 0 off, 1 on |
| `TargetValue` | Target Value (Storytelling) | 100 | -100000 to 100000 (slider; more can be typed) |
| `TargetLabel` | Target Label (Storytelling) | "Target" | text |
| `TargetShowValue` | Show Target Value (Storytelling) | 0 | 0 off, 1 on |
| `ChartLineWidth` | Line Width (Lines And Markers) | 5 | 0.5 to 20 (slider; more can be typed) |
| `Smooth` | Smooth Curve (Lines And Markers) | 0 | 0 off, 1 on |
| `Marker` | Marker (Lines And Markers) | 0 | 0 None, 1 Circle, 2 Square, 3 Diamond |
| `MarkerSize` | Marker Size (Lines And Markers) | 12 | whole number 2 to 40 (slider; more can be typed) |
| `AreaOpacity` | Area Opacity (Lines And Markers) | 0.35 | 0 to 1 (slider; more can be typed) |
| `StartAngle` | Start Angle (Radial Charts) | -90 | -360 to 360 (slider; more can be typed) |
| `SweepDir` | Sweep Direction (Radial Charts) | 0 | 0 Clockwise, 1 Counter Clockwise |
| `InnerRadius` | Inner Radius (Radial Charts) | 0.55 | 0 to 0.9 (slider; more can be typed) |
| `SliceGap` | Slice Gap (Degrees) (Radial Charts) | 0 | 0 to 8 (slider; more can be typed) |
| `DonutTotal` | Donut Center Total (Radial Charts) | 0 | 0 off, 1 on |
| `DonutLabel` | Center Caption (Radial Charts) | "TOTAL" | text |
| `WaterfallTotal` | Add Total Bar (Waterfall) | 1 | 0 off, 1 on |
| `WaterfallTotalLabel` | Total Label (Waterfall) | "Total" | text |
| `ParlRows` | Rows (Parliament) | 4 | whole number 1 to 12 (slider; more can be typed) |
| `SeatShape` | Seat Shape (Parliament) | 0 | 0 Circle, 1 Rounded, 2 Square |
| `SeatSize` | Seat Size (Parliament) | 1 | 0.2 to 1.5 (slider; more can be typed) |
| `ParlInner` | Inner Radius (Parliament) | 0.35 | 0 to 0.85 (slider; more can be typed) |

**Animation page**

| ID | Label (section) | Default | Values |
|---|---|---|---|
| `MotionMode` | Playback (Animation) | 0 | 0 Manual Progress, 1 Auto Entrance, 2 Auto In + Out, 3 Loop |
| `TimeOrigin` | Frame Origin (Animation) | 0 | 0 Composition Render Start, 1 Absolute Frame |
| `MotionStart` | Entrance Start (Frames) (Animation) | 0 | -10000 to 10000 (slider; more can be typed) |
| `MotionDuration` | Entrance Duration (Animation) | 40 | 1 to 600 (slider; more can be typed) |
| `MotionHold` | Hold (Frames) (Animation) | 90 | 0 to 36000 (slider; more can be typed) |
| `MotionExit` | Exit Duration (Animation) | 20 | 1 to 600 (slider; more can be typed) |
| `MotionGap` | Loop Gap (Frames) (Animation) | 15 | 0 to 600 (slider; more can be typed) |
| `Progress` | Progress (Animation) | 1 | 0 to 1 (slider; more can be typed) |
| `BuildMode` | Build Mode (Animation) | 0 | 0 None, 1 Grow, 2 Sweep, 3 Draw, 4 Fade |
| `Stagger` | Stagger (Animation) | 0.6 | 0 to 1 (slider; more can be typed) |
| `BuildOrder` | Stagger Order (Animation) | 0 | 0 First To Last, 1 Last To First, 2 Center Out |
| `BuildEase` | Ease (Animation) | 2 | 0 Linear, 1 Smooth, 2 Ease Out, 3 Back Out, 4 Bounce Out, 5 Elastic Out |
| `CountUp` | Count Up Values (Animation) | 0 | 0 off, 1 on |
| `DrawHead` | Animated Draw Head (Animation) | 0 | 0 off, 1 on |
| `TransitionMode` | Value Changes (Value Transitions) | 2 | 0 Instant, 1 Smooth, 2 Spring, 3 Bouncy |
| `TransitionFrames` | Transition Frames (Value Transitions) | 18 | whole number 1 to 240 |
| `RaceAuto` | Auto Play Timeline (Bar Chart Race) | 1 | 0 off, 1 on |
| `RacePosition` | Timeline Position (Bar Chart Race) | 0 | 0 to 1 (slider; more can be typed) |
| `RaceStart` | Start Frame (Bar Chart Race) | 0 | -10000 to 10000 (slider; more can be typed) |
| `RaceDuration` | Duration (Frames) (Bar Chart Race) | 240 | 1 to 36000 (slider; more can be typed) |
| `RaceTopN` | Visible Ranks (Bar Chart Race) | 8 | whole number 1 to 16 (slider; more can be typed) |
| `RaceShowTime` | Show Timeline Caption (Bar Chart Race) | 1 | 0 off, 1 on |
| `RaceShowRanks` | Show Rank Numbers (Bar Chart Race) | 1 | 0 off, 1 on |
| `RaceTracks` | Show Bar Tracks (Bar Chart Race) | 1 | 0 off, 1 on |

**Colors page**

| ID | Label (section) | Default | Values |
|---|---|---|---|
| `AutoPalette` | Auto Palette (Auto Palette) | 1 | 0 off, 1 on |
| `PaletteHue` | Palette Hue (Auto Palette) | 210 | 0 to 360 (slider; more can be typed) |
| `PaletteSpread` | Palette Spread (Auto Palette) | 300 | 0 to 720 (slider; more can be typed) |
| `PaletteSat` | Palette Saturation (Auto Palette) | 0.72 | 0 to 1 (slider; more can be typed) |
| `PaletteLight` | Palette Lightness (Auto Palette) | 0.55 | 0 to 1 (slider; more can be typed) |
| `Custom1R`, `Custom1G`, `Custom1B` to `Custom6R`, `Custom6G`, `Custom6B` | Color 1 to 6 (Custom Colors) | 1: 0.851, 0.106, 0.376; 2: 0.459, 0.749, 0.871; 3: 0.98, 0.671, 0.25; 4: 0.353, 0.784, 0.392; 5: 0.6, 0.365, 0.741; 6: 0.925, 0.427, 0.283 | red, green, blue, 0 to 1 each |

**Typography roles** (Style page). Each role prefix below has the same eight controls, for example `TitleSize` or `CategoryOffsetY`.

| Role prefix | Text it styles |
|---|---|
| `Category` | category labels |
| `Value` | value labels and legend values |
| `AxisText` | axis numbers |
| `LegendText` | legend names |
| `Title` | title |
| `Subtitle` | subtitle |
| `Source` | source / credit |
| `Target` | target line label |
| `DonutNumber` | donut and gauge centre number |
| `DonutCaption` | donut centre caption and gauge ring names |
| `RaceTime` | race timeline caption |
| `Rank` | race rank numbers |

| Control (after the prefix) | Default | Values |
|---|---|---|
| `UseMainFont` (Use Main Font / Style) | 1 | 0 off, 1 on |
| `FontFamily` (Font) | "Arial" | text |
| `FontStyle` (Weight / Style) | "Regular" | text |
| `Size` (Size Multiplier) | 1 | 0.25 to 4 (slider; more can be typed) |
| `Tracking` (Letter Spacing) | 0 | -1 to 6 (slider; more can be typed) |
| `OffsetX` (X Offset (px)) | 0 | -500 to 500 (slider; more can be typed) |
| `OffsetY` (Y Offset (px)) | 0 | -500 to 500 (slider; more can be typed) |
| `TextAlign` (Alignment) | 0 | 0 Auto, 1 Left, 2 Center, 3 Right |
<!-- /controls -->

## 13. Example 1: Ranked Bars

A horizontal ranking on the Editorial Paper look: sorted from largest to smallest, the second row (Technology) highlighted while the others fade, compact values that count up, built with a short cascade. Pasted as a new node, everything not listed is at its default.

<!-- example: Graphizo - Ranked Bars -->
```lua
{
	Tools = ordered() {
		Graphizo1 = Fuse.Graphizo {
			Inputs = {
				GraphType = Input { Value = 0, },
				Orientation = Input { Value = 1, },
				CreatorLook = Input { Value = 3, },
				DataSource = Input { Value = 1, },
				Data = Input { Value = "Category,Views\nScience,280000\nTechnology,340000\nHistory,190000\nTravel,145000\nDesign,115000", },
				OutputPreset = Input { Value = 1, },
				SortMode = Input { Value = 2, },
				ShowValues = Input { Value = 1, },
				NumberStyle = Input { Value = 1, },
				Decimals = Input { Value = 1, },
				ShowTitle = Input { Value = 1, },
				TitleText = Input { Value = "WHAT PEOPLE WATCH", },
				Subtitle = Input { Value = "Average views per upload | illustrative data", },
				SourceText = Input { Value = "Source: example data", },
				FocusItem = Input { Value = 2, },
				FocusDim = Input { Value = 0.32, },
				MotionMode = Input { Value = 1, },
				MotionDuration = Input { Value = 45, },
				Stagger = Input { Value = 0.35, },
				CountUp = Input { Value = 1, },
			},
		},
	},
}
```

## 14. Example 2: Live Counter

Four Field values keyed to change on frames 75, 135 and 195; each change springs to the new value. The axis is fixed at 0 to 300 so it stays still while the bars grow.

<!-- example: Graphizo - Live Counter -->
```lua
{
	Tools = ordered() {
		Graphizo1FieldValue1 = BezierSpline {
			SplineColor = { Red = 191, Green = 255, Blue = 0 },
			KeyFrames = {
				[0] = { 120, Flags = { Linear = true } },
				[74] = { 120, Flags = { Linear = true } },
				[75] = { 180, Flags = { Linear = true } },
				[134] = { 180, Flags = { Linear = true } },
				[135] = { 210, Flags = { Linear = true } },
				[194] = { 210, Flags = { Linear = true } },
				[195] = { 260, Flags = { Linear = true } },
			}
		},
		Graphizo1FieldValue2 = BezierSpline {
			SplineColor = { Red = 191, Green = 255, Blue = 0 },
			KeyFrames = {
				[0] = { 90, Flags = { Linear = true } },
				[74] = { 90, Flags = { Linear = true } },
				[75] = { 160, Flags = { Linear = true } },
				[134] = { 160, Flags = { Linear = true } },
				[135] = { 240, Flags = { Linear = true } },
				[194] = { 240, Flags = { Linear = true } },
				[195] = { 250, Flags = { Linear = true } },
			}
		},
		Graphizo1FieldValue3 = BezierSpline {
			SplineColor = { Red = 191, Green = 255, Blue = 0 },
			KeyFrames = {
				[0] = { 60, Flags = { Linear = true } },
				[74] = { 60, Flags = { Linear = true } },
				[75] = { 75, Flags = { Linear = true } },
				[134] = { 75, Flags = { Linear = true } },
				[135] = { 110, Flags = { Linear = true } },
				[194] = { 110, Flags = { Linear = true } },
				[195] = { 170, Flags = { Linear = true } },
			}
		},
		Graphizo1FieldValue4 = BezierSpline {
			SplineColor = { Red = 191, Green = 255, Blue = 0 },
			KeyFrames = {
				[0] = { 40, Flags = { Linear = true } },
				[74] = { 40, Flags = { Linear = true } },
				[75] = { 70, Flags = { Linear = true } },
				[134] = { 70, Flags = { Linear = true } },
				[135] = { 90, Flags = { Linear = true } },
				[194] = { 90, Flags = { Linear = true } },
				[195] = { 95, Flags = { Linear = true } },
			}
		},
		Graphizo1 = Fuse.Graphizo {
			Inputs = {
				GraphType = Input { Value = 0, },
				CreatorLook = Input { Value = 2, },
				DataSource = Input { Value = 0, },
				FieldCount = Input { Value = 4, },
				FieldLabel1 = Input { Value = "Option A", },
				FieldValue1 = Input { SourceOp = "Graphizo1FieldValue1", Source = "Value", },
				FieldLabel2 = Input { Value = "Option B", },
				FieldValue2 = Input { SourceOp = "Graphizo1FieldValue2", Source = "Value", },
				FieldLabel3 = Input { Value = "Option C", },
				FieldValue3 = Input { SourceOp = "Graphizo1FieldValue3", Source = "Value", },
				FieldLabel4 = Input { Value = "Option D", },
				FieldValue4 = Input { SourceOp = "Graphizo1FieldValue4", Source = "Value", },
				OutputPreset = Input { Value = 1, },
				AutoY = Input { Value = 0, },
				YMin = Input { Value = 0, },
				YMax = Input { Value = 300, },
				ShowValues = Input { Value = 1, },
				ShowTitle = Input { Value = 1, },
				TitleText = Input { Value = "LIVE VOTE COUNT", },
				Subtitle = Input { Value = "Votes as they come in | illustrative data", },
				MotionMode = Input { Value = 1, },
				Stagger = Input { Value = 0.4, },
				BuildEase = Input { Value = 3, },
				CountUp = Input { Value = 1, },
			},
		},
	},
}
```

## 15. Using a preset in Resolve

- **As a new node:** on the Fusion page, click an empty spot in the Nodes area and paste the code (Ctrl+V, Mac: Cmd+V), or drag the `.setting` file onto the Nodes area.
- **On an existing Graphizo node:** right-click the node and choose **Settings > Load…**, then pick the `.setting` file. Presets in Resolve's Settings folder are listed in that menu:
  - Windows: `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Settings`
  - Mac: `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Settings`
  - Linux: `~/.local/share/DaVinciResolve/Fusion/Settings`
- **Connect** the node to MediaOut1, or through a Merge over footage (Quick start, step 4).
- **Your own data:** edit the table in **Controls > Data Fields > Data**, the Fields, or use **CSV Import** to load a CSV file.
- **Play** the clip: the first frame of an entrance is empty on purpose.

## 16. Troubleshooting

| Problem | Fix |
|---|---|
| Pasting does nothing | Copy the whole block, from the first `{` to the last `}`, and click an empty spot in the Nodes area before pasting. |
| The chart replaced my video | It was pasted while a node was selected, so Fusion wired it to that node. Connect Graphizo to a Merge's green foreground input instead (Quick start, step 4), and click an empty spot before pasting next time. |
| The chart shows Q1 to Q4 or Sales and Costs | That is Graphizo's example data: the preset has no data, or `DataSource` does not match (Text needs `Data`; Fields need `FieldCount` and the fields). |
| Some values are 0 | The cells have text Graphizo cannot read, like units (`12 kg`) or `n/a`. Keep cells plain and use `ValuePrefix` / `ValueSuffix`. |
| The chart does not animate | `MotionMode` is 0 (Manual Progress). Use 1, 2 or 3. |
| The first frame is empty | The entrance starts there. Play the clip, or raise `MotionStart`. |
| The chart disappears early | With `MotionMode` 2 the exit runs after `MotionHold`; raise the hold or use `MotionMode` 1. |
| Keyed values jump instead of gliding | `TransitionMode` is 0, or the data is a Text table. Use Fields and `TransitionMode` 2. |
| Labels end with `..` | They are too long for their space: use horizontal bars, shorter labels, a side legend or a smaller `LabelScale`. |
| The wrong font | The font or style name is not installed. Use a safe font from section 6 or install it. |
| A new preset is not in the Settings menu | Use Settings > Load… and pick the file, or restart Resolve. |
| The chart looks blurry or small in a vertical timeline | Use `OutputPreset` 2 (Shorts) so the chart is drawn at 1080 x 1920. |
