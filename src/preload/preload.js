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
  quitApp: () => {
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
  getTrackerStatus: (provider = "anilist", profileId = null) =>
    ipcRenderer.invoke("tracker:getStatus", provider, profileId),
  startAniListAuth: (clientId, profileId = null) =>
    ipcRenderer.invoke("tracker:startAniListAuth", clientId, profileId),
  disconnectTracker: (provider = "anilist", profileId = null) =>
    ipcRenderer.invoke("tracker:disconnect", provider, profileId),
  saveTrackerMapping: (provider, seriesId, mediaId, profileId = null) =>
    ipcRenderer.invoke("tracker:saveMapping", provider, seriesId, mediaId, profileId),
  getTrackerMapping: (provider, seriesId, profileId = null) =>
    ipcRenderer.invoke("tracker:getMapping", provider, seriesId, profileId),

  /**
   * Local-first merged catalog cache IPC methods.
   */
  getCachedCatalog: () => ipcRenderer.invoke("catalog:get"),
  refreshCatalog: (token = null) => ipcRenderer.invoke("catalog:refresh", token),
});
