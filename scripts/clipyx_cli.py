#!/usr/bin/env python3
"""
Clipyx Unified CLI & Toolkit
Integrates Planizo, Clipyx Library, Textizo Preset Generator, and Transcribe.
"""

import os
import sys
import json
import argparse
import webbrowser
import socketserver
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
APP_DIR = ROOT_DIR / "app" / "planizo"
DATA_DIR = ROOT_DIR / "data"
TOOLS_DIR = ROOT_DIR / "tools"
TEXTIZO_DIR = TOOLS_DIR / "textizo"
TRANSCRIBE_DIR = TOOLS_DIR / "transcribe"
MY_PRESETS_DIR = ROOT_DIR / "my-presets"

MY_PRESETS_DIR.mkdir(parents=True, exist_ok=True)
LIBRARY_FILE = DATA_DIR / "clipyx_library.json"

def get_library_data():
    if not LIBRARY_FILE.exists():
        print(f"Error: Library file not found at {LIBRARY_FILE}", file=sys.stderr)
        return []
    with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# -------------------------------------------------------------
# Planizo Web Server
# -------------------------------------------------------------
def cmd_serve(args):
    from scripts.serve_planizo import run_server
    port = args.port
    if args.open:
        webbrowser.open(f"http://localhost:{port}/")
    run_server(port)

# -------------------------------------------------------------
# Clipyx Library Search & Inspection
# -------------------------------------------------------------
def cmd_library_search(args):
    items = get_library_data()
    q = args.query.lower() if args.query else ""
    t_filter = args.type.lower() if args.type else ""
    c_filter = args.category.lower() if args.category else ""

    matches = []
    for it in items:
        title = it.get("title", "")
        summary = it.get("summary", "")
        slug = it.get("slug", "")
        cat = it.get("category", "")
        t = it.get("type", "")
        tool = it.get("tool", "")
        inp = it.get("input", "")

        if t_filter and t.lower() != t_filter:
            continue
        if c_filter and c_filter not in cat.lower():
            continue
        if q:
            match_str = f"{title} {summary} {slug} {cat} {t} {tool} {inp}".lower()
            if q not in match_str:
                continue
        matches.append(it)

    print(f"Found {len(matches)} matching library items:\n")
    for it in matches[:args.limit]:
        print(f"• [{it.get('type', 'item').upper()}] {it.get('title')} (slug: {it.get('slug')})")
        print(f"  Category: {it.get('category', 'N/A')} | Tool: {it.get('tool', 'Fusion')} | Input: {it.get('input', 'N/A')}")
        print(f"  Summary: {it.get('summary')}")
        if it.get("tip"):
            print(f"  Tip: {it.get('tip')}")
        print(f"  Paste target: {it.get('paste', 'Fusion')}")
        print()
    if len(matches) > args.limit:
        print(f"... and {len(matches) - args.limit} more items. Increase --limit to see all.")

def cmd_library_get(args):
    items = get_library_data()
    slug = args.slug.lower().strip()
    match = next((it for it in items if it.get("slug", "").lower() == slug), None)
    if not match:
        print(f"Error: No library item found with slug '{args.slug}'", file=sys.stderr)
        sys.exit(1)

    print("=" * 60)
    print(f"Title:       {match.get('title')}")
    print(f"Slug:        {match.get('slug')}")
    print(f"Type:        {match.get('type')}")
    print(f"Category:    {match.get('category')}")
    print(f"Tool:        {match.get('tool', 'Fusion')}")
    print(f"Input:       {match.get('input', 'N/A')}")
    print(f"Paste Into:  {match.get('paste', 'Fusion Inspector / Node Editor')}")
    print("=" * 60)
    print(f"\nSummary:\n  {match.get('summary')}\n")
    if match.get("tip"):
        print(f"Inspector Tip:\n  {match.get('tip')}\n")
    if match.get("needs"):
        needs = match.get("needs")
        if isinstance(needs, dict):
            print(f"Prerequisites: {needs.get('text')}")
            print(f"How-to:        {needs.get('how')}\n")
    if match.get("url"):
        print(f"Reference URL: {match.get('url')}\n")

