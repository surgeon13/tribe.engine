#!/usr/bin/env bash
# Remove a Tevel install on Android (Termux) or Linux shell.
# Usage:
#   bash scripts/uninstall-android.sh
#   TEVEL_INSTALL_DIR=~/tribe.engine bash scripts/uninstall-android.sh

set -euo pipefail

INSTALL_DIR="${TEVEL_INSTALL_DIR:-$HOME/tribe.engine}"
LAUNCHER="${HOME}/bin/tevel"

info() { printf '[Tevel] %s\n' "$*"; }
warn() { printf '[Tevel] WARN: %s\n' "$*" >&2; }

if [[ ! -e "$INSTALL_DIR" && ! -e "$LAUNCHER" ]]; then
  info "Nothing to remove (no install dir or launcher found)."
  exit 0
fi

if [[ -e "$INSTALL_DIR" ]]; then
  if [[ ! -d "$INSTALL_DIR" ]]; then
    warn "$INSTALL_DIR is a file, not a folder. Remove manually if needed."
  else
    info "Removing install folder: $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
  fi
fi

if [[ -e "$LAUNCHER" ]]; then
  info "Removing launcher: $LAUNCHER"
  rm -f "$LAUNCHER"
fi

info "Tevel uninstalled."
