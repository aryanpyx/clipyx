#!/usr/bin/env python3
"""Graphizo chart preset helper (Python 3, standard library only).

Commands:
  build     <spec.json> [<out.setting>] [--frames N] [--compact]   write a chart preset from a JSON spec, then check it
  check     <file.setting>... [--frames N]                         check presets: controls, data, timing, layout
  to-spec   <file.setting> [<out.json>]                            turn a preset (or a node saved from Resolve) into a spec
  data      <file.csv|.tsv|.txt> [--transpose] [--columns A,B]     turn a table file into Graphizo data text
  where                                                            print the folders presets can go to
  next-name [--to resolve|downloads|<folder>] [--variant N]        the next free short name, like Graphizo-07A
  install   <file.setting>... --to resolve|downloads|<folder> [--overwrite]

The rules this tool applies are written out in "Graphizo AI Guide.md".
"""
import argparse
import csv
import io
import json
import math
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
INPUTS_PATH = os.path.join(KIT, "reference", "inputs.json")
MY_PRESETS = os.path.join(KIT, "my-presets")
TOOL_NAME = "Graphizo1"

# --------------------------------------------------------------------------- facts about Graphizo

CHARTS = ["bar", "grouped_bar", "stacked_bar", "line", "area", "scatter", "pie", "donut", "rose", "radar",
          "parliament", "race", "waterfall", "gauge", "funnel", "heatmap", "bubble"]
CHART_ALIASES = {
    "column": "bar", "columns": "bar", "bars": "bar", "horizontal_bar": "bar", "grouped": "grouped_bar",
    "clustered_bar": "grouped_bar", "stacked": "stacked_bar", "lines": "line", "area_chart": "area",
    "scatter_plot": "scatter", "doughnut": "donut", "ring": "donut", "polar": "rose", "nightingale": "rose",
    "spider": "radar", "seats": "parliament", "hemicycle": "parliament", "bar_chart_race": "race",
    "bar_race": "race", "bridge": "waterfall", "meter": "gauge", "rings": "gauge", "progress": "gauge",
    "heat_map": "heatmap", "heat": "heatmap", "bubbles": "bubble",
}
CARTESIAN = {"bar", "grouped_bar", "stacked_bar", "line", "area", "scatter", "waterfall", "bubble"}
BARS = {"bar", "grouped_bar", "stacked_bar", "waterfall"}
RADIAL = {"pie", "donut", "rose"}
MULTI_SERIES = {"grouped_bar", "stacked_bar", "line", "area", "radar", "heatmap"}

LOOKS = ["custom", "midnight", "studio_lime", "editorial_paper", "neon", "sunset"]
# Background and text colours of the creator looks (the Fuse's CREATOR_LOOKS), for contrast checks.
LOOK_COLORS = {
    "midnight": ((0.035, 0.051, 0.09), (0.92, 0.96, 1.0)),
    "studio_lime": ((0.06, 0.07, 0.08), (0.97, 0.97, 0.94)),
    "editorial_paper": ((0.96, 0.95, 0.92), (0.10, 0.14, 0.20)),
    "neon": ((0.04, 0.025, 0.09), (0.96, 0.93, 1.0)),
    "sunset": ((0.11, 0.045, 0.075), (1.0, 0.95, 0.88)),
}
CANVAS_SIZES = {1: (1920, 1080), 2: (1080, 1920), 3: (1080, 1080), 4: (3840, 2160)}
TEXT_ROLES = {"category": "Category", "value": "Value", "axis": "AxisText", "legend": "LegendText",
              "title": "Title", "subtitle": "Subtitle", "source": "Source", "target": "Target",
              "donut_total": "DonutNumber", "donut_caption": "DonutCaption", "race_time": "RaceTime",
              "rank": "Rank"}
ROLE_FIELDS = ("UseMainFont", "FontFamily", "FontStyle", "Size", "Tracking", "OffsetX", "OffsetY", "TextAlign")
SAFE_FONTS = ("Arial", "Arial Black", "Verdana", "Tahoma", "Trebuchet MS", "Georgia", "Times New Roman",
              "Courier New", "Impact")

ENUMS = {
    "GraphType": CHARTS,
    "Orientation": ["vertical", "horizontal"],
    "CreatorLook": LOOKS,
    "OutputPreset": ["custom", "youtube", "shorts", "square", "4k"],
    "DataSource": ["fields", "text"],
    "SortMode": ["none", "ascending", "descending"],
    "ValueMode": ["value", "percent"],
    "NumberStyle": ["plain", "compact", "thousands"],
    "LegendMode": ["outside", "legend", "none"],
    "TitleAlign": ["center", "left"],
    "Marker": ["none", "circle", "square", "diamond"],
    "SweepDir": ["clockwise", "counter_clockwise"],
    "SeatShape": ["circle", "rounded", "square"],
    "MotionMode": ["manual", "entrance", "in_out", "loop"],
    "TimeOrigin": ["comp", "absolute"],
    "BuildMode": ["auto", "grow", "sweep", "draw", "fade"],
    "BuildOrder": ["first_to_last", "last_to_first", "center_out"],
    "BuildEase": ["linear", "smooth", "ease_out", "back_out", "bounce_out", "elastic_out"],
    "TransitionMode": ["instant", "smooth", "spring", "bouncy"],
    "TextAlign": ["auto", "left", "center", "right"],
}
ENUM_ALIASES = {
    "CreatorLook": {"none": "custom", "paper": "editorial_paper", "editorial": "editorial_paper",
                    "lime": "studio_lime", "studio": "studio_lime", "dark": "midnight"},
    "OutputPreset": {"1080p": "youtube", "landscape": "youtube", "16:9": "youtube", "hd": "youtube",
                     "vertical": "shorts", "portrait": "shorts", "reels": "shorts", "tiktok": "shorts",
                     "9:16": "shorts", "1:1": "square", "instagram": "square", "uhd": "4k", "youtube_4k": "4k",
                     "2160p": "4k"},
    "NumberStyle": {"k": "compact", "short": "compact", "separators": "thousands", "comma": "thousands",
                    "commas": "thousands"},
    "LegendMode": {"side": "legend", "on": "legend", "off": "none", "labels": "outside"},
    "SweepDir": {"cw": "clockwise", "ccw": "counter_clockwise", "counterclockwise": "counter_clockwise",
                 "anticlockwise": "counter_clockwise"},
    "MotionMode": {"auto": "entrance", "auto_entrance": "entrance", "in": "entrance", "in_and_out": "in_out",
                   "in_+_out": "in_out", "auto_in_out": "in_out", "static": "manual", "progress": "manual"},
    "TimeOrigin": {"composition": "comp", "render_start": "comp", "clip": "comp", "absolute_frame": "absolute"},
    "BuildMode": {"none": "auto", "default": "auto", "draw_on": "draw"},
    "BuildEase": {"ease": "ease_out", "out": "ease_out", "back": "back_out", "bounce": "bounce_out",
                  "elastic": "elastic_out", "easeout": "ease_out"},
    "TransitionMode": {"off": "instant", "none": "instant", "jump": "instant", "springy": "spring", "bounce": "bouncy"},
    "TitleAlign": {"centre": "center", "middle": "center"},
    "TextAlign": {"centre": "center", "middle": "center"},
    "BuildOrder": {"first": "first_to_last", "last": "last_to_first", "center": "center_out",
                   "centre_out": "center_out", "reverse": "last_to_first"},
}

# Spec path -> Graphizo input. Kinds: num, int, bool, text, enum, color (an R/G/B prefix).
FIELDS = [
    ("orientation", "Orientation", "enum"),
    ("look", "CreatorLook", "enum"),
    ("follow_input", "AutoResolution", "bool"),
    ("sort", "SortMode", "enum"),
    ("transparent", "TransparentBg", "bool"),
    ("background", "Bg", "color"),
    ("opacity", "MasterOpacity", "num"),
    ("padding", "Padding", "int"),
    ("bars.width", "BarWidth", "num"),
    ("bars.corner_radius", "CornerRadius", "int"),
    ("depth.shadow", "Shadow", "num"),
    ("depth.softness", "ShadowSoftness", "num"),
    ("depth.distance", "ShadowDistance", "num"),
    ("depth.glow", "Glow", "num"),
    ("depth.glow_size", "GlowSize", "num"),
    ("grid.show", "GridShow", "bool"),
    ("grid.fade", "GridFade", "int"),
    ("grid.color", "Grid", "color"),
    ("grid.width", "LineWidth", "num"),
    ("axis.show", "AxisShow", "bool"),
    ("axis.color", "Axis", "color"),
    ("font_scale", "LabelScale", "int"),
    ("text_color", "Label", "color"),
    ("labels", "ShowLabels", "bool"),
    ("values", "ShowValues", "bool"),
    ("value_format", "ValueMode", "enum"),
    ("number_style", "NumberStyle", "enum"),
    ("prefix", "ValuePrefix", "text"),
    ("suffix", "ValueSuffix", "text"),
    ("decimals", "Decimals", "int"),
    ("legend", "LegendMode", "enum"),
    ("title.text", "TitleText", "text"),
    ("title.scale", "TitleScale", "num"),
    ("title.align", "TitleAlign", "enum"),
    ("subtitle", "Subtitle", "text"),
    ("source", "SourceText", "text"),
    ("highlight", "FocusItem", "int"),
    ("dim", "FocusDim", "num"),
    ("target.value", "TargetValue", "num"),
    ("target.label", "TargetLabel", "text"),
    ("target.show_value", "TargetShowValue", "bool"),
    ("lines.width", "ChartLineWidth", "num"),
    ("lines.smooth", "Smooth", "bool"),
    ("lines.marker", "Marker", "enum"),
    ("lines.marker_size", "MarkerSize", "int"),
    ("lines.area_opacity", "AreaOpacity", "num"),
    ("radial.start_angle", "StartAngle", "num"),
    ("radial.direction", "SweepDir", "enum"),
    ("radial.inner_radius", "InnerRadius", "num"),
    ("radial.slice_gap", "SliceGap", "num"),
    ("radial.center_total", "DonutTotal", "bool"),
    ("radial.center_caption", "DonutLabel", "text"),
    ("waterfall.total", "WaterfallTotal", "bool"),
    ("waterfall.total_label", "WaterfallTotalLabel", "text"),
    ("parliament.rows", "ParlRows", "int"),
    ("parliament.seat_shape", "SeatShape", "enum"),
    ("parliament.seat_size", "SeatSize", "num"),
    ("parliament.inner_radius", "ParlInner", "num"),
    ("animation.playback", "MotionMode", "enum"),
    ("animation.origin", "TimeOrigin", "enum"),
    ("animation.start", "MotionStart", "num"),
    ("animation.duration", "MotionDuration", "num"),
    ("animation.hold", "MotionHold", "num"),
    ("animation.exit", "MotionExit", "num"),
    ("animation.gap", "MotionGap", "num"),
    ("animation.progress", "Progress", "num"),
    ("animation.build", "BuildMode", "enum"),
    ("animation.stagger", "Stagger", "num"),
    ("animation.order", "BuildOrder", "enum"),
    ("animation.ease", "BuildEase", "enum"),
    ("animation.count_up", "CountUp", "bool"),
    ("animation.draw_head", "DrawHead", "bool"),
    ("transitions.mode", "TransitionMode", "enum"),
    ("transitions.frames", "TransitionFrames", "int"),
    ("race.auto", "RaceAuto", "bool"),
    ("race.position", "RacePosition", "num"),
    ("race.start", "RaceStart", "num"),
    ("race.duration", "RaceDuration", "num"),
    ("race.ranks", "RaceTopN", "int"),
    ("race.show_time", "RaceShowTime", "bool"),
    ("race.show_ranks", "RaceShowRanks", "bool"),
    ("race.tracks", "RaceTracks", "bool"),
    ("palette.hue", "PaletteHue", "num"),
    ("palette.spread", "PaletteSpread", "num"),
    ("palette.saturation", "PaletteSat", "num"),
    ("palette.lightness", "PaletteLight", "num"),
]
# Colours a creator look sets, with the Graphizo switch that puts the colour's picker in place of the look's colour.
LOOK_OVERRIDES = (("background", "Bg", "CustomBg"), ("text_color", "Label", "CustomText"),
                  ("grid.color", "Grid", "CustomGrid"), ("axis.color", "Axis", "CustomAxis"))