# -------------------------------------------------------------
# Textizo Preset Integration
# -------------------------------------------------------------
def get_preset_tool():
    preset_tool = TEXTIZO_DIR / "tools" / "textizo_preset.py"
    if not preset_tool.exists():
        print(f"Error: textizo_preset.py not found at {preset_tool}", file=sys.stderr)
        sys.exit(1)
    return str(preset_tool)

def cmd_preset_list(args):
    presets_dir = TEXTIZO_DIR / "presets"
    if not presets_dir.exists():
        print("Presets folder not found.", file=sys.stderr)
        return
    presets = sorted(list(presets_dir.glob("*.setting")))
    my_presets = sorted(list(MY_PRESETS_DIR.glob("*.setting")))

    print(f"Built-in Textizo Presets ({len(presets)}):\n")
    for p in presets:
        print(f"  • {p.stem}")
    if my_presets:
        print(f"\nUser Saved Presets ({len(my_presets)} in my-presets/):\n")
        for p in my_presets:
            print(f"  • {p.stem}")
    print("\nTo inspect timing or validate: clipyx preset check <filename>")

def cmd_preset_check(args):
    preset_tool = get_preset_tool()
    cmd = [sys.executable, preset_tool, "check", args.file]
    if args.frames:
        cmd.extend(["--frames", str(args.frames)])
    if args.aspect:
        cmd.extend(["--aspect", str(args.aspect)])
    subprocess.run(cmd)

def cmd_preset_build(args):
    preset_tool = get_preset_tool()
    cmd = [sys.executable, preset_tool, "build", args.spec]
    if args.out:
        cmd.extend(["--out", args.out])
    subprocess.run(cmd)

def cmd_preset_next_name(args):
    preset_tool = get_preset_tool()
    subprocess.run([sys.executable, preset_tool, "next-name"])

def cmd_preset_where(args):
    preset_tool = get_preset_tool()
    subprocess.run([sys.executable, preset_tool, "where"])

def cmd_preset_install(args):
    preset_tool = get_preset_tool()
    cmd = [sys.executable, preset_tool, "install", args.folder, args.file]
    subprocess.run(cmd)

# -------------------------------------------------------------
# Script & Content Planning (Planizo Script Mode Integration)
# -------------------------------------------------------------
def cmd_plan_script(args):
    script_path = Path(args.file)
    if not script_path.exists():
        print(f"Error: Script file '{args.file}' not found.", file=sys.stderr)
        sys.exit(1)
    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines()
    broll_cues = []
    text_cues = []

    current_section = "Intro"
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        if line_clean.startswith("#"):
            current_section = line_clean.lstrip("#").strip()
            continue
        if "[" in line_clean and "]" in line_clean:
            tag = line_clean[line_clean.find("[")+1:line_clean.find("]")]
            broll_cues.append({"section": current_section, "cue": tag})
        elif "b-roll" in line_clean.lower() or "screen:" in line_clean.lower():
            broll_cues.append({"section": current_section, "cue": line_clean})
        if "text:" in line_clean.lower() or "title:" in line_clean.lower() or "lower third" in line_clean.lower():
            text_cues.append({"section": current_section, "cue": line_clean})

    print(f"==================================================")
    print(f"  Planizo Script Analysis: {script_path.name}")
    print(f"==================================================")
    print(f"Total Lines: {len(lines)}")
    print(f"\nExtracted B-Roll / Visual Cues ({len(broll_cues)}):")
    for b in broll_cues:
        print(f"  [{b['section']}] -> {b['cue']}")

    print(f"\nExtracted On-Screen Text / Graphics Cues ({len(text_cues)}):")
    for t in text_cues:
        print(f"  [{t['section']}] -> {t['cue']}")
    print(f"\nTip: Paste these visual cues directly into Planizo Whiteboard Script mode or use Textizo presets for animated titles.")

