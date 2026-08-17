#!/bin/bash
set -euo pipefail

# tribe.engine has zero npm dependencies (pure Node.js stdlib) — no lockfile,
# no node_modules, nothing to install. This hook just confirms the Node
# toolchain the project needs is present so `npm run validate:*` /
# `npm run build:data` work right away in the session.

if ! command -v node >/dev/null 2>&1; then
  echo "node not found on PATH — tribe.engine requires Node.js (see package.json)" >&2
  exit 1
fi

echo "Node $(node --version) ready — tribe.engine has no dependencies to install."