LOOK_OVERRIDE_NAMES = {"Bg": "background", "Label": "text colour", "Grid": "grid colour", "Axis": "axis colour"}
GROUP_KEYS = {}
for _path, _input, _kind in FIELDS:
    if "." in _path:
        _group, _key = _path.split(".", 1)
        GROUP_KEYS.setdefault(_group, set()).add(_key)
SPEC_KEYS = ({"name", "notes", "chart", "canvas", "data", "fields", "keys_mode", "title", "colors", "palette",
              "y_range", "font", "font_style", "typography", "chart_offset", "target", "inputs", "frames", "fps",
              "aspect"} | {p for p, _, _ in FIELDS if "." not in p} | set(GROUP_KEYS))
DATA_INPUTS = {"DataSource", "Data", "FieldCount"} | {"FieldLabel%d" % i for i in range(1, 17)} | {
    "FieldValue%d" % i for i in range(1, 17)}
# Inputs Fusion itself gives every tool; they can appear in files saved from Resolve.
# What the builder uses where a spec says nothing and the Fuse's own default is not a good start for a preset.
BUILDER_DEFAULTS = {"MotionMode": 1, "OutputPreset": 1}
# What a chart is about rather than how it looks. A style preset (no data) writes these only when its spec
# sets them, so loading it onto a node keeps that node's chart, canvas, titles, units and scale.
CONTENT_INPUTS = ({"GraphType", "Orientation", "AutoResolution", "OutputPreset", "OutputWidth", "OutputHeight",
                   "AutoY", "YMin", "YMax", "SortMode", "ShowTitle", "TitleText", "Subtitle", "SourceText",
                   "ValuePrefix", "ValueSuffix", "ValueMode", "FocusItem", "ShowTarget", "TargetValue", "TargetLabel",
                   "TargetShowValue", "DonutLabel", "WaterfallTotalLabel", "RaceAuto", "RacePosition", "RaceStart",
                   "RaceDuration", "RaceTopN", "MotionStart"} | DATA_INPUTS)
FUSION_INPUTS = {"Comments", "Blend", "ProcessWhenBlendIs00", "ProcessRed", "ProcessGreen", "ProcessBlue",
                 "ProcessAlpha", "ApplyMaskInverted", "MultiplyByMask", "FitMask", "EffectMask", "MaskChannel",
                 "MaskLow", "MaskHigh", "MaskClipBlack", "MaskClipWhite", "GlobalIn", "GlobalOut",
                 "FrameRenderScript", "StartRenderScript", "EndRenderScript", "UseGPU", "Input"}



# --------------------------------------------------------------------------- reading Fusion settings

class Table:
    """A Lua table from a settings file; `kind` is the constructor name (Input, FuID, ...)."""

    def __init__(self, kind=None):
        self.kind = kind
        self.fields = {}
        self.items = []
        self.duplicates = []

    def get(self, key, default=None):
        return self.fields.get(key, default)


class Ref:
    def __init__(self, name):
        self.name = name


TOKEN_RE = re.compile(r"""
    (?P<ws>\s+)
  | (?P<comment>--\[(?P<ceq>=*)\[.*?\](?P=ceq)\]|--[^\n]*)
  | (?P<str>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')
  | (?P<longstr>\[(?P<leq>=*)\[.*?\](?P=leq)\])
  | (?P<num>-?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<sym>[{}\[\]=,;().])
""", re.S | re.X)


def unescape_lua(body):
    simple = {"n": "\n", "t": "\t", "r": "\r", "a": "\a", "b": "\b", "f": "\f", "v": "\v",
              "\\": "\\", '"': '"', "'": "'", "\n": "\n"}
    raw = body.encode("utf-8")
    data = bytearray()
    i = 0
    while i < len(raw):
        c = raw[i:i + 1]
        if c != b"\\":
            data += c
            i += 1
            continue
        nxt = raw[i + 1:i + 2].decode("latin-1")
        if nxt in simple:
            data += simple[nxt].encode("utf-8")
            i += 2
        elif nxt.isdigit():
            m = re.match(rb"\d{1,3}", raw[i + 1:])
            data.append(int(m.group(0)) & 0xFF)
            i += 1 + len(m.group(0))
        elif nxt == "x":
            data.append(int(raw[i + 2:i + 4], 16))
            i += 4
        elif nxt == "z":
            i += 2
            while i < len(raw) and raw[i:i + 1].isspace():
                i += 1
        else:
            data += raw[i + 1:i + 2]
            i += 2
    return data.decode("utf-8", "replace")


def tokenize(text):
    pos, tokens = 0, []
    while pos < len(text):
        m = TOKEN_RE.match(text, pos)
        if not m:
            line = text.count("\n", 0, pos) + 1
            raise ValueError("cannot read the settings text at line %d: %r" % (line, text[pos:pos + 20]))
        pos = m.end()
        kind = m.lastgroup
        if kind in ("ws", "comment"):
            continue
        if kind in ("ceq", "leq"):
            kind = "longstr" if m.group("longstr") else "comment"
            if kind == "comment":
                continue
        value = m.group(kind)
        if kind == "str":
            tokens.append(("str", unescape_lua(value[1:-1])))
        elif kind == "longstr":
            eq = len(m.group("leq"))
            body = value[2 + eq:-(2 + eq)]
            tokens.append(("str", body[1:] if body.startswith("\n") else body))
        elif kind == "num":
            tokens.append(("num", float(int(value, 16)) if "x" in value.lower() else float(value)))
        else:
            tokens.append((kind, value))
    return tokens


class Parser:
    def __init__(self, text):
        self.tokens = tokenize(text)
        self.i = 0

    def peek(self, offset=0):
        j = self.i + offset
        return self.tokens[j] if j < len(self.tokens) else ("eof", None)

    def take(self, kind=None, value=None):
        tok = self.peek()
        if (kind and tok[0] != kind) or (value is not None and tok[1] != value):
            raise ValueError("expected %s but found %r" % (value or kind, tok[1]))
        self.i += 1
        return tok

    def value(self):
        kind, val = self.peek()
        if kind == "sym" and val == "{":
            return self.table(None)
        if kind == "str":
            self.i += 1
            return val
        if kind == "num":
            self.i += 1
            return int(val) if val.is_integer() and abs(val) < 1e15 else val
        if kind == "name":
            self.i += 1
            if val in ("true", "false"):
                return val == "true"
            if val == "nil":
                return None
            name = val
            while self.peek() == ("sym", "."):
                self.i += 1
                name += "." + self.take("name")[1]
            if self.peek() == ("sym", "("):
                self.take("sym", "(")
                self.take("sym", ")")
                name += "()"
            if self.peek() == ("sym", "{"):
                return self.table(name)
            return Ref(name)
        raise ValueError("unexpected %r" % (val,))

    def table(self, kind):
        t = Table(kind)
        self.take("sym", "{")
        while self.peek() != ("sym", "}"):
            kind_, val = self.peek()
            if kind_ == "name" and self.peek(1) == ("sym", "="):
                self.i += 2
                key = val
                if key in t.fields:
                    t.duplicates.append(key)
                t.fields[key] = self.value()
            elif kind_ == "sym" and val == "[":
                self.i += 1
                key = self.value()
                self.take("sym", "]")
                self.take("sym", "=")
                t.fields[key] = self.value()
            else:
                t.items.append(self.value())
            if self.peek()[0] == "sym" and self.peek()[1] in (",", ";"):
                self.i += 1
        self.take("sym", "}")
        return t


def read_setting_text(text):
    root = Parser(text).value()
    if not isinstance(root, Table):
        raise ValueError("the text does not start with {")
    return root


def read_setting(path):
    with open(path, "r", encoding="utf-8-sig", errors="replace") as handle:
        return read_setting_text(handle.read())


def find_tools(root):
    """[(name, Fuse.Graphizo table)], {spline name: table}, [(other name, kind)]."""
    tools = root.get("Tools")
    if not isinstance(tools, Table):
        raise ValueError("no Tools = ordered() { ... } block")
    found, splines, others = [], {}, []
    for name, tool in tools.fields.items():
        if not isinstance(tool, Table):
            continue
        if tool.kind == "Fuse.Graphizo":
            found.append((name, tool))
        elif tool.kind in ("BezierSpline", "LUTBezier"):
            splines[name] = tool
        else:
            others.append((name, tool.kind))
    return found, splines, others


def saved_from_resolve(tool):
    """True for a node Resolve saved (it adds keys like CtrlWZoom or ViewInfo); the builder writes only Inputs."""
    return any(key != "Inputs" for key in tool.fields)


def spline_keys(spline):
    """[(frame, value)] of a BezierSpline, sorted by frame."""
    keys = spline.get("KeyFrames") if isinstance(spline, Table) else None
    out = []
    if isinstance(keys, Table):
        for frame, key in keys.fields.items():
            if is_number(frame) and isinstance(key, Table) and key.items and is_number(key.items[0]):
                out.append((float(frame), float(key.items[0])))
    return sorted(out)


def spline_value(keys, frame):
    """Value of linear keys at `frame` (holds before the first and after the last key)."""
    if not keys:
        return None
    if frame <= keys[0][0]:
        return keys[0][1]
    for (f0, v0), (f1, v1) in zip(keys, keys[1:]):
        if f0 <= frame <= f1:
            return v0 if f1 == f0 else v0 + (v1 - v0) * (frame - f0) / (f1 - f0)
    return keys[-1][1]


# --------------------------------------------------------------------------- the control list

