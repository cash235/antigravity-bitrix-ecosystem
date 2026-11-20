#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.gemini/config/plugins/antigravity-bitrix-qa"

mkdir -p "$(dirname "${TARGET_DIR}")"
rm -rf "${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"

for item in plugin.json README.md LICENSE assets rules skills agents scripts; do
  if [ -e "${SOURCE_DIR}/${item}" ]; then
    cp -R "${SOURCE_DIR}/${item}" "${TARGET_DIR}/"
  fi
done

echo "Installed antigravity-bitrix-qa to ${TARGET_DIR}"
echo "Enable it in Antigravity -> Customizations if needed."
