#!/usr/bin/env bash
# Stop psychiatry-ink Vite (5173) and API (3001), including Cursor background terminals.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

kill_port() {
  local port=$1
  if ! fuser "${port}/tcp" >/dev/null 2>&1; then
    return 0
  fi
  fuser -TERM -k "${port}/tcp" 2>/dev/null || true
  sleep 0.5
  fuser -KILL -k "${port}/tcp" 2>/dev/null || true
}

kill_port 5173
kill_port 3001

while read -r pid; do
  [[ -z "$pid" ]] && continue
  cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
  [[ "$cwd" == "$ROOT" ]] || continue
  kill -TERM "$pid" 2>/dev/null || true
done < <(pgrep -f "${ROOT}/node_modules/.bin/vite" 2>/dev/null || true)

while read -r pid; do
  [[ -z "$pid" ]] && continue
  cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
  [[ "$cwd" == "$ROOT" ]] || continue
  kill -TERM "$pid" 2>/dev/null || true
done < <(pgrep -f "${ROOT}/node_modules/.bin/tsx watch server/index.ts" 2>/dev/null || true)

sleep 0.5
