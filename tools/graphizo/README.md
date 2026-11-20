# Graphizo AI Kit

Let your AI make **Graphizo** charts: animated charts for DaVinci Resolve, ready to load. Give it your numbers, a table or a CSV file and describe what you want, for example *"a neon bar chart of my views per month"* or *"a bar chart race of these five channels for a Short"*. The AI writes the chart preset, checks it, and saves it where you want.

This kit is made for Graphizo (Clipizo); `reference/inputs.json` names the version it was built from.

## Two ways to use it

**1. With any AI chat** (ChatGPT, Claude, Gemini, Copilot):

1. Give the chat the file **`Graphizo AI Guide.md`**.
2. Describe the chart you want and give it your numbers.
3. Copy the code it gives you, click in Fusion's Nodes area, and press Ctrl+V (Mac: Cmd+V).

The guide's first section explains this step by step.

**2. With an AI agent that can open folders** (Claude Code, OpenAI Codex, Gemini CLI, Cursor, VS Code with Copilot):

1. Open this folder in the agent.
2. Ask for a chart.

The agent reads `AGENTS.md` and `SKILL.md`, asks you a few questions (including where to save), then writes and checks the `.setting` file. It can read your CSV files too.

For Claude, you can also upload this folder, zipped, as a custom skill.

## Where presets can go

| Choice | What you get |
|---|---|
| Resolve's Settings folder | The preset is listed in a Graphizo node's right-click **Settings** menu, and **Settings > Load…** opens this folder. |
| Downloads/Graphizo Presets | Easy to find. Drag a preset onto the Nodes area, or load it with Settings > Load…. |
| Any folder you name | |

Resolve's Settings folder is in these places:

- **Windows:** `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Fusion\Settings`
- **Mac:** `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Settings`
- **Linux:** `~/.local/share/DaVinciResolve/Fusion/Settings`

## What is inside

| File or folder | Contents |
|---|---|
| `Graphizo AI Guide.md` | Everything an AI needs to know about Graphizo's data, charts, looks and animation. |
| `SKILL.md`, `AGENTS.md` | Instructions for AI agents. `CLAUDE.md` and `GEMINI.md` point to them. |
| `presets/` | 21 ready presets, one or more for each of the 17 chart types (list below). |
| `specs/` | The same presets as short, editable descriptions. |
| `tools/graphizo_preset.py` | Builds, checks and installs presets, and turns CSV files into chart data. Needs Python 3 and nothing else. |
| `reference/inputs.json` | The list of Graphizo's controls, which the checker uses. |
| `my-presets/` | Where the agent keeps your presets while it works on them. |

The ready presets (all data in them is illustrative):

| Preset | Chart |
|---|---|
| Ranked Bars | horizontal ranking, sorted, one bar highlighted |
| Neon Bars | glowing bars that pop in, hold and fade out |
| Grouped Months | two series side by side, year on year |
| Stacked Formats | three formats stacked per quarter |
| Growth Line | a line that draws on toward a goal line |
| Area Story | two channels as soft overlapping areas over a year |
| Price Scatter | price against rating |
| Pie Share | shares with a side legend |
| Donut Total | donut sweep with a total in the middle |
| Rose Petals | a year in petals |
| Radar Compare | two products on six axes |
| Parliament Seats | seats per party |
| Audience Race | bar chart race over six years |
| Profit Waterfall | steps up and down with a subtotal and a total |
| Goal Gauge | three goal rings with a big number |
| Sales Funnel | stages as a share of visitors |
| Weekly Heatmap | days by hours |
| Bubble Markets | growth, margin and revenue |
| Live Counter | values that change during the clip and spring to the new numbers |
| Shorts Overlay | a vertical ranking on a transparent background, for footage |
| Neon Style | a style without data: load it onto your own chart |

New presets get short names like `Graphizo-01A`: a number for each chart and a letter for each variation.

## Using a preset in Resolve

- **As a new node:** paste the code into the Nodes area, or drag the `.setting` file onto it.
- **On an existing Graphizo node:** right-click the node and choose **Settings > Load…**.
- **Your own numbers:** edit them in the Inspector afterwards (Controls > Data Fields), or load a CSV with CSV Import.

## License

Free of charge, under the Clipizo product license in `LICENSE.txt`. Use the kit and its presets in your own projects, personal or commercial, including client work and monetized videos. Please don't re-upload or redistribute the files; to recommend Graphizo, link to its page on clipizo.com.
