# Clipyx Production Distribution (`dist`)

This folder contains the complete, self-contained, zero-dependency offline web application of **Planizo / Clipyx**.

---

## 🚀 Quick Start

### Option 1: Double-click Launcher (Windows)
Double-click `run.bat` to launch the server and automatically open the application in your default browser.

### Option 2: Python Command Line
Run with any Python 3 installation (no pip dependencies required):
```bash
python server.py
```

By default, the application runs at:
```
http://localhost:8765/
```

To specify a custom port or automatically open the browser:
```bash
python server.py 8080 --open
```

---

## 📦 What's Included

| File / Folder | Purpose |
| :--- | :--- |
| `index.html` | Pre-built React 18 / Vite single-page application entry point |
| `assets/` | Compiled JavaScript chunks, CSS stylesheets, and SVG icon sprites |
| `fonts/` | Offline embedded fonts (Inter, Geometria, Space Grotesk) |
| `iconizo/` | Clipyx UI iconography |
| `planizo.png` | Web application icon and branding |
| `server.py` | Built-in Python HTTP server with mock REST API for offline functionality |
| `run.bat` | Windows one-click launcher |

---

## ⚡ Features Out of the Box
- **Calendar & Schedule**: Visual day/week/month planner with sample production tasks.
- **Script & B-Roll Breakdown**: Script-to-broll workflow editor with interactive timeline markers.
- **Today & To-Dos**: Daily routine tracker and task execution checklist.
- **Offline Persistence**: Local mock endpoints for `/api/bootstrap`, `/api/me`, `/api/range`, `/api/todos`, `/api/whiteboard/file`, `/api/projects`, and `/api/notes`.
