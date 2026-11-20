#!/usr/bin/env python3
"""
Clipyx Unified Server
Serves the main Clipyx website, Planizo sub-app, and REST API endpoints.
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT_DIR / "app" / "site"
PLANIZO_DIR = ROOT_DIR / "app" / "planizo"
DATA_DIR = ROOT_DIR / "data"
FONTS_DIR = PLANIZO_DIR / "fonts"
LIBRARY_FILE = DATA_DIR / "clipyx_library.json"

port = 8765

# ---------- Mock API Data ----------
BOOTSTRAP_DATA = {
    "user": {
        "id": "clipyx_creator",
        "name": "Clipyx Senior Creator",
        "email": "engineer@clipyx.local",
        "timeFormat": "12h"
    },
    "palette": "dark",
    "features": {
        "botizo": True, "reminders": True, "business": True,
        "whiteboard": True, "calendar": True, "schedule": True,
        "routine": True, "content": True
    },
    "welcome": False
}

ME_DATA = {
    "id": "clipyx_creator",
    "name": "Clipyx Senior Creator",
    "email": "engineer@clipyx.local"
}

TODOS_DATA = [
    {"id": "t1", "text": "Draft DaVinci Resolve Masterclass Script", "completed": True, "dateKey": "2026-11-20", "order": 0},
    {"id": "t2", "text": "Build Textizo Apple Reveal Preset for video title", "completed": True, "dateKey": "2026-11-20", "order": 1},
    {"id": "t3", "text": "Assemble Fusion Node Tree (VHS Tape Look)", "completed": False, "dateKey": "2026-11-20", "order": 2},
    {"id": "t4", "text": "Generate offline subtitles using Qwen3-ASR Transcribe", "completed": False, "dateKey": "2026-11-20", "order": 3}
]

RANGE_DATA = {
    "events": [
        {"id": "e1", "title": "Script & B-Roll Planning Session", "startAt": "2026-11-20T09:00:00.000Z", "endAt": "2026-11-20T11:00:00.000Z", "color": "#00a2ff"},
        {"id": "e2", "title": "DaVinci Resolve Editing & Color Grade", "startAt": "2026-11-20T14:00:00.000Z", "endAt": "2026-11-20T16:30:00.000Z", "color": "#00e5ff"}
    ],
    "tasks": [{"id": "tk1", "title": "Record YouTube A-Roll & Tutorial", "dateKey": "2026-11-20", "completed": False, "order": 0}],
    "content": [{"id": "ci1", "title": "5 Insane DaVinci Resolve Motion Tricks", "status": "editing", "platform": "youtube", "dateKey": "2026-11-25"}],
    "todos": TODOS_DATA,
    "notes": []
}

WHITEBOARD_FILE_DATA = {
    "view": "script", "mode": "script",
    "elements": [], "texts": [], "frames": [], "groups": [], "guides": [],
    "script": {
        "scripts": [
            {"id": "s1", "title": "1. Hook & Intro", "text": "Hey creators! Today we are looking at 5 insane DaVinci Resolve tricks in Fusion.", "brolls": [{"id": "b1", "text": "Fast zoom montage of Resolve timeline into Fusion Node graph", "range": [15, 80]}]},
            {"id": "s2", "title": "2. Procedural Kinetic Text", "text": "Instead of manual keyframing, we trigger Clipyx Textizo presets.", "brolls": [{"id": "b2", "text": "A/B comparison of manual keyframing vs 1-click Textizo Apple Reveal", "range": [10, 85]}]},
            {"id": "s3", "title": "3. VHS Tape Retro Look", "text": "With the Clipyx Library, copy the VHS Tape Node Tree and paste directly into the Fusion node editor.", "brolls": [{"id": "b3", "text": "Split screen showing modern footage turning into authentic 90s VHS tape", "range": [20, 95]}]}
        ],
        "inactive_brolls": []
    }
}

WHITEBOARDS_DATA = [{"path": "main_script_breakdown", "label": "Episode 12 - B-Roll Breakdown & Storyboard", "view": "script"}]

PROJECTS_DATA = [
    {"id": "p1", "title": "5 Insane DaVinci Resolve Motion Tricks", "stage": "editing", "updatedAt": "2026-11-20T03:30:00Z"},
    {"id": "p2", "title": "AI Video Transcriptions Offline", "stage": "script", "updatedAt": "2026-11-20T02:15:00Z"}
]

CONTENT_ITEMS_DATA = [
    {"id": "ci1", "title": "5 Insane DaVinci Resolve Motion Tricks", "status": "editing", "platform": "youtube", "dateKey": "2026-11-25"},
    {"id": "ci2", "title": "AI Video Transcriptions Offline", "status": "script", "platform": "youtube", "dateKey": "2026-11-30"}
]

NOTES_DATA = [
    {"id": "n1", "title": "DaVinci Resolve Color Grade Settings", "text": "Rec.709-A gamma curve with Kodak 2383 LUT emulation and Textizo titles.", "date": "2026-11-20"}
]

# ---------- Library Data Cache ----------
_library_cache = None

def get_library_data():
    global _library_cache
    if _library_cache is not None:
        return _library_cache
    if LIBRARY_FILE.exists():
        with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
            _library_cache = json.load(f)
    else:
        _library_cache = []
    return _library_cache


# ---------- MIME types ----------
MIME_MAP = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
    '.ttf': 'font/ttf', '.webp': 'image/webp', '.mp4': 'video/mp4',
}

def guess_mime(path):
    ext = Path(path).suffix.lower()
    return MIME_MAP.get(ext, 'application/octet-stream')


class ClipyxHandler(http.server.BaseHTTPRequestHandler):

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def log_message(self, format, *args):
        # Cleaner log output
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_HEAD(self):
        return self.do_GET()

    def respond_json(self, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_file(self, file_path):
        if not file_path.exists() or not file_path.is_file():
            self.send_error(404)
            return
        mime = guess_mime(str(file_path))
        file_size = file_path.stat().st_size
        range_header = self.headers.get('Range')

        # Support partial video streaming for instant MP4 playback in browser
        if range_header and range_header.startswith('bytes='):
            try:
                ranges = range_header[6:].split('-')
                start = int(ranges[0]) if ranges[0] else 0
                end = int(ranges[1]) if ranges[1] else file_size - 1
                end = min(end, file_size - 1)
                length = end - start + 1

                self.send_response(206)
                self.send_header("Content-Type", mime)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Content-Length", str(length))
                self.send_header("Cache-Control", "public, max-age=31536000")
                self.end_headers()

                with open(file_path, "rb") as f:
                    f.seek(start)
                    self.wfile.write(f.read(length))
                return
            except Exception:
                pass

        with open(file_path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        url = parsed.path

        # ---------- API ENDPOINTS ----------
        if url.endswith("/api/bootstrap"):
            return self.respond_json(BOOTSTRAP_DATA)
        elif url.endswith("/api/me"):
            return self.respond_json(ME_DATA)
        elif url.endswith("/api/range"):
            return self.respond_json(RANGE_DATA)
        elif url.endswith("/api/todos"):
            return self.respond_json(TODOS_DATA)
        elif url.endswith("/api/whiteboards"):
            return self.respond_json(WHITEBOARDS_DATA)
        elif url.endswith("/api/whiteboard/file"):
            return self.respond_json(WHITEBOARD_FILE_DATA)
        elif url.endswith("/api/projects"):
            return self.respond_json(PROJECTS_DATA)
        elif url.endswith("/api/content-items"):
            return self.respond_json(CONTENT_ITEMS_DATA)
        elif url.endswith("/api/notes"):
            return self.respond_json(NOTES_DATA)
        elif url.endswith("/api/library"):
            return self.respond_json(get_library_data())
        elif url.endswith("/api/reminders") or url.endswith("/api/events") or url.endswith("/api/routines") or url.endswith("/api/day-presets"):
            return self.respond_json([])
        elif "/api/" in url:
            return self.respond_json([])

        # ---------- SVG SPRITE (shared) ----------
        if "iconizo-sprite.svg" in url or "sprite-" in url:
            sprite_path = PLANIZO_DIR / "assets" / "sprite-BI_fQmJc.svg"
            if sprite_path.exists():
                return self.serve_file(sprite_path)

        # ---------- PLANIZO SUB-APP (at /planizo/) ----------
        if url == "/planizo" or url.startswith("/planizo/"):
            sub_path = url[len("/planizo"):]
            if not sub_path or sub_path == "/":
                sub_path = "/index.html"
            file_path = PLANIZO_DIR / sub_path.lstrip("/")
            return self.serve_file(file_path)

        # ---------- SHARED ASSETS ----------
        # Fonts (shared between site and planizo)
        if url.startswith("/fonts/"):
            file_path = PLANIZO_DIR / url.lstrip("/")
            if file_path.exists():
                return self.serve_file(file_path)

        # Planizo icon
        if url == "/planizo.png":
            return self.serve_file(PLANIZO_DIR / "planizo.png")

        # ---------- SITE STATIC FILES ----------
        if url.startswith("/site/"):
            file_path = SITE_DIR / url[len("/site/"):].lstrip("/")
            return self.serve_file(file_path)

        # ---------- MAIN SITE & SUB-PAGES ----------
        clean_rel = urllib.parse.unquote(url.lstrip("/"))
        if not clean_rel or clean_rel == "index.html":
            return self.serve_file(SITE_DIR / "index.html")

        # Check in SITE_DIR first
        site_target = SITE_DIR / clean_rel
        if site_target.is_dir():
            idx = site_target / "index.html"
            if idx.exists():
                return self.serve_file(idx)
        elif site_target.is_file():
            return self.serve_file(site_target)

        # Check in PLANIZO_DIR as fallback
        planizo_target = PLANIZO_DIR / clean_rel
        if planizo_target.is_dir():
            idx = planizo_target / "index.html"
            if idx.exists():
                return self.serve_file(idx)
        elif planizo_target.is_file():
            return self.serve_file(planizo_target)

        self.send_error(404)

    def do_POST(self):
        return self.respond_json({"status": "ok"})

    def do_PUT(self):
        return self.respond_json({"status": "ok"})

    def do_DELETE(self):
        return self.respond_json({"status": "ok"})


def run_server(p=port):
    print()
    print("=" * 60)
    print(f"  ⚡ Clipyx Server Running")
    print(f"  🌐 Main Site:  http://localhost:{p}/")
    print(f"  📅 Planizo:    http://localhost:{p}/planizo/")
    print(f"  📚 Library API: http://localhost:{p}/api/library")
    print(f"  📂 Site Dir:   {SITE_DIR}")
    print(f"  📂 Planizo Dir: {PLANIZO_DIR}")
    print("=" * 60)
    print()

    with socketserver.TCPServer(("", p), ClipyxHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.")


if __name__ == "__main__":
    p = port
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        p = int(sys.argv[1])

    if "--open" in sys.argv:
        import webbrowser
        webbrowser.open(f"http://localhost:{p}/")

    run_server(p)
