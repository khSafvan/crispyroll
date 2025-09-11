/**
 * Main Process Entry Point for Crispyroll
 */

const path = require("path");
const electron = require("electron");
const { app, BrowserWindow, ipcMain } = electron;
const { handleGamepadButtonPress } = require("./gamepad");
const { ensureWidevineCdm } = require("./widevine");

// Linux GPU, sandbox, and Wayland compatibility configuration
// Allow disabling GPU hardware acceleration via environment variable for headless, VM, or broken driver setups
if (process.env.DISABLE_GPU === "1" || process.env.CRISPYROLL_DISABLE_GPU === "1") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
} else {
  // Avoid GPU process sandbox launch failures on Linux drivers while preserving hardware acceleration
  app.commandLine.appendSwitch("disable-gpu-sandbox");
}

// Ozone platform / Wayland configuration
if (process.env.ENABLE_WAYLAND === "1" || process.env.OZONE_PLATFORM === "wayland") {
  app.commandLine.appendSwitch("enable-features", "UseOzonePlatform");
  app.commandLine.appendSwitch("ozone-platform", process.env.OZONE_PLATFORM || "wayland");
} else if (!process.env.OZONE_PLATFORM) {
  app.commandLine.appendSwitch("ozone-platform-hint", "auto");
}

// Pre-populate Widevine CDM from system locations if component directory is not yet populated
ensureWidevineCdm(app);

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
    try {
      await electron.components.whenReady();
    } catch (error) {
      console.warn("Warning: Failed to load/update Widevine CDM components:", error?.message || error);
    }
  }
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
