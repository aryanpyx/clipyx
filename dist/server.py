#!/usr/bin/env python3
"""
Clipyx Standalone Production Server
Serves the complete Clipyx platform and Planizo offline web application.
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse
from pathlib import Path

DIST_DIR = Path(__file__).resolve().parent
SITE_DIR = DIST_DIR / "site"
PLANIZO_DIR = DIST_DIR / "planizo"
port = 8765

# Mock data
BOOTSTRAP_DATA = {
    "user": {"id": "clipyx_creator", "name": "Clipyx Creator", "email": "creator@clipyx.local", "timeFormat": "12h"},
    "palette": "dark",
    "features": {"botizo": True, "reminders": True, "business": True, "whiteboard": True, "calendar": True, "schedule": True, "routine": True, "content": True},
    "welcome": False
}

MIME_MAP = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
    '.ttf': 'font/ttf', '.webp': 'image/webp', '.mp4': 'video/mp4'
}

def guess_mime(p):
    return MIME_MAP.get(Path(p).suffix.lower(), 'application/octet-stream')

class DistHandler(http.server.BaseHTTPRequestHandler):
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
        with open(file_path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        url = parsed.path

        if url.endswith("/api/bootstrap"):
            return self.respond_json(BOOTSTRAP_DATA)
        elif url.endswith("/api/me"):
            return self.respond_json(BOOTSTRAP_DATA["user"])
        elif url.endswith("/api/range"):
            return self.respond_json({"events": [], "tasks": [], "content": [], "todos": [], "notes": []})
        elif url.endswith("/api/todos") or url.endswith("/api/whiteboards") or url.endswith("/api/notes"):
            return self.respond_json([])
        elif url.endswith("/api/whiteboard/file"):
            return self.respond_json({"view": "script", "mode": "script", "elements": [], "texts": [], "frames": [], "groups": [], "guides": [], "script": {"scripts": [], "inactive_brolls": []}})
        elif "/api/" in url:
            return self.respond_json([])

        if "iconizo-sprite.svg" in url or "sprite-" in url:
            sp = PLANIZO_DIR / "assets" / "sprite-BI_fQmJc.svg"
            if sp.exists(): return self.serve_file(sp)

        if url == "/planizo" or url.startswith("/planizo/"):
            sub = url[len("/planizo"):]
            if not sub or sub == "/": sub = "/index.html"
            return self.serve_file(PLANIZO_DIR / sub.lstrip("/"))

        clean_rel = urllib.parse.unquote(url.lstrip("/"))
        if not clean_rel or clean_rel == "index.html":
            return self.serve_file(SITE_DIR / "index.html")

        st = SITE_DIR / clean_rel
        if st.is_dir():
            idx = st / "index.html"
            if idx.exists(): return self.serve_file(idx)
        elif st.is_file():
            return self.serve_file(st)

        pt = PLANIZO_DIR / clean_rel
        if pt.is_dir():
            idx = pt / "index.html"
            if idx.exists(): return self.serve_file(idx)
        elif pt.is_file():
            return self.serve_file(pt)

        self.send_error(404)

    def do_POST(self): return self.respond_json({"status": "ok"})
    def do_PUT(self): return self.respond_json({"status": "ok"})
    def do_DELETE(self): return self.respond_json({"status": "ok"})

def main():
    p = port
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        p = int(sys.argv[1])
    print(f"Clipyx Standalone Server at http://localhost:{p}/")
    if "--open" in sys.argv:
        import webbrowser
        webbrowser.open(f"http://localhost:{p}/")
    with socketserver.TCPServer(("", p), DistHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == '__main__':
    main()
"""