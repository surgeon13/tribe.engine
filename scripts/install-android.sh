#!/usr/bin/env bash
# Tevel Tribe Engine — install on Android (Termux) or any Linux shell.
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/surgeon13/tribe.engine/master/scripts/install-android.sh | bash
#
# Or, after cloning:
#   bash scripts/install-android.sh

set -euo pipefail

REPO_URL="${TEVEL_REPO_URL:-https://github.com/surgeon13/tribe.engine.git}"
BRANCH="${TEVEL_BRANCH:-master}"
INSTALL_DIR="${TEVEL_INSTALL_DIR:-$HOME/tribe.engine}"
PORT="${PORT:-3456}"

info() { printf '[Tevel] %s\n' "$*"; }
warn() { printf '[Tevel] WARN: %s\n' "$*" >&2; }
die() { printf '[Tevel] ERROR: %s\n' "$*" >&2; exit 1; }

is_termux() {
  [[ -n "${TERMUX_VERSION:-}" ]] || [[ "${PREFIX:-}" == *com.termux* ]]
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_packages_termux() {
  info "Installing Termux packages (git, nodejs)…"
  pkg update -y
  pkg install -y git nodejs
}

install_packages_linux() {
  warn "Not running in Termux. Make sure git and node (v18+) are installed."
  need_cmd git || die "git is missing"
  need_cmd node || die "node is missing"
}

clone_or_update() {
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Updating existing install at $INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
  else
    info "Cloning $REPO_URL → $INSTALL_DIR"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
  fi
}

write_launcher() {
  local launcher="$HOME/bin/tevel"
  mkdir -p "$HOME/bin"
  cat >"$launcher" <<EOF
#!/usr/bin/env bash
cd "$INSTALL_DIR" || exit 1
export PORT=${PORT}
exec npm start
EOF
  chmod +x "$launcher"
  info "Created launcher: $launcher"
  if [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    warn 'Add $HOME/bin to your PATH, e.g.: echo export PATH="\$HOME/bin:\$PATH" >> ~/.bashrc'
  fi
}

main() {
  info "Tevel Tribe Engine — Android / shell installer"
  if is_termux; then
    install_packages_termux
  else
    install_packages_linux
  fi

  node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<18) process.exit(1)" \
    || die "Node.js 18+ required (found $(node -v 2>/dev/null || echo unknown))"

  clone_or_update
  cd "$INSTALL_DIR"
  info "Building tribe data…"
  npm run build:data
  write_launcher

  cat <<EOF

╔══════════════════════════════════════════════╗
║  Tevel installed successfully                ║
╚══════════════════════════════════════════════╝

Install folder : $INSTALL_DIR
Start command  : tevel
               : cd "$INSTALL_DIR" && npm start

Dashboard URL  : http://127.0.0.1:${PORT}
On your phone  : open that URL in Chrome (same device).

EOF
  if is_termux; then
    cat <<EOF
Termux tip     : termux-open-url http://127.0.0.1:${PORT}
Keep this tab  : leave the terminal session running while you use the dashboard.

EOF
  fi
}

main "$@"
