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

  /**
   * Safely opens an external URL in the system's default browser.
   * @param {string} url
   */
  openExternal: (url) => {
    ipcRenderer.send("openExternal", url);
  },

  /**
   * General persistent store getters and setters.
   */
  getStoreValue: (key, defaultValue) => ipcRenderer.invoke("store:get", key, defaultValue),
  setStoreValue: (key, value) => ipcRenderer.invoke("store:set", key, value),

  /**
   * Scrobbling and tracking sync IPC methods.
   */
  getTrackerStatus: (provider = "anilist") => ipcRenderer.invoke("tracker:getStatus", provider),
  startAniListAuth: (clientId) => ipcRenderer.invoke("tracker:startAniListAuth", clientId),
  disconnectTracker: (provider = "anilist") => ipcRenderer.invoke("tracker:disconnect", provider),
  saveTrackerMapping: (provider, seriesId, mediaId) =>
    ipcRenderer.invoke("tracker:saveMapping", provider, seriesId, mediaId),
  getTrackerMapping: (provider, seriesId) =>
    ipcRenderer.invoke("tracker:getMapping", provider, seriesId),
});
