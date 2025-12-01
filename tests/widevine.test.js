/**
 * Unit Tests for Widevine CDM Helper
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { findSystemWidevineCdm, ensureWidevineCdm } = require("../src/main/widevine");

function testWidevineModule() {
  console.log("Running Widevine Module Tests...");

  // Test findSystemWidevineCdm function exports
  assert.strictEqual(
    typeof findSystemWidevineCdm,
    "function",
    "findSystemWidevineCdm should be a function"
  );
  assert.strictEqual(
    typeof ensureWidevineCdm,
    "function",
    "ensureWidevineCdm should be a function"
  );

  // Test findSystemWidevineCdm execution
  const cdm = findSystemWidevineCdm();
  if (cdm) {
    assert(cdm.cdmPath, "Discovered CDM should have cdmPath");
    assert(cdm.version, "Discovered CDM should have version string");
    assert(cdm.soPath, "Discovered CDM should have soPath");
    assert(fs.existsSync(cdm.soPath), "Discovered libwidevinecdm.so must exist on disk");
  }

  // Test ensureWidevineCdm with mock app object
  const tempUserData = path.join(os.tmpdir(), "crispyroll-test-userdata-" + Date.now());
  fs.mkdirSync(tempUserData, { recursive: true });

  const mockApp = {
    getPath: (name) => {
      if (name === "userData") return tempUserData;
      return "";
    },
  };

  ensureWidevineCdm(mockApp);

  if (cdm) {
    const targetWidevineDir = path.join(tempUserData, "WidevineCdm", cdm.version);
    assert(
      fs.existsSync(targetWidevineDir),
      "Target WidevineCdm version directory should be created"
    );
    assert(
      fs.existsSync(path.join(targetWidevineDir, "libwidevinecdm.so")) ||
        fs.existsSync(
          path.join(targetWidevineDir, "_platform_specific/linux_x64/libwidevinecdm.so")
        ),
      "Target WidevineCdm directory should contain libwidevinecdm.so"
    );
  }

  // Cleanup
  fs.rmSync(tempUserData, { recursive: true, force: true });

  console.log("✓ Widevine module tests passed!");
}

module.exports = { testWidevineModule };
