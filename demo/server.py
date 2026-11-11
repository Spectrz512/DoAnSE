"""Local demonstration server: static web app + anonymous visitor counter.
Hỗ trợ mạng đa thiết bị (Multi-Device LAN): Điện thoại, máy tính bảng cùng Wi-Fi truy cập.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime, timezone
import json
import os
import socket

ROOT = Path(__file__).parent
DATA = ROOT / "visits.json"
ADMIN_KEY = os.getenv("DEMO_ADMIN_KEY", "demo-admin-key")

def get_lan_ip():
    """Tự động phát hiện địa chỉ IPv4 LAN của máy chủ."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def read_data():
    if not DATA.exists(): return {"visits": [], "visitors": {}}
    return json.loads(DATA.read_text(encoding="utf-8"))

def save_data(data):
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Mở rộng CORS cho mọi thiết bị trong mạng LAN truy cập
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def json(self, status, body):
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path != "/api/visit": return self.send_error(404)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(size) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self.json(400, {"error": "Invalid JSON"})

        visitor_id = str(payload.get("visitorId", "anonymous"))[:100]
        data = read_data()
        now = datetime.now(timezone.utc).isoformat()
        data["visits"].append({"visitorId": visitor_id, "at": now})
        data["visitors"][visitor_id] = now
        save_data(data)
        return self.json(201, {"ok": True})

    def do_GET(self):
        if self.path != "/api/stats": return super().do_GET()
        if self.headers.get("x-admin-key") != ADMIN_KEY:
            return self.json(401, {"error": "Admin key required"})
        data = read_data()
        return self.json(200, {
            "totalVisits": len(data["visits"]),
            "uniqueVisitors": len(data["visitors"]),
            "latestVisits": list(reversed(data["visits"][-20:]))
        })

if __name__ == "__main__":
    lan_ip = get_lan_ip()
    port = 8080
    print("=" * 70)
    print("  🌐 HỆ THỐNG THUYẾT MINH DI TÍCH - FRONTEND STATIC WEB SERVER")
    print("=" * 70)
    print(f"  💻 Trên máy tính cục bộ       : http://localhost:{port}/index.html")
    print(f"  📱 Trên điện thoại (cùng Wi-Fi): http://{lan_ip}:{port}/index.html")
    print(f"  🖨️  Trang Tạo Mã QR Quét Vé    : http://{lan_ip}:{port}/qr.html")
    print(f"  📊 Trang Quản Trị (Admin)     : http://{lan_ip}:{port}/admin.html")
    print("=" * 70)
    print(f"  🔑 Dashboard Admin Key        : {ADMIN_KEY}")
    print(f"  📡 Đang lắng nghe trên binding 0.0.0.0:{port}...")
    print("=" * 70)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
