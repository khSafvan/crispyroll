#!/usr/bin/env python3
"""
Verification Script for Crispyroll Codebase
Validates JSON syntax, Shell syntax, file integrity, and HTML asset paths.
"""

import json
import os
import re
import subprocess
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def check_json_files():
    print("--> Checking JSON files...")
    json_files = [
        "package.json",
        ".eslintrc.json",
        ".prettierrc",
    ]
    for rel_path in json_files:
        full_path = os.path.join(PROJECT_ROOT, rel_path)
        if os.path.exists(full_path):
            with open(full_path, "r", encoding="utf-8") as f:
                try:
                    json.load(f)
                    print(f"  [OK] {rel_path}")
                except Exception as e:
                    print(f"  [FAIL] {rel_path}: {e}")
                    return False
    return True

def check_shell_scripts():
    print("--> Checking Shell scripts with 'bash -n'...")
    scripts = [
        "scripts/build.sh",
        "scripts/install.sh",
        "scripts/tag-release.sh",
        "scripts/generate-sources.sh",
        "install.sh",
        "electron_build.sh",
        "tag_release.sh",
        "flatpak/generate_sources.sh",
    ]
    for rel_path in scripts:
        full_path = os.path.join(PROJECT_ROOT, rel_path)
        if os.path.exists(full_path):
            res = subprocess.run(["bash", "-n", full_path], capture_output=True, text=True)
            if res.returncode == 0:
                print(f"  [OK] {rel_path}")
            else:
                print(f"  [FAIL] {rel_path}: {res.stderr}")
                return False
    return True

def check_html_links():
    print("--> Checking HTML script and stylesheet links...")
    index_html = os.path.join(PROJECT_ROOT, "index.html")
    with open(index_html, "r", encoding="utf-8") as f:
        content = f.read()

    # Find src="..." and href="..."
    links = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', content)
    success = True
    for link in links:
        if link.startswith("http") or link.startswith("data:"):
            continue
        target = os.path.join(PROJECT_ROOT, link)
        if os.path.exists(target):
            print(f"  [OK] {link}")
        else:
            print(f"  [FAIL] Link target does not exist: {link} -> {target}")
            success = False
    return success

def check_js_files_balance():
    print("--> Checking JavaScript syntax with 'node --check' (excluding vendor libs)...")
    all_ok = True
    for root, _, files in os.walk(os.path.join(PROJECT_ROOT, "src")):
        if "vendor" in root:
            continue
        for f in files:
            if f.endswith(".js"):
                path = os.path.join(root, f)
                rel = os.path.relpath(path, PROJECT_ROOT)
                res = subprocess.run(["node", "--check", path], capture_output=True, text=True)
                if res.returncode == 0:
                    print(f"  [OK] {rel}")
                else:
                    print(f"  [FAIL] {rel}: {res.stderr.strip()}")
                    all_ok = False
    return all_ok

def main():
    print("=========================================")
    print("Crispyroll Integrity Verification")
    print("=========================================")
    ok1 = check_json_files()
    ok2 = check_shell_scripts()
    ok3 = check_html_links()
    ok4 = check_js_files_balance()

    if ok1 and ok2 and ok3 and ok4:
        print("\n=========================================")
        print("All integrity checks PASSED successfully! 🎉")
        print("=========================================")
        sys.exit(0)
    else:
        print("\nIntegrity checks failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
