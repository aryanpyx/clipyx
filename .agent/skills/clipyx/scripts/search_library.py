#!/usr/bin/env python3
"""
Clipyx Library Search & Retrieval Tool
Queries the 319-item offline DaVinci Resolve snippet and expression database.
"""
import sys
import json
import argparse
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "clipyx_library.json"
if not DATA_FILE.exists():
    DATA_FILE = Path(r"c:\Users\aryan\Downloads\Clipyx\data\clipyx_library.json")

def load_data():
    if not DATA_FILE.exists():
        print(f"Error: Database not found at {DATA_FILE}", file=sys.stderr)
        sys.exit(1)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def search(query, item_type=None, category=None, limit=10):
    items = load_data()
    q = query.lower() if query else ""
    t_filter = item_type.lower() if item_type else ""
    c_filter = category.lower() if category else ""

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

    print(f"Found {len(matches)} matching items in Clipyx Library:\n")
    for it in matches[:limit]:
        print(f"• [{it.get('type', 'item').upper()}] {it.get('title')} (slug: {it.get('slug')})")
        print(f"  Category: {it.get('category')} | Tool: {it.get('tool', 'Fusion')} | Input: {it.get('input', 'N/A')}")
        print(f"  Summary: {it.get('summary')}")
        if it.get("tip"):
            print(f"  Tip: {it.get('tip')}")
        print(f"  Paste Into: {it.get('paste', 'Fusion')}\n")

    if len(matches) > limit:
        print(f"... and {len(matches) - limit} more items.")

def get_item(slug):
    items = load_data()
    slug = slug.lower().strip()
    match = next((it for it in items if it.get("slug", "").lower() == slug), None)
    if not match:
        print(f"Error: No library item found with slug '{slug}'", file=sys.stderr)
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
        print(f"Tip:\n  {match.get('tip')}\n")
    if match.get("needs"):
        needs = match.get("needs")
        if isinstance(needs, dict):
            print(f"Prerequisites: {needs.get('text')}")
            print(f"How-to:        {needs.get('how')}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Query Clipyx 319-item Resolve Library")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_s = sub.add_parser("search", help="Search items")
    p_s.add_argument("query", nargs="?", default="", help="Search query")
    p_s.add_argument("--type", choices=["expression", "motion", "tree", "script", "ai"], help="Filter by type")
    p_s.add_argument("--category", help="Filter by category")
    p_s.add_argument("--limit", type=int, default=10, help="Max results")

    p_g = sub.add_parser("get", help="Get details by slug")
    p_g.add_argument("slug", help="Item slug name")

    args = parser.parse_args()
    if args.cmd == "search":
        search(args.query, args.type, args.category, args.limit)
    elif args.cmd == "get":
        get_item(args.slug)
