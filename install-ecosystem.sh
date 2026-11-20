#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGINS_ARG="${1:-core,seo-geo,qa,marketing}"
WITH_IDE_PANEL="${WITH_IDE_PANEL:-1}"

IFS=',' read -ra RAW_LIST <<< "$PLUGINS_ARG"
SELECTED=()

map_name() {
  case "$1" in
    core|antigravity-bitrix-core) echo "antigravity-bitrix-core" ;;
    seo-geo|seo|antigravity-bitrix-seo-geo) echo "antigravity-bitrix-seo-geo" ;;
    qa|antigravity-bitrix-qa) echo "antigravity-bitrix-qa" ;;
    marketing|cro|antigravity-bitrix-marketing) echo "antigravity-bitrix-marketing" ;;
    *) echo "" ;;
  esac
}

for item in "${RAW_LIST[@]}"; do
  mapped="$(map_name "$(echo "$item" | tr '[:upper:]' '[:lower:]' | xargs)")"
  if [ -n "$mapped" ]; then
    SELECTED+=("$mapped")
  fi
done

if [[ ! " ${SELECTED[*]} " =~ " antigravity-bitrix-core " ]]; then
  SELECTED=("antigravity-bitrix-core" "${SELECTED[@]}")
fi

echo "=== Installing 1C-Bitrix Antigravity Ecosystem ==="
for plugin in "${SELECTED[@]}"; do
  installer="${ROOT_DIR}/${plugin}/install.sh"
  if [ -f "$installer" ]; then
    echo "-> Installing ${plugin} ..."
    bash "$installer"
  fi
  if command -v node >/dev/null 2>&1 && [ -d "${ROOT_DIR}/${plugin}/scripts" ]; then
    for s in "${ROOT_DIR}/${plugin}/scripts"/*.mjs; do
      [ -e "$s" ] && node --check "$s"
    done
  fi
done

if [ "$WITH_IDE_PANEL" = "1" ] && [ -f "${ROOT_DIR}/antigravity-bitrix-ide-panel/install-ide-extension.sh" ]; then
  echo "-> Installing Antigravity IDE Activity Bar extension..."
  bash "${ROOT_DIR}/antigravity-bitrix-ide-panel/install-ide-extension.sh"
fi

echo "Done! Next: bash ./init-bitrix-project.sh <path-to-bitrix-project>"
