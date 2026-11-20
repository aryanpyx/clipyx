#!/usr/bin/env python3
"""
Clipyx Script B-Roll & Visual Cue Breakdown Tool
Extracts inline visual cues, animations, and lower-third graphics from markdown/text scripts.
"""
import sys
from pathlib import Path

def analyze_script(file_path):
    p = Path(file_path)
    if not p.exists():
        print(f"Error: File not found at {file_path}", file=sys.stderr)
        sys.exit(1)

    with open(p, "r", encoding="utf-8") as f:
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

    print("=" * 60)
    print(f"  Planizo Script Analysis: {p.name}")
    print("=" * 60)
    print(f"Total Lines: {len(lines)}")
    print(f"\nExtracted B-Roll / Visual Cues ({len(broll_cues)}):")
    for b in broll_cues:
        print(f"  [{b['section']}] -> {b['cue']}")

    print(f"\nExtracted On-Screen Text / Graphics Cues ({len(text_cues)}):")
    for t in text_cues:
        print(f"  [{t['section']}] -> {t['cue']}")
    print(f"\nRecommended Next Step:")
    print("  • Paste visual cues into Planizo Whiteboards at http://localhost:8765/planizo/#/whiteboard")
    print("  • Generate matching kinetic titles with: clipyx preset build")
    print("  • Generate data charts with: clipyx chart build")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_script.py <script_file.md>")
        sys.exit(1)
    analyze_script(sys.argv[1])
