/**
 * Gamepad Button Event Dispatcher (Electron Main Process)
 * Translates gamepad button names received over IPC into simulated keyboard input events.
 */

const BUTTON_KEY_MAP = {
  bButton: "escape",
  aButton: "enter",
  dPadDown: "down",
  dPadUp: "up",
  dPadLeft: "left",
  dPadRight: "right",
  up: "up",
  down: "down",
};

/**
 * Dispatches simulated key down and key up events to the given BrowserWindow webContents.
 *
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {string} keyCode
 */
function sendKeyEvent(mainWindow, keyCode) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.sendInputEvent({
    type: "keyDown",
    keyCode,
  });
  mainWindow.webContents.sendInputEvent({
    type: "keyUp",
    keyCode,
  });
}

/**
 * Handles gamepad button press IPC events.
 *
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {string} buttonName
 */
function handleGamepadButtonPress(mainWindow, buttonName) {
  const keyCode = BUTTON_KEY_MAP[buttonName];
  if (keyCode) {
    sendKeyEvent(mainWindow, keyCode);
  }
}

module.exports = {
  BUTTON_KEY_MAP,
  sendKeyEvent,
  handleGamepadButtonPress,
};
