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

echo "==> Building renderer bundles with ESBuild..."
node "${PROJECT_ROOT}/scripts/bundle.js"

echo "==> Packaging application with electron-builder..."
npx electron-builder "$@"

echo "==> Build complete."
