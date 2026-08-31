/**
 * Widevine CDM Manager for Crispyroll (Electron / Linux)
 * Locates, pre-populates, and configures the Widevine Content Decryption Module
 * for CastLabs Electron DRM media playback.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const log = require("electron-log/main");

/**
 * Searches system and browser directories for a usable Widevine CDM library.
 *
 * @returns {{ cdmPath: string, version: string, soPath: string } | null}
 */
function findSystemWidevineCdm() {
  const home = os.homedir();
  const candidateBaseDirs = [
    path.join(home, ".config/crispyroll/WidevineCdm"),
    path.join(home, ".config/Electron/WidevineCdm"),
    path.join(home, ".config/google-chrome/WidevineCdm"),
    path.join(home, ".config/chromium/WidevineCdm"),
    path.join(home, ".config/BraveSoftware/Brave-Browser/WidevineCdm"),
    "/opt/google/chrome/WidevineCdm",
    "/usr/lib/chromium/WidevineCdm",
    "/usr/lib/chromium-browser/WidevineCdm",
    "/var/lib/flatpak/app/com.google.Chrome/current/active/files/extra/WidevineCdm",
    "/var/lib/flatpak/app/org.chromium.Chromium/current/active/files/WidevineCdm",
  ];

  // Search Firefox profile directories
  const firefoxProfileRoots = [
    path.join(home, ".config/mozilla/firefox"),
    path.join(home, ".mozilla/firefox"),
  ];

  for (const root of firefoxProfileRoots) {
    if (fs.existsSync(root)) {
      try {
        const profiles = fs.readdirSync(root);
        for (const profile of profiles) {
          const gmpDir = path.join(root, profile, "gmp-widevinecdm");
          if (fs.existsSync(gmpDir)) {
            candidateBaseDirs.push(gmpDir);
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  for (const baseDir of candidateBaseDirs) {
    if (!fs.existsSync(baseDir)) continue;
    try {
      // Check direct directory
      const directSo = path.join(baseDir, "libwidevinecdm.so");
      if (fs.existsSync(directSo)) {
        return { cdmPath: baseDir, version: "4.10.3050.0", soPath: directSo };
      }

      // Check version subdirectories
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(baseDir, entry.name);
          const directSubSo = path.join(subDir, "libwidevinecdm.so");
          const platformSubSo = path.join(subDir, "_platform_specific/linux_x64/libwidevinecdm.so");
          if (fs.existsSync(directSubSo)) {
            return { cdmPath: subDir, version: entry.name, soPath: directSubSo };
          }
          if (fs.existsSync(platformSubSo)) {
            return { cdmPath: subDir, version: entry.name, soPath: platformSubSo };
          }
        }
      }
    } catch {
      // Ignore scan errors
    }
  }

  return null;
}

/**
 * Ensures the target application userData directory has a valid WidevineCdm structure.
 *
 * @param {import('electron').App} app
 */
function ensureWidevineCdm(app) {
  try {
    const userDataPath = app.getPath("userData");
    const targetWidevineDir = path.join(userDataPath, "WidevineCdm");

    // Check if userData Widevine directory already contains a version with libwidevinecdm.so
    let hasInstalledCdm = false;
    if (fs.existsSync(targetWidevineDir)) {
      const entries = fs.readdirSync(targetWidevineDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(targetWidevineDir, entry.name);
          if (
            fs.existsSync(path.join(subDir, "libwidevinecdm.so")) ||
            fs.existsSync(path.join(subDir, "_platform_specific/linux_x64/libwidevinecdm.so"))
          ) {
            hasInstalledCdm = true;
            break;
          }
        }
      }
    }

    if (!hasInstalledCdm) {
      const systemCdm = findSystemWidevineCdm();
      if (systemCdm) {
        const destVersionDir = path.join(targetWidevineDir, systemCdm.version);
        const destPlatformDir = path.join(destVersionDir, "_platform_specific/linux_x64");

        fs.mkdirSync(destPlatformDir, { recursive: true });

        // Copy CDM binary and metadata
        const filesToCopy = ["libwidevinecdm.so", "manifest.json", "LICENSE"];
        for (const file of filesToCopy) {
          const srcFile = path.join(systemCdm.cdmPath, file);
          if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, path.join(destVersionDir, file));
          }
        }

        // Also copy into _platform_specific/linux_x64
        if (fs.existsSync(systemCdm.soPath)) {
          fs.copyFileSync(systemCdm.soPath, path.join(destPlatformDir, "libwidevinecdm.so"));
        }
        log.info(
          `Pre-populated Widevine CDM v${systemCdm.version} from host path: ${systemCdm.cdmPath}`
        );
      } else {
        log.info("No host Widevine CDM installation discovered on system paths.");
      }
    } else {
      log.info("Pre-existing Widevine CDM cache detected in userData directory.");
    }
  } catch (err) {
    log.warn("Warning: Non-fatal error during Widevine CDM discovery:", err?.message || err);
  }
}

module.exports = {
  findSystemWidevineCdm,
  ensureWidevineCdm,
};
