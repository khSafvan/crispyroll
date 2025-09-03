#!/usr/bin/env bash
# ==============================================================================
# Installer Script for Crispyroll (via GearLever)
# Downloads the latest release AppImage and installs via Flatpak GearLever
# ==============================================================================

set -euo pipefail

APP="crispyroll"
RELEASE_URL="https://api.github.com/repos/khSafvan/crispyroll/releases/latest"
DOWNLOAD_DIR="${HOME}/Downloads"

# Ensure script is not run with root permissions
if [[ "${EUID}" -eq 0 ]]; then
  echo "Error: Please do not run this script as root." >&2
  exit 1
fi

# Ensure dependencies exist
if ! command -v curl >/dev/null 2>&1; then
  echo "Error: 'curl' is required but not installed." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: 'jq' is required but not installed." >&2
  exit 1
fi

# Install GearLever flatpak if flatpak is available
if command -v flatpak >/dev/null 2>&1; then
  echo "==> Ensuring GearLever is installed via Flatpak..."
  flatpak install -v --system -y --noninteractive it.mijorus.gearlever >/dev/null 2>&1 || true
  echo "==> GearLever setup verified."
fi

echo "==> Fetching latest release info for ${APP}..."
DOWNLOAD_URL=$(curl -fsSL "${RELEASE_URL}" | jq -r '.assets[] | select(.name | test(".*AppImage")) | .browser_download_url' | head -n 1)

if [[ -z "${DOWNLOAD_URL}" || "${DOWNLOAD_URL}" == "null" ]]; then
  echo "Error: Failed to find AppImage download URL from GitHub release." >&2
  exit 1
fi

TARGET_FILE="${DOWNLOAD_DIR}/${APP}.AppImage"
mkdir -p "${DOWNLOAD_DIR}"

echo "==> Downloading ${APP} AppImage from ${DOWNLOAD_URL}..."
if command -v wget >/dev/null 2>&1; then
  wget -q --show-progress "${DOWNLOAD_URL}" -O "${TARGET_FILE}"
else
  curl -fL "${DOWNLOAD_URL}" -o "${TARGET_FILE}"
fi

chmod +x "${TARGET_FILE}"
echo "==> AppImage downloaded to ${TARGET_FILE}"

if command -v flatpak >/dev/null 2>&1 && flatpak info it.mijorus.gearlever >/dev/null 2>&1; then
  echo "==> Opening ${APP} with GearLever..."
  flatpak run it.mijorus.gearlever "${TARGET_FILE}" || true
else
  echo "==> GearLever flatpak not available; AppImage is executable and ready at ${TARGET_FILE}"
fi

echo "==> Installation complete."
