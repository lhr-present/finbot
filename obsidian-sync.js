#!/usr/bin/env node
// FINBOT-9000 · Obsidian Sync Server
// Listens on :3001, appends session results to your vault's FINBOT-9000.md
//
// Usage:
//   node obsidian-sync.js [path-to-vault-file]
//   node obsidian-sync.js ~/Obsidian/FINBOT-9000.md
//
// The game POSTs to http://localhost:3001/session after each run.
// If this server isn't running, the game silently skips — no error shown.

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 3001;
const DEFAULT_VAULT = path.join(
  process.env.HOME,
  "Obsidian",
  "FINBOT-9000.md"
);
const VAULT_FILE = process.argv[2]
  ? path.resolve(process.argv[2])
  : DEFAULT_VAULT;

// ─── Row builder ─────────────────────────────────────────────────────────────
function buildRow(data) {
  const {
    callsign = "---",
    netWorth = 0,
    archetype = "?",
    grade = "?",
    optimalRate = 0,
    worstBias = "-",
    totalRounds = 0,
    difficulty = "-",
    date = new Date().toLocaleDateString(),
    notes = "",
  } = data;

  const worth = `$${Math.round(netWorth).toLocaleString()}`;
  const opt = `${Math.round(optimalRate * 100)}%`;
  return `| ${date} | ${callsign} | ${archetype} [${grade}] | ${worth} | ${opt} | ${worstBias} | ${difficulty} | ${notes} |\n`;
}

// ─── Find and insert row in the Session Log table ────────────────────────────
function appendToVault(row) {
  if (!fs.existsSync(VAULT_FILE)) {
    console.warn(`[finbot-sync] Vault file not found: ${VAULT_FILE}`);
    console.warn(`[finbot-sync] Would have written: ${row.trim()}`);
    return;
  }

  let content = fs.readFileSync(VAULT_FILE, "utf8");

  // Find the SESSION LOG table header and insert after the header row + separator
  // Looks for: | # | Date | ... (table row with #1 placeholder or existing rows)
  const tableHeaderPattern = /(\|\s*#\s*\|\s*Date\s*\|[^\n]*\n\|[-| ]+\|[^\n]*\n)/;
  if (tableHeaderPattern.test(content)) {
    content = content.replace(
      tableHeaderPattern,
      `$1${row}`
    );
    fs.writeFileSync(VAULT_FILE, content, "utf8");
    console.log(`[finbot-sync] ✓ Appended session to ${VAULT_FILE}`);
  } else {
    // Fallback: append to end of file under a new section
    const fallback = `\n\n## Auto-Logged Sessions\n| Date | Callsign | Archetype | Net Worth | Opt% | Worst Bias | Difficulty | Notes |\n|---|---|---|---|---|---|---|---|\n${row}`;
    fs.appendFileSync(VAULT_FILE, fallback, "utf8");
    console.log(`[finbot-sync] ✓ Appended new session log section to ${VAULT_FILE}`);
  }

  // Also update MEMORY index date line if present
  content = fs.readFileSync(VAULT_FILE, "utf8");
  const dateStamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  content = content.replace(
    /Last sync:.*$/m,
    `Last sync: ${dateStamp} · Status: ACTIVE`
  );
  fs.writeFileSync(VAULT_FILE, content, "utf8");
}

// ─── HTTP server ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS headers — allow the Vite dev server
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/session") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        console.log(`[finbot-sync] Received: ${data.callsign} · ${data.archetype} · $${data.netWorth}`);
        appendToVault(buildRow(data));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error("[finbot-sync] Parse error:", e.message);
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, vault: VAULT_FILE }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n┌─────────────────────────────────────────────┐`);
  console.log(`│  FINBOT-9000 · Obsidian Sync Server         │`);
  console.log(`│  Listening on http://localhost:${PORT}          │`);
  console.log(`│  Vault: ${VAULT_FILE.slice(-36).padEnd(36)} │`);
  console.log(`└─────────────────────────────────────────────┘\n`);
  console.log(`Health check: curl http://localhost:${PORT}/health`);
  console.log(`Game POSTs to: http://localhost:${PORT}/session\n`);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`[finbot-sync] Port ${PORT} already in use. Kill the existing process first.`);
  } else {
    console.error("[finbot-sync] Server error:", e.message);
  }
  process.exit(1);
});
