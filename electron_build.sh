#!/usr/bin/env bash
# Legacy wrapper: forwards to scripts/build.sh
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${DIR}/scripts/build.sh" "$@"
