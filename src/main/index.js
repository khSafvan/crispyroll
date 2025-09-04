/**
 * Main Process Entry Point for Crispyroll
 */

const path = require("path");
const electron = require("electron");
const { app, BrowserWindow, ipcMain } = electron;
const { handleGamepadButtonPress } = require("./gamepad");

const USER_AGENT =
  "Mozilla/5.0 (SMART-TV; LINUX; Tizen 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 TV Safari/537.36";

/**
 * Creates and initializes the primary application window.
 */
function createWindow() {
  const isFullScreen = process.env.FULL_SCREEN === "1";

  const windowPreferences = {
    title: "Crispyroll",
    width: 1920,
    height: 1080,
    minWidth: 1920,
    minHeight: 1080,
    fullscreen: isFullScreen,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      webSecurity: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  };

  const win = new BrowserWindow(windowPreferences);

  win.webContents.setUserAgent(USER_AGENT);

  const indexPath = path.join(__dirname, "../../index.html");
  win.loadFile(indexPath, {
    userAgent: USER_AGENT,
  });

  ipcMain.on("gamepadButtonPress", (_, buttonName) => {
    handleGamepadButtonPress(win, buttonName);
  });

  ipcMain.on("exitApp", () => {
    app.quit();
  });

  return win;
}

app.whenReady().then(async () => {
  if (electron.components) {
    await electron.components.whenReady();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