def load_inputs():
    with open(INPUTS_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def fmt_num(value):
    if isinstance(value, bool):
        value = int(value)
    if isinstance(value, int):
        return str(value)
    value = float(value)
    if value.is_integer() and abs(value) < 1e15:
        return str(int(value))
    text = ("%.6f" % value).rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def lua_string(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\t", "\\t") + '"'


def norm_word(text):
    return re.sub(r"[\s\-]+", "_", str(text).strip().lower())


def parse_enum(input_id, value, where):
    kind = "TextAlign" if input_id.endswith("TextAlign") else input_id
    options = ENUMS[kind]
    if is_number(value) and float(value).is_integer() and 0 <= value < len(options):
        return int(value)
    word = norm_word(value)
    word = ENUM_ALIASES.get(kind, {}).get(word, word)
    if kind == "GraphType":
        word = CHART_ALIASES.get(word, word)
    if word in options:
        return options.index(word)
    raise ValueError('%s: "%s" is not one of: %s' % (where, value, ", ".join(options)))


def parse_color(value, where):
    if isinstance(value, str):
        m = re.fullmatch(r"#?([0-9a-fA-F]{6})", value.strip())
        if not m:
            raise ValueError('%s: colour "%s" must be "#RRGGBB" or [r, g, b] from 0 to 1' % (where, value))
        return [round(int(m.group(1)[i:i + 2], 16) / 255.0, 4) for i in (0, 2, 4)]
    if isinstance(value, (list, tuple)) and len(value) in (3, 4) and all(is_number(c) for c in value):
        if any(c > 1 for c in value[:3]):
            if all(0 <= c <= 255 for c in value[:3]):
                return [round(c / 255.0, 4) for c in value[:3]]
        return [round(float(c), 4) for c in value[:3]]
    raise ValueError("%s: colour must be \"#RRGGBB\" or [r, g, b] from 0 to 1" % where)


def color_hex(rgb):
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(c * 255)))) for c in rgb)


def luminance(rgb):
    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(max(0.0, min(1.0, c))) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


# --------------------------------------------------------------------------- Graphizo's data rules

def split_data_line(line, delimiter):
    cols, cell, quoted, i = [], [], False, 0
    while i < len(line):
        ch = line[i]
        if ch == '"':
            if quoted and line[i + 1:i + 2] == '"':
                cell.append('"')
                i += 1
            else:
                quoted = not quoted
        elif ch == delimiter and not quoted:
            cols.append("".join(cell).strip())
            cell = []
        else:
            cell.append(ch)
        i += 1
    cols.append("".join(cell).strip())
    return cols


LUA_NUMBER_RE = re.compile(r"^[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)$")


IGNORED_IN_NUMBERS = re.compile("[\\s   $%'€£¥’]")


def data_number(text, semicolon=False):
    """Graphizo's cell reader (port of the Fuse's dataNumber). Spaces, no-break and thin spaces, $, EUR, GBP, JPY,
    % and apostrophes are ignored; (12) is -12. With both "." and "," the last one is the decimal mark. A single
    comma is a decimal mark in semicolon tables or when not followed by exactly three digits; otherwise commas are
    thousands separators. Several dots, or one dot followed by three digits in a semicolon table, are thousands."""
    s = IGNORED_IN_NUMBERS.sub("", str(text or ""))
    m = re.match(r"^\((.*)\)$", s)
    if m:
        s = "-" + m.group(1)
    last_comma, last_dot = s.rfind(","), s.rfind(".")
    if last_comma >= 0 and last_dot >= 0:
        s = s.replace(".", "").replace(",", ".") if last_comma > last_dot else s.replace(",", "")
    elif last_comma >= 0:
        after = re.search(r",(\d*)$", s)
        if s.count(",") == 1 and (semicolon or (after is not None and len(after.group(1)) != 3)):
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    elif last_dot >= 0:
        after = re.search(r"\.(\d*)$", s)
        if s.count(".") > 1 or (semicolon and after is not None and len(after.group(1)) == 3):
            s = s.replace(".", "")
    if not LUA_NUMBER_RE.match(s):
        return None
    value = float(int(s, 16)) if "x" in s.lower() else float(s)
    if not math.isfinite(value):
        return None
    return max(-1e15, min(1e15, value))


def is_year_cell(text):
    return re.fullmatch(r"\d{4}", text) is not None and 1800 <= int(text) <= 2200


def parse_data(text, series_limit=6):
    """Port of the Fuse's parseData: rows (<= 64), series names, invalid cells."""
    rows, series_names, max_series = [], [], 0
    text = str(text or "").replace("\r\n", "\n").replace("\r", "\n")
    if text.startswith("﻿"):
        text = text[1:]
    delimiter, invalid, cut_columns, cut_rows, bad_cells = None, 0, 0, False, []
    lines = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line or line.startswith("--") or line.startswith("//"):
            continue
        if delimiter is None:
            best = 1
            for sep in (",", "\t", ";"):
                count = len(split_data_line(line, sep))
                if count > best:
                    best, delimiter = count, sep
        cols = split_data_line(line, delimiter or ",")
        if any(c != "" for c in cols):  # Excel's ",,," rows are skipped
            lines.append((cols, line.startswith('"')))
            if len(lines) >= 512:
                break
    semicolon = delimiter == ";"

    def value_info(cols):
        cells = [c for c in cols[1:] if c != ""]
        numeric = any(data_number(c, semicolon) is not None for c in cols[1:])
        return numeric, bool(cells) and all(is_year_cell(c) for c in cells)

    for index, (cols, quoted) in enumerate(lines):
        if len(cols) < 2 and not (cols[0] if cols else "").startswith("="):
            continue
        first = cols[0] if cols else ""
        numeric, all_years = value_info(cols)
        hash_line = not quoted and first.startswith("#")
        header = not quoted and first == "#"
        if not header and not rows and not series_names and not hash_line:
            if not numeric:
                header = True
            elif all_years and index + 1 < len(lines):
                next_numeric, next_years = value_info(lines[index + 1][0])
                header = next_numeric and not next_years
        if header:
            series_names = cols[1:series_limit + 1]
            cut_columns = max(cut_columns, len(cols) - 1 - series_limit)
        elif hash_line and not numeric:
            continue
        else:
            if len(rows) >= 64:
                cut_rows = True
                break
            label = first or str(len(rows) + 1)
            values = []
            for cell in cols[1:series_limit + 1]:
                num = data_number(cell, semicolon)
                if num is None and cell != "":
                    invalid += 1
                    if len(bad_cells) < 5:
                        bad_cells.append(cell)
                values.append(num if num is not None else 0.0)
            cut_columns = max(cut_columns, len(cols) - 1 - series_limit)
            rows.append({"label": label, "values": values, "subtotal": label.startswith("=")})
            max_series = max(max_series, len(values))
    max_series = max(max_series, len(series_names))
    for row in rows:
        row["values"] += [0.0] * (max_series - len(row["values"]))
    names = [series_names[i] if i < len(series_names) and series_names[i] else "S%d" % (i + 1)
             for i in range(max_series)]
    return {"rows": rows, "series": max_series, "names": names, "invalid": invalid, "bad_cells": bad_cells,
            "cut_columns": max(0, cut_columns), "cut_rows": cut_rows, "delimiter": delimiter or ","}


def series_limit(chart):
    return 128 if chart == "race" else 16 if chart == "heatmap" else 6


def csv_cell(value):
    if is_number(value):
        return fmt_num(value)
    text = str(value).replace("\r", " ").replace("\n", " ")
    if text != text.strip() or any(ch in text for ch in ',;\t"'):
        return '"' + text.replace('"', '""') + '"'
    return text


def table_to_data(table, where="data"):
    """data: text, [[...], ...] or {"columns": [...], "rows": [[...]]} -> Graphizo data text."""
    if isinstance(table, str):
        return table.strip("\n")
    if isinstance(table, dict):
        expect_keys(table, {"columns", "rows"}, where)
        columns = table.get("columns")
        rows = table.get("rows") or []
        lines = [",".join(csv_cell(c) for c in (["#"] + list(columns[1:]) if columns and columns[0] in ("", None)
                                                   else columns))] if columns else []
        lines += [",".join(csv_cell(c) for c in row) for row in rows]
        return "\n".join(lines)
    if isinstance(table, list):
        return "\n".join(",".join(csv_cell(c) for c in row) for row in table)
    raise ValueError("%s: give the table as text, as a list of rows, or as {\"columns\": [...], \"rows\": [...]}" % where)


# --------------------------------------------------------------------------- writing presets

class Fu:
    """A value written as Fusion settings text."""

    def __init__(self, text):
        self.text = text


def fu_value(value):
    if isinstance(value, Fu):
        return value.text
    if isinstance(value, bool):
        return "1" if value else "0"
    if is_number(value):
        return fmt_num(value)
    if isinstance(value, str):
        return lua_string(value)
    raise ValueError("cannot write %r" % (value,))


def expect_keys(obj, allowed, where):
    if not isinstance(obj, dict):
        raise ValueError("%s must be an object { ... }" % where)
    unknown = sorted(set(obj) - set(allowed))
    if unknown:
        raise ValueError("%s: unknown key%s %s (allowed: %s)" % (
            where, "s" if len(unknown) > 1 else "", ", ".join(unknown), ", ".join(sorted(allowed))))


def number(value, where, integer=False):
    if isinstance(value, bool) or not is_number(value):
        raise ValueError("%s needs a number" % where)
    if integer and not float(value).is_integer():
        raise ValueError("%s needs a whole number" % where)
    return int(value) if integer else value


def normalize_spec(spec):
    """Expand shorthands: "title": "Hi" -> {"text": "Hi"}, "grid": false -> {"show": false}, ..."""
    spec = dict(spec)
    if isinstance(spec.get("title"), str):
        spec["title"] = {"text": spec["title"]}
    for key in ("grid", "axis"):
        if isinstance(spec.get(key), bool):
            spec[key] = {"show": spec[key]}
    if isinstance(spec.get("transitions"), str):
        spec["transitions"] = {"mode": spec["transitions"]}
    if isinstance(spec.get("animation"), str):
        spec["animation"] = {"playback": spec["animation"]}
    if is_number(spec.get("target")):
        spec["target"] = {"value": spec["target"]}
    if isinstance(spec.get("font"), str):
        spec["font"] = {"family": spec["font"]}
    if "font_style" in spec:
        spec["font"] = dict(spec.get("font") or {})
        spec["font"]["style"] = spec.pop("font_style")
    return spec


def get_path(spec, path):
    node = spec
    for part in path.split("."):
        if not isinstance(node, dict) or part not in node:
            return None, False
        node = node[part]
    return node, True


