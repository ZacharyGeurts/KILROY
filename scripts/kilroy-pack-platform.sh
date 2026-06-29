#!/usr/bin/env bash
# Pack KILROY per-platform binaries using Grok16 g16 cross toolchain.
# Usage: ./scripts/kilroy-pack-platform.sh [version] [--all]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SG_ROOT="${SG_ROOT:-$(cd "$ROOT/.." && pwd)}"
GROK16_ROOT="${GROK16_ROOT:-$SG_ROOT/Grok16}"
VERSION="${1:-1.0.0}"
DIST="$ROOT/dist"
STAGE="$DIST/kilroy-${VERSION}"
G16="${G16_PREFIX:-$GROK16_ROOT}/bin/g16"

log() { printf '[%s] kilroy-pack %s\n' "$(date +%H:%M:%S)" "$*"; }

build_userspace() {
  local plat="$1" prefix="${2:-}" outdir="$3"
  mkdir -p "$outdir/bin"
  local cc_args=(-std=gnu17 -O2 -static)
  if [[ -n "$prefix" ]]; then
    export G16_CROSS_PREFIX="$prefix"
  fi
  if [[ ! -x "$G16" ]]; then
    log "WARN g16 missing — skip $plat userspace"
    return 0
  fi
  for src in kilroy-status kilroy-ioctl-test; do
    local cpath="$ROOT/userspace/${src}/${src}.c"
    [[ -f "$cpath" ]] || continue
    if [[ -n "$prefix" ]] && ! command -v "${prefix}gcc" >/dev/null 2>&1; then
      log "WARN ${prefix}gcc missing — $plat $src source-only"
      cp "$cpath" "$outdir/bin/${src}.c"
      continue
    fi
    if [[ -n "$prefix" ]]; then
      "${prefix}gcc" "${cc_args[@]}" -o "$outdir/bin/$src" "$cpath" 2>/dev/null && \
        log "built $plat/$src (${prefix}gcc)" || \
        log "WARN cross build failed $plat/$src"
    else
      "$G16" "${cc_args[@]}" -o "$outdir/bin/$src" "$cpath" 2>/dev/null && \
        log "built $plat/$src (g16)" || \
        log "WARN native build failed $plat/$src"
    fi
  done
}

pack_platform() {
  local id="$1" prefix="${2:-}"
  local pdir="$STAGE/platforms/$id"
  mkdir -p "$pdir"
  build_userspace "$id" "$prefix" "$pdir"
  if [[ "$id" == "linux-gnu-x86_64" ]]; then
    [[ -f "$ROOT/build/bzImage" ]] && cp "$ROOT/build/bzImage" "$pdir/"
    [[ -f "$ROOT/build/initramfs.cpio.gz" ]] && cp "$ROOT/build/initramfs.cpio.gz" "$pdir/"
    [[ -f "$ROOT/build/grok-kilroy.iso" ]] && cp "$ROOT/build/grok-kilroy.iso" "$pdir/" || true
    mkdir -p "$pdir/boot/grok"
    cp -a "$ROOT/boot/grok/vendor/limine/"*.EFI "$pdir/boot/grok/" 2>/dev/null || true
    [[ -f "$ROOT/rootfs/production-staging/boot/kilroy/bzImage" ]] && \
      cp "$ROOT/rootfs/production-staging/boot/kilroy/bzImage" "$pdir/bzImage-staged" 2>/dev/null || true
  fi
  if [[ "$id" == *"riscv"* || "$id" == *"aarch64"* || "$id" == *"arm"* ]]; then
    mkdir -p "$pdir/boot/grok"
    for efi in BOOTAA64.EFI BOOTRISCV64.EFI BOOTIA32.EFI; do
      [[ -f "$ROOT/boot/grok/vendor/limine/$efi" ]] && cp "$ROOT/boot/grok/vendor/limine/$efi" "$pdir/boot/grok/"
    done
  fi
  (cd "$STAGE/platforms" && tar -czf "$DIST/kilroy-${VERSION}-${id}.tar.gz" "$id")
  log "wrote kilroy-${VERSION}-${id}.tar.gz"
}

main() {
  log "pack KILROY ${VERSION} platforms"
  rm -rf "$STAGE"
  mkdir -p "$STAGE/platforms"
  cp "$ROOT/data/kilroy-platform-release.json" "$STAGE/"
  cp "$ROOT/data/kilroy-version.json" "$STAGE/"
  pack_platform linux-gnu-x86_64 ""
  pack_platform linux-gnu-i386 "i686-linux-gnu-"
  pack_platform linux-gnu-aarch64 "aarch64-linux-gnu-"
  pack_platform linux-gnu-arm "arm-linux-gnueabihf-"
  pack_platform linux-gnu-riscv64 "riscv64-linux-gnu-"
  pack_platform bare-elf-x86_64 ""
  pack_platform bare-elf-aarch64 "aarch64-linux-gnu-"
  pack_platform bare-elf-riscv64 "riscv64-linux-gnu-"
  log "platform pack complete → $DIST"
}

main