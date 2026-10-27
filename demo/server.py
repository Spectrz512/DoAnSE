"""Local demonstration server: static web app + anonymous visitor counter."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime, timezone
import json
import os

ROOT = Path(__file__).parent
DATA = ROOT / "visits.json"
ADMIN_KEY = os.getenv("DEMO_ADMIN_KEY", "demo-admin-key")

def read_data():
    if not DATA.exists(): return {"visits": [], "visitors": {}}
    return json.loads(DATA.read_text(encoding="utf-8"))

def save_data(data): DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def json(self, status, body):
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status); self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def do_POST(self):
        if self.path != "/api/visit": return self.send_error(404)
        try:
            size = int(self.headers.get("Content-Length", "0")); payload = json.loads(self.rfile.read(size) or b"{}")
        except (ValueError, json.JSONDecodeError): return self.json(400, {"error": "Invalid JSON"})
        visitor_id = str(payload.get("visitorId", "anonymous"))[:100]
        data = read_data(); now = datetime.now(timezone.utc).isoformat()
        data["visits"].append({"visitorId": visitor_id, "at": now})
        data["visitors"][visitor_id] = now; save_data(data)
        return self.json(201, {"ok": True})
    def do_GET(self):
        if self.path != "/api/stats": return super().do_GET()
        if self.headers.get("x-admin-key") != ADMIN_KEY: return self.json(401, {"error": "Admin key required"})
        data = read_data(); return self.json(200, {"totalVisits": len(data["visits"]), "uniqueVisitors": len(data["visitors"]), "latestVisits": list(reversed(data["visits"][-20:]) )})

if __name__ == "__main__":
    print("Demo: http://0.0.0.0:8080  | dashboard key: " + ADMIN_KEY)
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
