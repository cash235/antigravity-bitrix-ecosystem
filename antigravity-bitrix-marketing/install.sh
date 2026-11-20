#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.gemini/config/plugins/antigravity-bitrix-marketing"

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

for item in plugin.json README.md LICENSE assets rules skills agents; do
  if [ -e "${SOURCE_DIR}/${item}" ]; then
    cp -R "${SOURCE_DIR}/${item}" "${TARGET_DIR}/${item}"
  fi
done

echo "Installed antigravity-bitrix-marketing to ${TARGET_DIR}"
echo "Enable it in Antigravity -> Customizations if needed."
