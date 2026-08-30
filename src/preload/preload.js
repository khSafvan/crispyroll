/**
 * Preload Script (Electron Context Bridge)
 * Safely exposes gamepad IPC and application lifecycle helpers to the renderer world.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronUtilsRender", {
  /**
   * Sends a gamepad button press event name to the main process.
   * @param {string} buttonName
   */
  gamepadButtonPress: (buttonName) => {
    ipcRenderer.send("gamepadButtonPress", buttonName);
  },

  /**
   * Requests application exit.
   */
  exitApp: () => {
    ipcRenderer.send("exitApp");
  },

  /**
   * Toggles fullscreen state.
   */
  toggleFullScreen: () => {
    ipcRenderer.send("toggleFullScreen");
  },
});
