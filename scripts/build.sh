#!/usr/bin/env bash
# ==============================================================================
# Build Script for Crispyroll
# Prepares static bundles and packages the application
# ==============================================================================

set -euo pipefail

# Directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "==> Preparing build directories..."
BUILD_DIR="${PROJECT_ROOT}/electron/static/build"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

echo "==> Copying application assets..."
cp "${PROJECT_ROOT}/index.html" "${BUILD_DIR}/"
cp -r "${PROJECT_ROOT}/assets" "${BUILD_DIR}/"
cp -r "${PROJECT_ROOT}/src" "${BUILD_DIR}/"

echo "==> Build preparation complete."
