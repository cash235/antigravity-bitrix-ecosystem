#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="${HOME}/.antigravity/extensions/bitrix-antigravity.antigravity-bitrix-command-center-1.0.0"

mkdir -p "$(dirname "${EXT_DIR}")"
rm -rf "${EXT_DIR}"
mkdir -p "${EXT_DIR}"

for item in package.json extension.js README.md assets; do
  if [ -e "${SOURCE_DIR}/${item}" ]; then
    cp -R "${SOURCE_DIR}/${item}" "${EXT_DIR}/"
  fi
done

echo "Installed 1C-Bitrix Command Center Activity Bar extension to ${EXT_DIR}"
echo "Reload Antigravity IDE window to see the 1C-Bitrix icon in the left Activity Bar."
