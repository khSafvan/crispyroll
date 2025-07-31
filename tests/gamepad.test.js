/**
 * Gamepad Button Mapping Unit Tests
 */

const assert = require("assert");
const { BUTTON_KEY_MAP, handleGamepadButtonPress } = require("../src/main/gamepad");

function testGamepadMappings() {
  console.log("Running Gamepad Mapping Tests...");

  // Verify key mappings
  assert.strictEqual(BUTTON_KEY_MAP.aButton, "enter", "aButton must map to enter");
  assert.strictEqual(BUTTON_KEY_MAP.bButton, "escape", "bButton must map to escape");
  assert.strictEqual(BUTTON_KEY_MAP.dPadUp, "up", "dPadUp must map to up");
  assert.strictEqual(BUTTON_KEY_MAP.dPadDown, "down", "dPadDown must map to down");
  assert.strictEqual(BUTTON_KEY_MAP.dPadLeft, "left", "dPadLeft must map to left");
  assert.strictEqual(BUTTON_KEY_MAP.dPadRight, "right", "dPadRight must map to right");
  assert.strictEqual(BUTTON_KEY_MAP.up, "up", "up must map to up");
  assert.strictEqual(BUTTON_KEY_MAP.down, "down", "down must map to down");

  // Verify simulated event dispatching
  const sentEvents = [];
  const mockWindow = {
    isDestroyed: () => false,
    webContents: {
      sendInputEvent: (evt) => sentEvents.push(evt),
    },
  };

  handleGamepadButtonPress(mockWindow, "aButton");
  assert.strictEqual(sentEvents.length, 2, "Expected 2 events (keyDown and keyUp)");
  assert.strictEqual(sentEvents[0].type, "keyDown");
  assert.strictEqual(sentEvents[0].keyCode, "enter");
  assert.strictEqual(sentEvents[1].type, "keyUp");
  assert.strictEqual(sentEvents[1].keyCode, "enter", "keyUp must be enter, not space");

  console.log("✓ Gamepad mapping tests passed!");
}

module.exports = { testGamepadMappings };
