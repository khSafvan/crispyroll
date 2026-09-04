# ==============================================================================
# Crispyroll - Linux HTPC Client for Crunchyroll
# Canonical Developer Workflow Automation
# ==============================================================================

.PHONY: help setup dev start bundle test lint format verify build build-dir clean

SHELL := /bin/bash

help:
	@echo "Crispyroll Developer Commands:"
	@echo "  make setup       Install dependencies, build bundles, and verify environment"
	@echo "  make dev         Launch hot-reloading development server (with auto-bundle)"
	@echo "  make start       Launch Electron application"
	@echo "  make bundle      Compile renderer ES modules using ESBuild"
	@echo "  make test        Execute all 19 automated unit test suites"
	@echo "  make lint        Run ESLint code quality checks"
	@echo "  make format      Auto-format code using Prettier"
	@echo "  make verify      Run full codebase syntax and link integrity checks"
	@echo "  make build       Build Linux AppImage package"
	@echo "  make build-dir   Build unpacked Linux x64 binary directory"
	@echo "  make clean       Remove build artifacts, caches, and temporary files"

setup:
	@echo "==> Setting up Crispyroll development environment..."
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example"; fi
	npm install
	npm run bundle
	node tests/run-tests.js
	python3 scripts/verify.py
	@echo "==> Setup complete! Run 'make dev' to start developing."

bundle:
	npm run bundle

dev: bundle
	npm run dev

start: bundle
	npm start

test:
	npm test

lint:
	npm run lint

format:
	npm run format

verify:
	python3 scripts/verify.py

build: bundle
	npm run build

build-dir: bundle
	npm run build:dir

clean:
	@echo "==> Cleaning build artifacts and temporary files..."
	rm -rf dist/
	rm -rf electron/static/build/
	rm -f src/renderer/bundle.js.map
	@echo "==> Clean complete."
