/**
 * Main Process Entry Point for Crispyroll (Linux HTPC Client)
 */

const path = require("path");
const electron = require("electron");
const { app, BrowserWindow, ipcMain } = electron;
const log = require("electron-log/main");
const unhandled = require("electron-unhandled");
const store = require("./store");
const { handleGamepadButtonPress } = require("./gamepad");
const { ensureWidevineCdm } = require("./widevine");

// Initialize electron-log for main and renderer IPC bridge
log.initialize({ preload: true });
log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs/main.log");
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB rotating file
log.info("Starting Crispyroll Main Process...");

// Catch uncaught exceptions and unhandled promise rejections
unhandled({
  logger: (error) => {
    log.error("Unhandled Exception / Promise Rejection:", error);
  },
  showDialog: true,
});

// Linux process, sandbox, and GPU flags for kernel compatibility
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("no-zygote");

// Allow disabling GPU hardware acceleration via environment variable for headless, VM, or broken driver setups
if (process.env.DISABLE_GPU === "1" || process.env.CRISPYROLL_DISABLE_GPU === "1") {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
} else {
  // Avoid GPU process sandbox launch failures on Linux drivers while preserving hardware acceleration
  app.commandLine.appendSwitch("disable-gpu-sandbox");
}

// Ozone platform / Wayland configuration
// Suppress Wayland color management protocol handshake errors while keeping native Wayland rendering
app.commandLine.appendSwitch(
  "disable-features",
  "WaylandColorManagement,WaylandColorManagerV1,WaylandColorManager"
);

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
  const { screen } = electron;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const savedBounds = store.get("windowBounds", { width: 1920, height: 1080 });
  const windowWidth = Math.min(savedBounds.width || 1920, screenWidth);
  const windowHeight = Math.min(savedBounds.height || 1080, screenHeight);

  const windowPreferences = {
    title: "Crispyroll",
    width: windowWidth,
    height: windowHeight,
    minWidth: 800,
    minHeight: 480,
    resizable: true,
    fullscreen: isFullScreen,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: false,
      webSecurity: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  };

  const win = new BrowserWindow(windowPreferences);

  win.webContents.setUserAgent(USER_AGENT);

  win.once("ready-to-show", () => {
    win.show();
  });

  win.on("resize", () => {
    if (!win.isFullScreen()) {
      const bounds = win.getBounds();
      store.set("windowBounds", {
        width: bounds.width,
        height: bounds.height,
        isFullScreen: false,
      });
    }
  });

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

  ipcMain.on("toggleFullScreen", () => {
    win.setFullScreen(!win.isFullScreen());
  });

  ipcMain.on("openExternal", (_, url) => {
    if (url && typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))) {
      electron.shell.openExternal(url);
    }
  });

  return win;
}

app.whenReady().then(async () => {
  if (electron.components) {
    try {
      await electron.components.whenReady();
      log.info("Widevine CDM component successfully initialized by CastLabs Electron.");
    } catch (error) {
      log.warn("Warning: Failed to load/update Widevine CDM components:", error?.message || error);
    }
  }
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
