#!/usr/bin/env bash
# Tevel Tribe Engine launcher (Android Termux / Linux / macOS)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "[Tevel] Node.js is required."
  if [[ -n "${TERMUX_VERSION:-}" ]]; then
    echo "[Tevel] In Termux run: pkg install nodejs git"
  else
    echo "[Tevel] Install Node.js 18+ from https://nodejs.org/"
  fi
  exit 1
fi

exec node applet/launch.js
