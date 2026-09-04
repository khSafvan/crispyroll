/**
 * Vanilla DOM Utilities & Architecture Unit Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testDomAndArchitecture() {
  console.log("Running Vanilla DOM & Bulma Integration Tests...");

  // 1. Verify Bulma assets exist
  const bulmaPath = path.resolve(__dirname, "../src/renderer/styles/vendor/bulma.min.css");
  const bulmaThemePath = path.resolve(__dirname, "../src/renderer/styles/bulma-theme.css");
  assert(fs.existsSync(bulmaPath), "bulma.min.css should exist in vendor directory");
  assert(fs.existsSync(bulmaThemePath), "bulma-theme.css should exist");

  const bulmaThemeContent = fs.readFileSync(bulmaThemePath, "utf8");
  assert(
    bulmaThemeContent.includes("--bulma-primary: var(--cr-orange)"),
    "bulma-theme should bind primary color to --cr-orange"
  );
  assert(
    bulmaThemeContent.includes("--bulma-scheme-main: var(--surface-base)"),
    "bulma-theme should bind main surface to --surface-base"
  );

  // 2. Verify all renderer screens parse without error
  const screensDir = path.resolve(__dirname, "../src/renderer/screens");
  const screenFiles = fs.readdirSync(screensDir).filter((f) => f.endsWith(".js"));
  assert(screenFiles.length >= 10, "Should have all screen files present");

  screenFiles.forEach((file) => {
    const fullPath = path.join(screensDir, file);
    const code = fs.readFileSync(fullPath, "utf8");
    assert.doesNotThrow(() => {
      new Function(code);
    }, `Screen ${file} should have valid JavaScript syntax`);
  });

  // 3. Verify bundled dom helpers logic
  const globalWindow = { document: { querySelectorAll: () => [], querySelector: () => null } };
  const bundleCode = fs.readFileSync(path.resolve(__dirname, "../src/renderer/bundle.js"), "utf8");
  const bundleFunc = new Function("window", "document", bundleCode);
  bundleFunc(globalWindow, globalWindow.document);

  assert(typeof globalWindow.$$ === "function", "window.$$ should be defined in bundle");
  assert(typeof globalWindow.$1 === "function", "window.$1 should be defined in bundle");
  assert(
    typeof globalWindow.delegate === "function",
    "window.delegate should be defined in bundle"
  );
  assert(
    typeof globalWindow.translate === "object",
    "window.translate should be defined in bundle"
  );
  // 4. Verify Flat Edge Sidebar Navigation with Reversed Corner Fillets
  const menuCss = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/styles/components/menu.css"),
    "utf8"
  );
  assert(
    menuCss.includes("#menu-screen") &&
      menuCss.includes("width: 84px") &&
      menuCss.includes(".menu-corner-top") &&
      menuCss.includes(".menu-bottom-exit"),
    "menu.css must implement Flat Edge Navigation with 84px rail width, reversed corner design, and rounded bottom exit button"
  );

  // 5. Verify Package Dependency Cleanliness (zero unused icon packages)
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
  const deadPackages = [
    "@carbon/icons",
    "@phosphor-icons/core",
    "@radix-ui/react-icons",
    "heroicons",
    "bulma",
  ];
  deadPackages.forEach((dep) => {
    assert(
      !pkgJson.dependencies || !pkgJson.dependencies[dep],
      `Unused package ${dep} must not be present in runtime dependencies`
    );
  });

  console.log("✓ Vanilla DOM & Bulma integration tests passed!");
}

module.exports = { testDomAndArchitecture };
