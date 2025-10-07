/**
 * Unit tests for Keyboard Shortcut Mappings and Key Helpers
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testKeysModule() {
  console.log("Running Keyboard & Media Key Shortcut Tests...");

  // Mock global window object
  global.window = {};
  const keysFilePath = path.join(__dirname, "../src/renderer/keys.js");
  const keysCode = fs.readFileSync(keysFilePath, "utf8");
  eval(keysCode);

  const { tvKey } = global.window;
  assert(tvKey, "window.tvKey must be defined");

  // Verify core navigation keys
  assert.strictEqual(tvKey.KEY_ENTER, 13, "Enter key must be 13");
  assert.strictEqual(tvKey.KEY_ESCAPE, 27, "Escape key must be 27");
  assert.strictEqual(tvKey.KEY_LEFT, 37, "Left arrow must be 37");
  assert.strictEqual(tvKey.KEY_UP, 38, "Up arrow must be 38");
  assert.strictEqual(tvKey.KEY_RIGHT, 39, "Right arrow must be 39");
  assert.strictEqual(tvKey.KEY_DOWN, 40, "Down arrow must be 40");

  // Verify desktop media and shortcut keys
  assert.strictEqual(tvKey.KEY_SPACE, 32, "Space key must be 32");
  assert.strictEqual(tvKey.KEY_TAB, 9, "Tab key must be 9");
  assert.strictEqual(tvKey.KEY_F, 70, "F key (fullscreen) must be 70");
  assert.strictEqual(tvKey.KEY_J, 74, "J key (seek -10s) must be 74");
  assert.strictEqual(tvKey.KEY_K, 75, "K key (play/pause) must be 75");
  assert.strictEqual(tvKey.KEY_L, 76, "L key (seek +10s) must be 76");
  assert.strictEqual(tvKey.KEY_M, 77, "M key (mute) must be 77");
  assert.strictEqual(tvKey.KEY_F11, 122, "F11 key must be 122");

  // Verify helpers
  assert.strictEqual(tvKey.IS_KEY_BACK(27), 27, "Escape must be recognized as back");
  assert.strictEqual(tvKey.IS_KEY_BACK(10009), 10009, "TV back key must be recognized");
  assert.strictEqual(tvKey.IS_KEY_BACK(999), -1, "Unknown key should not match back");

  assert.strictEqual(tvKey.IS_KEY_ENTER(13), true, "Enter (13) must match IS_KEY_ENTER");
  assert.strictEqual(tvKey.IS_KEY_ENTER(32), true, "Space (32) must match IS_KEY_ENTER");
  assert.strictEqual(tvKey.IS_KEY_ENTER(999), false, "Unknown key should not match IS_KEY_ENTER");

  console.log("✓ Keyboard & Media Key shortcut tests passed!");
}

module.exports = { testKeysModule };
