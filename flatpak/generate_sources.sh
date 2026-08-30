#!/usr/bin/env bash
# Legacy wrapper: forwards to scripts/generate-sources.sh
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${DIR}/../scripts/generate-sources.sh" "$@"