def build_inputs(spec, data, compact=False):
    """(ordered [(input_id, value)], {spline tool name: [(frame, value)]}) for a spec."""
    spec_inputs = data["inputs"]
    spec = normalize_spec(spec)
    expect_keys(spec, SPEC_KEYS, "spec")
    for group, keys in GROUP_KEYS.items():
        if group in spec and spec[group] is not None:
            allowed = set(keys)
            if group == "title":
                allowed |= {"show"}
            if group == "target":
                allowed |= {"show"}
            expect_keys(spec[group], allowed, group)

    values, explicit = {}, set()
    for input_id, entry in spec_inputs.items():
        if entry.get("role") == "public" and "default" in entry:
            values[input_id] = BUILDER_DEFAULTS.get(input_id, entry["default"])

    def put(input_id, value):
        if input_id not in spec_inputs:
            raise ValueError("internal: %s is not a Graphizo control" % input_id)
        values[input_id] = value
        explicit.add(input_id)

    # Chart type.
    chart = None
    if spec.get("chart") is not None:
        chart = CHARTS[parse_enum("GraphType", spec["chart"], "chart")]
        put("GraphType", CHARTS.index(chart))
        if norm_word(spec["chart"]) == "horizontal_bar" and "orientation" not in spec:
            put("Orientation", 1)

    # Every plain field.
    for path, input_id, kind in FIELDS:
        value, present = get_path(spec, path)
        if not present or value is None:
            continue
        where = path
        if kind == "bool":
            if not isinstance(value, bool) and value not in (0, 1):
                raise ValueError("%s needs true or false" % where)
            put(input_id, 1 if value else 0)
        elif kind == "num":
            put(input_id, number(value, where))
        elif kind == "int":
            put(input_id, number(value, where, integer=True))
        elif kind == "text":
            if not isinstance(value, str):
                raise ValueError('%s needs text in quotes' % where)
            put(input_id, value)
        elif kind == "enum":
            put(input_id, parse_enum(input_id, value, where))
        elif kind == "color":
            r, g, b = parse_color(value, where)
            put(input_id + "R", r)
            put(input_id + "G", g)
            put(input_id + "B", b)

    # A colour given together with a creator look means "use this colour": switch it on (the look keeps the rest).
    if int(values.get("CreatorLook", 0)) != 0:
        for path, _prefix, switch in LOOK_OVERRIDES:
            value, present = get_path(spec, path)
            if present and value is not None:
                put(switch, 1)

    # Title on/off.
    title = spec.get("title")
    if title is not None:
        show = title.get("show", bool(title.get("text", "")))
        put("ShowTitle", 1 if show else 0)
    elif "title" in spec:
        put("ShowTitle", 0)
    # Target line on/off.
    if "target" in spec:
        target = spec.get("target")
        put("ShowTarget", 1 if target and target.get("show", True) else 0)
    # Canvas.
    canvas = spec.get("canvas")
    if canvas is not None:
        if isinstance(canvas, (list, tuple)):
            if len(canvas) != 2:
                raise ValueError("canvas: give a name (youtube, shorts, square, 4k) or [width, height]")
            w, h = (number(c, "canvas", integer=True) for c in canvas)
            preset = {v: k for k, v in CANVAS_SIZES.items()}.get((w, h))
            if preset:
                put("OutputPreset", preset)
            else:
                put("OutputPreset", 0)
                put("OutputWidth", w)
                put("OutputHeight", h)
        else:
            put("OutputPreset", parse_enum("OutputPreset", canvas, "canvas"))
    # Value range.
    y_range = spec.get("y_range")
    if y_range is not None:
        if isinstance(y_range, str) and y_range.lower() == "auto":
            put("AutoY", 1)
        elif isinstance(y_range, (list, tuple)) and len(y_range) == 2:
            put("AutoY", 0)
            put("YMin", number(y_range[0], "y_range"))
            put("YMax", number(y_range[1], "y_range"))
        else:
            raise ValueError('y_range: give [min, max] or "auto"')
    # Colours.
    colors = spec.get("colors")
    if colors is not None:
        if not isinstance(colors, list) or not 1 <= len(colors) <= 6:
            raise ValueError("colors: give 1 to 6 colours, like [\"#FF5A36\", \"#2EC4B6\"]")
        put("AutoPalette", 0)
        for i, color in enumerate(colors, 1):
            r, g, b = parse_color(color, "colors[%d]" % i)
            put("Custom%dR" % i, r)
            put("Custom%dG" % i, g)
            put("Custom%dB" % i, b)
    if spec.get("palette") is not None:
        if colors is not None:
            raise ValueError("give either colors (your own six) or palette (automatic hues), not both")
        put("AutoPalette", 1)
    # Chart offset.
    offset = spec.get("chart_offset")
    if offset is not None:
        if not isinstance(offset, (list, tuple)) or len(offset) != 2:
            raise ValueError("chart_offset: give [x, y] in pixels")
        put("ChartOffsetX", number(offset[0], "chart_offset"))
        put("ChartOffsetY", number(offset[1], "chart_offset"))
    # Main font.
    font = spec.get("font")
    if font is not None:
        expect_keys(font, {"family", "style"}, "font")
        if "family" in font:
            put("FontFamily", str(font["family"]))
        if "style" in font:
            put("FontStyle", str(font["style"]))
    # Per-role typography.
    typography = spec.get("typography") or {}
    expect_keys(typography, set(TEXT_ROLES), "typography")
    for role_key, settings in typography.items():
        role = TEXT_ROLES[role_key]
        expect_keys(settings, {"font", "style", "size", "tracking", "x", "y", "align"}, "typography." + role_key)
        if "font" in settings or "style" in settings:
            put(role + "UseMainFont", 0)
            put(role + "FontFamily", str(settings.get("font", values.get("FontFamily", "Arial"))))
            put(role + "FontStyle", str(settings.get("style", "Regular")))
        for key, field in (("size", "Size"), ("tracking", "Tracking"), ("x", "OffsetX"), ("y", "OffsetY")):
            if key in settings:
                put(role + field, number(settings[key], "typography.%s.%s" % (role_key, key)))
        if "align" in settings:
            put(role + "TextAlign", parse_enum("TextAlign", settings["align"], "typography.%s.align" % role_key))

    # Data.
    splines = {}
    if spec.get("data") is not None and spec.get("fields") is not None:
        raise ValueError("give either data (a table: Data Source Text) or fields (up to 16 keyframable values), not both")
    if spec.get("data") is not None:
        text = table_to_data(spec["data"])
        if not text.strip():
            raise ValueError("data is empty")
        put("DataSource", 1)
        put("Data", text)
    elif spec.get("fields") is not None:
        fields = spec["fields"]
        if not isinstance(fields, list) or not 1 <= len(fields) <= 16:
            raise ValueError("fields: give 1 to 16 items, like [[\"Q1\", 120], [\"Q2\", 90]]")
        mode = norm_word(spec.get("keys_mode", "step"))
        if mode not in ("step", "linear"):
            raise ValueError('keys_mode: "step" (hold, then change on the key frame; the default) or "linear"')
        put("DataSource", 0)
        put("FieldCount", len(fields))
        for i, item in enumerate(fields, 1):
            where = "fields[%d]" % i
            if isinstance(item, (list, tuple)) and len(item) == 2:
                item = {"label": item[0], "value": item[1]}
            expect_keys(item, {"label", "value", "keys"}, where)
            put("FieldLabel%d" % i, str(item.get("label", "F%d" % i)).replace("\n", " "))
            if item.get("keys"):
                keys = item["keys"]
                if not isinstance(keys, dict) or len(keys) < 1:
                    raise ValueError('%s.keys: give {"frame": value, ...}, like {"0": 120, "90": 200}' % where)
                points = []
                for frame, value in keys.items():
                    try:
                        frame = float(frame)
                    except (TypeError, ValueError):
                        raise ValueError("%s.keys: %r is not a frame number" % (where, frame))
                    if not frame.is_integer():
                        raise ValueError("%s.keys: frame %s must be a whole frame" % (where, fmt_num(frame)))
                    points.append((int(frame), number(value, "%s.keys[%s]" % (where, fmt_num(frame)))))
                points.sort()
                if mode == "step":
                    stepped = [points[0]]
                    for frame, value in points[1:]:
                        prev_frame, prev_value = stepped[-1]
                        if frame - 1 > prev_frame and value != prev_value:
                            stepped.append((frame - 1, prev_value))
                        stepped.append((frame, value))
                    points = stepped
                name = "%sFieldValue%d" % (TOOL_NAME, i)
                splines[name] = points
                put("FieldValue%d" % i, Fu('Input { SourceOp = "%s", Source = "Value", }' % name))
            else:
                put("FieldValue%d" % i, number(item.get("value", 0), where + ".value"))

    # Raw overrides (advanced): {"InputID": number | "text" | true/false}.
    for input_id, value in (spec.get("inputs") or {}).items():
        entry = spec_inputs.get(input_id)
        if entry is None:
            raise ValueError("inputs: unknown input %s (see reference/inputs.json)" % input_id)
        if entry.get("role") != "public":
            raise ValueError("inputs: %s is not a preset control (role %s)" % (input_id, entry.get("role")))
        if isinstance(value, bool):
            value = 1 if value else 0
        put(input_id, value)

    # Which inputs to write.
    has_data = spec.get("data") is not None or spec.get("fields") is not None
    core = set(COMPACT_CORE)
    if spec.get("fields") is not None:
        core |= {"FieldCount"} | {"FieldLabel%d" % i for i in range(1, len(spec["fields"]) + 1)}
        core |= {"FieldValue%d" % i for i in range(1, len(spec["fields"]) + 1)}
    if not values.get("AutoY", 1):
        core |= {"YMin", "YMax"}
    if values.get("ShowTitle"):
        core.add("TitleText")
    written = []
    for input_id, entry in spec_inputs.items():
        if input_id not in values:
            continue
        if not has_data and input_id in CONTENT_INPUTS and input_id not in explicit:
            continue  # a style preset keeps the node's own chart, data, canvas and texts
        value = values[input_id]
        if compact and input_id not in core and not isinstance(value, Fu) and same_value(value, entry.get("default")):
            continue
        written.append((input_id, value))
    return written, splines, chart


COMPACT_CORE = {"GraphType", "CreatorLook", "OutputPreset", "DataSource", "MotionMode"}


def same_value(a, b):
    if is_number(a) and is_number(b):
        return abs(float(a) - float(b)) <= 1e-9
    return a == b


def build_preset(spec, data, compact=False):
    written, splines, _chart = build_inputs(spec, data, compact)
    lines = ["{", "\tTools = ordered() {"]
    for name, points in splines.items():
        lines += ["\t\t%s = BezierSpline {" % name,
                  "\t\t\tSplineColor = { Red = 191, Green = 255, Blue = 0 },",
                  "\t\t\tKeyFrames = {"]
        for frame, value in points:
            lines.append("\t\t\t\t[%d] = { %s, Flags = { Linear = true } }," % (frame, fmt_num(value)))
        lines += ["\t\t\t}", "\t\t},"]
    lines += ["\t\t%s = Fuse.Graphizo {" % TOOL_NAME, "\t\t\tInputs = {"]
    for input_id, value in written:
        if isinstance(value, Fu) and value.text.startswith("Input {"):
            lines.append("\t\t\t\t%s = %s," % (input_id, value.text))
        else:
            lines.append("\t\t\t\t%s = Input { Value = %s, }," % (input_id, fu_value(value)))
    lines += ["\t\t\t},", "\t\t},", "\t},", "}", ""]
    return "\n".join(lines)


# --------------------------------------------------------------------------- checking presets

class Report:
    def __init__(self):
        self.errors, self.warnings, self.notes, self.info = [], [], [], []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def note(self, msg):
        self.notes.append(msg)


