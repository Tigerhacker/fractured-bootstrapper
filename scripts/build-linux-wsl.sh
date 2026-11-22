#!/usr/bin/env bash
# Builds the Linux packages (AppImage, deb, rpm) inside WSL and copies them to <repo>/dist/linux.
# Normally started from Windows by build-linux-wsl.ps1 (npm run build:linux:wsl).
#
#   build-linux-wsl.sh <repo path as seen from WSL> [--clean]
#
# The repo is copied to ~/fsb-build on the Linux filesystem first: building on /mnt/c is very slow
# and the Windows node_modules contains the Windows Electron. node_modules in ~/fsb-build is kept
# between runs unless --clean is given. Node 22 is installed to ~/.local/node22 if missing.
set -euo pipefail

SRC="${1:?usage: build-linux-wsl.sh <repo path> [--clean]}"
CLEAN="${2:-}"
WORK="$HOME/fsb-build"
NODE_DIR="$HOME/.local/node22"
OUT="$SRC/dist/linux"

# Don't pick up the Windows node/npm that WSL puts on PATH
export PATH="$NODE_DIR/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

step() { printf '\n==> %s\n' "$*"; }

[ -f "$SRC/package.json" ] || { echo "Not the repo folder: $SRC" >&2; exit 1; }

if ! command -v rpmbuild >/dev/null; then
    echo "rpmbuild is missing (needed for the .rpm). Install it with: sudo apt-get install -y rpm" >&2
    exit 1
fi

if [ ! -x "$NODE_DIR/bin/node" ]; then
    step "Installing Node 22 to $NODE_DIR"
    base=https://nodejs.org/dist/latest-v22.x
    tmp=$(mktemp -d)
    curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/sums.txt"
    tarball=$(grep -o 'node-v22[^ ]*-linux-x64\.tar\.xz' "$tmp/sums.txt" | head -1)
    curl -fsSL "$base/$tarball" -o "$tmp/$tarball"
    (cd "$tmp" && grep " $tarball\$" sums.txt | sha256sum -c -)
    mkdir -p "$NODE_DIR"
    tar -xJf "$tmp/$tarball" -C "$NODE_DIR" --strip-components=1
    rm -rf "$tmp"
fi
echo "node $(node --version), npm $(npm --version)"

step "Copying sources to $WORK"
mkdir -p "$WORK"
if [ "$CLEAN" = "--clean" ]; then
    rm -rf "$WORK"/{*,.[!.]*} 2>/dev/null || true
else
    find "$WORK" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
fi
(cd "$SRC" && tar --exclude=./node_modules --exclude=./dist --exclude=./.git --exclude=./.claude -cf - .) \
    | tar -xf - -C "$WORK"

cd "$WORK"
step "npm install"
npm install --no-audit --no-fund

step "electron-builder --linux"
npx electron-builder build --linux --publish never

step "Copying packages to $OUT"
mkdir -p "$OUT"
rm -f "$OUT"/FracturedSpaceBootstrapper-* "$OUT"/latest-linux.yml
cp dist/FracturedSpaceBootstrapper-*.AppImage dist/FracturedSpaceBootstrapper-*.deb \
   dist/FracturedSpaceBootstrapper-*.rpm dist/latest-linux.yml "$OUT"/

step "Done: version $(node -p 'require("./package.json").version')"
(cd "$OUT" && ls -l && sha256sum FracturedSpaceBootstrapper-*)
