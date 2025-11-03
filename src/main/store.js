const electron = require("electron");
const Store = require("electron-store");

// Initialize IPC channels for renderer process access if in Electron main process
if (electron?.ipcMain && typeof Store.initRenderer === "function") {
  Store.initRenderer();
}

const store = new Store({
  name: "crispyroll-config",
  encryptionKey: "crispyroll-secure-store-key-v1",
  defaults: {
    windowBounds: {
      width: 1920,
      height: 1080,
      isFullScreen: false,
    },
    uiPreferences: {
      enableController: true,
      lastActiveTheme: "dark",
    },
  },
});

module.exports = store;