def check_type(entry, value):
    """None when `value` fits the input, else a short reason."""
    dtype = entry.get("type")
    if dtype == "Number":
        if not is_number(value):
            return "needs a number"
        control = entry.get("control")
        if control == "CheckboxControl" and value not in (0, 1):
            return "is a checkbox: use 0 or 1"
        options = entry.get("options")
        if options and control == "ComboControl":
            if not float(value).is_integer() or not 0 <= value < len(options):
                return "must be one of 0..%d (%s)" % (len(options) - 1, ", ".join(
                    "%d %s" % (i, o.get("label")) for i, o in enumerate(options)))
        if entry.get("integer") and not float(value).is_integer():
            return "needs a whole number"
        lo, hi = entry.get("min"), entry.get("max")
        if lo is not None and value < lo or hi is not None and value > hi:
            return "must be between %s and %s" % (fmt_num(lo) if lo is not None else "-inf",
                                                 fmt_num(hi) if hi is not None else "inf")
        return None
    if dtype == "Text":
        return None if isinstance(value, str) else 'needs text in quotes, like "Hello"'
    return None


# Ranges the Fuse clamps to at render time, where the control itself allows more.
RENDER_RANGES = {
    "MasterOpacity": (0, 1), "Padding": (0, 400), "BarWidth": (0.05, 1), "CornerRadius": (0, 50),
    "Shadow": (0, 1), "ShadowSoftness": (0, 200), "ShadowDistance": (-200, 200), "Glow": (0, 1), "GlowSize": (1, 200),
    "LineWidth": (0.25, 8), "LabelScale": (1, 12), "Decimals": (0, 4), "TitleScale": (0.5, 6), "FocusItem": (0, 64),
    "FocusDim": (0, 1), "ChartLineWidth": (0.25, 20), "MarkerSize": (1, 40), "AreaOpacity": (0, 1),
    "InnerRadius": (0, 0.9), "SliceGap": (0, 8), "ParlRows": (1, 12), "SeatSize": (0.2, 1.5), "ParlInner": (0, 0.85),
    "Progress": (0, 1), "Stagger": (0, 1), "RacePosition": (0, 1), "RaceTopN": (1, 16), "PaletteSat": (0, 1),
    "PaletteLight": (0.05, 0.95), "TransitionFrames": (1, 240), "GridFade": (0, 60), "MotionDuration": (1, 1e9),
    "MotionExit": (1, 1e9), "MotionHold": (0, 1e9), "MotionGap": (0, 1e9), "RaceDuration": (1, 1e9),
}

ARIAL_WIDTHS = dict(zip(
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
    [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278] + [556] * 10 +
    [278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722,
     778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500,
     556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500,
     500, 500, 334, 260, 334, 584]))
# Pixels per em for each Font Scale unit at 1080p, measured in Resolve 21.2 (Arial labels and titles).
EM_PER_SCALE = 7.15
FONT_WIDTH_FACTOR = {"Arial Black": 1.2, "Verdana": 1.17, "Trebuchet MS": 0.98, "Georgia": 1.05,
                     "Times New Roman": 0.88, "Impact": 0.85}


def em_width(text, font="Arial", style="Regular"):
    """Rough advance width in ems (Arial metrics, scaled per font)."""
    factor = FONT_WIDTH_FACTOR.get(font, 1.0)
    if "bold" in (style or "").lower() or "black" in (style or "").lower():
        factor *= 1.08
    return sum(ARIAL_WIDTHS.get(ch, 600 if ord(ch) > 0x2E80 else 556) for ch in str(text)) / 1000.0 * factor


