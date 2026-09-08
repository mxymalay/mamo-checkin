#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output_directory="$project_root/build"
output_binary="$output_directory/attendance-ocr"

mkdir -p "$output_directory"
temporary_directory=$(mktemp -d "$output_directory/native-build.XXXXXX")
trap 'rm -rf "$temporary_directory"' EXIT HUP INT TERM
for architecture in arm64 x86_64; do
xcrun swiftc \
  -O \
  -target "$architecture-apple-macos12.0" \
  -framework CoreGraphics \
  -framework Foundation \
  -framework ImageIO \
  -framework Vision \
  "$project_root/native/ocr.swift" \
  -o "$temporary_directory/$architecture"
done
xcrun lipo -create "$temporary_directory/arm64" "$temporary_directory/x86_64" -output "$temporary_directory/attendance-ocr"
codesign --force --sign - "$temporary_directory/attendance-ocr"
mv "$temporary_directory/attendance-ocr" "$output_binary"
chmod 0755 "$output_binary" "$project_root/native/host.py"
printf '%s\n' "$output_binary"
