#!/usr/bin/env bash
# ==============================================================================
# Flatpak Node Sources Generator Script
# Generates flatpak-node-generator dependencies for offline Flatpak builds
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

LOCK_FILE="${PROJECT_ROOT}/package-lock.json"
OUTPUT="${PROJECT_ROOT}/flatpak/generated-sources.json"
VENV_DIR="${PROJECT_ROOT}/flatpak/venv"

echo "==> Project Root: ${PROJECT_ROOT}"
echo "==> Lockfile:     ${LOCK_FILE}"
echo "==> Output:       ${OUTPUT}"

if [[ ! -f "${LOCK_FILE}" ]]; then
  echo "Error: package-lock.json not found at ${LOCK_FILE}" >&2
  exit 1
fi

if ! command -v flatpak-node-generator >/dev/null 2>&1; then
  echo "flatpak-node-generator from https://github.com/flatpak/flatpak-builder-tools is required to generate the sources"

  if [[ -d "${VENV_DIR}" ]]; then
    echo "==> Activating existing virtual environment at ${VENV_DIR}..."
    # shellcheck disable=SC1091
    source "${VENV_DIR}/bin/activate"
  else
    echo "==> Creating new virtual environment at ${VENV_DIR}..."
    python3 -m venv --system-site-packages "${VENV_DIR}"
    # shellcheck disable=SC1091
    source "${VENV_DIR}/bin/activate"
    echo "==> Installing flatpak-builder-tools node generator..."
    pip install "git+https://github.com/flatpak/flatpak-builder-tools.git@refs/pull/382/head#subdirectory=node"
  fi
fi

echo "==> Running flatpak-node-generator..."
flatpak-node-generator npm "${LOCK_FILE}" -o "${OUTPUT}"

echo "==> Sources generated successfully at ${OUTPUT}"
