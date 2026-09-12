"""Serve the static UI for browser preview; desktop persistence uses Rust."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial

if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent / "ui"
    print("SkillTopo preview: http://127.0.0.1:4173", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 4173), partial(SimpleHTTPRequestHandler, directory=str(root))).serve_forever()
