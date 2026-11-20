#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash ./init-bitrix-project.sh <target-dir> [--profile full|store|corporate|minimal] [--name \"Project\"] [--update-plugins] [--update-config] [--force] [--dry-run]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLOBAL_ROOT="${HOME}/.gemini/config/plugins"

FORCE_UPDATE_PLUGINS=0
PASSTHROUGH=()
for arg in "$@"; do
  if [ "$arg" = "--update-plugins" ]; then
    FORCE_UPDATE_PLUGINS=1
  else
    PASSTHROUGH+=("$arg")
  fi
done

NEEDS_UPDATE=$FORCE_UPDATE_PLUGINS
if [ "$NEEDS_UPDATE" = "0" ] && command -v node >/dev/null 2>&1; then
  if ! node -e '
const fs = require("fs");
const path = require("path");
const [srcRoot, dstRoot] = process.argv.slice(1);
const list = ["antigravity-bitrix-core", "antigravity-bitrix-seo-geo", "antigravity-bitrix-qa", "antigravity-bitrix-marketing"];
for (const p of list) {
  const sf = path.join(srcRoot, p, "plugin.json");
  const df = path.join(dstRoot, p, "plugin.json");
  if (!fs.existsSync(df)) process.exit(2);
  const sv = JSON.parse(fs.readFileSync(sf, "utf8")).version || "0.0.0";
  const dv = JSON.parse(fs.readFileSync(df, "utf8")).version || "0.0.0";
  if (sv !== dv) process.exit(2);
}
' "$ROOT_DIR" "$GLOBAL_ROOT"; then
    NEEDS_UPDATE=1
  fi
fi

if [ "$NEEDS_UPDATE" = "1" ] && [ -f "${ROOT_DIR}/install-ecosystem.sh" ]; then
  echo "Installing/updating global 1C-Bitrix ecosystem..."
  bash "${ROOT_DIR}/install-ecosystem.sh"
fi

GLOBAL_SCRIPT="${GLOBAL_ROOT}/antigravity-bitrix-core/scripts/bitrix-bootstrap.mjs"
LOCAL_SCRIPT="${ROOT_DIR}/antigravity-bitrix-core/scripts/bitrix-bootstrap.mjs"
SCRIPT="$GLOBAL_SCRIPT"
[ -f "$SCRIPT" ] || SCRIPT="$LOCAL_SCRIPT"

node "$SCRIPT" "${PASSTHROUGH[@]}"