def format_value(v, values):
    style = int(values.get("NumberStyle", 0))
    decimals = int(values.get("Decimals", 0))
    if style == 1:
        for div, suffix in ((1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")):
            if abs(v) >= div:
                text = ("%%.%df" % decimals) % (v / div)
                if "." in text:
                    text = text.rstrip("0").rstrip(".")
                return values.get("ValuePrefix", "") + text + suffix + values.get("ValueSuffix", "")
    text = ("%%.%df" % decimals) % v
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    if style == 2:
        whole, _, frac = text.partition(".")
        sign = "-" if whole.startswith("-") else ""
        whole = "{:,}".format(int(whole.lstrip("-") or 0))
        text = sign + whole + ("." + frac if frac else "")
    return values.get("ValuePrefix", "") + text + values.get("ValueSuffix", "")


def check_tool(tool_name, tool, splines, spec_inputs, report, clip_frames=None):
    inputs = tool.get("Inputs")
    if not isinstance(inputs, Table):
        report.error("%s has no Inputs = { ... } block" % tool_name)
        return
    for dup in inputs.duplicates:
        report.error("%s is written twice; keep one" % dup)
    file_values, keyed = {}, {}
    for input_id, entry in inputs.fields.items():
        if not isinstance(entry, Table) or entry.kind != "Input":
            report.error("%s must be written as %s = Input { Value = ... }," % (input_id, input_id))
            continue
        spec = spec_inputs.get(input_id)
        if spec is None:
            if input_id in FUSION_INPUTS:
                continue
            close = [k for k in spec_inputs if k.lower() == input_id.lower()]
            report.error("%s is not a Graphizo control%s; Resolve would ignore it" % (
                input_id, " (did you mean %s? IDs are case-sensitive)" % close[0] if close else ""))
            continue
        if spec.get("role") == "internal":
            report.warn("%s is an internal control; leave it out of presets" % input_id)
        if "SourceOp" in entry.fields:
            source = entry.fields.get("SourceOp")
            if spec.get("type") != "Number":
                report.error("%s is connected to %s, but only number controls can be keyframed" % (input_id, source))
                continue
            spline = splines.get(source)
            if spline is None:
                report.error("%s is connected to %s, which is not in the file" % (input_id, source))
                continue
            keys = spline_keys(spline)
            if not keys:
                report.error("%s has no keyframes (KeyFrames = { [frame] = { value, ... }, })" % source)
                continue
            keyed[input_id] = keys
            for _, v in keys:
                problem = check_type(spec, v)
                if problem:
                    report.error("%s key value %s %s" % (input_id, fmt_num(v), problem))
                    break
            continue
        if "Value" not in entry.fields:
            report.error("%s has no Value" % input_id)
            continue
        value = entry.fields["Value"]
        problem = check_type(spec, value)
        if problem:
            report.error("%s %s" % (input_id, problem))
            continue
        file_values[input_id] = value
        rng = RENDER_RANGES.get(input_id)
        if rng and is_number(value) and not rng[0] <= value <= rng[1]:
            report.warn("%s = %s is outside %s..%s; Graphizo limits it to that range" % (
                input_id, fmt_num(value), fmt_num(rng[0]), fmt_num(rng[1])))
    for name in splines:
        if not any(isinstance(e, Table) and e.fields.get("SourceOp") == name for e in inputs.fields.values()):
            report.warn("spline %s is not connected to any input" % name)

    # Effective values: what a new node pasted from this file renders.
    values = {k: e["default"] for k, e in spec_inputs.items() if "default" in e}
    values.update(file_values)
    for input_id, keys in keyed.items():
        values[input_id] = keys[-1][1]
    present = set(inputs.fields)
    if saved_from_resolve(tool):
        present |= {"GraphType", "DataSource"}  # Resolve leaves out controls at their defaults
    graph = int(values.get("GraphType", 0))
    chart = CHARTS[graph] if 0 <= graph < len(CHARTS) else "bar"
    look = LOOKS[int(values.get("CreatorLook", 0))] if 0 <= int(values.get("CreatorLook", 0)) < len(LOOKS) else "custom"
    preset = int(values.get("OutputPreset", 0))
    W, H = CANVAS_SIZES.get(preset, (int(values.get("OutputWidth", 1920)), int(values.get("OutputHeight", 1080))))
    ui = min(W, H) / 1080.0 if preset > 0 else 1.0
    info = report.info
    info.append(("chart", "%s%s, look %s, canvas %dx%d%s" % (
        chart.replace("_", " "), " (horizontal)" if chart in BARS and values.get("Orientation") == 1 and chart != "waterfall" else "",
        look.replace("_", " "), W, H, ", transparent background" if values.get("TransparentBg") else "")))
    if "GraphType" not in present:
        report.note("no GraphType: pasted as a new node this is a Bar chart; loaded onto a node it keeps that node's chart")

    # ----- data
    fields_mode = int(values.get("DataSource", 0)) == 0
    if not (present & {"DataSource", "Data", "FieldCount"}):
        report.note("no data in the file: a style preset. Loaded onto a node (Settings > Load) it keeps that node's "
                    "data; pasted as a new node it shows Graphizo's example data")
    if fields_mode:
        count = int(max(1, min(16, values.get("FieldCount", 4))))
        rows = []
        for i in range(1, count + 1):
            label = str(values.get("FieldLabel%d" % i, "F%d" % i)).replace("\n", " ") or "F%d" % i
            rows.append({"label": label, "values": [float(values.get("FieldValue%d" % i, 0))], "subtotal": False})
        parsed = {"rows": rows, "series": 1, "names": ["Values"], "invalid": 0, "bad_cells": [], "cut_columns": 0,
                  "cut_rows": False}
        source = "Fields (%d values)" % count
    else:
        text = values.get("Data", "")
        if not isinstance(text, str) or not text.strip():
            report.error("Data Source is Text but Data is empty")
            text = ""
        parsed = parse_data(text, series_limit(chart))
        source = "Text table"
    rows, series = parsed["rows"], parsed["series"]
    info.append(("data", "%s: %d rows x %d series (%s)" % (
        source, len(rows), series, ", ".join(parsed["names"][:6]) + (" ..." if series > 6 else ""))))
    if not rows:
        report.error("no data rows: write Label,Value lines (for example Jan,120)")
    if parsed["invalid"]:
        report.warn("%d cells are not numbers and draw as 0 (for example %s). Graphizo reads digits with '.' or ','"
                    " and ignores spaces, $, €, £, ¥, %% and apostrophes; put units like kg in ValueSuffix instead" % (
                        parsed["invalid"], ", ".join(repr(c) for c in parsed["bad_cells"])))
    if parsed["cut_rows"]:
        report.warn("more than 64 rows: Graphizo draws the first 64")
    if parsed["cut_columns"] > 0:
        report.warn("%d value columns over the %s limit of %d are ignored" % (
            parsed["cut_columns"], chart.replace("_", " "), series_limit(chart)))
    firsts = [r["values"][0] for r in rows if r["values"]]
    if firsts:
        info.append(("range", "first series from %s to %s" % (format_value(min(firsts), values), format_value(max(firsts), values))))

    # ----- chart and data fit
    fields_note = "Fields give one series; use a Text table (data) for %s"
    if chart in ("grouped_bar", "stacked_bar") and series < 2:
        report.warn("%s with one series looks like a plain Bar: give two or more value columns" % chart.replace("_", " ")
                    if not fields_mode else fields_note % chart.replace("_", " "))
    if chart in ("scatter", "bubble") and series < (2 if chart == "scatter" else 3):
        need = "X and Y columns" if chart == "scatter" else "X, Y and size columns"
        report.warn("%s needs %s (series 1 = X, series 2 = Y%s)" % (chart, need, ", series 3 = size" if chart == "bubble" else ""))
    if chart == "race":
        if fields_mode:
            report.error("a Bar Chart Race needs a Text table: rows are categories, columns are snapshots in time")
        elif series < 2:
            report.error("a Bar Chart Race needs two or more snapshot columns (for example 2020,2021,2022)")
        if any(v < 0 for r in rows for v in r["values"]):
            report.note("race values below 0 draw as 0")
    if chart == "radar" and len(rows) < 3:
        report.warn("a Radar needs at least 3 rows (one per axis)")
    if chart == "gauge" and len(rows) > 4:
        report.warn("a Gauge draws up to 4 rings: only the first 4 rows show")
    if chart in RADIAL and any(v < 0 for v in firsts):
        report.warn("%s slices use the size of each value: negative values show as positive slices" % chart)
    if chart in RADIAL and len(rows) > 8:
        report.note("%d slices: more than about 7 gets hard to read; group the small ones as Other" % len(rows))
    if chart == "parliament":
        seats = sum(max(0, v) for v in firsts)
        if seats > 1500:
            report.warn("a Parliament draws at most 1500 seats (this data has %d)" % round(seats))
        if any(not float(v).is_integer() for v in firsts):
            report.note("parliament seats are whole numbers: values are rounded")
    if chart == "funnel" and any(b > a for a, b in zip(firsts, firsts[1:])):
        report.note("funnel stages usually get smaller from top to bottom")
    if chart == "waterfall" and fields_mode:
        report.note("in Fields mode a Waterfall has no subtotal rows (=Label); use a Text table for those")
    if chart == "heatmap" and series < 2:
        report.warn("a Heatmap needs several value columns (rows x columns)")
    if chart in ("bar", "waterfall", "funnel", "parliament", "gauge") + tuple(RADIAL) and series > 1 and not fields_mode:
        report.note("%s uses only the first value column (%s)" % (chart.replace("_", " "), parsed["names"][0]))
    if chart in CARTESIAN and chart != "bubble" and len(rows) > 24 and chart not in ("line", "area", "scatter"):
        report.warn("%d bars are hard to read in a video; keep about 12 or fewer" % len(rows))

    # ----- value range and storytelling
    if chart in CARTESIAN | {"race", "gauge"} and not values.get("AutoY", 1):
        lo, hi = float(values.get("YMin", 0)), float(values.get("YMax", 100))
        if chart not in ("race",) and lo >= hi:
            report.error("Y Min (%s) must be below Y Max (%s)" % (fmt_num(lo), fmt_num(hi)))
        if chart in ("scatter", "bubble"):
            data_vals = [r["values"][1 if series >= 2 else 0] for r in rows if r["values"]]
        elif chart == "stacked_bar":
            data_vals = [sum(v for v in r["values"] if v > 0) for r in rows] + [sum(v for v in r["values"] if v < 0) for r in rows]
        elif chart == "waterfall":
            data_vals, running = [0.0], 0.0
            for r in rows:
                if not r["subtotal"]:
                    running += r["values"][0] if r["values"] else 0.0
                data_vals.append(running)
        elif chart in ("bar", "gauge"):
            data_vals = firsts
        else:
            data_vals = [v for r in rows for v in r["values"]]
        if data_vals and (max(data_vals) > hi or (chart != "race" and min(data_vals) < lo)):
            report.warn("some values fall outside the Y range %s..%s and are cut off" % (fmt_num(lo), fmt_num(hi)))
    focus = int(values.get("FocusItem", 0))
    multi = chart in MULTI_SERIES and series > 1
    if focus:
        limit = series if multi and chart not in ("race",) else len(rows)
        if focus > limit:
            report.warn("Highlight Item %d is beyond the %d %s" % (focus, limit, "series" if multi else "rows"))
    if values.get("ShowTarget"):
        if chart not in CARTESIAN or chart == "bubble":
            report.note("the target line shows only on Bar, Line, Area, Scatter and Waterfall charts")
    if values.get("ValueMode") == 1 and chart in ("line", "area", "scatter", "bubble"):
        report.note("Value Format Percent shows each value as a share of the first series' total")

    # ----- looks, colours and text
    own_bg = (values.get("BgR", 0.07), values.get("BgG", 0.07), values.get("BgB", 0.09))
    own_text = (values.get("LabelR", 0.92), values.get("LabelG", 0.93), values.get("LabelB", 0.95))
    if look != "custom":
        bg, text_col = LOOK_COLORS[look]
        for _path, prefix, switch in LOOK_OVERRIDES:
            if values.get(switch):
                bg = own_bg if prefix == "Bg" else bg
                text_col = own_text if prefix == "Label" else text_col
            elif any(prefix + c in file_values and not same_value(file_values[prefix + c], spec_inputs[prefix + c].get("default"))
                     for c in "RGB"):
                report.note("the %s look sets the %s; turn on %s (1), or use CreatorLook 0, to use your own" % (
                    look.replace("_", " "), LOOK_OVERRIDE_NAMES[prefix], switch))
    else:
        bg, text_col = own_bg, own_text
    if not values.get("TransparentBg") and contrast(bg, text_col) < 3.0:
        report.warn("text %s on background %s is hard to read (contrast %.1f:1; aim for 4.5 or more)" % (
            color_hex(text_col), color_hex(bg), contrast(bg, text_col)))
    if values.get("TransparentBg") and luminance(text_col) < 0.2:
        report.note("dark text on a transparent background: make sure the footage behind it is light")
    if not values.get("AutoPalette", 1) and look != "custom":
        report.note("Auto Palette is off, so the six Custom Colors replace the %s look's colours" % look.replace("_", " "))
    family = str(values.get("FontFamily", "Arial"))
    if family not in SAFE_FONTS:
        report.note('font "%s" must be installed on every computer that renders this (Graphizo uses an installed '
                    'font when it is missing)' % family)

    # ----- layout estimates
    em = EM_PER_SCALE * max(1, min(12, values.get("LabelScale", 4))) * ui
    pad = max(0, min(400, values.get("Padding", 60))) * ui
    width = W - 2 * pad
    style = str(values.get("FontStyle", "Regular"))
    if values.get("ShowTitle") and values.get("TitleText"):
        title = str(values.get("TitleText"))
        size = em * max(0.5, min(6, values.get("TitleScale", 1.5))) * 2 * float(values.get("TitleSize", 1))
        need = em_width(title, family, style) * size
        if need > width * 1.25:  # Graphizo shrinks long titles by itself; only a big shrink is worth a note
            report.note('the title shrinks to about %d%% of its size to fit the frame ("%s"). That is automatic; if it '
                        'gets too small, shorten the title or lower TitleScale' % (
                            max(1, int(100 * width / need)), title if len(title) < 50 else title[:47] + "..."))
    for key, label in (("Subtitle", "subtitle"), ("SourceText", "source credit")):
        text = str(values.get(key, "") or "")
        if text and em_width(text, family, style) * em > width:
            report.warn("the %s is too long for the frame and is cut short: %s" % (label, json.dumps(text, ensure_ascii=False)))
    labels_on = values.get("ShowLabels", 1)
    horizontal = values.get("Orientation") == 1 and chart in ("bar", "grouped_bar", "stacked_bar")
    if labels_on and rows and chart in ("bar", "grouped_bar", "stacked_bar", "waterfall", "line", "area") and not horizontal:
        slot = width / max(1, len(rows) + (1 if chart == "waterfall" and values.get("WaterfallTotal", 1) else 0))
        long = [r["label"] for r in rows if em_width(r["label"], family, style) * em * float(values.get("CategorySize", 1)) > slot]
        if long:
            report.warn("%d category labels are wider than their slot and get shortened (for example %s): use "
                        "horizontal bars, shorter labels, fewer rows or a smaller Font Scale" % (
                            len(long), json.dumps(long[0], ensure_ascii=False)))
    if labels_on and rows and (horizontal or chart == "race"):
        # Horizontal bars give their labels at most 30% of the plot width.
        column = width * 0.3 - 12
        long = [r["label"] for r in rows if em_width(r["label"], family, style) * em * float(values.get("CategorySize", 1)) > column]
        if long:
            report.warn("%d category labels are wider than the label column (about %d px) and get shortened (for "
                        "example %s): use shorter labels or a smaller Font Scale" % (
                            len(long), column, json.dumps(long[0], ensure_ascii=False)))
    if labels_on and chart in ("pie", "donut", "rose", "radar"):
        long = [r["label"] for r in rows if len(r["label"]) > 12]
        if long and (chart == "radar" or values.get("LegendMode", 0) == 0):
            report.note("labels around the chart are cut to 12 characters (%s); use the side Legend for long names"
                        % json.dumps(long[0], ensure_ascii=False))

    # ----- timing
    motion = int(values.get("MotionMode", 0))
    start = float(values.get("MotionStart", 0))
    duration = max(1.0, float(values.get("MotionDuration", 40)))
    hold, exit_, gap = float(values.get("MotionHold", 90)), max(1.0, float(values.get("MotionExit", 20))), float(values.get("MotionGap", 15))
    origin = "from the clip's first frame" if int(values.get("TimeOrigin", 0)) == 0 else "absolute comp frames"
    if motion == 0:
        progress = float(values.get("Progress", 1))
        info.append(("timing", "Manual Progress %s (no automatic entrance)" % fmt_num(progress)))
        if "Progress" not in keyed and progress >= 1:
            report.note("Playback is Manual Progress: the chart stands still. Use Auto Entrance (MotionMode 1) for an "
                        "animated build")
        end_frame = None
    else:
        parts = ["entrance %s-%s" % (fmt_num(start), fmt_num(start + duration))]
        end_frame = start + duration
        if motion >= 2:
            parts.append("hold to %s" % fmt_num(start + duration + hold))
            parts.append("exit %s-%s" % (fmt_num(start + duration + hold), fmt_num(start + duration + hold + exit_)))
            end_frame = start + duration + hold + exit_
        if motion == 3:
            parts.append("then a %s-frame gap and repeat every %s frames" % (fmt_num(gap), fmt_num(duration + hold + exit_ + gap)))
        info.append(("timing", "%s (%s)" % (", ".join(parts), origin)))
    if chart == "race" and values.get("RaceAuto", 1):
        rs, rd = float(values.get("RaceStart", 0)), max(1.0, float(values.get("RaceDuration", 240)))
        info.append(("race", "race plays %s-%s over %d snapshots, %d ranks shown" % (
            fmt_num(rs), fmt_num(rs + rd), series, int(values.get("RaceTopN", 8)))))
        if clip_frames and rs + rd > clip_frames - 1:
            report.warn("the race ends on frame %s, after the clip's last frame (%d)" % (fmt_num(rs + rd), clip_frames - 1))
        if motion >= 2 and start + duration + hold < rs + rd:
            report.warn("the exit starts (frame %s) before the race ends (frame %s): raise Hold" % (
                fmt_num(start + duration + hold), fmt_num(rs + rd)))
    if clip_frames and end_frame is not None and motion != 3 and end_frame > clip_frames - 1:
        report.warn("the animation ends on frame %s, after the clip's last frame (%d): shorten it or lengthen the clip" % (
            fmt_num(end_frame), clip_frames - 1))
    elif clip_frames and end_frame is not None and motion in (1, 2):
        left = clip_frames - 1 - end_frame
        info.append(("clip", "frames 0-%d; the %s ends %s frames before the last frame%s" % (
            clip_frames - 1, "exit" if motion == 2 else "entrance", fmt_num(left),
            " (then the chart holds)" if motion == 1 else "")))
    if motion >= 2 and duration + hold < 60:
        report.note("the chart holds only %s frames before its exit; viewers need about 3 seconds to read it" % fmt_num(hold))
    if keyed:
        mode = int(values.get("TransitionMode", 2))
        frames = int(values.get("TransitionFrames", 18))
        described = []
        for input_id, keys in sorted(keyed.items(), key=lambda kv: int(re.sub(r"\D", "", kv[0]) or 0)):
            described.append("%s %s" % (input_id, " ".join("%s@%s" % (fmt_num(v), fmt_num(f)) for f, v in keys)))
            if clip_frames and keys[-1][0] > clip_frames - 1:
                report.warn("%s has a key on frame %s, after the clip's last frame (%d)" % (input_id, fmt_num(keys[-1][0]), clip_frames - 1))
        info.append(("keys", "; ".join(described)))
        info.append(("transitions", "%s over %d frames" % (ENUMS["TransitionMode"][mode], frames)))
        if not fields_mode:
            report.warn("keyed Field values only count in Fields mode (DataSource 0)")
        if mode == 0:
            report.note("Value Changes is Instant: keyed values jump; Spring (2) makes them glide")
        if any(not k.startswith("FieldValue") for k in keyed) and set(keyed) - {"Progress", "RacePosition", "MasterOpacity"}:
            report.note("keyframes on other controls animate as keyed, without value transitions")


def print_report(path, report, tool_name=None, count=None, others=None):
    print("Graphizo preset check: %s" % os.path.basename(path))
    if tool_name:
        print("  node: %s, %d inputs" % (tool_name, count))
    for name, kind in others or []:
        print("  other node in the file: %s (%s)" % (name, kind))
    for key, text in report.info:
        print("  %-11s %s" % (key + ":", text))
    for title, items in (("ERRORS", report.errors), ("WARNINGS", report.warnings), ("NOTES", report.notes)):
        if items:
            print("%s (%d):" % (title, len(items)))
            for item in items:
                print("  - " + item)
    ok = not report.errors
    print("Result: %s (%d errors, %d warnings)" % ("OK" if ok else "FAILED", len(report.errors), len(report.warnings)))
    return ok


def check_text(text, data, frames=None):
    """(report, tool name, input count, others) for settings text; raises ValueError when unreadable."""
    root = read_setting_text(text)
    tools, splines, others = find_tools(root)
    if not tools:
        raise ValueError("no Fuse.Graphizo node in the file")
    report = Report()
    name, tool = tools[0]
    if len(tools) > 1:
        report.note("the file has %d Graphizo nodes; only %s was checked" % (len(tools), name))
    check_tool(name, tool, splines, data["inputs"], report, frames)
    count = len(tool.get("Inputs").fields) if isinstance(tool.get("Inputs"), Table) else 0
    return report, name, count, others


def cmd_check(args):
    data = load_inputs()
    all_ok = True
    for path in args.files:
        try:
            with open(path, "r", encoding="utf-8-sig", errors="replace") as handle:
                report, name, count, others = check_text(handle.read(), data, args.frames)
        except (OSError, ValueError) as exc:
            print("Graphizo preset check: %s\nERRORS (1):\n  - %s\nResult: FAILED\n" % (os.path.basename(path), exc))
            all_ok = False
            continue
        all_ok = print_report(path, report, name, count, others) and all_ok
        print()
    return 0 if all_ok else 1


# --------------------------------------------------------------------------- names, build

# Preset names are short: Graphizo-<two-digit number><letter>, for example Graphizo-07A. The number
# is a new chart or look, the letter a variation of it. No spaces: browsers turn them into %20.
SHORT_NAME_RE = re.compile(r"^(?:graphizo[-_ ]?)?(\d{1,3})([a-z])$", re.I)
SHORT_FILE_RE = re.compile(r"^Graphizo-(\d{2,3})([A-Z])\.setting$", re.I)


def preset_file_name(name):
    name = (name or "").strip()
    m = SHORT_NAME_RE.match(name)
    if m:
        return "Graphizo-%02d%s.setting" % (int(m.group(1)), m.group(2).upper())
    if not name:
        return "Graphizo-01A.setting"
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    return (name if name.lower().startswith("graphizo") else "Graphizo - " + name) + ".setting"


def used_preset_names(folders):
    used = {}
    for folder in folders:
        if os.path.isdir(folder):
            for file_name in os.listdir(folder):
                m = SHORT_FILE_RE.match(file_name)
                if m:
                    used.setdefault(int(m.group(1)), set()).add(m.group(2).upper())
    return used


def cmd_next_name(args):
    folders = [MY_PRESETS] + [target_folder(t) for t in args.to or []]
    used = used_preset_names(folders)
    if args.variant is not None:
        free = [ch for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if ch not in used.get(args.variant, set())]
        if not free:
            print("all letters of %02d are used; start a new number" % args.variant)
            return 1
        print("Graphizo-%02d%s" % (args.variant, free[0]))
        return 0
    print("Graphizo-%02dA" % (max(used) + 1 if used else 1))
    return 0


def load_spec(path):
    with open(path, "r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def cmd_build(args):
    data = load_inputs()
    try:
        spec = load_spec(args.spec)
    except json.JSONDecodeError as exc:
        print("spec error: invalid JSON at line %d, column %d: %s (look for a missing or extra comma or quote)" % (
            exc.lineno, exc.colno, exc.msg))
        return 1
    try:
        text = build_preset(spec, data, compact=args.compact)
    except ValueError as exc:
        print("spec error: %s" % exc)
        return 1
    out_path = args.out or os.path.join(MY_PRESETS, preset_file_name(spec.get("name")))
    inside_work = os.path.normcase(os.path.abspath(out_path)).startswith(os.path.normcase(MY_PRESETS) + os.sep)
    if os.path.exists(out_path) and not (args.overwrite or inside_work):
        print("%s already exists; pass --overwrite to replace it (files in my-presets/ are replaced without asking)" % out_path)
        return 1
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    print("wrote %s" % out_path)
    frames = args.frames or spec.get("frames")
    report, name, count, others = check_text(text, data, frames)
    if not SHORT_FILE_RE.match(os.path.basename(out_path)) and not args.out:
        report.note("presets get short names: Graphizo-<number><letter>, for example Graphizo-07A "
                    "(python tools/graphizo_preset.py next-name --to <folder>)")
    ok = print_report(out_path, report, name, count, others)
    return 0 if ok else 1


# --------------------------------------------------------------------------- preset -> spec

def preset_to_spec(path, data, text=None):
    """A spec (as build takes it) with everything the preset sets that differs from Graphizo's defaults."""
    spec_inputs = data["inputs"]
    root = read_setting_text(text) if text is not None else read_setting(path)
    tools, splines, _ = find_tools(root)
    if not tools:
        raise ValueError("no Fuse.Graphizo node in %s" % path)
    _, tool = tools[0]
    raw, keyed = {}, {}
    for input_id, entry in tool.get("Inputs").fields.items():
        if not isinstance(entry, Table) or input_id not in spec_inputs:
            continue
        if "SourceOp" in entry.fields:
            keys = spline_keys(splines.get(entry.fields["SourceOp"]))
            if keys:
                keyed[input_id] = keys
        elif "Value" in entry.fields:
            raw[input_id] = entry.fields["Value"]

    def default(input_id):
        return BUILDER_DEFAULTS.get(input_id, spec_inputs[input_id].get("default"))

    def changed(input_id):
        return input_id in raw and not same_value(raw[input_id], default(input_id))

    spec = {"name": os.path.splitext(os.path.basename(path))[0]}
    used = set()
    saved = saved_from_resolve(tool)
    if saved:
        # A node saved from Resolve holds only its changed controls: the rest are at Graphizo's defaults.
        for input_id in ("GraphType", "DataSource", "OutputPreset", "MotionMode"):
            if input_id not in raw and input_id not in keyed:
                raw[input_id] = spec_inputs[input_id]["default"]
    if "GraphType" in raw:
        spec["chart"] = CHARTS[int(raw["GraphType"])]
        used.add("GraphType")
    if "OutputPreset" in raw:
        p = int(raw["OutputPreset"])
        spec["canvas"] = ENUMS["OutputPreset"][p]
        used.add("OutputPreset")
        if p:
            used |= {"OutputWidth", "OutputHeight"}  # a preset size; Custom keeps its own as inputs
    # Data.
    if int(raw.get("DataSource", 0)) == 1:
        spec["data"] = raw.get("Data", spec_inputs["Data"]["default"])
    elif "DataSource" in raw or "FieldCount" in raw:
        count = int(raw.get("FieldCount", spec_inputs["FieldCount"]["default"]))
        fields = []
        for i in range(1, count + 1):
            label = raw.get("FieldLabel%d" % i, spec_inputs["FieldLabel%d" % i]["default"])
            if "FieldValue%d" % i in keyed:
                fields.append({"label": label, "keys": {str(int(f)): v for f, v in keyed["FieldValue%d" % i]}})
            else:
                fields.append([label, raw.get("FieldValue%d" % i, spec_inputs["FieldValue%d" % i]["default"])])
        spec["fields"] = fields
        if any(isinstance(f, dict) for f in fields):
            spec["keys_mode"] = "linear"
    used |= DATA_INPUTS
    # Title, target, range, colours, fonts.
    if raw.get("ShowTitle"):
        spec["title"] = {"text": raw.get("TitleText", "Graphizo")}
    used |= {"ShowTitle", "TitleText"}
    if raw.get("ShowTarget"):
        spec["target"] = {}
    used.add("ShowTarget")
    if "AutoY" in raw and not raw["AutoY"]:
        spec["y_range"] = [raw.get("YMin", 0), raw.get("YMax", 100)]
    used |= {"AutoY", "YMin", "YMax"}
    if "AutoPalette" in raw and not raw["AutoPalette"]:
        colors, last = [], 1
        for i in range(1, 7):
            ids = ["Custom%d%s" % (i, c) for c in "RGB"]
            colors.append(color_hex([raw.get(k, spec_inputs[k]["default"]) for k in ids]))
            if any(changed(k) for k in ids):
                last = i
        spec["colors"] = colors[:last]
    used |= {"AutoPalette"} | {"Custom%d%s" % (i, c) for i in range(1, 7) for c in "RGB"}
    if changed("FontFamily") or changed("FontStyle"):
        spec["font"] = {"family": raw.get("FontFamily", "Arial"), "style": raw.get("FontStyle", "Regular")}
    used |= {"FontFamily", "FontStyle"}
    if changed("ChartOffsetX") or changed("ChartOffsetY"):
        spec["chart_offset"] = [raw.get("ChartOffsetX", 0), raw.get("ChartOffsetY", 0)]
    used |= {"ChartOffsetX", "ChartOffsetY"}
    typography = {}
    for role_key, role in TEXT_ROLES.items():
        settings = {}
        if role + "UseMainFont" in raw and not raw[role + "UseMainFont"]:
            settings["font"] = raw.get(role + "FontFamily", "Arial")
            settings["style"] = raw.get(role + "FontStyle", "Regular")
        for key, field in (("size", "Size"), ("tracking", "Tracking"), ("x", "OffsetX"), ("y", "OffsetY")):
            if changed(role + field):
                settings[key] = raw[role + field]
        if changed(role + "TextAlign"):
            settings["align"] = ENUMS["TextAlign"][int(raw[role + "TextAlign"])]
        used |= {role + f for f in ROLE_FIELDS}
        if settings:
            typography[role_key] = settings
    # Plain fields.
    for path, input_id, kind in FIELDS:
        ids = [input_id + c for c in "RGB"] if kind == "color" else [input_id]
        if input_id in ("TitleText",):
            continue
        if not any(changed(i) for i in ids):
            used |= set(ids)
            continue
        if kind == "color":
            value = color_hex([raw.get(i, spec_inputs[i]["default"]) for i in ids])
        elif kind == "bool":
            value = bool(raw[input_id])
        elif kind == "enum":
            value = ENUMS["TextAlign" if input_id.endswith("TextAlign") else input_id][int(raw[input_id])]
        else:
            value = raw[input_id]
        used |= set(ids)
        node = spec
        parts = path.split(".")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value
    # Under a creator look a colour counts only with its Custom switch on: then it is always written (the builder
    # turns the switch on again from it); without the switch it is dropped, so a rebuild cannot change the look.
    look_set = int(raw.get("CreatorLook", 0)) != 0
    for path, prefix, switch in LOOK_OVERRIDES:
        used.add(switch)
        if not look_set:
            continue
        parts = path.split(".")
        group = spec.get(parts[0]) if len(parts) > 1 else spec
        if raw.get(switch):
            node = spec.setdefault(parts[0], {}) if len(parts) > 1 else spec
            node[parts[-1]] = color_hex([raw.get(prefix + c, spec_inputs[prefix + c]["default"]) for c in "RGB"])
        elif isinstance(group, dict) and parts[-1] in group:
            del group[parts[-1]]
            if len(parts) > 1 and not group:
                del spec[parts[0]]
    if "OutputPreset" not in raw and (spec.get("data") is not None or spec.get("fields") is not None):
        # No OutputPreset in a node saved from Resolve means the node's default, Custom (its own width and height).
        spec["canvas"] = "custom"
    if "MotionMode" not in raw:
        # Resolve saves only changed controls: no MotionMode means the node's default, Manual Progress.
        spec.setdefault("animation", {})["playback"] = "manual"
    if "palette" in spec and "colors" in spec:
        del spec["palette"]
    if "title" in spec and isinstance(spec["title"], dict) and list(spec["title"]) == ["text"]:
        spec["title"] = spec["title"]["text"]
    if typography:
        spec["typography"] = typography
    extra = {k: v for k, v in raw.items() if k not in used and spec_inputs.get(k, {}).get("role") == "public" and changed(k)}
    if extra:
        spec["inputs"] = extra
    return spec


def cmd_to_spec(args):
    try:
        spec = preset_to_spec(args.file, load_inputs())
    except (OSError, ValueError) as exc:
        print(exc)
        return 1
    text = json.dumps(spec, indent=2, ensure_ascii=False)
    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text + "\n")
        print("wrote %s" % args.out)
    else:
        print(text)
    return 0


# --------------------------------------------------------------------------- table files -> data

NUMBER_CHARS = re.compile(r"[^0-9.,()\-]")


def clean_cell(cell, decimal_comma):
    """A value cell as Graphizo reads it best: currency signs, units and spaces dropped; 1.234,5 -> 1234.5 with decimal_comma."""
    text = NUMBER_CHARS.sub("", cell)
    if decimal_comma:
        text = text.replace(".", "").replace(",", ".")
    else:
        text = text.replace(",", "")
    return text if data_number(text) is not None else cell


def read_table_file(path):
    raw = open(path, "rb").read()
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1"), "latin-1"


def cmd_data(args):
    text, encoding = read_table_file(args.file)
    sample = text[:4096]
    try:
        delimiter = csv.Sniffer().sniff(sample, delimiters=",;\t").delimiter
    except csv.Error:
        delimiter = "\t" if "\t" in sample else ";" if sample.count(";") > sample.count(",") else ","
    rows = [[c.strip() for c in r] for r in csv.reader(io.StringIO(text), delimiter=delimiter) if any(c.strip() for c in r)]
    if not rows:
        print("the file has no rows")
        return 1
    if args.columns:
        header = rows[0]
        index = []
        for name in [c.strip() for c in args.columns.split(",")]:
            if name in header:
                index.append(header.index(name))
            elif name.isdigit() and int(name) < len(header):
                index.append(int(name))
            else:
                print("column %r is not in the header: %s" % (name, ", ".join(header)))
                return 1
        rows = [[r[i] if i < len(r) else "" for i in index] for r in rows]
    if args.transpose:
        width = max(len(r) for r in rows)
        rows = [[r[i] if i < len(r) else "" for r in rows] for i in range(width)]
    # The output is comma-separated, so a semicolon file's numbers (1,5 = 1.5; 1.250 = 1250) are written as plain
    # decimals first; Graphizo reads them the same way, but "1,250" would mean 1250 once the separator is a comma.
    cleaned = 0
    if delimiter == ";" and not args.decimal_comma:
        for r in rows[1:]:
            for i in range(1, len(r)):
                value = data_number(r[i], semicolon=True)
                if value is not None and r[i].strip() != fmt_num(value):
                    r[i], cleaned = fmt_num(value), cleaned + 1
    ambiguous = 0 if delimiter == ";" else sum(
        1 for r in rows[1:] for c in r[1:] if re.fullmatch(r"-?\d{1,3},\d{3}", NUMBER_CHARS.sub("", c)))
    if args.clean or args.decimal_comma:
        for r in rows[1:]:
            for i in range(1, len(r)):
                new = clean_cell(r[i], args.decimal_comma)
                if new != r[i]:
                    r[i], cleaned = new, cleaned + 1
    out = "\n".join(",".join(csv_cell(c) for c in r) for r in rows)
    parsed = parse_data(out, 128)
    print(out)
    notes = ["%d rows x %d value columns (%s); %d cells are not numbers%s" % (
        len(parsed["rows"]), parsed["series"], ", ".join(parsed["names"][:8]), parsed["invalid"],
        "; %d cells cleaned" % cleaned if cleaned else "")]
    if encoding != "utf-8-sig":
        notes.append("the file is not UTF-8; read it as %s" % encoding)
    if parsed["bad_cells"]:
        notes.append("not numbers (they draw as 0): %s. Pass --clean to drop currency signs and units, and put "
                     "the unit in Value Prefix / Suffix" % ", ".join(repr(c) for c in parsed["bad_cells"]))
    if ambiguous and not args.decimal_comma:
        notes.append("%d cells like 1,250 are read as thousands (1250). If the comma is the decimal mark in this "
                     "file (1,250 = 1.25), pass --decimal-comma" % ambiguous)
    for note in notes:
        print("--- " + note, file=sys.stderr)
    return 0


# --------------------------------------------------------------------------- folders, install

def resolve_settings_dir():
    home = os.path.expanduser("~")
    if sys.platform.startswith("win"):
        base = os.environ.get("APPDATA") or os.path.join(home, "AppData", "Roaming")
        return os.path.join(base, "Blackmagic Design", "DaVinci Resolve", "Support", "Fusion", "Settings")
    if sys.platform == "darwin":
        return os.path.join(home, "Library", "Application Support", "Blackmagic Design", "DaVinci Resolve", "Fusion", "Settings")
    return os.path.join(home, ".local", "share", "DaVinciResolve", "Fusion", "Settings")


def downloads_dir():
    return os.path.join(os.path.expanduser("~"), "Downloads", "Graphizo Presets")


def target_folder(target):
    named = {"resolve": resolve_settings_dir(), "downloads": downloads_dir()}
    return os.path.expanduser(named.get(target, target))


def cmd_where(_args):
    for label, path in (("resolve", resolve_settings_dir()), ("downloads", downloads_dir())):
        print("%-9s %s  (%s)" % (label, path, "exists" if os.path.isdir(path) else "will be created"))
    return 0


def cmd_install(args):
    data = load_inputs()
    target = target_folder(args.to)
    status = 0
    for path in args.files:
        try:
            with open(path, "r", encoding="utf-8-sig", errors="replace") as handle:
                report, _, _, _ = check_text(handle.read(), data)
        except (OSError, ValueError) as exc:
            print("not installed: %s (%s)" % (path, exc))
            status = 1
            continue
        if report.errors:
            print("not installed: %s has errors; run the check command" % path)
            status = 1
            continue
        os.makedirs(target, exist_ok=True)
        dest = os.path.normpath(os.path.join(target, os.path.basename(path)))
        if os.path.exists(dest) and not args.overwrite:
            print("not installed: %s already exists (pass --overwrite or use the next free name)" % dest)
            status = 1
            continue
        shutil.copyfile(path, dest)
        print("installed: %s" % dest)
    return status


def main(argv=None):
    parser = argparse.ArgumentParser(description="Graphizo chart preset helper: build, check, to-spec, data, where, next-name, install.")
    sub = parser.add_subparsers(dest="command")
    p = sub.add_parser("build", help="write a chart preset from a JSON spec, then check it")
    p.add_argument("spec")
    p.add_argument("out", nargs="?", help="default: my-presets/<name>.setting")
    p.add_argument("--frames", type=int, help="clip length in frames, to warn about animation that runs past it")
    p.add_argument("--compact", action="store_true", help="write only what differs from Graphizo's defaults")
    p.add_argument("--overwrite", action="store_true")
    p.set_defaults(func=cmd_build)
    p = sub.add_parser("check", help="check presets")
    p.add_argument("files", nargs="+")
    p.add_argument("--frames", type=int, help="clip length in frames")
    p.set_defaults(func=cmd_check)
    p = sub.add_parser("to-spec", help="turn a preset into a JSON spec")
    p.add_argument("file")
    p.add_argument("out", nargs="?")
    p.set_defaults(func=cmd_to_spec)
    p = sub.add_parser("data", help="turn a CSV/TSV file into Graphizo data text")
    p.add_argument("file")
    p.add_argument("--columns", help="keep these columns, by header name or number (the label column first)")
    p.add_argument("--transpose", action="store_true", help="swap rows and columns")
    p.add_argument("--clean", action="store_true", help="drop currency signs, units and spaces from value cells")
    p.add_argument("--decimal-comma", action="store_true", help="the file writes 1.234,5: convert to 1234.5 (implies --clean)")
    p.set_defaults(func=cmd_data)
    p = sub.add_parser("where", help="print the folders presets can go to")
    p.set_defaults(func=cmd_where)
    p = sub.add_parser("next-name", help="the next free short preset name, like Graphizo-07A")
    p.add_argument("--to", action="append", help="also look in resolve, downloads or a folder (repeat for several)")
    p.add_argument("--variant", type=int, help="number of an existing look: print its next free letter instead")
    p.set_defaults(func=cmd_next_name)
    p = sub.add_parser("install", help="copy checked presets to a folder")
    p.add_argument("files", nargs="+")
    p.add_argument("--to", required=True, help="resolve, downloads, or a folder path")
    p.add_argument("--overwrite", action="store_true")
    p.set_defaults(func=cmd_install)
    args = parser.parse_args(argv)
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except (AttributeError, ValueError):
            pass
    if not getattr(args, "func", None):
        parser.print_help()
        return 2
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
