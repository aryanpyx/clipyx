#!/usr/bin/env python3
"""
Clipyx Platform Server Launcher
Runs the local streaming web server for the Clipyx suite on port 8765.
"""
import sys
import subprocess
from pathlib import Path

SERVER_SCRIPT = Path(r"c:\Users\aryan\Downloads\Clipyx\scripts\serve_planizo.py")

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    if not SERVER_SCRIPT.exists():
        print(f"Error: Server script not found at {SERVER_SCRIPT}", file=sys.stderr)
        sys.exit(1)
    print(f"Starting Clipyx Platform on http://localhost:{port}/ ...")
    subprocess.run([sys.executable, str(SERVER_SCRIPT), str(port)])

if __name__ == "__main__":
    main()
