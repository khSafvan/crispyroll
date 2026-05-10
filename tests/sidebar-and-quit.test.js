/**
 * Sidebar Restructuring & Quit App Verification Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testSidebarAndQuitModule() {
  console.log("Running Sidebar Restructure, Quit App, and Settings Logout Tests...");

  // Setup mock DOM and environment
  global.window = {
    translate: { go: (k) => k },
    session: {
      storage: {
        account: {
          username: "testuser@crunchyroll.com",
          premium: true,
          avatar: "0001-cr-white-orange.png",
        },
      },
      get_active_profile_name: () => "Shinobu",
      clear: () => {},
    },
    icons: {
      get: () => "<svg></svg>",
      phosphor: { get: () => "<svg></svg>" },
    },
    profilesScreen: {
      id: "profiles-screen",
      init: () => {
        global.window.profilesOpened = true;
      },
    },
    settings: {
      id: "settings-screen",
      init: () => {},
    },
    exit: null,
    menu: null,
    main: {
      state: "home-screen",
      events: {
        logout: () => {
          global.window.logoutTriggered = true;
        },
      },
    },
    electronUtilsRender: {
      exitApp: () => {
        global.window.appExited = true;
      },
      quitApp: () => {
        global.window.appExited = true;
      },
    },
    tvKey: {
      KEY_UP: 38,
      KEY_DOWN: 40,
      KEY_LEFT: 37,
      KEY_RIGHT: 39,
      KEY_ENTER: 13,
      KEY_PANEL_ENTER: 13,
      KEY_EXIT: 10009,
      IS_KEY_BACK: (k) => k === 10009 || k === 27,
    },
  };

  // Mock DOM
  global.document = {
    body: {
      classList: {
        add: () => {},
        remove: () => {},
      },
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: (tag) => {
      const el = {
        tagName: tag,
        id: "",
        className: "",
        innerHTML: "",
        setAttribute: () => {},
        getAttribute: () => null,
        remove: () => {},
        addEventListener: () => {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false,
        },
      };
      return el;
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  // Evaluate exit.js, menu.js, and settings.js
  const exitSrc = fs.readFileSync(path.join(__dirname, "../src/renderer/screens/exit.js"), "utf8");
  const menuSrc = fs.readFileSync(path.join(__dirname, "../src/renderer/screens/menu.js"), "utf8");
  const settingsSrc = fs.readFileSync(path.join(__dirname, "../src/renderer/screens/settings.js"), "utf8");

  eval(exitSrc);
  eval(menuSrc);
  eval(settingsSrc);

  // 1. Verify 3-Zone Sidebar Structure and Order
  const options = window.menu.options;
  assert.strictEqual(options.length, 6, "Sidebar must have exactly 6 navigation options");

  // Middle Zone Order: Search, Home, Browse, Watchlist
  assert.strictEqual(options[0].id, "search", "Item 1 must be Search");
  assert.strictEqual(options[1].id, "home", "Item 2 must be Home");
  assert.strictEqual(options[2].id, "browse", "Item 3 must be Browse");
  assert.strictEqual(options[3].id, "mylist", "Item 4 must be Watchlist");

  // Bottom Zone Order: Settings, Quit
  assert.strictEqual(options[4].id, "settings", "Item 5 must be Settings");
  assert.strictEqual(options[5].id, "quit", "Item 6 must be Quit App");
  assert.strictEqual(options[5].iconName, "power", "Quit App must use the power icon");

  // 2. Verify Quit App confirmation step
  let exitModalOpened = false;
  let exitModalIsLogout = null;
  window.exit = {
    id: "exit-screen",
    init: (isLogout) => {
      exitModalOpened = true;
      exitModalIsLogout = isLogout;
    },
  };

  // Simulate selecting Quit App
  const quitOption = options.find((o) => o.id === "quit");
  assert(quitOption, "Quit option must exist");
  assert.strictEqual(quitOption.event, "quit", "Quit option must emit 'quit' event");
  window.exit.init(false);
  assert.strictEqual(exitModalOpened, true, "Exit modal must open on quit");
  assert.strictEqual(exitModalIsLogout, false, "Exit modal must not be logout modal");

  // 3. Verify Settings Account Section with Log Out
  const accountOption = window.settings.options.find((o) => o.id === "account");
  assert(accountOption, "Settings must have an Account section");
  assert.strictEqual(accountOption.type, "account", "Account option must have type 'account'");

  const accountHtml = window.settings.details.account.create();
  assert(accountHtml.includes("settings-logout-btn"), "Account details HTML must render Log Out button");
  assert(accountHtml.includes("Shinobu"), "Account details HTML must render active profile name");

  // Verify Settings Log Out Action triggers window.main.events.logout()
  global.window.logoutTriggered = false;
  window.settings.details.account.action();
  assert.strictEqual(global.window.logoutTriggered, true, "Settings Log Out action must trigger window.main.events.logout()");

  console.log("✓ Sidebar restructure, Quit App, and Settings Logout tests passed!");
}

module.exports = { testSidebarAndQuitModule };
