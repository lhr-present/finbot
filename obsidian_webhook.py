#!/usr/bin/env python3
"""
FINBOT-9000 Obsidian Webhook Listener
Receives POST /finbot-result and appends a row to the
performance tracker table in ~/FINBOT-9000.md

Run:  python3 ~/projects/finbot/obsidian_webhook.py
      python3 ~/projects/finbot/obsidian_webhook.py &   # background
Stop: kill $(pgrep -f obsidian_webhook.py)

Requires: Python 3.8+ (stdlib only — no pip)
"""

import json
import re
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

VAULT_FILE = Path.home() / "FINBOT-9000.md"
PORT = 7788

# Must match the header row in the vault's performance tracker table exactly
TABLE_HEADER = "| Run | Date | Mode | Seed | Ending | NW | Opt% | Calib | Blind Spot | Ripples | Export |"


def fmt_nw(n):
    """Format net worth as $1.2M / $312K / $8000"""
    if n is None:
        return "—"
    try:
        n = float(n)
    except (TypeError, ValueError):
        return "—"
    if n >= 1_000_000:
        return f"${n / 1_000_000:.2f}M"
    if n >= 1_000:
        return f"${n / 1_000:.0f}K"
    return f"${int(n)}"


def append_row(data: dict):
    if not VAULT_FILE.exists():
        print(f"[WARN] Vault not found at {VAULT_FILE}")
        return

    content = VAULT_FILE.read_text(encoding="utf-8")

    if TABLE_HEADER not in content:
        print(f"[WARN] Performance tracker table not found in vault (expected header: {TABLE_HEADER!r})")
        return

    # Count existing data rows (lines starting with "| <digit>") to derive run number
    run_num = len(re.findall(r"^\| \d+", content, re.MULTILINE)) + 1
    date    = datetime.now().strftime("%Y-%m-%d")
    mode    = str(data.get("difficulty") or "—").upper()
    seed    = str(data.get("seed") or "—")
    ending  = str(data.get("endingId") or "—")
    nw      = fmt_nw(data.get("netWorth"))
    opt     = f"{data.get('optimalRate', '—')}%" if data.get("optimalRate") is not None else "—"
    calib   = f"{data.get('calibrationScore')}%" if data.get("calibrationScore") is not None else "—"
    blind   = "YES" if data.get("blindSpotFired") else "no"
    ripples = ", ".join(data.get("ripplesFired") or []) or "—"
    export  = "—"

    row = f"| {run_num} | {date} | {mode} | {seed} | {ending} | {nw} | {opt} | {calib} | {blind} | {ripples} | {export} |"

    # Find the table in the content and locate where to insert the new row
    # Strategy: find the header, skip the separator row (|---|), then walk lines
    # until a blank line or end-of-table is found; insert just before that point.
    idx = content.find(TABLE_HEADER)
    lines_after = content[idx:].split("\n")

    # Walk to find insertion point: after all existing data rows (non-empty, start with |)
    insert_line_offset = 0
    in_table = False
    for i, line in enumerate(lines_after):
        stripped = line.strip()
        if i == 0:
            in_table = True
            insert_line_offset = i + 1
            continue
        if not in_table:
            break
        if stripped.startswith("|"):
            insert_line_offset = i + 1  # keep advancing past each table row
        elif stripped == "" and insert_line_offset > 1:
            # blank line after table rows — insert here
            break
        # if separator-only row (|---|---|), it still starts with | so we advance past it

    # Reconstruct: split at the insertion point relative to the table start
    before_table = content[:idx]
    table_lines  = lines_after[:insert_line_offset]
    after_table  = lines_after[insert_line_offset:]

    new_content = before_table + "\n".join(table_lines) + "\n" + row + "\n" + "\n".join(after_table)
    VAULT_FILE.write_text(new_content, encoding="utf-8")
    print(f"[OK] Run #{run_num} appended → {VAULT_FILE.name}  |  {ending} · {nw} · opt:{opt} · calib:{calib} · blind:{blind}")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/finbot-result":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)

        try:
            data = json.loads(body)
            append_row(data)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        except Exception as e:
            print(f"[ERR] {e}")
            self.send_response(500)
            self.end_headers()

    def do_OPTIONS(self):
        # CORS preflight — browser may send this before POST
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, fmt, *args):
        # Suppress default per-request access log noise; we print our own
        pass


if __name__ == "__main__":
    server = HTTPServer(("localhost", PORT), Handler)
    print(f"FINBOT webhook listening on localhost:{PORT}")
    print(f"Vault: {VAULT_FILE}")
    print(f"Table header expected: {TABLE_HEADER!r}")
    print("Ctrl+C to stop\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
