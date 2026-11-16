import http.server
import socketserver
import os
import sys
import json
import urllib.parse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT_DIR / "app" / "planizo"
port = 8765

BOOTSTRAP_DATA = {
    "user": {
        "id": "clipyx_creator",
        "name": "Clipyx Senior Creator",
        "email": "engineer@clipyx.local",
        "timeFormat": "12h"
    },
    "palette": "dark",
    "features": {
        "botizo": True,
        "reminders": True,
        "business": True,
        "whiteboard": True,
        "calendar": True,
        "schedule": True,
        "routine": True,
        "content": True
    },
    "welcome": False
}

ME_DATA = {
    "id": "clipyx_creator",
    "name": "Clipyx Senior Creator",
    "email": "engineer@clipyx.local"
}

TODOS_DATA = [
    {"id": "t1", "text": "Draft DaVinci Resolve Masterclass Script", "completed": True, "dateKey": "2026-11-17", "order": 0},
    {"id": "t2", "text": "Build Textizo Apple Reveal Preset for video title", "completed": True, "dateKey": "2026-11-17", "order": 1},
    {"id": "t3", "text": "Assemble Fusion Node Tree (VHS Tape Look)", "completed": False, "dateKey": "2026-11-17", "order": 2},
    {"id": "t4", "text": "Generate offline subtitles using Qwen3-ASR Transcribe", "completed": False, "dateKey": "2026-11-17", "order": 3}
]

RANGE_DATA = {
    "events": [
        {
            "id": "e1",
            "title": "Script & B-Roll Planning Session",
            "startAt": "2026-11-17T09:00:00.000Z",
            "endAt": "2026-11-17T11:00:00.000Z",
            "color": "#9eff00"
        },
        {
            "id": "e2",
            "title": "DaVinci Resolve Editing & Color Grade",
            "startAt": "2026-11-17T14:00:00.000Z",
            "endAt": "2026-11-17T16:30:00.000Z",
            "color": "#00e5ff"
        }
    ],
    "tasks": [
        {
            "id": "tk1",
            "title": "Record YouTube A-Roll & Tutorial",
            "dateKey": "2026-11-17",
            "completed": False,
            "order": 0
        }
    ],
    "content": [
        {
            "id": "ci1",
            "title": "5 Insane DaVinci Resolve Motion Tricks",
            "status": "editing",
            "platform": "youtube",
            "dateKey": "2026-11-22"
        }
    ],
    "todos": TODOS_DATA,
    "notes": []
}

WHITEBOARD_FILE_DATA = {
    "view": "script",
    "mode": "script",
    "elements": [],
    "texts": [],
    "frames": [],
    "groups": [],
    "guides": [],
    "script": {
        "scripts": [
            {
                "id": "s1",
                "title": "1. Hook & Intro",
                "text": "Hey creators! Today we are looking at 5 insane DaVinci Resolve tricks in Fusion that will completely supercharge your video workflow.",
                "brolls": [
                    {"id": "b1", "text": "Fast zoom montage of Resolve timeline into Fusion Node graph", "range": [15, 80]}
                ]
            },
            {
                "id": "s2",
                "title": "2. Procedural Kinetic Text",
                "text": "Instead of manual keyframing, we trigger Clipyx Textizo presets. The letters pop, blur and stagger automatically with mathematical easing curves.",
                "brolls": [
                    {"id": "b2", "text": "A/B comparison of manual keyframing vs 1-click Textizo Apple Reveal", "range": [10, 85]}
                ]
            },
            {
                "id": "s3",
                "title": "3. VHS Tape Retro Look",
                "text": "With the Clipyx Library, copy the VHS Tape Node Tree and paste directly into the Fusion node editor for instant scanlines and phosphor glow.",
                "brolls": [
                    {"id": "b3", "text": "Split screen showing modern footage turning into authentic 90s VHS tape", "range": [20, 95]}
                ]
            }
        ],
        "inactive_brolls": []
    }
}

WHITEBOARDS_DATA = [
    {
        "path": "main_script_breakdown",
        "label": "Episode 12 - B-Roll Breakdown & Storyboard",
        "view": "script"
    }
]

PROJECTS_DATA = [
    {
        "id": "p1",
        "title": "5 Insane DaVinci Resolve Motion Tricks",
        "stage": "editing",
        "updatedAt": "2026-11-17T03:30:00Z"
    },
    {
        "id": "p2",
        "title": "AI Video Transcriptions Offline",
        "stage": "script",
        "updatedAt": "2026-11-17T02:15:00Z"
    }
]

CONTENT_ITEMS_DATA = [
    {
        "id": "ci1",
        "title": "5 Insane DaVinci Resolve Motion Tricks",
        "status": "editing",
        "platform": "youtube",
        "dateKey": "2026-11-22"
    },
    {
        "id": "ci2",
        "title": "AI Video Transcriptions Offline",
        "status": "script",
        "platform": "youtube",
        "dateKey": "2026-11-28"
    }
]

NOTES_DATA = [
    {
        "id": "n1",
        "title": "DaVinci Resolve Color Grade Settings",
        "text": "Rec.709-A gamma curve with Kodak 2383 LUT emulation and Textizo titles.",
        "date": "2026-11-17"
    }
]

class PlanizoHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def respond_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        url = parsed.path

        # Handle SVG sprite requests
        if "iconizo-sprite.svg" in url or "sprite-" in url:
            sprite_path = WEB_DIR / "assets" / "sprite-BI_fQmJc.svg"
            if sprite_path.exists():
                self.send_response(200)
                self.send_header("Content-Type", "image/svg+xml")
                self.end_headers()
                with open(sprite_path, "rb") as sf:
                    self.wfile.write(sf.read())
                return

        # Mock API Endpoints
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
        elif url.endswith("/api/reminders") or url.endswith("/api/events") or url.endswith("/api/routines") or url.endswith("/api/day-presets"):
            return self.respond_json([])
        elif "/api/" in url:
            return self.respond_json([])
        elif url.startswith("/planizo/"):
            sub = url[len("/planizo"):]
            if not sub:
                sub = "/"
            self.path = sub

        return super().do_GET()

    def do_POST(self):
        return self.respond_json({"status": "ok"})

    def do_PUT(self):
        return self.respond_json({"status": "ok"})

    def do_DELETE(self):
        return self.respond_json({"status": "ok"})

def run_server(p=port):
    with socketserver.TCPServer(("", p), PlanizoHandler) as httpd:
        print(f"Planizo local server running at http://localhost:{p}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Server stopped.")

if __name__ == '__main__':
    p = int(sys.argv[1]) if len(sys.argv) > 1 else port
    run_server(p)
