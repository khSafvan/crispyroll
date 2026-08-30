#!/usr/bin/env bash
# ==============================================================================
# Tag & Release Automation Script
# Bumps version in package.json, syncs lockfiles, creates git tag and pushes
# ==============================================================================

set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  echo "Error: Please do not run this script as root." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.1.7"
  exit 1
fi

NEW_TAG="$1"
# Strip leading 'v' if provided
NEW_TAG="${NEW_TAG#v}"

# Validate semantic version format (e.g. 1.2.3 or 1.2.3-beta.1)
if [[ ! "${NEW_TAG}" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: Invalid version format '${NEW_TAG}'. Expected semver (e.g. 1.1.7)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "==> Switching to master branch..."
git checkout master

echo "==> Updating version in package.json to ${NEW_TAG}..."
sed -i "s/\"version\": \"[0-9]\+\.[0-9]\+\.[0-9]\+\(-[a-zA-Z0-9.]\+\)\?\"/\"version\": \"${NEW_TAG}\"/" ./package.json

git add ./package.json

echo "==> Updating package locks if package managers are available..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --lockfile-only || pnpm install
  git add ./pnpm-lock.yaml 2>/dev/null || true
fi

if command -v npm >/dev/null 2>&1; then
  npm install --package-lock-only || npm install
  git add ./package-lock.json 2>/dev/null || true
fi

echo "==> Committing and tagging release v${NEW_TAG}..."
git commit -m "Release version ${NEW_TAG}"
git tag "v${NEW_TAG}"

echo "==> Pushing commit and tags to origin..."
git push
git push --tags

echo "==> Successfully released and tagged v${NEW_TAG}!"