# -------------------------------------------------------------
# Main Argparse Dispatcher
# -------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Clipyx Complete Suite: Planizo, DaVinci Resolve Library, Textizo & Transcribe",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # serve
    p_serve = subparsers.add_parser("serve", help="Run the local Planizo Web App")
    p_serve.add_argument("--port", type=int, default=8765, help="Port to run server on (default: 8765)")
    p_serve.add_argument("--open", action="store_true", help="Automatically open browser")
    p_serve.set_defaults(func=cmd_serve)

    # library
    p_lib = subparsers.add_parser("library", help="Browse and search Clipyx DaVinci Resolve Library (319 items)")
    lib_sub = p_lib.add_subparsers(dest="lib_cmd", required=True)
    
    p_search = lib_sub.add_parser("search", help="Search library by query/category/type")
    p_search.add_argument("query", nargs="?", default="", help="Keyword search")
    p_search.add_argument("--type", choices=["expression", "motion", "tree", "script", "ai"], help="Filter by type")
    p_search.add_argument("--category", help="Filter by category (e.g. Text, Titles, Backgrounds, Looks)")
    p_search.add_argument("--limit", type=int, default=15, help="Max results to display")
    p_search.set_defaults(func=cmd_library_search)

    p_get = lib_sub.add_parser("get", help="Get full details for a library item by slug")
    p_get.add_argument("slug", help="Slug name of the item (e.g. count-up, grid-reveal)")
    p_get.set_defaults(func=cmd_library_get)

    # preset
    p_preset = subparsers.add_parser("preset", help="Textizo Animated Text Preset Generator & Validator")
    pre_sub = p_preset.add_subparsers(dest="pre_cmd", required=True)

    p_plist = pre_sub.add_parser("list", help="List all built-in and user Textizo presets")
    p_plist.set_defaults(func=cmd_preset_list)

    p_pcheck = pre_sub.add_parser("check", help="Check and validate a Textizo .setting file")
    p_pcheck.add_argument("file", help="Path to .setting preset file")
    p_pcheck.add_argument("--frames", type=int, help="Clip length in frames to warn about rows ending late")
    p_pcheck.add_argument("--aspect", type=float, help="Aspect ratio (default 16:9; 0.5625 for 9:16 vertical)")
    p_pcheck.set_defaults(func=cmd_preset_check)

    p_pbuild = pre_sub.add_parser("build", help="Build a Textizo .setting preset from a JSON spec")
    p_pbuild.add_argument("spec", help="Path to spec file (JSON)")
    p_pbuild.add_argument("--out", help="Output path for .setting file")
    p_pbuild.set_defaults(func=cmd_preset_build)

    p_pnext = pre_sub.add_parser("next-name", help="Find the next available preset name (e.g. Textizo-11A)")
    p_pnext.set_defaults(func=cmd_preset_next_name)

    p_pwhere = pre_sub.add_parser("where", help="Show DaVinci Resolve settings directory and installation paths")
    p_pwhere.set_defaults(func=cmd_preset_where)

    p_pinst = pre_sub.add_parser("install", help="Copy preset to Resolve settings folder or target directory")
    p_pinst.add_argument("folder", choices=["resolve", "downloads"], help="Destination folder shortcut")
    p_pinst.add_argument("file", help="Path to .setting preset file")
    p_pinst.set_defaults(func=cmd_preset_install)

    # plan
    p_plan = subparsers.add_parser("plan", help="Planizo video script & content planning tools")
    plan_sub = p_plan.add_subparsers(dest="plan_cmd", required=True)

    p_script = plan_sub.add_parser("script", help="Analyze video script for B-roll and visual cues")
    p_script.add_argument("file", help="Path to script markdown or text file")
    p_script.set_defaults(func=cmd_plan_script)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
