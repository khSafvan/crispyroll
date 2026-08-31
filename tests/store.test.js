/**
 * Encrypted Configuration Store Unit Tests
 */

const assert = require("assert");
const fs = require("fs");

function testStoreModule() {
  console.log("Running Encrypted Store Tests...");

  const storeModule = require("../src/main/store");
  assert(storeModule, "store module should load");
  assert(typeof storeModule.get === "function", "store.get should be a function");
  assert(typeof storeModule.set === "function", "store.set should be a function");

  // Test set and get
  storeModule.set("uiPreferences.lastActiveTheme", "dark-crispy");
  const retrievedTheme = storeModule.get("uiPreferences.lastActiveTheme");
  assert.strictEqual(retrievedTheme, "dark-crispy", "should correctly store and retrieve values");

  // Verify file on disk is encrypted (ciphertext, not raw plaintext)
  if (fs.existsSync(storeModule.path)) {
    const rawFileContent = fs.readFileSync(storeModule.path, "utf8");
    assert(
      !rawFileContent.includes('"dark-crispy"'),
      "Disk contents should be encrypted, not raw JSON"
    );
  }

  console.log("✓ Encrypted Store tests passed!");
}

module.exports = { testStoreModule };
